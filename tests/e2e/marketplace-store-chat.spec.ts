import { expect, test } from "./fixtures";
import { marketplaceProduct, petOwner, petOwnerBootstrap } from "./mock-data";

const businessID = "59000000-0000-4000-8000-000000000101";
const threadID = "57000000-0000-4000-8000-000000000101";
const affordable = marketplaceProduct({
  id: "52000000-0000-4000-8000-000000000201",
  name: "Healthy Salmon Bites",
  category: "Snack",
  price: 42_000,
  sold_count: 72,
  created_at: "2026-09-10T08:00:00Z",
  store_is_online: true,
});
const premium = marketplaceProduct({
  id: "52000000-0000-4000-8000-000000000202",
  name: "Cloudy Pet Carrier",
  category: "Aksesori",
  price: 320_000,
  sold_count: 12,
  created_at: "2026-10-02T08:00:00Z",
  store_is_online: true,
});

test("store profile exposes sections, sorting, and a text-only chat drawer", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "marketplace-store-test-token");
    localStorage.setItem("slivadoc.refresh_token", "marketplace-store-test-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities")
      return json({
        data: [],
        count: 0,
        summary: { booking: 0, order: 0, consultation: 0 },
      });
    if (path === "/api/v1/public/discovery/products")
      return json({ data: [affordable, premium], count: 2 });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === `/api/v1/public/marketplace/stores/${businessID}`)
      return json({
        store: {
          id: businessID,
          name: "Sliva Pet Shop",
          logo_url: "",
          banner_url: "",
          about: "Toko pilihan untuk kebutuhan sehat dan seru pet setiap hari.",
          city: "Jakarta Selatan",
          joined_at: "2025-01-01T08:00:00Z",
          is_online: true,
          last_seen_at: "2026-10-05T01:00:00Z",
          product_count: 2,
          category_count: 2,
          rating: 5,
          review_count: 1,
          sold_count: 84,
        },
        categories: [
          { name: "Snack", product_count: 1 },
          { name: "Aksesori", product_count: 1 },
        ],
        reviews: [
          {
            id: "56000000-0000-4000-8000-000000000201",
            product_id: affordable.id,
            product_name: affordable.name,
            reviewer_name: "Pet Parent",
            rating: 5,
            comment: "Toko responsif dan produknya aman sampai tujuan.",
            updated_at: "2026-10-04T08:00:00Z",
          },
        ],
      });
    if (
      path === "/api/v1/petowner/marketplace/chats" &&
      request.method() === "POST"
    )
      return json({ id: threadID, business_id: businessID, buyer_user_id: petOwner.id });
    if (path === `/api/v1/marketplace/chats/${threadID}/messages`)
      return json({ data: [], count: 0, viewer: "buyer" });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=shop", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("button", { name: /Sliva Pet Shop Online sekarang/ }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Sliva Pet Shop Online sekarang/ })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`store=${businessID}`));
  await expect(
    page.locator(".market-store-hero").getByRole("heading", {
      name: "Sliva Pet Shop",
    }),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Harga termahal" }).click();
  await expect(page.locator(".market-product-card h3").first()).toHaveText(
    premium.name,
  );

  await page.getByRole("tab", { name: "Kategori" }).click();
  await expect(page.getByRole("button", { name: "Snack 1 produk" })).toBeVisible();
  await page.getByRole("tab", { name: "Ulasan (1)" }).click();
  await expect(page.getByText("Toko responsif dan produknya aman sampai tujuan.")).toBeVisible();
  await page.getByRole("tab", { name: "Tentang toko" }).click();
  await expect(
    page.getByText("Toko pilihan untuk kebutuhan sehat dan seru pet setiap hari."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Chat toko" }).click();
  await expect(
    page.getByRole("dialog", { name: "Chat dengan Sliva Pet Shop" }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Tulis pesan ke toko…")).toBeVisible();
  await expect(page.getByText(/hanya untuk pesan teks/)).toBeVisible();

  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});
