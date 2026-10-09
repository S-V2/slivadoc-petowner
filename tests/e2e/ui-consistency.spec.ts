import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { activityCenter, marketplaceProduct, petOwner, petOwnerBootstrap } from "./mock-data";

async function catalogueMocks(page: Page, options: { authenticated?: boolean; endpoint?: string; block?: Promise<void>; fail?: () => boolean } = {}) {
  if (options.authenticated) await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "ui-audit-token");
    localStorage.setItem("slivadoc.refresh_token", "ui-audit-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === options.endpoint) {
      await options.block;
      if (options.fail?.()) return json({ error: "service_unavailable", message: "Temporarily unavailable" }, 503);
    }
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap({ withPet: true }));
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/public/discovery/products") return json({ data: [marketplaceProduct({ id: "52000000-0000-4000-8000-000000000908", name: "UI Audit Food" })], count: 1 });
    if (path === "/api/v1/public/petship/places") return json({ data: [], count: 0, privacy: "Petship hanya membagikan lokasi tempat, bukan koordinat pengguna." });
    if (path === "/api/v1/public/pawdating/standards") return json({ principles: [], levels: [], minimum_age_months: {}, report_validity_days: 180, blocked_conditions: [] });
    if (path === "/api/v1/public/pawdating/profiles") return json({ data: [], count: 0, filters: { species: "", breed: "", sex: "", city: "", min_level: 2, min_health_score: 80 } });
    if (path === "/api/v1/public/discovery/branches") return json({ data: [], count: 0, has_more: false });
    if (path.startsWith("/api/v1/public/") || path === "/api/v1/petowner/marketplace/chats") return json({ data: [], count: 0 });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
}

for (const viewport of [{ width: 320, height: 700 }, { width: 812, height: 375 }]) {
  test(`More keeps keyboard focus and every feature reachable at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await catalogueMocks(page);
    await page.setViewportSize(viewport);
    await page.goto("/?view=profile");
    const trigger = page.getByRole("button", { name: "Lainnya", exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Semua fitur Slivadoc", exact: true });
    const buttons = dialog.getByRole("button");
    const labelSizes = await dialog.locator(".mobile-more-grid b").evaluateAll((labels) => labels.map((label) => parseFloat(getComputedStyle(label).fontSize)));
    expect(labelSizes.length).toBeGreaterThan(0);
    expect(Math.min(...labelSizes)).toBeGreaterThanOrEqual(13);
    expect(await dialog.locator("header span").evaluate((label) => parseFloat(getComputedStyle(label).fontSize))).toBeGreaterThanOrEqual(10);
    await expect(buttons.first()).toBeFocused();
    await buttons.first().press("Shift+Tab");
    await expect(buttons.last()).toBeFocused();
    await buttons.last().press("Tab");
    await expect(buttons.first()).toBeFocused();
    for (const button of await buttons.all()) {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeInViewport();
      const bounds = await button.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    await buttons.last().press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

const catalogues = [
  { mode: "academy", endpoint: "/api/v1/public/academy/programs", empty: "Belum ada program pada kategori ini" },
  { mode: "events", endpoint: "/api/v1/public/events", empty: "Belum ada event mendatang" },
  { mode: "petspot", endpoint: "/api/v1/public/petspots", empty: "Tempat belum ditemukan" },
  { mode: "pethub", endpoint: "/api/v1/public/pethub/feed", empty: "Feed ini masih kosong" },
];
for (const catalogue of catalogues) {
  test(`${catalogue.mode} distinguishes loading, outage, retry and empty content`, async ({ page }) => {
    let fail = true;
    let release!: () => void;
    const block = new Promise<void>((resolve) => { release = resolve; });
    await catalogueMocks(page, { endpoint: catalogue.endpoint, block, fail: () => fail });
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(`/?view=world&world_mode=${catalogue.mode}`);
    await expect(page.locator(".world-catalog-status")).toContainText("Memuat informasi terbaru…");
    release();
    await expect(page.locator(".world-catalog-status")).toContainText("Informasi belum dapat dimuat");
    await expect(page.getByText(catalogue.empty, { exact: true })).toBeHidden();
    fail = false;
    await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
    await expect(page.getByRole("heading", { name: catalogue.empty, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Coba lagi", exact: true })).toBeHidden();
  });
}

test("event empty and error feedback is available in English without a translation server", async ({ page }) => {
  let fail = true;
  await page.addInitScript(() => localStorage.setItem("slivadoc.petowner.language", "en"));
  await catalogueMocks(page, { endpoint: "/api/v1/public/events", fail: () => fail });
  await page.goto("/?view=world&world_mode=events");
  await expect(page.getByRole("heading", { name: "Unable to load information", exact: true })).toBeVisible();
  fail = false;
  await page.locator(".world-catalog-status").getByRole("button").click();
  await expect(page.getByRole("heading", { name: "No upcoming events yet", exact: true })).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test(`primary and World surfaces keep header controls inside the screen at ${viewport.width}px`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await catalogueMocks(page, { authenticated: true });
    await page.setViewportSize(viewport);
    for (const view of ["home", "shop", "discover", "community", "bookings", "health", "profile", "academy", "events", "petspot", "pethub", "consult", "adoption", "documents", "pawdating"]) {
      await page.goto(`/?view=${view}`);
      await expect(page.locator(".app-shell")).toBeVisible();
      await expect(page.locator(".marketplace-loading")).toHaveCount(0);
      if (view === "shop") await expect(page.getByText("UI Audit Food", { exact: true })).toBeVisible();
      if (view === "home") {
        await expect(page.locator(".home-doctor-empty")).toContainText("Belum ada dokter yang tersedia.");
        const empty = await page.locator(".home-doctor-empty").boundingBox();
        expect(empty!.height).toBeLessThanOrEqual(150);
        expect(empty!.width).toBeGreaterThan(250);
      }
      // Header controls must fit individually; overflow:hidden on the page can conceal a clipped button.
      const clipped = await page.locator(".topbar button, .owner-mobile-header button, .mobile-nav button").evaluateAll((elements) => elements.flatMap((element) => {
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return [];
        return bounds.left < -1 || bounds.right > window.innerWidth + 1 ? [element.textContent || element.getAttribute("aria-label")] : [];
      }));
      expect(clipped, view).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), view).toBeLessThanOrEqual(1);
      if (["home", "shop", "community", "profile", "events"].includes(view)) {
        await page.screenshot({ path: testInfo.outputPath(`${view}-${viewport.width}.png`), fullPage: true });
      }
    }
  });
}
