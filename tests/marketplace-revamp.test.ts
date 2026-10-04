import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createPetOwnerSupportTicket,
  clearPlatformCache,
  getDiscoveryService,
  getDiscoveryServiceAvailability,
  getPetOwnerSupportTickets,
  getProductReviews,
  saveProductReview,
} from "../app/lib/platform-api.ts";
import { formatRupiah } from "../app/lib/petowner-domain.ts";

const web = readFileSync(
  new URL("../app/components/marketplace/ShopMarketplace.tsx", import.meta.url),
  "utf8",
);
const api = readFileSync(
  new URL("../app/lib/platform-api.ts", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../app/marketplace.css", import.meta.url),
  "utf8",
);
const mobile = readFileSync(
  new URL("../mobile/src/screens/MarketplaceScreen.tsx", import.meta.url),
  "utf8",
);

test("web marketplace cards expose purchase-critical product data", () => {
  for (const field of [
    "product.brand",
    "product.city",
    "product.stock",
    "product.rating",
    "product.reviewCount",
    "product.soldCount",
    "product.price",
  ]) {
    assert.ok(web.includes(field), `${field} must remain visible in the marketplace`);
  }
  assert.match(web, /Sliva Point/);
  assert.match(web, /aria-label=\{`Lihat detail \$\{product\.name\}`\}/);
});

test("product cards deep-link to detail and verified review APIs", () => {
  assert.match(web, /searchParams\.set\("product", product\.id\)/);
  assert.match(web, /function ProductDetail/);
  assert.match(web, /Ulasan & komentar/);
  assert.match(web, /saveProductReview/);
  assert.match(api, /\/api\/v1\/public\/products\/\$\{productId\}\/reviews/);
  assert.match(api, /\/api\/v1\/petowner\/products\/\$\{productId\}\/reviews/);
  assert.match(web, /Pembelian terverifikasi/);
});

test("web marketplace stays responsive from phone grid through desktop", () => {
  assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("native marketplace mirrors richer card and review detail data", () => {
  assert.match(mobile, /productFulfillment/);
  assert.match(mobile, /productReward/);
  assert.match(mobile, /detailFacts/);
  assert.match(mobile, /reviewDistribution/);
  assert.match(mobile, /saveMobileProductReview/);
});

test("marketplace review client reads public comments and posts verified comments", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: String(init.method ?? "GET").toUpperCase(),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    return {
      ok: true,
      status: 200,
      json: async () =>
        init.method === "POST"
          ? { id: "review-1", message: "Ulasan tersimpan" }
          : { data: [], count: 0, average_rating: 0 },
    } as Response;
  }) as typeof globalThis.fetch;
  clearPlatformCache();

  try {
    const reviews = await getProductReviews("product-1");
    const saved = await saveProductReview("product-1", {
      rating: 5,
      comment: "Makanan cocok dan pengiriman cepat.",
    });

    assert.deepEqual(reviews, { data: [], count: 0, average_rating: 0 });
    assert.equal(saved.id, "review-1");
    assert.equal(calls.length, 2);
    assert.match(calls[0].url, /\/api\/v1\/public\/products\/product-1\/reviews$/);
    assert.equal(calls[0].method, "GET");
    assert.match(calls[1].url, /\/api\/v1\/petowner\/products\/product-1\/reviews$/);
    assert.equal(calls[1].method, "POST");
    assert.deepEqual(calls[1].body, {
      rating: 5,
      comment: "Makanan cocok dan pengiriman cepat.",
    });
  } finally {
    globalThis.fetch = original;
    clearPlatformCache();
  }
});

test("service detail, live availability, and support use their API handlers", async () => {
  const original = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const service = {
    id: "grooming-1",
    branch_id: "branch-1",
    name: "Grooming Lengkap",
    category: "grooming",
  };
  const availability = {
    service_id: "grooming-1",
    branch_id: "branch-1",
    timezone: "Asia/Jakarta",
    slots: [{ starts_at: "2026-10-05T09:00:00+07:00", available_capacity: 2 }],
  };
  const tickets = { data: [], meta: { page: 1, page_size: 20, total: 0 } };
  const createdTicket = {
    id: "ticket-1",
    ticket_number: "SLV-001",
    status: "open",
    response_due_at: "2026-10-05T17:00:00+07:00",
    message: "Tiket dukungan dibuat",
  };

  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    const url = String(input);
    const method = String(init.method ?? "GET").toUpperCase();
    calls.push({
      url,
      method,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const payload = url.includes("/availability")
      ? availability
      : url.endsWith("/support-tickets") && method === "POST"
        ? createdTicket
        : url.endsWith("/support-tickets")
          ? tickets
          : service;
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    } as Response;
  }) as typeof globalThis.fetch;
  clearPlatformCache();

  try {
    assert.deepEqual(await getDiscoveryService("grooming/1", "branch & 1"), service);
    assert.deepEqual(
      await getDiscoveryServiceAvailability("grooming/1", "branch & 1", {
        from: "2026-10-05",
        days: 7,
      }),
      availability,
    );
    assert.deepEqual(await getPetOwnerSupportTickets(), tickets);
    assert.deepEqual(
      await createPetOwnerSupportTicket({
        category: "booking",
        subject: "Jadwal grooming",
        description: "Saya perlu memastikan ulang waktu kedatangan.",
        reference_type: "booking",
        reference_id: "booking-1",
      }),
      createdTicket,
    );

    assert.match(calls[0].url, /services\/grooming%2F1\?branch_id=branch%20%26%201$/);
    assert.match(
      calls[1].url,
      /services\/grooming%2F1\/availability\?branch_id=branch\+%26\+1&from=2026-10-05&days=7$/,
    );
    assert.equal(calls[2].method, "GET");
    assert.equal(calls[3].method, "POST");
    assert.deepEqual(calls[3].body, {
      category: "booking",
      subject: "Jadwal grooming",
      description: "Saya perlu memastikan ulang waktu kedatangan.",
      reference_type: "booking",
      reference_id: "booking-1",
    });
  } finally {
    globalThis.fetch = original;
    clearPlatformCache();
  }
});

test("marketplace currency labels use Indonesian rupiah without fractions", () => {
  assert.equal(formatRupiah(125_000), "Rp\u00a0125.000");
});
