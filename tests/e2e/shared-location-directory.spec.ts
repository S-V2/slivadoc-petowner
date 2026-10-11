import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import type { DiscoveryBranch } from "../../app/lib/platform-api";

const initial = { latitude: -6.2, longitude: 106.8, label: "Jakarta Selatan" };
const moved = { latitude: -6.91, longitude: 107.61 };
const interval = 15 * 60 * 1000;
const places: DiscoveryBranch[] = [
  ["Deploy Verification Clinic", "Cabang Utama", ""],
  ["8 Pet Shop Lembang - Retail & Grosir", "8 Pet Shop Lembang - Retail & Grosir", "Jl. Kayu Ambon No.14 - 16, Lembang, Bandung, Jawa Barat 40391"],
  ["@ Petshop", "@ Petshop", "Jl. Prof. drg. Soeria Soemantri No.15A, Sukawarna, Kota Bandung"],
  ["Alita Pet Care", "Alita Pet Care", "Jl. Gatot Subroto No.437, Maleer, Bandung"],
  ["Alvin Kennel Pet Shop", "Alvin Kennel Pet Shop", "Komplek Kopo Permai III Block A - 13 No. 1, Cirangrang, Babakan Ciparay, Bandung, Jawa Barat 40227, Sukamenak, Margahayu"],
].map(([name, branch, address], index) => ({
  branch_id: `55000000-0000-4000-8000-0000000003${index}1`, business_id: null,
  business_name: name, branch_name: branch, type: index === 0 ? "hybrid" : index === 3 ? "petclinic" : "petshop",
  source: "manual", verified: index === 0, can_transact: false,
  logo_url: null, banner_url: index === 4 ? "https://example.test/broken.jpg" : null,
  address, district: "", city: index === 0 ? "" : "Bandung", latitude: -6.91, longitude: 107.61,
  distance_km: null, opening_hours: {}, timezone: "Asia/Jakarta", is_open_now: null,
  rating: index === 0 ? null : 4.8, review_count: index === 0 ? 0 : 124,
  product_count: 0, service_count: 0,
}));

type GeoState = {
  calls: number; point: { latitude: number; longitude: number }; fail: boolean; hold: boolean;
  callbacks: PositionCallback[];
};

async function setup(page: Page, source?: "manual" | "device") {
  const requests: URL[] = [];
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ point, source }) => {
    if (!localStorage.getItem("slivadoc.location")) {
      localStorage.setItem("slivadoc.location", JSON.stringify(point));
      if (source) localStorage.setItem("slivadoc.location_preferences", JSON.stringify({ source, updatedAt: Date.now() }));
    }
    const state: GeoState = { calls: 0, point: { latitude: -6.91, longitude: 107.61 }, fail: false, hold: false, callbacks: [] };
    Object.assign(window, { __slivaGeo: state });
    Object.defineProperty(navigator.geolocation, "getCurrentPosition", { value: (success: PositionCallback, error?: PositionErrorCallback) => {
      state.calls++;
      if (state.hold) { state.callbacks.push(success); return; }
      queueMicrotask(() => {
        if (state.fail) { error?.({ code: 2, message: "Unavailable", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 }); return; }
        success({ coords: { ...state.point, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON() { return {}; } }, timestamp: Date.now(), toJSON() { return {}; } });
      });
    } });
  }, { point: initial, source });
  await page.route("https://example.test/broken.jpg", (route) => route.fulfill({ status: 404 }));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const path = url.pathname;
    if (path === "/api/v1/public/discovery/branches") return route.fulfill({ json: { data: places, count: places.length, has_more: false } });
    if (path === "/api/v1/public/pet-sitters") return route.fulfill({ json: { data: [] } });
    if (path === "/api/v1/public/petship/places") return route.fulfill({ json: { data: [], count: 0, privacy: "Only public venue positions are shared." } });
    if (path === "/api/v1/public/pawdating/profiles") return route.fulfill({ json: { data: [], count: 0, filters: { species: "", breed: "", sex: "", city: "", min_level: 2, min_health_score: 80 } } });
    if (path === "/api/v1/public/pawdating/standards") return route.fulfill({ json: { principles: [], levels: [], minimum_age_months: {}, report_validity_days: 30, blocked_conditions: [] } });
    if (path.startsWith("/api/v1/public/")) return route.fulfill({ json: { data: [], count: 0 } });
    return route.fulfill({ status: 404, json: { code: "not_found", message: "Not found" } });
  });
  return requests;
}

async function geoCalls(page: Page) {
  return page.evaluate(() => (window as unknown as { __slivaGeo: GeoState }).__slivaGeo.calls);
}

async function savedPoint(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("slivadoc.location")!));
}

test("the saved header location follows users between clinic, PetSpot, Petship, PAW Dating, sitters and Home", async ({ page }) => {
  const requests = await setup(page, "manual");
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [view, path] of [
    ["clinics", "/api/v1/public/discovery/branches"],
    ["petspot", "/api/v1/public/petspots"],
    ["petship", "/api/v1/public/petship/places"],
    ["pawdating", "/api/v1/public/pawdating/profiles"],
    ["sitter", "/api/v1/public/pet-sitters"],
    ["home", "/api/v1/public/discovery/branches"],
  ]) {
    requests.length = 0;
    await page.goto(`/?view=${view}`);
    await expect(page.locator(".location-picker")).toContainText(initial.label);
    await expect.poll(() => requests.some((url) => url.pathname === path && url.searchParams.get("latitude") === String(initial.latitude) && url.searchParams.get("longitude") === String(initial.longitude))).toBe(true);
    await expect(page.locator(".clinic-location, .clinic-banner")).toHaveCount(0);
    expect(await geoCalls(page)).toBe(0);
  }
});

test("existing location permission refreshes GPS every fifteen minutes and updates public queries", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await page.clock.install({ time: new Date("2026-10-11T15:00:00Z") });
  const requests = await setup(page, "device");
  await page.goto("/?view=clinics");
  await expect(page.locator(".location-picker")).toContainText(initial.label);
  await page.clock.fastForward(interval - 5_000);
  expect(await geoCalls(page)).toBe(0);
  await page.clock.fastForward(5_000);
  await expect.poll(() => geoCalls(page)).toBe(1);
  await expect(page.locator(".location-picker")).toContainText("Lokasi perangkat");
  await expect.poll(() => requests.some((url) => url.pathname === "/api/v1/public/discovery/branches" && url.searchParams.get("latitude") === String(moved.latitude))).toBe(true);
  expect(await savedPoint(page)).toMatchObject(moved);
  await page.evaluate(() => { (window as unknown as { __slivaGeo: GeoState }).__slivaGeo.point = { latitude: -7.25, longitude: 112.75 }; });
  await page.clock.fastForward(interval);
  await expect.poll(() => geoCalls(page)).toBe(2);
  await expect.poll(async () => (await savedPoint(page)).latitude).toBe(-7.25);
  await page.goto("/?view=petspot");
  await expect.poll(() => requests.some((url) => url.pathname === "/api/v1/public/petspots" && url.searchParams.get("latitude") === "-7.25")).toBe(true);
  expect(await geoCalls(page)).toBe(0); // Reload starts a fresh GPS observer, while the saved selection remains.
});

test("a manual pick stays fixed until the header switches to device location; revoked permission and GPS failures keep the last point", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await page.clock.install({ time: new Date("2026-10-11T15:00:00Z") });
  await setup(page, "manual");
  await page.goto("/?view=clinics");
  await expect(page.locator(".location-picker")).toContainText(initial.label);
  await page.clock.fastForward(interval * 2);
  expect(await geoCalls(page)).toBe(0);
  await page.locator(".location-picker").click();
  await page.getByRole("button", { name: /Gunakan lokasi perangkat/ }).click();
  await expect(page.locator(".location-modal")).toHaveCount(0);
  await expect(page.locator(".location-picker")).toContainText("Lokasi perangkat");
  expect(await geoCalls(page)).toBe(1);
  await page.evaluate(() => { (window as unknown as { __slivaGeo: GeoState }).__slivaGeo.fail = true; });
  await page.clock.fastForward(interval);
  await expect.poll(() => geoCalls(page)).toBe(2);
  expect(await savedPoint(page)).toMatchObject(moved);
  await context.clearPermissions();
  await page.clock.fastForward(interval);
  expect(await geoCalls(page)).toBe(2);
  expect(await savedPoint(page)).toMatchObject(moved);
});

test("automatic refresh never prompts without permission and discards an old GPS result after a newer manual selection", async ({ page, context }) => {
  await page.clock.install({ time: new Date("2026-10-11T15:00:00Z") });
  await setup(page);
  await page.goto("/?view=clinics");
  await expect(page.locator(".location-picker")).toContainText(initial.label);
  await page.clock.fastForward(interval);
  expect(await geoCalls(page)).toBe(0);
  await context.grantPermissions(["geolocation"]);
  await page.evaluate(() => { (window as unknown as { __slivaGeo: GeoState }).__slivaGeo.hold = true; window.dispatchEvent(new Event("focus")); });
  await expect.poll(() => geoCalls(page)).toBe(1);
  await page.evaluate(() => {
    const value = { latitude: -8.65, longitude: 115.22, label: "Denpasar" };
    const preferences = { source: "manual", updatedAt: Date.now() };
    localStorage.setItem("slivadoc.location", JSON.stringify(value));
    localStorage.setItem("slivadoc.location_preferences", JSON.stringify(preferences));
    window.dispatchEvent(new CustomEvent("slivadoc:location-changed", { detail: { value, preferences } }));
    const state = (window as unknown as { __slivaGeo: GeoState }).__slivaGeo;
    state.callbacks[0]({ coords: { ...state.point, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON() { return {}; } }, timestamp: Date.now(), toJSON() { return {}; } });
  });
  await expect(page.locator(".location-picker")).toContainText("Denpasar");
  expect(await savedPoint(page)).toMatchObject({ latitude: -8.65, label: "Denpasar" });
});

test("the default illustration stays visible while a real photo loads, then gives way to that photo", async ({ page }) => {
  await setup(page, "manual");
  let release!: () => void;
  const loading = new Promise<void>((resolve) => { release = resolve; });
  await page.route("https://example.test/broken.jpg", async (route) => {
    await loading;
    await route.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420"><rect width="720" height="420" fill="#38bdf8"/></svg>' });
  });
  await page.goto("/?view=clinics", { waitUntil: "domcontentloaded" });
  const card = page.locator(`[data-branch-id="${places[4].branch_id}"]`);
  await expect(card.locator("img[data-place-fallback]")).toBeVisible();
  release();
  await expect(card.locator("img[data-place-fallback]")).toHaveCount(0);
  await expect(card.locator("img")).toHaveAttribute("src", "https://example.test/broken.jpg");
  await expect(card.locator("img")).toHaveCSS("opacity", "1");
});

for (const width of [2560, 1440, 390]) {
  test(`directory card sections stay aligned and missing or broken photos use Slivadoc artwork at ${width}px`, async ({ page }, testInfo) => {
    await setup(page, "manual");
    await page.setViewportSize({ width, height: 1100 });
    await page.goto("/?view=clinics");
    const cards = page.locator(".clinic-card:not(.clinic-card--skeleton)");
    await expect(cards).toHaveCount(places.length);
    await expect(cards.locator("img[data-place-fallback]")).toHaveCount(places.length);
    await expect.poll(() => cards.locator("img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    const positions = await cards.evaluateAll((elements) => elements.map((card) => {
      const box = card.getBoundingClientRect();
      return { y: box.y, height: box.height, rows: ["h3", ".clinic-directory-verification", ".clinic-card-branch", ".clinic-card-place", ".clinic-open-state", ".clinic-card-rating", ".clinic-card-counts"].map((selector) => card.querySelector(selector)!.getBoundingClientRect().y - box.y) };
    }));
    for (const card of positions) {
      const peer = positions.find((candidate) => Math.abs(candidate.y - card.y) < 1)!;
      expect(Math.abs(card.height - peer.height)).toBeLessThan(1);
      card.rows.forEach((position, index) => expect(Math.abs(position - peer.rows[index])).toBeLessThan(1));
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: process.env.LOCATION_ARTIFACTS ? `${process.env.LOCATION_ARTIFACTS}/directory-${width}.png` : testInfo.outputPath(`directory-${width}.png`), fullPage: true, animations: "disabled" });
  });
}
