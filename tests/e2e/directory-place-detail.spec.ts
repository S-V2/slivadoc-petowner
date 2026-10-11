import { expect, test } from "./fixtures";
import type { DiscoveryBranch } from "../../app/lib/platform-api";

const basePlace: DiscoveryBranch = {
  branch_id: "55000000-0000-4000-8000-000000000901",
  place_id: "55000000-0000-4000-8000-000000000901",
  business_id: null, business_name: "Andara Vet", branch_name: "Andara Vet",
  type: "petclinic", source: "manual", verified: false, can_transact: false,
  logo_url: null, banner_url: null, address: "Jl. Margasatwa 51",
  district: "Cilandak", city: "Jakarta Selatan", latitude: -6.31, longitude: 106.8,
  distance_km: null, opening_hours: { mon: "09:00-18:00" }, timezone: "Asia/Jakarta",
  is_open_now: null, rating: 4.9, review_count: 633, product_count: 0, service_count: 0,
  phone: "0817-0791-919", website: "https://example.com", description: "Tempat perawatan dan kebutuhan pet di Cilandak.",
};

for (const width of [1440, 390]) {
  for (const scenario of ["manual-petclinic", "manual-petshop", "registered-without-pin"] as const) {
    test(`${scenario} uses the shared storefront and working Google Maps directions at ${width}px`, async ({ page, context }) => {
      await page.setViewportSize({ width, height: 1000 });
      const place: DiscoveryBranch = scenario === "manual-petshop"
        ? { ...basePlace, business_name: "Cilandak Petshop", branch_name: "Cilandak Petshop", type: "petshop" }
        : scenario === "registered-without-pin"
          ? { ...basePlace, source: "registered", business_id: "59000000-0000-4000-8000-000000000901", latitude: null, longitude: null, type: "hybrid" }
          : basePlace;
      const calls: string[] = [];
      await page.route("**/api/v1/**", async (route) => {
        const path = new URL(route.request().url()).pathname;
        calls.push(path);
        const json = (body: unknown) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
        if (path === "/api/v1/public/discovery/branches") return json({ data: [place], count: 1, has_more: false });
        if (path === `/api/v1/public/discovery/branches/${place.branch_id}`) return json(place);
        if (path === "/api/v1/public/discovery/products" || path === "/api/v1/public/discovery/services" || path === "/api/v1/public/campaigns" || path === "/api/v1/public/veterinarians") return json({ data: [], count: 0 });
        return route.fulfill({ status: 404, body: "Unmocked API route" });
      });
      await context.route("https://www.google.com/maps/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "Google Maps destination verified" }));
      await page.goto("/?view=clinics", { waitUntil: "domcontentloaded" });
      const card = page.locator(`[data-branch-id="${place.branch_id}"]`);
      await expect(card).toBeVisible();
      await card.getByRole("button").click();
      await expect(page).toHaveURL(new RegExp(`/clinics/${place.branch_id}`));
      await expect(page.locator(".market-store-hero").getByRole("heading", { name: place.business_name })).toBeVisible();
      await expect(page.locator(".place-detail-workspace .clinic-branch-info")).toBeVisible();
      await expect(page.getByRole("button", { name: "Chat toko", exact: true })).toHaveCount(0);
      await expect(page.getByRole("tab", { name: "Layanan", exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Produk", exact: true }).click();
      await expect(page.getByText("Belum ada produk", { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Layanan", exact: true }).click();
      await expect(page.getByText("Belum ada layanan aktif", { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Kategori", exact: true }).click();
      await expect(page.getByText("Kategori produk belum tersedia", { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Ulasan (0)", exact: true }).click();
      await expect(page.getByText("Belum ada ulasan toko", { exact: true })).toBeVisible();
      await page.getByRole("tab", { name: "Tentang toko", exact: true }).click();
      await expect(page.locator(".market-store-about")).toContainText(place.description!);
      if (scenario === "registered-without-pin") await expect(page.getByText(/Pengelola belum memiliki akun/)).toHaveCount(0);
      const directions = page.getByRole("link", { name: "Petunjuk arah", exact: true });
      await expect(directions).toHaveCount(2);
      const destination = scenario === "registered-without-pin" ? "Andara Vet, Jl. Margasatwa 51, Cilandak, Jakarta Selatan" : "-6.31,106.8";
      expect(new URL((await directions.first().getAttribute("href"))!).searchParams.get("destination")).toBe(destination);
      const popupPromise = page.waitForEvent("popup");
      await directions.first().click();
      const popup = await popupPromise;
      await popup.waitForLoadState();
      expect(new URL(popup.url()).searchParams.get("destination")).toBe(destination);
      await popup.close();
      expect(calls.some((path) => path.includes("/marketplace/stores/"))).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      if (process.env.PLACE_DETAIL_ARTIFACTS) {
        await page.getByRole("tab", { name: place.type === "petclinic" ? "Layanan" : "Produk", exact: true }).click();
        await page.screenshot({ path: `${process.env.PLACE_DETAIL_ARTIFACTS}/${scenario}-${width}.png`, fullPage: true, animations: "disabled" });
      }
    });
  }
}

test("unavailable directory details allow retry without showing a fabricated storefront", async ({ page }) => {
  let unavailable = true;
  await page.route(`**/api/v1/public/discovery/branches/${basePlace.branch_id}`, (route) => route.fulfill({ status: unavailable ? 404 : 200, contentType: "application/json", body: JSON.stringify(unavailable ? { code: "branch_not_found", message: "Not found" } : basePlace) }));
  await page.goto(`/clinics/${basePlace.branch_id}`);
  await expect(page.getByRole("alert")).toContainText("Tempat tidak tersedia atau belum dapat dimuat.");
  await expect(page.getByRole("link", { name: "Petunjuk arah" })).toHaveCount(0);
  unavailable = false;
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: basePlace.business_name })).toBeVisible();
});
