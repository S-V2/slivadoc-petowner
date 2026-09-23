import { expect, test } from "@playwright/test";

const product = {
  id: "payment-test-product",
  name: "Test Food",
  sku: "TEST",
  barcode: "",
  category: "Food",
  description: "",
  image_url: "",
  price: 35_000,
  stock: 10,
  minimum_stock: 1,
  available: true,
};

const address = {
  id: "address-1",
  label: "Rumah",
  recipient_name: "Pet Parent",
  phone: "081234567890",
  address: "Jalan Contoh nomor 12",
  post_code: "12345",
  province: { code: "31", name: "DKI Jakarta" },
  regency: { code: "3171", name: "Jakarta Selatan" },
  district: { code: "3171010", name: "Kebayoran Baru" },
  village: { code: "3171010001", name: "Senayan" },
  area: "Senayan, Jakarta Selatan",
  latitude: -6.22,
  longitude: 106.8,
  is_primary: true,
};

const quote = {
  subtotal: 35_000,
  platform_fee: 0,
  shipping_fee: 0,
  voucher_code: "",
  voucher_description: "",
  voucher_discount: 0,
  voucher_error: "",
  points_redeemed: 0,
  points_discount: 0,
  total_amount: 35_000,
  amount: 35_000,
  max_redeemable_points: 0,
  point_value_rupiah: 0,
  min_redemption_points: 0,
  max_redemption_bps: 0,
  shipping_ready: false,
  shipping_quotes: [],
};

const pendingPayment = {
  id: "payment-1",
  order_id: "order-1",
  provider: "mock",
  method: "qris",
  status: "pending",
  payment_status: "pending",
  amount: 35_000,
  currency: "IDR",
  reference_type: "shop_order",
  reference_id: "order-1",
  qr_string: "test",
};

test("mobile checkout keeps address readable and confirms paid orders", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "payment-test-token");
    localStorage.setItem("slivadoc.refresh_token", "payment-test-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
    if (!localStorage.getItem("slivadoc.cart"))
      localStorage.setItem(
        "slivadoc.cart",
        JSON.stringify({ "payment-test-product": 1 }),
      );
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
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
        phone: address.phone,
        role: "pet_owner",
      });
    if (path === "/api/v1/petowner/bootstrap")
      return json({
        user: {
          id: "user-1",
          email: "pet@example.test",
          full_name: "Pet Parent",
          phone: address.phone,
          member_since: "2026-01-01",
        },
        pets: [],
        notifications: [],
        unread_notifications: 0,
        activities: [],
        favorites: [],
        points: { balance: 0, earned: 0, redeemed: 0, formula: { enabled: false } },
      });
    if (path === "/api/v1/public/discovery/products")
      return json({ data: [product], count: 1 });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/shipping-addresses")
      return json({ addresses: [address] });
    if (path === "/api/v1/petowner/orders/quote") return json(quote);
    if (path === "/api/v1/petowner/orders")
      return json({
        ...quote,
        id: "order-1",
        order_number: "SO-1",
        status: "pending",
        payment_status: "pending",
        reference_type: "shop_order",
      });
    if (path === "/api/v1/payment-methods")
      return json({
        data: [{ code: "qris", method: "qris", label: "QRIS", description: "QRIS" }],
        count: 1,
        provider: "mock",
        currency: "IDR",
      });
    if (path === "/api/v1/payment-intents" && request.method() === "POST")
      return json(pendingPayment);
    if (path === "/api/v1/payment-intents/payment-1")
      return json({
        ...pendingPayment,
        status: "paid",
        payment_status: "paid",
        paid_at: "2026-09-23T00:00:00Z",
      });
    if (path === "/api/v1/petowner/points")
      return json({ balance: 0, earned: 0, redeemed: 0, formula: { enabled: false } });

    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.setViewportSize({ width: 428, height: 701 });
  await page.goto("/?view=shop", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Tambah Test Food ke keranjang" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keranjang", exact: true }).last().click();
  await expect(page.locator(".cart-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Atur pengiriman" }).click();
  await expect(page.locator(".cart-summary .total b")).toContainText("35.000");
  const addressLayout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const bounds = element.getBoundingClientRect();
      return {
        top: bounds.top,
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
      };
    };
    return {
      title: rect(".cart-shipping-heading b"),
      hint: rect(".cart-shipping-heading small"),
      recipient: rect(".cart-shipping-saved > div > b"),
      phone: rect(".cart-shipping-saved > div > span"),
      street: rect(".cart-shipping-saved p"),
      region: rect(".cart-shipping-saved > div > small"),
      orderSummary: rect(".cart-order-preview > span"),
      changeCart: rect(".cart-order-preview button"),
    };
  });
  expect(addressLayout.hint.top).toBeGreaterThanOrEqual(addressLayout.title.bottom);
  expect(addressLayout.phone.top).toBeGreaterThanOrEqual(addressLayout.recipient.bottom);
  expect(addressLayout.street.top).toBeGreaterThanOrEqual(addressLayout.phone.bottom);
  expect(addressLayout.region.top).toBeGreaterThanOrEqual(addressLayout.street.bottom);
  expect(addressLayout.changeCart.left - addressLayout.orderSummary.right).toBeGreaterThanOrEqual(8);
  await page.getByRole("button", { name: "Lanjut ke pembayaran" }).click();
  await expect(
    page.getByRole("heading", { name: "Keranjang masih kosong" }),
  ).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: "Pembayaran berhasil" }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("dialog", { name: "Pembayaran berhasil" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Selesai" }).click();
  await page.getByRole("button", { name: "Keranjang", exact: true }).last().click();
  await expect(page.getByRole("heading", { name: "Keranjang masih kosong" })).toBeVisible();
});
