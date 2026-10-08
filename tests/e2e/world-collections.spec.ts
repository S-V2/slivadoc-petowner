import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { paymentMethods } from "./mock-data";
import { collectionSamples } from "./world-collection-data";

const surfaces = [
  ["academy", ".academy-grid", ".academy-card"], ["events", ".event-grid", ".event-card"],
  ["petspot", ".petspot-grid", ".petspot-card"], ["consult", ".doctor-grid", ".doctor-card"],
  ["adoption", ".adoption-grid", ".adoption-card"], ["documents", ".document-product-grid", ".document-product-card"],
] as const;

async function catalog(page: Page) {
  await page.route("https://example.test/**", route => route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="440"><rect width="640" height="440" fill="#DFF3FF"/></svg>' }));
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    const answer = (body: unknown) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/v1/payment-methods") return answer(paymentMethods());
    const key = path.replace("/api/v1/public/", "") as keyof typeof collectionSamples;
    const sample = collectionSamples[key];
    if (sample) return answer({ data: Array.from({ length: 8 }, (_, index) => ({ ...sample, id: `9a000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` })), count: 8 });
    if (path === "/api/v1/public/pawdating/standards") return answer({ principles: [], levels: [], minimum_age_months: {}, report_validity_days: 180, blocked_conditions: [] });
    if (path === "/api/v1/public/pawdating/profiles") return answer({ data: [], count: 0, filters: { species: "", breed: "", sex: "", city: "", min_level: 2, min_health_score: 80 } });
    if (path === "/api/v1/public/petship/places") return answer({ data: [], count: 0, privacy: "Lokasi tempat, tanpa koordinat pengguna." });
    return answer({ data: [], count: 0 });
  });
}

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`World collections fit compact multi-column cards at ${width}px`, async ({ page }) => {
    await catalog(page); await page.setViewportSize({ width, height: 900 });
    for (const [mode, gridSelector, cardSelector] of surfaces) {
      await page.goto(`/?view=${mode}`);
      const grid = page.locator(gridSelector).first(), cards = grid.locator(cardSelector);
      await expect(cards).toHaveCount(8);
      const columns = await grid.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
      expect(columns).toBeGreaterThanOrEqual(2);
      if (width <= 390) expect(columns).toBe(2);
      if (width >= 1440 && mode !== "petspot") expect(columns).toBeGreaterThanOrEqual(4);
      if (mode === "petspot") expect(columns).toBeLessThanOrEqual(3);
      const first = await cards.nth(0).boundingBox(), second = await cards.nth(1).boundingBox();
      expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
      expect(second!.x).toBeGreaterThan(first!.x + first!.width);
      expect(first!.height, `${mode} card at ${width}px`).toBeLessThan(width <= 390 ? 440 : 500);
      const title = cards.first().locator("h3");
      const height = await title.evaluate(node => ({ height: node.getBoundingClientRect().height, line: Number.parseFloat(getComputedStyle(node).lineHeight) }));
      expect(height.height).toBeLessThanOrEqual(height.line * 2 + 1);
      if (mode === "adoption") {
        // A legacy promotional card used white copy and outer padding. Keep
        // pet metadata readable on these white collection cards instead.
        const contrast = await cards.first().locator("p").evaluate(node => {
          const channels = getComputedStyle(node).color.match(/[\d.]+/g)!.slice(0, 3).map(value => {
            const c = Number(value) / 255;
            return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
          });
          return 1.05 / (.2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2] + .05);
        });
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  });
}

test("compact document cards keep the complete checklist in detail", async ({ page }) => {
  await catalog(page); await page.setViewportSize({ width: 320, height: 700 }); await page.goto("/?view=documents");
  const card = page.locator(".document-product-card").first();
  await expect(card.locator(".world-document-requirements")).toContainText("persyaratan");
  await card.getByRole("button", { name: "Lihat & ajukan" }).click();
  const detail = page.locator(".document-modal");
  await expect(detail).toBeVisible();
  for (const requirement of collectionSamples["pet-documents"].requirements) await expect(detail).toContainText(requirement);
});

test("an unavailable provider photo falls back to an avatar and its package remains reachable", async ({ page }) => {
  await catalog(page);
  await page.route("https://example.test/**", route => route.fulfill({ status: 404, body: "Unavailable test image" }));
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/?view=consult");
  const card = page.locator(".doctor-card").first();
  await expect(card.locator(".world-photo-fallback")).toHaveText("P");
  await card.getByRole("button", { name: "Lihat paket" }).click();
  await expect(page.locator(".care-modal")).toContainText(collectionSamples.veterinarians.bio);
});

for (const mode of ["consult", "adoption", "documents"] as const) {
  test(`${mode} distinguishes pending data, failure, retry and an empty catalog`, async ({ page }) => {
    await catalog(page);
    let failing = true, release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const endpoints = mode === "consult" ? ["veterinarians", "trainers"] : mode === "adoption" ? ["adoptions"] : ["pet-documents"];
    for (const endpoint of endpoints) await page.route(`**/api/v1/public/${endpoint}`, async route => {
      await pending;
      return route.fulfill({ status: failing ? 503 : 200, contentType: "application/json", body: JSON.stringify(failing ? { error: "service_unavailable", message: "Unavailable test catalog" } : { data: [], count: 0 }) });
    });
    await page.setViewportSize({ width: 320, height: 700 }); await page.goto(`/?view=${mode}`);
    await expect(page.locator(".world-catalog-status")).toContainText("Memuat informasi terbaru…");
    release();
    await expect(page.locator(".world-catalog-status")).toContainText("Informasi belum dapat dimuat");
    failing = false;
    await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
    await expect(page.locator(mode === "consult" ? ".consult-filter-empty" : ".world-catalog-status")).toContainText(mode === "consult" ? "Provider belum ditemukan" : mode === "adoption" ? "Belum ada pet yang cocok" : "Belum ada dokumen tersedia");
  });
}
