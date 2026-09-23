import { expect, test } from "@playwright/test";

const product = {
  id: "unavailable-product",
  name: "Cat Teaser Feather",
  sku: "TEST-1",
  barcode: "",
  category: "Aksesori",
  description: "",
  image_url: "",
  price: 35_000,
  stock: 10,
  minimum_stock: 1,
  available: true,
};

const availableProduct = {
  ...product,
  id: "available-product",
  name: "Cat Food",
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

const stockError = {
  code: "product_unavailable",
  error: "product_unavailable",
  message:
    'Produk "Cat Teaser Feather" tidak tersedia atau stoknya berubah. Ubah jumlah atau hapus dari keranjang.',
  product_id: "unavailable-product",
  available_stock: 2,
};

test("stock error returns to cart and marks affected product", async ({ page }) => {
  await page.setViewportSize({ width: 428, height: 701 });
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "stock-test-token");
    localStorage.setItem("slivadoc.refresh_token", "stock-test-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
    localStorage.setItem(
      "slivadoc.cart",
      JSON.stringify({ "unavailable-product": 3, "available-product": 1 }),
    );
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
    if (path === "/api/v1/petowner/activities")
      return json({ data: [], count: 0, summary: { booking: 0, order: 0, consultation: 0 } });
    if (path === "/api/v1/public/discovery/products")
      return json({ data: [product, availableProduct], count: 2 });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/campaigns" ||
      path === "/api/v1/payment-methods"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/shipping-addresses")
      return json({ addresses: [address] });
    if (path === "/api/v1/petowner/orders/quote")
      return route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify(stockError),
      });

    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.goto("/?view=shop", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("button", { name: "Tambah Cat Teaser Feather ke keranjang" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keranjang", exact: true }).last().click();
  await page.getByRole("button", { name: "Atur pengiriman" }).click();

  await expect(
    page.getByRole("heading", { name: "Keranjangmu" }),
  ).toBeVisible();
  const unavailableRow = page
    .locator(".cart-item")
    .filter({ hasText: product.name });
  const availableRow = page
    .locator(".cart-item")
    .filter({ hasText: availableProduct.name });
  await expect(unavailableRow.locator(".cart-item-stock-warning")).toContainText(
    "Stok tersedia: 2",
  );
  await expect(availableRow.locator(".cart-item-stock-warning")).toHaveCount(0);
});
