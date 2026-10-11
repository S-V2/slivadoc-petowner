import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { collectionSamples } from "./world-collection-data";
import type { DiscoveryBranch } from "../../app/lib/platform-api";

const point = { latitude: -6.2, longitude: 106.8, label: "Lokasi perangkat" };
const branches: DiscoveryBranch[] = [
  ["Petshop dekat", "petshop", 0.7], ["Klinik dekat", "petclinic", 1.1],
  ["Hybrid dekat", "hybrid", 2.4], ["Petshop jauh", "petshop", 27],
].map(([name, kind, distance], index) => ({
  branch_id: `55000000-0000-4000-8000-0000000005${index}1`, business_id: null,
  business_name: String(name), branch_name: String(name), type: kind as DiscoveryBranch["type"],
  source: "manual", verified: false, can_transact: false, logo_url: null, banner_url: null,
  address: "Jalan Test", district: "", city: "Jakarta", latitude: -6.21, longitude: 106.8,
  distance_km: Number(distance), opening_hours: {}, timezone: "Asia/Jakarta", is_open_now: true,
  rating: null, review_count: 0, product_count: 0, service_count: 0,
}));
const spots = [
  { ...collectionSamples.petspots, id: "92000000-0000-4000-8000-000000000501", name: "Cafe jauh", category: "cafe", address: "Jalan A", distance_km: 12 },
  { ...collectionSamples.petspots, id: "92000000-0000-4000-8000-000000000502", name: "Cafe dekat", category: "cafe", address: "Jalan Margasatwa", distance_km: 1.2 },
  { ...collectionSamples.petspots, id: "92000000-0000-4000-8000-000000000503", name: "Taman dekat", category: "park", address: "Jalan C", distance_km: 0.6 },
  { ...collectionSamples.petspots, id: "92000000-0000-4000-8000-000000000504", name: "Cafe luar radius", category: "cafe", address: "Jalan D", distance_km: 35 },
];
const serverOnlyPark = { ...spots[2], id: "92000000-0000-4000-8000-000000000505", name: "Taman hasil pencarian server", distance_km: 2 };

async function mocks(page: Page, saved = true) {
  const requests: URL[] = [];
  if (saved) await page.addInitScript((point) => {
    localStorage.setItem("slivadoc.location", JSON.stringify(point));
    localStorage.setItem("slivadoc.location_preferences", JSON.stringify({ source: "manual", updatedAt: Date.now() }));
  }, point);
  await page.route("https://example.test/**", (route) => route.fulfill({ status: 404 }));
  await page.route("**/api/v1/**", (route) => {
    const url = new URL(route.request().url()), path = url.pathname;
    requests.push(url);
    const json = (body: unknown) => route.fulfill({ json: body });
    if (path === "/api/v1/public/discovery/branches") {
      const kind = url.searchParams.get("type"), radius = url.searchParams.get("max_distance_km");
      const search = url.searchParams.get("search")?.toLowerCase();
      const data = branches.filter((branch) => (!kind || branch.type === kind || branch.type === "hybrid")
        && (!radius || branch.distance_km! <= Number(radius)) && (!search || branch.business_name.toLowerCase().includes(search)));
      return json({ data, count: data.length, has_more: false });
    }
    if (path === "/api/v1/public/petspots") {
      const category = url.searchParams.get("category"), radius = url.searchParams.get("max_distance_km");
      const search = url.searchParams.get("search")?.toLowerCase();
      const data = (category === "park" ? [serverOnlyPark] : spots).filter((spot) => (!category || spot.category === category)
        && (!radius || spot.distance_km <= Number(radius)) && (!search || `${spot.name} ${spot.address} ${spot.description}`.toLowerCase().includes(search)));
      return json({ data, count: data.length });
    }
    if (path === "/api/v1/public/petship/places") return json({ data: [], count: 0, privacy: "Only public venue positions are shared." });
    return json({ data: [], count: 0 });
  });
  return requests;
}

for (const width of [1440, 390]) {
  test(`GPS activation automatically loads nearby petshops and preserves distance ordering through filters at ${width}px`, async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation(point);
    const requests = await mocks(page, false);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/?view=clinics");
    await page.locator(".location-picker").click();
    await page.getByRole("button", { name: /Gunakan lokasi perangkat/ }).click();
    await expect(page.locator(".location-modal")).toHaveCount(0);
    await expect.poll(() => requests.some((url) => url.pathname === "/api/v1/public/discovery/branches" && url.searchParams.get("latitude") === "-6.2" && url.searchParams.get("longitude") === "106.8")).toBe(true);
    await page.getByRole("button", { name: "Petshop", exact: true }).click();
    const cards = page.locator(".clinic-card:not(.clinic-card--skeleton)");
    await expect(cards.locator("h3")).toHaveText(["Petshop dekat", "Hybrid dekat", "Petshop jauh"]);
    await page.locator(".clinic-radius .sliva-select-trigger").click();
    await page.getByRole("option", { name: "3 km", exact: true }).click();
    await expect(cards.locator("h3")).toHaveText(["Petshop dekat", "Hybrid dekat"]);
    const query = requests.filter((url) => url.pathname === "/api/v1/public/discovery/branches").at(-1)!;
    expect(query.searchParams.get("type")).toBe("petshop");
    expect(query.searchParams.get("max_distance_km")).toBe("3");
    expect(query.searchParams.get("latitude")).toBe("-6.2");
    await page.getByRole("searchbox", { name: "Cari nama klinik atau petshop" }).fill("hybrid");
    await expect(cards.locator("h3")).toHaveText(["Hybrid dekat"]);
    expect(requests.filter((url) => url.pathname === "/api/v1/public/discovery/branches").at(-1)!.searchParams.get("search")).toBe("hybrid");
  });

  test(`PetSpot sorts nearest first and sends category, radius and address search to the server at ${width}px`, async ({ page }) => {
    const requests = await mocks(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/?view=petspot");
    const cards = page.locator(".petspot-card");
    await expect(cards.locator("h3")).toHaveText(["Taman dekat", "Cafe dekat", "Cafe jauh"]);
    await expect(page.locator(".spot-filter")).toContainText("Urutan terdekat");
    await page.locator(".spot-filter").getByRole("button", { name: /Cafe/ }).click();
    await expect(cards.locator("h3")).toHaveText(["Cafe dekat", "Cafe jauh"]);
    await expect.poll(() => requests.filter((url) => url.pathname === "/api/v1/public/petspots").at(-1)?.searchParams.get("category")).toBe("cafe");
    await page.locator(".petspot-radius .sliva-select-trigger").click();
    await page.getByRole("option", { name: "3 km", exact: true }).click();
    await expect(cards.locator("h3")).toHaveText(["Cafe dekat"]);
    await page.locator(".petspot-query input").fill("margasatwa");
    await expect.poll(() => requests.filter((url) => url.pathname === "/api/v1/public/petspots").at(-1)?.searchParams.get("search")).toBe("margasatwa");
    await expect(cards.locator("h3")).toHaveText(["Cafe dekat"]);
    const query = requests.filter((url) => url.pathname === "/api/v1/public/petspots").at(-1)!;
    expect(query.searchParams.get("max_distance_km")).toBe("3");
    expect(query.searchParams.get("latitude")).toBe("-6.2");
    await page.locator(".petspot-query input").fill("");
    await page.locator(".spot-filter").getByRole("button", { name: /Taman/ }).click();
    await expect(cards.locator("h3")).toHaveText([serverOnlyPark.name]);
  });
}
