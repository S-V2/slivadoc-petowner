import { expect, test } from "./fixtures";
import {
  activityCenter,
  marketplaceProduct,
  petOwner,
  petOwnerBootstrap,
} from "./mock-data";

const product = marketplaceProduct({
  id: "52000000-0000-4000-8000-000000000777",
  name: "Salmon Skin & Coat Bites",
  sku: "SLIVA-SALMON-01",
  description: "Snack salmon lembut untuk membantu menjaga kulit dan bulu pet.",
  price: 48_000,
  stock: 18,
  rating: 4.8,
  review_count: 1,
  sold_count: 84,
});

const firstReview = {
  id: "56000000-0000-4000-8000-000000000101",
  product_id: product.id,
  user_id: petOwner.id,
  reviewer_name: "Pet Parent",
  rating: 5,
  comment: "Kemasan rapi dan anabulku langsung suka.",
  verified_purchase: true,
  created_at: "2026-10-01T08:00:00Z",
  updated_at: "2026-10-01T08:00:00Z",
};

test("marketplace card navigates to responsive product detail and publishes a review", async ({ page }) => {
  let savedComment = "";
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "marketplace-test-token");
    localStorage.setItem("slivadoc.refresh_token", "marketplace-test-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter());
    if (path === "/api/v1/public/discovery/products")
      return json({ data: [product], count: 1 });
    if (path === "/api/v1/public/discovery/services" || path === "/api/v1/public/campaigns")
      return json({ data: [], count: 0 });
    if (path === `/api/v1/public/products/${product.id}/reviews`)
      return json({
        data: savedComment ? [{ ...firstReview, comment: savedComment }] : [firstReview],
        count: 1,
        rating: 5,
      });
    if (path === `/api/v1/petowner/products/${product.id}/reviews` && request.method() === "POST") {
      savedComment = (request.postDataJSON() as { comment: string }).comment;
      return json({ id: firstReview.id, message: "Ulasan berhasil dipublikasikan" }, 201);
    }
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?view=shop", { waitUntil: "domcontentloaded" });

  const card = page.getByRole("link", { name: `Lihat detail ${product.name}` });
  await expect(card).toContainText("Sliva Pet Shop");
  await expect(card).toContainText("Jakarta Selatan");
  await expect(card).toContainText("Stok 18");
  await expect(card).toContainText("Sliva Point");
  await card.click();

  await expect(page).toHaveURL(new RegExp(`product=${product.id}`));
  await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
  await expect(page.getByText("Pembelian terverifikasi")).toBeVisible();

  const comment = "Snack-nya wangi, kemasan aman, dan cocok untuk Milo.";
  await page.getByPlaceholder("Ceritakan kualitas produk, kemasan, dan reaksi pet-mu…").fill(comment);
  await page.getByRole("button", { name: "Publikasikan ulasan" }).click();
  await expect(page.getByText(comment)).toBeVisible();

  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client);
});
