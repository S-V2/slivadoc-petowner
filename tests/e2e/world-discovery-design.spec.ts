import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { marketplaceProduct } from "./mock-data";

const first = "https://example.test/world-first.svg", second = "https://example.test/world-second.svg";
const venue = {
  id: "92000000-0000-4000-8000-000000000098", name: "Cafe World Test", category: "cafe", description: "Tempat ramah pet.",
  address: "Jalan Pet 1", city: "Jakarta Selatan", latitude: -6.27, longitude: 106.81, phone: "", website_url: "",
  cover_url: first, pet_facilities: ["indoor", "pet_menu", "water_bowl", "parking"], facility_details: [],
  supported_events: [], opening_hours: {}, rating: 4.9, review_count: 12, verified: true, reservable: false,
  deposit_type: "fixed", deposit_value: 0, reservation_policy: {}, distance_km: null,
};
const product = marketplaceProduct({ id: "52000000-0000-4000-8000-000000000098", name: "World Test Food", image_url: first });
async function mocks(page: Page) {
  await page.route("https://example.test/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#dff3ff"/></svg>' }));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/v1/public/petspots") return json({ data: [venue], count: 1 });
    if (path === `/api/v1/public/petspots/${venue.id}`) return json({ ...venue, image_urls: [first, second], resources: [], reviews: [] });
    if (path === "/api/v1/public/discovery/products") return json({ data: [product], count: 1 });
    if (path === `/api/v1/public/products/${product.id}/reviews`) return json({ data: [], count: 0, rating: 0 });
    if (path === "/api/v1/public/petship/places") return json({ data: [], count: 0, privacy: "Lokasi tempat tanpa koordinat pengguna." });
    if (path === "/api/v1/public/pawdating/standards") return json({ principles: [], levels: [], minimum_age_months: {}, report_validity_days: 180, blocked_conditions: [] });
    if (path === "/api/v1/public/pawdating/profiles") return json({ data: [], count: 0, filters: { species: "", breed: "", sex: "", city: "", min_level: 2, min_health_score: 80 } });
    return json({ data: [], count: 0 });
  });
}

for (const width of [320, 768, 1440]) {
  test(`World tabs and venue search share one responsive panel at ${width}px`, async ({ page }, testInfo) => {
    await mocks(page); await page.setViewportSize({ width, height: 900 }); await page.goto("/?view=petspot");
    const explorer = page.locator(".world-explorer");
    await expect(explorer.getByRole("heading", { name: "Sliva World" })).toBeVisible();
    await expect(explorer.getByPlaceholder("Cari cafe, kosan, apartemen, mall…")).toBeVisible();
    await expect(page.getByRole("button", { name: "Unduh ringkasan" })).toHaveCount(0);
    await expect(page.locator(".heading-kicker, .petspot-head")).toHaveCount(0);
    for (const tab of await explorer.locator("nav button").all()) { await tab.scrollIntoViewIfNeeded(); await expect(tab).toBeInViewport(); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const location = page.locator(".petspot-card-location");
    const icon = await location.locator("svg").boundingBox(), label = await location.locator("span").boundingBox();
    expect(label!.x).toBeGreaterThan(icon!.x + icon!.width);
    expect(Math.abs(label!.y - icon!.y)).toBeLessThan(5);
    await explorer.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`world-${width}.png`), fullPage: true });
  });
}

test("venue list photos stay on the first image while readable amenities rotate and detail retains a gallery", async ({ page }) => {
  await mocks(page); await page.goto("/?view=petspot");
  const card = page.locator(".petspot-card"), image = card.locator("img");
  await expect(image).toHaveAttribute("src", first);
  await expect(card.locator(".world-image-controls, .world-image-count")).toHaveCount(0);
  await expect(card.locator(".facility-ticker-more")).toHaveText("3+");
  await expect(card.locator(".facility-ticker")).toHaveAttribute("aria-label", "Fasilitas: Indoor, Pet menu, Mangkuk minum, Parkir");
  const label = card.locator(".facility-ticker-chip");
  await label.scrollIntoViewIfNeeded();
  await expect.poll(() => label.textContent()).not.toBe("Indoor");
  await expect(image).toHaveAttribute("src", first);
  await expect(card).not.toContainText("pet_menu");
  await card.getByRole("button", { name: `Lihat detail ${venue.name}`, exact: true }).click();
  const detail = page.locator(".petspot-experience-modal");
  await expect(detail.locator(".world-image-controls")).toBeVisible();
  await expect(detail).not.toContainText("pet_menu");
});

test("reduced motion keeps amenity text steady and product list photos stay static", async ({ page }) => {
  await mocks(page); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto("/?view=petspot");
  await expect(page.locator(".facility-ticker-chip")).toHaveText("Indoor");
  await page.waitForTimeout(2_200);
  await expect(page.locator(".facility-ticker-chip")).toHaveText("Indoor");
  await page.goto("/?view=shop");
  const image = page.locator(".market-card-picture img").first();
  await expect(image).toHaveAttribute("src", first);
  await page.waitForTimeout(2_200);
  await expect(image).toHaveAttribute("src", first);
  await expect(page.locator(".market-card-picture .market-gallery-count")).toHaveCount(0);
});
