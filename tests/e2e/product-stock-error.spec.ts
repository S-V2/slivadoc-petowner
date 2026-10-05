import { expect, test } from "./fixtures";
import {
  activityCenter,
  marketplaceProduct,
  paymentMethods,
  petOwner,
  petOwnerBootstrap,
} from "./mock-data";

const product = marketplaceProduct({
  id: "52000000-0000-4000-8000-000000000101",
  name: "Cat Teaser Feather",
  sku: "TEST-1",
  category: "Aksesori",
});

const availableProduct = marketplaceProduct({
  id: "52000000-0000-4000-8000-000000000102",
  name: "Cat Food",
  sku: "TEST-2",
  category: "Makanan",
});

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
  message:
    'Produk "Cat Teaser Feather" tidak tersedia atau stoknya berubah. Ubah jumlah atau hapus dari keranjang.',
  product_id: product.id,
  available_stock: 2,
};

test("stock error returns to cart and marks affected product", async ({ page }) => {
  await page.setViewportSize({ width: 428, height: 701 });
  await page.addInitScript(
    (cart) => {
      localStorage.setItem("slivadoc.access_token", "stock-test-token");
      localStorage.setItem("slivadoc.refresh_token", "stock-test-refresh");
      localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
      localStorage.setItem("slivadoc.cart", JSON.stringify(cart));
    },
    { [product.id]: 3, [availableProduct.id]: 1 },
  );
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
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter());
    if (path === "/api/v1/public/discovery/products")
      return json({ data: [product, availableProduct], count: 2 });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/payment-methods") return json(paymentMethods());
    if (path === "/api/v1/petowner/shipping-addresses")
      return json({ addresses: [address] });
    if (path === "/api/v1/petowner/orders/quote")
      return route.fulfill({
        status: 422,
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
