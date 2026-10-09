import { test, expect } from "./fixtures";
import {
  petOwner,
  petOwnerBootstrap,
  marketplaceProduct,
  activityCenter,
} from "./mock-data";
const service = {
  id: "favorite-service",
  business_id: "favorite-business",
  branch_id: "favorite-branch",
  business_name: "Paws & Care",
  branch_name: "Kemang",
  name: "Konsultasi Dokter Umum",
  category: "clinic",
  price: 150000,
  duration_minutes: 30,
  address: "Jl. Kemang Raya No. 88",
  city: "Jakarta Selatan",
  distance_km: 1.5,
  image_url: "https://example.test/clinic.svg",
  rating: 4.9,
  review_count: 20,
  description: "Perawatan untuk anabul",
  inclusions: [],
  supported_species: ["cat", "dog"],
};
const product = marketplaceProduct({
  id: "favorite-product",
  name: "Royal Cat Adult 1 kg",
  image_url: "https://example.test/food.svg",
  price: 89000,
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("favorite-test")) {
      localStorage.setItem("slivadoc.access_token", "favorite-token");
      localStorage.setItem("slivadoc.refresh_token", "favorite-refresh");
      localStorage.setItem(
        "slivadoc.access_expires_at",
        String(Date.now() + 3600000),
      );
      sessionStorage.setItem("favorite-test", "1");
    }
  });
  await page.route("https://example.test/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350"><rect width="600" height="350" fill="#c8eefa"/><circle cx="300" cy="175" r="80" fill="#a6dcec"/></svg>',
    }),
  );
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const reply = (json: unknown) => route.fulfill({ json });
    if (path === "/api/v1/auth/me")
      return reply({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap")
      return reply({
        ...petOwnerBootstrap({ withPet: true }),
        favorites: [
          { entity_id: service.id, entity_type: "service" },
          { entity_id: product.id, entity_type: "product" },
        ],
      });
    if (path === "/api/v1/petowner/activities") return reply(activityCenter());
    if (path === "/api/v1/petowner/shipping-addresses")
      return reply({ addresses: [] });
    if (path === "/api/v1/public/discovery/services")
      return reply({ data: [service], count: 1 });
    if (path === "/api/v1/public/discovery/products")
      return reply({ data: [product], count: 1 });
    return reply({ data: [], count: 0 });
  });
});
for (const width of [390, 1440])
  test(`favorites have consistent cards and useful filters at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/?view=favorites");
    await expect(page.locator(".favorites-total")).toContainText("2");
    await expect(page.locator(".service-result-card")).toHaveCount(1);
    await expect(page.locator(".product-card")).toHaveCount(1);
    await page
      .locator(".favorite-tabs")
      .getByRole("button", { name: /Produk/ })
      .click();
    await expect(page.locator(".service-result-card")).toHaveCount(0);
    await page
      .locator(".favorite-tabs")
      .getByRole("button", { name: /Semua favorit/ })
      .click();
    await expect(page.locator(".service-result-card")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await page
      .locator(".favorites-page")
      .screenshot({ path: testInfo.outputPath(`favorites-${width}.png`) });
    await page.goto("/?view=home");
    const meta = page.locator(".home-partner-meta");
    await expect(meta).toBeVisible();
    for (const row of await meta.locator("span").all()) {
      expect(
        await row.evaluate((node) => {
          const box = node.getBoundingClientRect(),
            icon = node.querySelector("svg")!.getBoundingClientRect();
          return (
            Math.abs(
              (box.top + box.bottom) / 2 - (icon.top + icon.bottom) / 2,
            ) < 2
          );
        }),
      ).toBe(true);
    }
    await page
      .locator(".home-service-card")
      .screenshot({ path: testInfo.outputPath(`clinic-card-${width}.png`) });
  });
test("Back after logout cannot restore an authenticated profile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=home");
  await page.locator(".side-profile").click();
  await expect(page.locator(".profile-member-card")).toBeVisible();
  await page
    .getByRole("button", {
      name: "Keluar dari akun Akhiri sesi hanya di perangkat ini.",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Ya, keluar", exact: true }).click();
  await expect(page.locator(".side-profile")).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(".profile-member-card")).toHaveCount(0);
  await expect(
    page.locator(".side-login-button").filter({ hasText: "Masuk ke akun" }),
  ).toBeVisible();
});
