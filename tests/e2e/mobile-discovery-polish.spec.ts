import { test, expect } from "./fixtures";
import { collectionSamples } from "./world-collection-data";
import { paymentMethods } from "./mock-data";
import type { Page } from "@playwright/test";
async function catalog(page: Page) {
  await page.route("**/api/v1/**", route => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = { data: [], count: 0 };
    if (path.endsWith("/payment-methods")) body = paymentMethods();
    if (path === "/api/v1/public/events") body = { data: [
      { ...collectionSamples.events, id: "9a000000-0000-4000-8000-000000000001", title: "Paw Festival", city: "Bogor", category: "festival" },
      { ...collectionSamples.events, id: "9a000000-0000-4000-8000-000000000002", title: "Paw Workshop", city: "Bandung", category: "workshop" },
    ], count: 2 };
    if (path.endsWith("/pawdating/standards")) body = { principles: [], levels: [], minimum_age_months: {}, report_validity_days: 180, blocked_conditions: [] };
    if (path.endsWith("/pawdating/profiles")) body = { data: [], count: 0, filters: { species: "", breed: "", sex: "", city: "", min_level: 2, min_health_score: 80 } };
    if (path.endsWith("/petship/places")) body = { data: [], count: 0, privacy: "Lokasi tempat, tanpa koordinat pengguna." };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
}
for (const width of [320, 390]) test(`World selection stays at the left edge at ${width}px, including the last tab`, async ({ page }) => {
  await catalog(page); await page.setViewportSize({ width, height: 900 }); await page.goto("/?view=documents");
  const nav = page.locator(".petowner-world-nav");
  for (const name of ["PAW Dating", "Konsultasi", "PetSpot", "Pet Event"]) {
    const button = nav.getByRole("button", { name, exact: true });
    await button.click(); await expect(button).toHaveAttribute("aria-current", "page");
    await expect.poll(async () => button.evaluate(node => node.getBoundingClientRect().left - node.parentElement!.getBoundingClientRect().left)).toBeLessThan(10);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  }
});
test("World tabs reset when expanding to desktop and restore the selected tab on mobile", async ({ page }) => {
  await catalog(page); await page.setViewportSize({ width: 320, height: 900 }); await page.goto("/?view=documents");
  const nav = page.locator(".petowner-world-nav");
  const selected = nav.getByRole("button", { name: "PAW Dating", exact: true });
  await selected.click();
  await expect.poll(() => nav.evaluate(node => node.scrollLeft)).toBeGreaterThan(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(() => nav.evaluate(node => node.scrollLeft)).toBe(0);
  await expect(nav.getByRole("button", { name: "Pet Academy", exact: true })).toBeInViewport({ ratio: 1 });
  await expect(selected).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 390, height: 900 });
  await expect.poll(() => selected.evaluate(node => node.getBoundingClientRect().left - node.parentElement!.getBoundingClientRect().left)).toBeLessThan(10);
  await expect(selected).toBeInViewport({ ratio: 1 });
});
test("Event search and categories filter the catalog and recover from no matches", async ({ page }) => {
  await catalog(page); await page.setViewportSize({ width: 390, height: 900 }); await page.goto("/?view=events");
  await expect(page.locator(".event-card")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Cari event atau kota" }).fill("Bandung");
  await expect(page.locator(".event-card")).toHaveCount(1);
  await expect(page.locator(".event-card")).toContainText("Paw Workshop");
  await page.getByRole("tab", { name: "Festival", exact: true }).click();
  await expect(page.locator(".world-catalog-status")).toContainText("Belum ada event yang cocok");
  await page.getByRole("button", { name: "Hapus pencarian event" }).click();
  await expect(page.locator(".event-card")).toContainText("Paw Festival");
});
test("brand logos are non-interactive, animated with pause, and static with reduced motion", async ({ page }) => {
  await catalog(page); await page.setViewportSize({ width: 390, height: 900 }); await page.goto("/?view=shop");
  const section = page.locator(".pet-brand-marquee");
  await expect(section.getByRole("img", { name: "Perro", exact: true })).toBeVisible();
  await expect(section.locator("a")).toHaveCount(0);
  expect(await section.locator(".pet-brand-track").evaluate(node => getComputedStyle(node).animationName)).toBe("pet-brands-drift");
  await section.getByRole("button", { name: "Jeda animasi brand" }).click();
  expect(await section.locator(".pet-brand-track").evaluate(node => getComputedStyle(node).animationPlayState)).toBe("paused");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await section.locator(".pet-brand-track").evaluate(node => getComputedStyle(node).animationName)).toBe("none");
  await expect(section.getByRole("img", { name: "Royal Canin", exact: true })).toBeVisible();
});
test("the brand marquee covers a wide viewport throughout the complete animation loop", async ({ page }) => {
  await catalog(page); await page.setViewportSize({ width: 1920, height: 1000 }); await page.goto("/?view=shop");
  const remaining = await page.locator(".pet-brand-window").evaluate(node => {
    const track = node.querySelector(".pet-brand-track")!, group = node.querySelector(".pet-brand-group")!;
    return track.getBoundingClientRect().width - group.getBoundingClientRect().width - node.clientWidth;
  });
  expect(remaining).toBeGreaterThanOrEqual(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("img", { name: "Kucingku", exact: true })).toBeInViewport({ ratio: 1 });
});
