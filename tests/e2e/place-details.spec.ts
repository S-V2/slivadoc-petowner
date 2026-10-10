import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { marketplaceProduct } from "./mock-data";
import { collectionSamples } from "./world-collection-data";

const businessID = "59000000-0000-4000-8000-000000000101";
const branchID = "55000000-0000-4000-8000-000000000101";
const name = "Paws & Care — klinik dan kebutuhan sehat untuk keluarga anabul";
const description = "Informasi layanan dan produk partner untuk perawatan harian pet. ".repeat(6);
const spot = { ...collectionSamples.petspots, name: "Ruang pet ramah keluarga dengan area bermain dan cafe", description, resources: [], reviews: [], image_urls: [collectionSamples.petspots.cover_url] };
const branch = {
  branch_id: branchID, business_id: businessID, business_name: name,
  branch_name: "Cabang Kebayoran Baru", type: "petclinic", logo_url: null,
  banner_url: null, address: "Jalan Panglima Polim No. 120, lantai dasar, area pet ramah keluarga",
  district: "Kebayoran Baru", city: "Jakarta Selatan", latitude: -6.24, longitude: 106.8,
  distance_km: 1.5, opening_hours: { mon: { open: "09:00", close: "21:00" }, tue: "09:00-21:00", daily: "09:00-21:00" },
  timezone: "Asia/Jakarta", is_open_now: true, rating: 4.8, review_count: 1, service_count: 4, product_count: 8,
};

async function setup(page: Page, type: "petclinic" | "petshop" = "petclinic", empty = false) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://example.test/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#dff3ff"/></svg>' }));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === `/api/v1/public/discovery/branches/${branchID}`) return json({ ...branch, type });
    if (path === `/api/v1/public/marketplace/stores/${businessID}`) return json({
      store: { id: businessID, name, about: description, city: branch.city, logo_url: "", banner_url: "", joined_at: "2025-01-01T08:00:00Z", is_online: false, last_seen_at: "", product_count: empty ? 0 : 8, category_count: empty ? 0 : 1, rating: 4.8, review_count: 0, sold_count: 20 },
      categories: empty ? [] : [{ name: "Makanan", product_count: 8 }], reviews: [],
    });
    if (path === "/api/v1/public/discovery/products") return json({ data: empty ? [] : Array.from({ length: 8 }, (_, i) => marketplaceProduct({ id: `52000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, name: `Kebutuhan sehat pet ${i + 1}`, business_name: name, image_url: collectionSamples.petspots.cover_url })), count: empty ? 0 : 8 });
    if (path === "/api/v1/public/discovery/services") return json({ data: empty ? [] : Array.from({ length: 4 }, (_, i) => ({ id: `53000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`, branch_id: branchID, business_id: businessID, business_name: name, branch_name: branch.branch_name, name: `Konsultasi dokter dan pemeriksaan kesehatan lengkap ${i + 1}`, category: "Clinic", image_url: "", image_urls: [], duration_minutes: 45, price: 150000, address: branch.address, city: branch.city, rating: 4.8, review_count: 1, description: "Pemeriksaan kesehatan pet.", inclusions: [], supported_species: ["cat", "dog"], cancellation_policy: "", business_license_status: "verified" })), count: empty ? 0 : 4 });
    if (path === "/api/v1/public/petspots") return json({ data: [spot], count: 1 });
    if (path === `/api/v1/public/petspots/${spot.id}`) return json(spot);
    return json({ data: [], count: 0 });
  });
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  for (const selector of [".place-detail-identity", ".place-detail-panel", ".place-visit-card"]) {
    expect(await page.locator(selector).evaluate(el => el.scrollWidth - el.clientWidth), selector).toBeLessThanOrEqual(1);
  }
}

for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`place pages fit long content and retain tabs and visit actions at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    for (const type of ["petclinic", "petshop"] as const) {
      if (type === "petshop") {
        await page.unroute("**/api/v1/**");
        await setup(page, type);
      }
      await page.goto(`/?view=shop&store=${businessID}&branch=${branchID}&store_section=services`);
      await expect(page.locator(".place-detail-identity h1")).toHaveText(name);
      await expect(page.locator(".clinic-branch-info h2")).toHaveText(branch.branch_name);
      await expect(page.locator(".market-store-service-card")).toHaveCount(4);
      await noOverflow(page);
      await page.getByRole("tab", { name: "Produk", exact: true }).click();
      await expect(page.locator(".market-product-card")).toHaveCount(8);
      await noOverflow(page);
      await page.getByRole("tab", { name: "Produk", exact: true }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("tab", { name: "Layanan", exact: true })).toHaveAttribute("aria-selected", "true");
      await page.getByRole("tab", { name: "Tentang toko" }).click();
      await expect(page.locator(".market-store-about")).toContainText(description.trim());
      await page.locator(".place-visit-card").scrollIntoViewIfNeeded();
      await expect(page.locator(".place-visit-card").getByRole("link", { name: "Petunjuk arah" })).toHaveAttribute("href", /destination=-6.24,106.8/);
      await expect(page.locator(".place-visit-hours")).toContainText("09:00-21:00");
      await noOverflow(page);
      await expect(page.locator(".topbar")).toHaveCSS("position", "fixed");
      expect((await page.locator(".topbar").boundingBox())!.y).toBeLessThanOrEqual(16);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`${type}-${width}.png`) });
    }
    await page.goto(`/?view=world&world_mode=petspot&world_item=${spot.id}`);
    await expect(page.locator(".place-detail-identity h1")).toHaveText(spot.name);
    await page.getByRole("tab", { name: "Fasilitas", exact: true }).click();
    await expect(page.locator(".petspot-facility-grid article")).toHaveCount(5);
    await noOverflow(page);
    await page.locator(".place-detail-actions").getByRole("button", { name: "Reservasi tempat" }).click();
    await expect(page.getByRole("tab", { name: "Reservasi", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#petspot-detail-panel").getByText("Tanggal kunjungan", { exact: true })).toBeVisible();
    await noOverflow(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`petspot-${width}.png`) });
  });
}

test("empty catalogs and English visit details remain useful", async ({ page }) => {
  await setup(page, "petshop", true);
  await page.addInitScript(() => localStorage.setItem("slivadoc.petowner.language", "en"));
  await page.goto(`/?view=shop&store=${businessID}&branch=${branchID}`);
  await expect(page.locator(".place-detail-identity h1")).toHaveText(name);
  await expect(page.getByText("No products match this selection yet")).toBeVisible();
  await page.getByRole("tab", { name: "Category", exact: true }).click();
  await expect(page.getByText("No product categories yet")).toBeVisible();
  await expect(page.locator(".place-visit-card")).toContainText("Monday");
  await page.getByRole("tab", { name: "Services", exact: true }).click();
  await expect(page.locator(".market-store-services .market-review-empty")).toBeVisible();
});
