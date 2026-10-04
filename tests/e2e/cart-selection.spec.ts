import { expect, test } from "./fixtures";
import {
  marketplaceProduct,
  paymentMethods,
  petOwner,
  petOwnerBootstrap,
} from "./mock-data";

const first = marketplaceProduct({
  id: "52000000-0000-4000-8000-000000000301",
  name: "Selected Food",
  price: 42_000,
});
const second = marketplaceProduct({
  id: "52000000-0000-4000-8000-000000000302",
  name: "Skipped Toy",
  price: 18_000,
});
const address = {
  id: "selection-address-1",
  label: "Rumah",
  recipient_name: "Pet Parent",
  phone: "081234567890",
  address: "Jalan Pilihan nomor 12",
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

test("checkout quotes only cart products selected by the pet owner", async ({
  page,
}) => {
  const quoteBodies: Array<{ items?: Array<{ product_id: string }> }> = [];
  await page.addInitScript(
    ({ firstID, secondID }) => {
      localStorage.setItem("slivadoc.access_token", "selection-test-token");
      localStorage.setItem("slivadoc.refresh_token", "selection-test-refresh");
      localStorage.setItem(
        "slivadoc.access_expires_at",
        String(Date.now() + 3_600_000),
      );
      localStorage.setItem(
        "slivadoc.cart",
        JSON.stringify({ [firstID]: 1, [secondID]: 1 }),
      );
    },
    { firstID: first.id, secondID: second.id },
  );

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path === "/api/v1/auth/me")
      return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities")
      return json({
        data: [],
        count: 0,
        summary: { booking: 0, order: 0, consultation: 0 },
      });
    if (path === "/api/v1/public/discovery/products")
      return json({ data: [first, second], count: 2 });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/shipping-addresses")
      return json({ addresses: [address] });
    if (path === "/api/v1/petowner/orders/quote") {
      quoteBodies.push(request.postDataJSON());
      return json({
        subtotal: first.price,
        platform_fee: 0,
        shipping_fee: 0,
        voucher_code: "",
        voucher_description: "",
        voucher_discount: 0,
        voucher_error: "",
        points_redeemed: 0,
        points_discount: 0,
        total_amount: first.price,
        amount: first.price,
        max_redeemable_points: 0,
        point_value_rupiah: 0,
        min_redemption_points: 0,
        max_redemption_bps: 0,
        shipping_ready: false,
        shipping_quotes: [],
      });
    }
    if (path === "/api/v1/payment-methods") return json(paymentMethods());
    if (path === "/api/v1/petowner/points")
      return json({
        balance: 0,
        earned: 0,
        redeemed: 0,
        pending: 0,
        formula: {
          enabled: false,
          point_value_rupiah: 1,
          earn_divisor_rupiah: 10_000,
          expiry_days: 365,
          settlement_hold_days: 7,
          max_redemption_bps: 5_000,
          min_redemption_points: 100,
          rules: [],
        },
      });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.goto("/?view=shop", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Keranjang", exact: true }).last().click();
  await expect(page.locator(".cart-item")).toHaveCount(2);
  await page
    .getByRole("button", { name: `Batalkan pilihan ${second.name}` })
    .click();
  await expect(page.getByText("Subtotal 1 produk dipilih")).toBeVisible();
  await page.getByRole("button", { name: "Atur pengiriman" }).click();

  await expect.poll(() => quoteBodies.length).toBeGreaterThan(0);
  expect(quoteBodies.at(-1)?.items).toEqual([
    { product_id: first.id, quantity: 1 },
  ]);
});
