import type { Page, Route } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  activityCenter,
  activityItem,
  marketplaceChatThread,
  marketplaceProduct,
  petOwner,
  petOwnerBootstrap,
} from "./mock-data";

const day = 86_400_000;
const storeID = "59000000-0000-4000-8000-000000000101";
const threadID = "57000000-0000-4000-8000-000000000101";

async function signIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "medium-surfaces-token");
    localStorage.setItem("slivadoc.refresh_token", "medium-surfaces-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
  });
}

const respond = (route: Route) => (body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

function shopOrder(overrides: Record<string, unknown> & { id: string; title: string }) {
  return activityItem({
    type: "order",
    subtitle: "Sliva Pet Shop",
    payment_reference_type: "shop_order",
    amount: 96_000,
    total_amount: 96_000,
    subtotal: 96_000,
    item_count: 1,
    items: [
      {
        product_id: "52000000-0000-4000-8000-000000000201",
        name: "Salmon Bites",
        quantity: 2,
        line_total: 96_000,
      },
    ],
    shipments: [],
    ...overrides,
  });
}

test("buyer cancels a paid order and files a return request", async ({ page }) => {
  const cancellableID = "a1000000-0000-4000-8000-000000000001";
  const stuckID = "a1000000-0000-4000-8000-000000000002";
  const deliveredID = "a1000000-0000-4000-8000-000000000003";
  const fulfillmentID = "a2000000-0000-4000-8000-000000000003";
  let cancelled = false;
  let requested = false;
  const posts: string[] = [];
  const returnBodies: unknown[] = [];
  const fulfillment = () => ({
    id: fulfillmentID,
    business_id: storeID,
    business_name: "Sliva Pet Shop",
    status: "delivered",
    delivered_at: new Date(Date.now() - day).toISOString(),
    return_until: new Date(Date.now() + 6 * day).toISOString(),
    return_requested: requested,
  });
  const orders = () => [
    shopOrder({
      id: cancellableID,
      title: "Pesanan Bisa Batal",
      code: "SO-CANCEL-1",
      status: cancelled ? "cancelled" : "processing",
      state: cancelled ? "history" : "upcoming",
      payment_status: cancelled ? "refund_pending" : "paid",
      cancellable: !cancelled,
      fulfillments: [
        {
          id: "a2000000-0000-4000-8000-000000000001",
          business_id: storeID,
          business_name: "Sliva Pet Shop",
          status: cancelled ? "cancelled" : "processing",
          delivered_at: null,
          return_until: null,
          return_requested: false,
        },
      ],
    }),
    shopOrder({
      id: stuckID,
      title: "Pesanan Sudah Diproses",
      code: "SO-STUCK-1",
      status: "processing",
      cancellable: true,
      fulfillments: [],
    }),
    shopOrder({
      id: deliveredID,
      title: "Pesanan Sudah Sampai",
      code: "SO-DELIVERED-1",
      status: "delivered",
      cancellable: false,
      fulfillments: [fulfillment()],
    }),
  ];

  await signIn(page);
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = respond(route);
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap());
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/marketplace/chats")
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/activities") return json(activityCenter(orders()));
    if (path === `/api/v1/petowner/orders/${cancellableID}/cancel`) {
      posts.push(path);
      cancelled = true;
      return json({ id: cancellableID, status: "cancelled", refund_queued: true });
    }
    if (path === `/api/v1/petowner/orders/${stuckID}/cancel`) {
      posts.push(path);
      return json(
        {
          code: "order_not_cancellable",
          message: "Pesanan hanya dapat dibatalkan setelah dibayar dan sebelum penjual memprosesnya.",
        },
        409,
      );
    }
    if (
      path ===
      `/api/v1/petowner/orders/${deliveredID}/fulfillments/${fulfillmentID}/return-request`
    ) {
      returnBodies.push(request.postDataJSON());
      requested = true;
      return json({ id: "a3000000-0000-4000-8000-000000000001", ticket_number: "TKT-0042", status: "open" }, 201);
    }
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings&activity_type=order", { waitUntil: "domcontentloaded" });

  // Cancel a paid order the seller has not started on.
  await page.getByRole("button", { name: /Pesanan Bisa Batal/ }).click();
  const detail = page.locator(".activity-detail-modal");
  await detail.getByRole("button", { name: "Batalkan pesanan" }).click();
  await detail.getByRole("button", { name: "Ya, batalkan" }).click();
  await expect(detail).toContainText(
    "Pesanan dibatalkan. Dana akan dikembalikan setelah diverifikasi tim finance.",
  );
  await expect(detail.getByRole("button", { name: "Batalkan pesanan" })).toHaveCount(0);
  expect(posts).toEqual([`/api/v1/petowner/orders/${cancellableID}/cancel`]);
  await detail.getByRole("button", { name: "Tutup" }).click();

  // The server refuses once the seller moved on: its message is shown as is.
  await page.getByRole("button", { name: /Pesanan Sudah Diproses/ }).click();
  await detail.getByRole("button", { name: "Batalkan pesanan" }).click();
  await detail.getByRole("button", { name: "Ya, batalkan" }).click();
  await expect(detail).toContainText("sebelum penjual memprosesnya");
  await detail.getByRole("button", { name: "Tutup" }).click();

  // A delivered parcel inside the return window can be returned once.
  await page.getByRole("button", { name: /Pesanan Sudah Sampai/ }).click();
  await expect(detail.getByRole("button", { name: "Batalkan pesanan" })).toHaveCount(0);
  await detail.getByRole("button", { name: "Ajukan retur" }).click();
  await detail.getByLabel("Alasan retur").fill("rusak");
  await detail.getByRole("button", { name: "Kirim permintaan retur" }).click();
  await expect(detail).toContainText("Alasan retur harus 10 sampai 1000 karakter.");
  expect(returnBodies).toHaveLength(0);
  await detail.getByLabel("Alasan retur").fill("Kemasan rusak dan isinya tumpah");
  await detail.getByRole("button", { name: "Kirim permintaan retur" }).click();
  await expect(detail).toContainText("Permintaan retur terkirim (TKT-0042)");
  await expect(detail).toContainText("Retur diajukan");
  await expect(detail.getByRole("button", { name: "Ajukan retur" })).toHaveCount(0);
  expect(returnBodies).toEqual([{ reason: "Kemasan rusak dan isinya tumpah" }]);
});

test("return window that passed offers no return action", async ({ page }) => {
  const orderID = "a1000000-0000-4000-8000-000000000011";
  await signIn(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = respond(route);
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap());
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/marketplace/chats")
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/activities")
      return json(
        activityCenter([
          shopOrder({
            id: orderID,
            title: "Pesanan Lewat Batas",
            status: "delivered",
            cancellable: false,
            fulfillments: [
              {
                id: "a2000000-0000-4000-8000-000000000011",
                business_id: storeID,
                business_name: "Sliva Pet Shop",
                status: "delivered",
                delivered_at: new Date(Date.now() - 10 * day).toISOString(),
                return_until: new Date(Date.now() - 3 * day).toISOString(),
                return_requested: false,
              },
            ],
          }),
        ]),
      );
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings&activity_type=order", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Pesanan Lewat Batas/ }).click();
  const detail = page.locator(".activity-detail-modal");
  await expect(detail).toContainText("Pesanan Lewat Batas");
  await expect(detail.getByRole("button", { name: "Ajukan retur" })).toHaveCount(0);
  await expect(detail).not.toContainText("Retur diajukan");
});

test("Aktivitas loads more pages by cursor and keeps what it loaded", async ({ page }) => {
  const first = activityItem({
    id: "b1000000-0000-4000-8000-000000000001",
    type: "booking",
    title: "Grooming Halaman Satu",
    service_name: "Grooming",
  });
  const second = activityItem({
    id: "b1000000-0000-4000-8000-000000000002",
    type: "booking",
    title: "Grooming Halaman Dua",
    service_name: "Grooming",
  });
  const queries: string[] = [];
  let failNext = true;
  await signIn(page);
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = respond(route);
    if (url.pathname === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (url.pathname === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap());
    if (
      url.pathname === "/api/v1/public/discovery/services" ||
      url.pathname === "/api/v1/public/discovery/products" ||
      url.pathname === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (url.pathname === "/api/v1/petowner/marketplace/chats")
      return json({ data: [], count: 0 });
    if (url.pathname === "/api/v1/petowner/activities") {
      queries.push(url.search);
      const cursor = url.searchParams.get("cursor");
      if (!cursor) return json(activityCenter([first], "cursor-2", [first, second]));
      if (failNext) {
        failNext = false;
        return json({ code: "activity_failed", message: "Riwayat belum dapat dimuat" }, 500);
      }
      return json(activityCenter([second], null, [first, second]));
    }
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: /Grooming Halaman Satu/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Grooming Halaman Dua/ })).toHaveCount(0);
  const more = page.getByRole("button", { name: "Muat lebih banyak" });
  await more.click();
  await expect(page.getByText("Riwayat belum dapat dimuat")).toBeVisible();
  await expect(page.getByRole("button", { name: /Grooming Halaman Dua/ })).toHaveCount(0);
  await more.click();
  await expect(page.getByRole("button", { name: /Grooming Halaman Dua/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Grooming Halaman Satu/ })).toBeVisible();
  await expect(more).toHaveCount(0);
  expect(queries).toEqual(
    expect.arrayContaining([
      "?view=center&type=all&state=all&limit=100",
      "?view=center&type=all&state=all&limit=100&cursor=cursor-2",
    ]),
  );
});

const invoice = {
  id: "c1000000-0000-4000-8000-000000000001",
  invoice_number: "INV-2026-0001",
  business_name: "Klinik Sliva",
  branch_name: "Cabang Kemang",
  status: "pending",
  subtotal: 250_000,
  discount_amount: 10_000,
  tax_amount: 0,
  total_amount: 240_000,
  paid_amount: 100_000,
  refunded_amount: 0,
  issued_at: "2026-10-01T08:00:00Z",
  paid_at: null,
};

test("owner invoices list, detail, error retry and empty state", async ({ page }) => {
  let listCalls = 0;
  await signIn(page);
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = respond(route);
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap());
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/marketplace/chats")
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/petowner/invoices") {
      listCalls += 1;
      if (listCalls === 1)
        return json({ code: "forbidden", message: "Akses ditolak" }, 403);
      if (listCalls === 2) return json({ data: [invoice], count: 1 });
      return json({ data: [], count: 0 });
    }
    if (path === `/api/v1/petowner/invoices/${invoice.id}`)
      return json({
        ...invoice,
        items: [
          {
            item_type: "service",
            description: "Vaksin tahunan",
            quantity: 1,
            unit_price: 250_000,
            discount_amount: 10_000,
            line_total: 240_000,
          },
        ],
      });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "Invoice", exact: true }).click();
  const panel = page.getByRole("region", { name: "Invoice", exact: true });
  await expect(panel).toContainText("Akses ditolak");
  await panel.getByRole("button", { name: "Coba lagi" }).click();
  await expect(panel).toContainText("INV-2026-0001");
  await expect(panel).toContainText("Klinik Sliva · Cabang Kemang");
  await expect(panel).toContainText("Menunggu pembayaran");

  await panel.getByRole("button", { name: /INV-2026-0001/ }).click();
  const detail = page.getByRole("region", { name: "Detail invoice", exact: true });
  await expect(detail).toContainText("Vaksin tahunan");
  await expect(detail).toContainText("Sisa tagihan");
  await expect(detail).toContainText("140.000");
  await detail.getByRole("button", { name: "Kembali ke daftar" }).click();
  await panel.getByRole("button", { name: "Tutup" }).click();

  // Reopening refetches; the next answer is an empty list.
  await page.getByRole("button", { name: "Invoice", exact: true }).click();
  await expect(page.getByRole("region", { name: "Invoice", exact: true })).toContainText(
    "Belum ada invoice tertaut. Tautkan kode pet owner di klinik agar invoice muncul di sini.",
  );
});

test("store reply shows a chat badge and its notification opens the thread", async ({ page }) => {
  const notification = {
    id: "d1000000-0000-4000-8000-000000000001",
    category: "order",
    title: "Balasan dari Sliva Pet Shop",
    body: "Halo, stok tersedia.",
    action_route: "shop",
    metadata: { thread_id: threadID, business_id: storeID },
    read_at: null,
    created_at: "2026-10-05T09:00:00Z",
  };
  const threads = [
    marketplaceChatThread({ id: threadID, business_id: storeID, unread_count: 2 }),
    marketplaceChatThread({
      id: "57000000-0000-4000-8000-000000000102",
      business_id: "59000000-0000-4000-8000-000000000102",
      business_name: "Toko Lain",
      unread_count: 1,
    }),
  ];
  await signIn(page);
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = respond(route);
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap")
      return json({
        ...petOwnerBootstrap(),
        notifications: [notification],
        unread_notifications: 1,
      });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/petowner/marketplace/chats" && request.method() === "GET")
      return json({ data: threads, count: threads.length });
    if (path === `/api/v1/notifications/${notification.id}/read`)
      return json({ id: notification.id, read: true });
    if (path === `/api/v1/marketplace/chats/${threadID}/messages`) {
      threads[0] = { ...threads[0], unread_count: 0 };
      return json({ data: [], count: 0, viewer: "buyer" });
    }
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const chatButton = page.getByRole("button", { name: "Buka daftar chat" });
  await expect(chatButton.locator(".counter")).toHaveText("3");

  await page.locator(".notification-header-button").click();
  await page
    .locator(".notification-drawer .notification")
    .filter({ hasText: "Balasan dari Sliva Pet Shop" })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Chat dengan Sliva Pet Shop" }),
  ).toBeVisible();

  // Closing the thread refreshes the badge: only the other store is unread.
  await page.locator('.market-chat-panel button[aria-label="Tutup chat"]').click();
  await expect(chatButton.locator(".counter")).toHaveText("1");
});

test("a hidden review answers with the moderator message", async ({ page }) => {
  const product = marketplaceProduct({
    id: "52000000-0000-4000-8000-000000000888",
    name: "Salmon Skin & Coat Bites",
  });
  await signIn(page);
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = respond(route);
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/petowner/marketplace/chats")
      return json({ data: [], count: 0 });
    if (path === "/api/v1/public/discovery/products")
      return json({ data: [product], count: 1 });
    if (path === "/api/v1/public/discovery/services" || path === "/api/v1/public/campaigns")
      return json({ data: [], count: 0 });
    if (path === `/api/v1/public/products/${product.id}/reviews`)
      return json({ data: [], count: 0, rating: 0 });
    if (
      path === `/api/v1/petowner/products/${product.id}/reviews` &&
      request.method() === "POST"
    )
      return json(
        {
          code: "review_hidden",
          message: "Ulasan Anda disembunyikan moderator dan tidak dapat diubah",
        },
        409,
      );
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=shop", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: `Lihat detail ${product.name}` }).click();
  await page
    .getByPlaceholder("Ceritakan kualitas produk, kemasan, dan reaksi pet-mu…")
    .fill("Snack-nya wangi dan kemasan aman untuk Milo.");
  await page.getByRole("button", { name: "Publikasikan ulasan" }).click();
  await expect(
    page.locator(".market-form-error"),
  ).toHaveText(
    "Ulasanmu disembunyikan moderator dan tidak bisa diubah. Hubungi dukungan jika ada keberatan.",
  );
});
