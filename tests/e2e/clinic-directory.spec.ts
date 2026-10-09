import { expect, test } from "./fixtures";

const businessID = "59000000-0000-4000-8000-000000000201";

function branch(index: number, overrides: Record<string, unknown> = {}) {
  return {
    branch_id: `55000000-0000-4000-8000-0000000002${String(index).padStart(2, "0")}`,
    business_id: businessID,
    business_name: "Klinik Sehat Pet",
    branch_name: `Cabang ${index}`,
    type: "hybrid",
    logo_url: null,
    banner_url: null,
    address: `Jalan Contoh ${index}`,
    district: "Kebayoran Baru",
    city: "Jakarta Selatan",
    latitude: -6.24,
    longitude: 106.8,
    distance_km: null,
    opening_hours: { daily: "08:00-17:00" },
    timezone: "Asia/Jakarta",
    is_open_now: true,
    rating: 4.6,
    review_count: 12,
    service_count: 3,
    product_count: 5,
    ...overrides,
  };
}

test("guests browse Klinik & Petshop, load more, and open a branch store with attribution", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const branchRequests: URL[] = [];
  const events: unknown[] = [];
  const page1 = Array.from({ length: 20 }, (_, index) => branch(index + 1));
  const page2 = [branch(21, { branch_name: "Cabang 21" })];

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (url.pathname === "/api/v1/public/discovery/branches") {
      branchRequests.push(url);
      if (url.searchParams.get("offset") === "20")
        return json({ data: page2, count: 1, has_more: false });
      return json({ data: page1, count: 20, has_more: true });
    }
    if (url.pathname === `/api/v1/public/discovery/branches/${page1[0].branch_id}`)
      return json(page1[0]);
    if (url.pathname === "/api/v1/petowner/events" && request.method() === "POST") {
      events.push(request.postDataJSON());
      return route.fulfill({ status: 204 });
    }
    if (url.pathname === `/api/v1/public/marketplace/stores/${businessID}`)
      return json({
        store: {
          id: businessID,
          name: "Klinik Sehat Pet",
          logo_url: "",
          banner_url: "",
          about: "Klinik dan petshop terpercaya.",
          city: "Jakarta Selatan",
          joined_at: "2025-01-01T08:00:00Z",
          is_online: true,
          last_seen_at: "2026-10-05T01:00:00Z",
          product_count: 0,
          category_count: 0,
          rating: 4.6,
          review_count: 12,
          sold_count: 0,
        },
        categories: [],
        reviews: [],
      });
    if (
      url.pathname === "/api/v1/public/discovery/products" ||
      url.pathname === "/api/v1/public/discovery/services" ||
      url.pathname === "/api/v1/public/campaigns" ||
      url.pathname === "/api/v1/public/veterinarians"
    )
      return json({ data: [], count: 0 });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.goto("/?view=clinics", { waitUntil: "domcontentloaded" });

  // No location chosen: banner, no radius, sorted by the API's city order.
  await expect(page.getByText("Pilih lokasi untuk melihat yang terdekat")).toBeVisible();
  await expect(page.locator(".clinic-card:not(.clinic-card--skeleton)")).toHaveCount(20);
  await expect(page.locator(".clinic-radius .sliva-select-trigger")).toBeDisabled();
  expect(branchRequests[0].searchParams.has("latitude")).toBe(false);
  expect(branchRequests[0].searchParams.get("limit")).toBe("20");

  const first = page.locator(".clinic-card").first();
  await expect(first).toContainText("Klinik & Petshop");
  await expect(first).toContainText("Rating toko");
  await expect(first).toContainText("3 layanan · 5 produk");

  await page.getByRole("button", { name: "Muat lagi" }).click();
  await expect(page.locator(".clinic-card:not(.clinic-card--skeleton)")).toHaveCount(21);
  await expect(page.getByRole("button", { name: "Muat lagi" })).toHaveCount(0);

  // Type chip narrows the API query.
  await page.getByRole("button", { name: "Petshop", exact: true }).click();
  await expect.poll(() => branchRequests.at(-1)?.searchParams.get("type")).toBe("petshop");

  await page.getByRole("button", { name: "Semua", exact: true }).click();
  await page.locator(".clinic-card:not(.clinic-card--skeleton)").first().getByRole("button").click();

  await expect(page).toHaveURL(new RegExp(`view=shop&store=${businessID}&branch=${page1[0].branch_id}`));
  await expect(page.getByRole("heading", { name: "Cabang 1" })).toBeVisible();
  await expect(page.getByText("Stok dikirim dari cabang terdekat yang tersedia")).toBeVisible();
  await expect(page.getByRole("link", { name: "Petunjuk arah" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/dir/?api=1&destination=-6.24,106.8",
  );
  expect(events).toEqual([
    { event: "clinic_card_click", branch_id: page1[0].branch_id, business_id: businessID },
  ]);
  expect(await page.evaluate(() => sessionStorage.getItem("slivadoc.entry_point"))).toBe("klinik_petshop");
});

test("a deep link opens the branch store, and an unknown branch falls back to the directory", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const known = branch(1);
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === `/api/v1/public/discovery/branches/${known.branch_id}`) return json(known);
    if (url.pathname.startsWith("/api/v1/public/discovery/branches/"))
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ code: "branch_not_found", message: "Cabang tidak ditemukan" }) });
    if (url.pathname === "/api/v1/public/discovery/branches") return json({ data: [known], count: 1, has_more: false });
    if (url.pathname === `/api/v1/public/marketplace/stores/${businessID}`)
      return route.fulfill({ status: 404, body: "Unmocked API route" });
    if (url.pathname.startsWith("/api/v1/public/"))
      return json({ data: [], count: 0 });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.goto("/?view=clinics&branch=missing", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".clinic-card:not(.clinic-card--skeleton)")).toHaveCount(1);
  await expect(page).toHaveURL(/view=clinics$/);

  await page.goto(`/?view=clinics&branch=${known.branch_id}`, { waitUntil: "domcontentloaded" });
  await expect
    .poll(() => {
      const params = new URL(page.url()).searchParams;
      return [params.get("view"), params.get("store"), params.get("branch")];
    })
    .toEqual(["shop", businessID, known.branch_id]);
});

test("Home lists the six nearest branches for the chosen location and opens the same store target", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const requests: URL[] = [];
  const known = branch(1, { distance_km: 1.234 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "slivadoc.location",
      JSON.stringify({ latitude: -6.2, longitude: 106.8, label: "Jakarta Selatan, DKI Jakarta" }),
    );
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.pathname === "/api/v1/public/discovery/branches") {
      requests.push(url);
      return json({ data: [known], count: 1, has_more: false });
    }
    if (url.pathname === "/api/v1/petowner/events") return route.fulfill({ status: 204 });
    if (url.pathname.startsWith("/api/v1/public/")) return json({ data: [], count: 0 });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const card = page.locator(".home-service-card", { hasText: "Klinik Sehat Pet" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("1.2 km");
  expect(requests.at(-1)?.searchParams.get("limit")).toBe("6");
  expect(requests.at(-1)?.searchParams.get("latitude")).toBe("-6.2");
  await card.click();
  await expect(page).toHaveURL(new RegExp(`branch=${known.branch_id}`));
});
