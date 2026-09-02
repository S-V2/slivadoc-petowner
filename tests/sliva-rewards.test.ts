import assert from "node:assert/strict";
import test from "node:test";

import {
  clearPlatformCache,
  createPetOwnerOrder,
  getPetOwnerBootstrap,
  getPetOwnerPoints,
  quotePetOwnerOrder,
} from "../app/lib/platform-api.ts";

// The old version of this file only regex-matched the client source, so it
// passed green against a backend that had no redemption at all. These tests
// drive the real request layer against a stubbed transport instead. The money
// arithmetic, the concurrency and the idempotency live in Go, next to the
// logic: slivadoc-backend/internal/modules/operations/rewards_test.go and
// rewards_integration_test.go.

type Capture = { url: string; method: string; body: Record<string, unknown> };

function stubTransport(
  status: number,
  payload: unknown,
): { calls: Capture[]; restore: () => void } {
  const original = globalThis.fetch;
  const calls: Capture[] = [];
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: String(init.method ?? "GET").toUpperCase(),
      body: init.body ? JSON.parse(String(init.body)) : {},
    });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    } as Response;
  }) as typeof globalThis.fetch;
  clearPlatformCache();
  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
      clearPlatformCache();
    },
  };
}

const serverQuote = {
  subtotal: 100_000,
  platform_fee: 2_500,
  voucher_code: "HEMAT50K",
  voucher_description: "Potongan Rp50.000",
  voucher_discount: 50_000,
  voucher_error: "",
  points_redeemed: 300,
  points_discount: 30_000,
  total_amount: 22_500,
  amount: 22_500,
  max_redeemable_points: 300,
  point_value_rupiah: 100,
  min_redemption_points: 100,
  max_redemption_bps: 3_000,
};

test("quote posts the cart, the voucher code and the redemption to the server", async () => {
  const transport = stubTransport(200, serverQuote);
  try {
    const quote = await quotePetOwnerOrder({
      items: [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      voucher_code: "HEMAT50K",
      redeem_points: 300,
    });
    assert.equal(transport.calls.length, 1);
    const [call] = transport.calls;
    assert.equal(call.method, "POST");
    assert.match(call.url, /\/api\/v1\/petowner\/orders\/quote$/);
    assert.deepEqual(call.body, {
      items: [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      voucher_code: "HEMAT50K",
      redeem_points: 300,
    });
    // The breakdown is returned verbatim: the cart renders these numbers.
    assert.equal(quote.total_amount, 22_500);
    assert.equal(quote.platform_fee, 2_500);
    assert.equal(quote.voucher_discount, 50_000);
    assert.equal(quote.points_discount, 30_000);
    assert.equal(quote.max_redeemable_points, 300);
  } finally {
    transport.restore();
  }
});

test("an omitted voucher and redemption still reach the server explicitly", async () => {
  const transport = stubTransport(200, serverQuote);
  try {
    await quotePetOwnerOrder({
      items: [{ product_id: "22222222-2222-4222-8222-222222222222", quantity: 1 }],
    });
    assert.deepEqual(transport.calls[0].body, {
      items: [{ product_id: "22222222-2222-4222-8222-222222222222", quantity: 1 }],
      voucher_code: "",
      redeem_points: 0,
    });
  } finally {
    transport.restore();
  }
});

test("checkout sends the same fields as the quote and never recomputes the total", async () => {
  // A deliberately odd server total: subtotal + fee - discounts is 22.500, but
  // the client must echo whatever the server says, not derive it. The old cart
  // rendered subtotal + 2500 - pointsDiscount and diverged from the charge.
  const transport = stubTransport(201, {
    ...serverQuote,
    total_amount: 19_999,
    amount: 19_999,
    id: "33333333-3333-4333-8333-333333333333",
    order_number: "SHOP-260901120000-ABCDEF",
    status: "pending_payment",
    payment_status: "pending",
    reference_type: "shop_order",
  });
  try {
    const order = await createPetOwnerOrder({
      items: [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      voucher_code: "HEMAT50K",
      redeem_points: 300,
    });
    const [call] = transport.calls;
    assert.match(call.url, /\/api\/v1\/petowner\/orders$/);
    assert.deepEqual(call.body, {
      items: [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      voucher_code: "HEMAT50K",
      redeem_points: 300,
    });
    assert.equal(order.total_amount, 19_999);
    assert.equal(order.amount, 19_999);
    assert.notEqual(order.total_amount, serverQuote.subtotal + 2_500);
    assert.equal(order.reference_type, "shop_order");
  } finally {
    transport.restore();
  }
});

test("a rejected voucher is reported by the quote instead of silently discounting", async () => {
  const transport = stubTransport(200, {
    ...serverQuote,
    voucher_code: "KADALUARSA",
    voucher_description: "",
    voucher_discount: 0,
    voucher_error: "Voucher sudah kedaluwarsa",
    points_redeemed: 0,
    points_discount: 0,
    total_amount: 102_500,
    amount: 102_500,
  });
  try {
    const quote = await quotePetOwnerOrder({
      items: [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 2 }],
      voucher_code: "KADALUARSA",
    });
    assert.equal(quote.voucher_error, "Voucher sudah kedaluwarsa");
    assert.equal(quote.voucher_discount, 0);
    assert.equal(quote.total_amount, 102_500);
  } finally {
    transport.restore();
  }
});

test("server-side redemption limits surface as the Indonesian message", async () => {
  for (const rejection of [
    { code: "insufficient_points", message: "Saldo Sliva Point tidak mencukupi" },
    {
      code: "points_redemption_capped",
      message: "Penukaran poin melebihi batas maksimal untuk transaksi ini",
    },
    {
      code: "invalid_points_redemption",
      message: "Jumlah poin yang ditukar tidak valid",
    },
    { code: "voucher_not_applicable", message: "Kuota voucher sudah habis" },
  ]) {
    const transport = stubTransport(422, rejection);
    try {
      await assert.rejects(
        createPetOwnerOrder({
          items: [{ product_id: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
          redeem_points: 999_999,
        }),
        (error: unknown) =>
          error instanceof Error && error.message === rejection.message,
      );
    } finally {
      transport.restore();
    }
  }
});

// points.formula has to be the RewardFormula object the client is typed
// against. While it was a prose string every field below was undefined, so the
// redemption card's `rewardFormula.enabled` gate never rendered.
test("bootstrap and points expose reward settings as a structured formula", async () => {
  const formula = {
    enabled: true,
    point_value_rupiah: 100,
    earn_divisor_rupiah: 10_000,
    expiry_days: 365,
    settlement_hold_days: 7,
    max_redemption_bps: 3_000,
    min_redemption_points: 100,
    rules: ["1 poin setiap Rp10.000 nilai transaksi bersih yang sudah dibayar"],
  };
  const transport = stubTransport(200, {
    user: {
      id: "1",
      email: "a@b.c",
      full_name: "A",
      phone: "",
      member_since: "",
    },
    pets: [],
    notifications: [],
    unread_notifications: 0,
    activities: [],
    favorites: [],
    points: { balance: 1_000, earned: 1_300, redeemed: 300, pending: 50, formula },
  });
  try {
    const bootstrap = await getPetOwnerBootstrap();
    assert.equal(typeof bootstrap.points.formula, "object");
    assert.equal(bootstrap.points.formula.enabled, true);
    assert.equal(bootstrap.points.formula.max_redemption_bps, 3_000);
    assert.equal(bootstrap.points.formula.min_redemption_points, 100);
    assert.equal(bootstrap.points.formula.settlement_hold_days, 7);
    assert.equal(bootstrap.points.pending, 50);
  } finally {
    transport.restore();
  }

  const points = stubTransport(200, {
    balance: 1_000,
    earned: 1_300,
    redeemed: 300,
    pending: 50,
    formula,
    transactions: [
      {
        id: "1",
        reference_type: "shop_order",
        transaction_amount: 175_000,
        points: 17,
        multiplier: 1,
        description: "Transaksi shop_order terbayar · poin diterima",
        available_at: "2026-09-08T00:00:00Z",
        expires_at: "2027-09-01T00:00:00Z",
        created_at: "2026-09-01T00:00:00Z",
      },
    ],
  });
  try {
    const summary = await getPetOwnerPoints();
    assert.equal(summary.formula.enabled, true);
    assert.equal(summary.formula.earn_divisor_rupiah, 10_000);
    // The hold has to be visible per row, not just as a global setting.
    assert.equal(summary.transactions[0].available_at, "2026-09-08T00:00:00Z");
    assert.equal(summary.transactions[0].points, 17);
  } finally {
    points.restore();
  }
});
