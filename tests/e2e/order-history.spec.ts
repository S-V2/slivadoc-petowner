import { expect, test } from "./fixtures";
import {
  activityCenter,
  activityItem,
  petOwner,
  petOwnerBootstrap,
} from "./mock-data";

test("Activity lists payable reservations first and filters order history", async ({
  page,
}) => {
  const order = activityItem({
    id: "6a000000-0000-4000-8000-000000000101",
    type: "order",
    code: "PO-260923-1234",
    title: "Pesanan Pet Shop",
    subtitle: "Sliva Pet Shop",
    status: "completed",
    payment_status: "paid",
    amount: 37_500,
    state: "history",
    payment_reference_type: "shop_order",
    subtotal: 35_000,
    platform_fee: 2_500,
    shipping_fee: 0,
    discount_amount: 0,
    voucher_code: "",
    points_redeemed: 0,
    points_discount: 0,
    total_amount: 37_500,
    item_count: 1,
    items: [],
    shipments: [],
    paid_at: "2026-09-23T00:00:00Z",
  });
  const processingOrder = {
    ...order,
    id: "6a000000-0000-4000-8000-000000000102",
    reference_id: "6a000000-0000-4000-8000-000000000102",
    code: "PO-260924-5678",
    subtitle: "Toko Sedang Diproses",
    status: "processing",
    occurred_at: "2026-09-24T00:00:00Z",
    updated_at: "2026-09-24T00:00:00Z",
    state: "ongoing",
  };
  // A housing reservation whose deposit hold is still open: the center marks
  // it payable, so it heads the list as something to act on.
  const reservation = activityItem({
    id: "5c000000-0000-4000-8000-000000000001",
    type: "reservation",
    code: "HOM-260923-1234",
    title: "Pawstay Residence",
    subtitle: "Kamar Garden",
    status: "pending_payment",
    payment_status: "pending",
    amount: 100_000,
    state: "upcoming",
    needs_action: true,
    payable: true,
    payment_reference_type: "petspot_reservation",
    scheduled_at: "2026-10-01T08:00:00Z",
    ends_at: "2026-10-03T08:00:00Z",
    spot_id: "5c000000-0000-4000-8000-000000000101",
    spot_name: "Pawstay Residence",
    spot_category: "apartment",
    resource_name: "Kamar Garden",
    resource_code: "GDN-01",
    address: "Jalan Kemang Raya 10",
    city: "Jakarta Selatan",
    latitude: null,
    longitude: null,
    guest_count: 1,
    pet_count: 1,
    subtotal: 350_000,
    deposit_amount: 100_000,
    remaining_amount: 250_000,
    hold_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  });

  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "activity-test-token");
    localStorage.setItem("slivadoc.refresh_token", "activity-test-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path === "/api/v1/auth/me")
      return json({
        ...petOwner,
        role: "pet_owner",
      });
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap());
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter([order, processingOrder, reservation]));

    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });
  const attention = page.getByRole("region", { name: "Perlu tindakan" });
  await expect(attention).toBeVisible();
  const attentionCard = attention.locator("article");
  await expect(attentionCard).toHaveCount(1);
  await expect(attentionCard).toContainText("Pawstay Residence");
  await expect(attentionCard).toContainText("Menunggu pembayaran");
  await expect(
    attentionCard.getByRole("button", { name: "Bayar" }),
  ).toBeVisible();
  const attentionCardWidth = await attentionCard.evaluate((element) =>
    element.getBoundingClientRect().width,
  );
  expect(attentionCardWidth).toBeLessThanOrEqual(900);
  await page
    .getByRole("group", { name: "Jenis aktivitas" })
    .getByRole("button", { name: "Belanja" })
    .click();
  await page
    .locator(".activity-state-tabs")
    .getByRole("button", { name: "Riwayat" })
    .click();

  const cards = page.locator(".activity-native-card");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Sliva Pet Shop");
  const activityCardWidth = await cards.first().evaluate((element) =>
    element.getBoundingClientRect().width,
  );
  expect(activityCardWidth).toBeLessThanOrEqual(900);
  await page
    .locator(".activity-state-tabs")
    .getByRole("button", { name: "Berlangsung" })
    .click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Toko Sedang Diproses");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBe(375);
  const mobileCardWidths = await page.evaluate(() => ({
    attention: document.querySelector(".activity-attention article")?.getBoundingClientRect().width ?? 0,
    activity: document.querySelector(".activity-native-card")?.getBoundingClientRect().width ?? 0,
  }));
  expect(mobileCardWidths.attention).toBeLessThanOrEqual(375);
  expect(mobileCardWidths.activity).toBeLessThanOrEqual(375);
});
