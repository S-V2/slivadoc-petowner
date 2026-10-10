import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { activityCenter, marketplaceProduct, petOwner, petOwnerBootstrap } from "./mock-data";
import { collectionSamples } from "./world-collection-data";

const viewports = [
  { width: 320, height: 700 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const views = [
  "home", "pets", "discover", "clinics", "sitter", "shop", "community", "world",
  "academy", "events", "petspot", "pethub", "consult", "adoption", "documents",
  "pawdating", "petship", "fundraising", "bookings", "health", "favorites",
  "notifications", "messages", "support", "profile",
];
const publicPaths = [
  "/career", "/career/pet-sitter", "/pet-sitter", "/services",
  "/services/dokter-hewan-online", "/shop", "/places", "/guides", "/cities",
  "/regions", "/partners", "/about", "/help", "/terms", "/privacy",
  "/delete-account", "/for/pet-owner", "/free", "/en", "/audit-missing-page",
];
const branch = {
  branch_id: "55000000-0000-4000-8000-000000000001",
  business_id: "59000000-0000-4000-8000-000000000001",
  business_name: "Klinik Hewan Paws & Care",
  branch_name: "Paws & Care Jakarta Selatan",
  type: "hybrid",
  logo_url: null,
  banner_url: "https://example.test/layout-card.svg",
  address: "Jalan Pet Parent No. 1",
  district: "Kebayoran Baru",
  city: "Jakarta Selatan",
  latitude: -6.2,
  longitude: 106.8,
  distance_km: 1.2,
  opening_hours: { daily: "08:00-21:00" },
  timezone: "Asia/Jakarta",
  is_open_now: true,
  rating: 4.6,
  review_count: 12,
  service_count: 4,
  product_count: 8,
};

async function signedInCatalog(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "layout-audit-token");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
    localStorage.setItem("slivadoc.location", JSON.stringify({ latitude: -6.2, longitude: 106.8, label: "DKI Jakarta, Indonesia" }));
  });
  await page.route("https://example.test/**", route => route.fulfill({
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#dff3ff"/></svg>',
  }));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap({ withPet: true }));
    if (path === "/api/v1/petowner/shipping-addresses") return json({ addresses: [] });
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/public/discovery/branches") return json({
      data: [branch, { ...branch, branch_id: "55000000-0000-4000-8000-000000000002", business_name: "PawMart", branch_name: "PawMart Kemang", type: "petshop", banner_url: null, is_open_now: null }],
      count: 2,
      has_more: false,
    });
    if (path === "/api/v1/public/discovery/products") return json({ data: [marketplaceProduct({ id: "52000000-0000-4000-8000-000000000001", name: "Makanan anabul untuk perawatan harian" })], count: 1 });
    const sample = collectionSamples[path.replace("/api/v1/public/", "") as keyof typeof collectionSamples];
    if (sample) return json({ data: [sample], count: 1 });
    if (path.endsWith("/pawdating/standards")) return json({ principles: [], levels: [], minimum_age_months: {}, report_validity_days: 180, blocked_conditions: [] });
    if (path.endsWith("/pawdating/profiles")) return json({ data: [], count: 0, filters: { species: "", breed: "", sex: "", city: "", min_level: 2, min_health_score: 80 } });
    if (path.endsWith("/petship/places")) return json({ data: [], count: 0, privacy: "Lokasi tempat, tanpa koordinat pengguna." });
    if (path.startsWith("/api/v1/public/careers")) return route.continue();
    return json({ data: [], count: 0 });
  });
}

for (const viewport of viewports) {
  test(`all signed-in app views fit and keep their header through the footer at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await signedInCatalog(page);
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const view of views) {
      await page.goto(`/?view=${view}`);
      await expect(page.locator(".app-shell"), view).toBeVisible();
      await expect(page.locator(".marketplace-loading"), view).toHaveCount(0);
      const header = page.locator(".topbar");
      await expect(header).toHaveCSS("position", "fixed");
      const clipped = await header.locator("button").evaluateAll(nodes => nodes.flatMap(node => {
        const box = node.getBoundingClientRect();
        if (!box.width || !box.height) return [];
        return box.left < -1 || box.right > innerWidth + 1 ? [node.getAttribute("aria-label") || node.textContent] : [];
      }));
      expect(clipped, view).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), view).toBeLessThanOrEqual(1);
      if (viewport.width > 860) {
        const sidebar = (await page.locator(".sidebar").boundingBox())!;
        expect((await header.boundingBox())!.x, view).toBeGreaterThanOrEqual(sidebar.x + sidebar.width + 8);
        await expect(header.locator(".mobile-brand")).toBeHidden();
      } else {
        await expect(header.locator(".mobile-brand")).toBeVisible();
      }
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      expect((await header.boundingBox())!.y, view).toBe(viewport.width > 860 ? 12 : 0);
    }
    expect(errors).toEqual([]);
  });

  test(`public pages keep navigation available at ${viewport.width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await signedInCatalog(page);
    await page.setViewportSize(viewport);
    for (const path of publicPaths) {
      await page.goto(path);
      const header = page.locator(".seo-header, .career-header").filter({ visible: true });
      await expect(header, path).toBeVisible();
      await expect(header.locator(".brand-mark"), path).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), path).toBeLessThanOrEqual(1);
      await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
      expect((await header.boundingBox())!.y, path).toBe(0);
    }
  });
}

for (const width of [390, 768, 1024, 1440]) {
  test(`home recommendations and account sections have usable spacing at ${width}px`, async ({ page }) => {
    await signedInCatalog(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=home");
    const cards = page.locator(".clinic-home-card");
    await expect(cards).toHaveCount(2);
    const first = (await cards.first().boundingBox())!;
    const second = (await cards.nth(1).boundingBox())!;
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(first.height - second.height)).toBeLessThanOrEqual(1);
    await expect(cards.first()).toContainText("Lihat detail");
    const spots = page.locator(".home-petspots");
    await expect(spots.locator(".home-petspot-card")).toHaveCount(1);
    const heading = (await spots.locator("header").boundingBox())!;
    const grid = (await spots.locator(".home-petspot-grid").boundingBox())!;
    expect(grid.y - heading.y - heading.height).toBeGreaterThanOrEqual(16);
    expect(heading.y).toBeGreaterThan(first.y + first.height);
    if (width <= 1180) {
      const quick = (await page.locator(".home-quick-panel").boundingBox())!;
      expect(quick.width).toBeGreaterThanOrEqual(width > 860 ? 600 : width - 60);
    }
    await page.goto("/?view=profile");
    const password = (await page.locator(".profile-password-panel").boundingBox())!;
    const settings = (await page.locator(".profile-native-settings").boundingBox())!;
    const member = (await page.locator(".profile-member-card").boundingBox())!;
    expect(password.y).toBeGreaterThan(settings.y + settings.height);
    expect(password.y).toBeGreaterThan(member.y + member.height);
    expect(password.width).toBeGreaterThanOrEqual((await page.locator(".profile-workspace").boundingBox())!.width - 1);
    if (width > 860 && width <= 1180) {
      expect((await page.locator(".global-search").boundingBox())!.width).toBeGreaterThanOrEqual(180);
    }
  });
}

test("tablet clinic cards use two columns with aligned search controls", async ({ page }) => {
  await signedInCatalog(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/?view=clinics");
  const cards = page.locator(".clinic-card:not(.clinic-card--skeleton)");
  await expect(cards).toHaveCount(2);
  const first = (await cards.first().boundingBox())!;
  const second = (await cards.nth(1).boundingBox())!;
  expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(1);
  expect(second.x - first.x - first.width).toBeGreaterThanOrEqual(12);
  const search = (await page.locator(".clinic-search").boundingBox())!;
  const radius = (await page.locator(".clinic-radius").boundingBox())!;
  expect(Math.abs(search.y - radius.y)).toBeLessThanOrEqual(1);
  expect(radius.x).toBeGreaterThan(search.x + search.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
