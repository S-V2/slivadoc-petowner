import { expect, test } from "./fixtures";

test("public marketplace is crawlable, responsive, and free of framework overlays", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      name: "Kebutuhan pet dari partner yang terhubung langsung",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka marketplace" })).toBeVisible();
  await expect(
    page.locator(
      '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
    ),
  ).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toHaveLength(0);

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth);
});
