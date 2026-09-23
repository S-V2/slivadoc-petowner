import { expect, test } from "@playwright/test";

test("Activity highlights housing payments and filters order history", async ({
  page,
}) => {
  const order = {
    id: "order-1",
    type: "order",
    reference_id: "order-1",
    code: "PO-260923-1234",
    title: "Pesanan Pet Shop",
    subtitle: "Sliva Pet Shop",
    status: "completed",
    payment_status: "paid",
    amount: 37_500,
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
    occurred_at: "2026-09-23T00:00:00Z",
    updated_at: "2026-09-23T00:00:00Z",
    state: "history",
  };
  const processingOrder = {
    ...order,
    id: "order-2",
    reference_id: "order-2",
    code: "PO-260924-5678",
    subtitle: "Toko Sedang Diproses",
    status: "processing",
    occurred_at: "2026-09-24T00:00:00Z",
    updated_at: "2026-09-24T00:00:00Z",
    state: "ongoing",
  };
  const reservation = {
    id: "stay-1",
    reservation_number: "HOM-260923-1234",
    deposit_amount: 100_000,
    remaining_amount: 250_000,
    subtotal: 350_000,
    hold_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    reference_type: "petspot_reservation",
    spot_name: "Pawstay Residence",
    resource_name: "Kamar Garden",
    starts_at: "2026-10-01T08:00:00Z",
    ends_at: "2026-10-03T08:00:00Z",
    payment_status: "pending",
    status: "pending_payment",
    category: "apartment",
  };

  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "activity-test-token");
    localStorage.setItem("slivadoc.refresh_token", "activity-test-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const query = new URL(route.request().url()).searchParams;
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path === "/api/v1/auth/me")
      return json({
        id: "user-1",
        email: "pet@example.test",
        full_name: "Pet Parent",
        phone: "081234567890",
        role: "pet_owner",
      });
    if (path === "/api/v1/petowner/bootstrap")
      return json({
        user: {
          id: "user-1",
          email: "pet@example.test",
          full_name: "Pet Parent",
          phone: "081234567890",
          member_since: "2026-01-01",
        },
        pets: [],
        notifications: [],
        unread_notifications: 0,
        activities: [],
        favorites: [],
        points: { balance: 0, earned: 0, redeemed: 0, formula: { enabled: false } },
      });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (
      path === "/api/v1/petowner/activities" &&
      query.get("view") === "center"
    )
      return json({
        data: [order, processingOrder],
        count: 2,
        summary: { booking: 0, order: 2, consultation: 0 },
      });
    if (path === "/api/v1/petowner/petspot-reservations")
      return json({ data: [reservation], count: 1 });
    if (path === "/api/v1/petowner/activities")
      return json({ data: [], count: 0 });

    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Reservasi hunian" }),
  ).toBeVisible();
  await expect(page.getByText("Menunggu pembayaran")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bayar DP" }),
  ).toBeVisible();
  const activityType = page.getByLabel("Jenis aktivitas");
  await expect(activityType).toBeVisible();
  await activityType.selectOption("order");
  await page
    .locator(".activity-state-tabs")
    .getByRole("button", { name: "Riwayat" })
    .click();

  const cards = page.locator(".activity-native-card");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Sliva Pet Shop");
  await page
    .locator(".activity-state-tabs")
    .getByRole("button", { name: "Berlangsung" })
    .click();
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Toko Sedang Diproses");
});
