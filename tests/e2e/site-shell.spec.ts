import { expect, test } from "@playwright/test";
import { careerSignedIn } from "./career-auth-setup";
test.beforeEach(async ({ page }) => careerSignedIn(page));

test("mobile careers show two readable columns with official branding", async ({
  page,
}, testInfo) => {
  await page.goto("/career?employment=PART_TIME");
  await expect(page.locator(".career-job")).toHaveCount(6);
  await expect(page.locator(".career-job").first()).toBeVisible();
  for (const width of [320, 390, 600, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const cards = page.locator(".career-job");
    // Read the layout together after hydration/viewport changes have settled.
    await expect(async () => {
      const boxes = await cards.evaluateAll((nodes) =>
        nodes.slice(0, 3).map((node) => node.getBoundingClientRect().toJSON()),
      );
      expect(boxes).toHaveLength(3);
      const [first, second, third] = boxes;
      expect(first.width).toBeGreaterThan(0);
      expect(first.y).toBe(second.y);
      expect(second.x).toBeGreaterThan(first.x + first.width);
      expect(third.y).toBeGreaterThan(first.y);
    }).toPass();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (await cards.nth(0).getByRole("link").boundingBox())!.height,
    ).toBeGreaterThanOrEqual(40);
    await expect(page.locator(".career-header .brand-mark")).toBeVisible();
    if (width === 390) {
      await cards.first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: testInfo.outputPath("career-two-columns-mobile.png"),
      });
    }
  }
});

test("public pages share official header assets and full desktop width", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const path of [
    "/career",
    "/pet-sitter",
    "/layanan",
    "/privasi",
    "/syarat-ketentuan",
    "/en",
    "/bantuan",
  ]) {
    await page.goto(path);
    const header = page
      .locator(".career-header, .seo-header")
      .filter({ visible: true });
    await expect(header.locator(".brand-mark")).toBeVisible();
    await expect(header.locator(".brand-mark")).toHaveAttribute(
      "src",
      /\/brand\/slivadoc-logo\.png/,
    );
    const box = await header.boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.width).toBe(1920);
    const content = page
      .locator(".career-page main, .legal-public-body, .seo-main-section")
      .filter({ visible: true })
      .first();
    await expect(content).toBeVisible();
    await expect
      .poll(async () => (await content.boundingBox())?.width ?? 0)
      .toBeGreaterThanOrEqual(1900);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/career");
  await page.screenshot({
    path: testInfo.outputPath("career-full-width-desktop.png"),
  });
  await page.goto("/?view=home");
  await expect(page.locator(".topbar .brand-mark")).toBeHidden();
  await expect(page.locator(".sidebar .brand-mark")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".topbar .brand-mark")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("missing pages and unavailable roles return 404 with helpful bilingual navigation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const missing = await page.goto("/halaman-yang-tidak-ada-sliva-qa");
  expect(missing!.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Halaman ini belum ditemukan." }),
  ).toBeVisible();
  await expect(page.locator(".seo-header .brand-mark")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("not-found-desktop.png") });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "This page has wandered off." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to Slivadoc", exact: true })
    .click();
  await expect(page.locator(".sidebar .brand-mark")).toBeVisible();
  const career = await page.goto("/career/position-that-does-not-exist");
  expect(career!.status()).toBe(404);
  await expect(
    page.getByRole("heading", {
      name: "This opportunity is no longer available.",
    }),
  ).toBeVisible();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("link", { name: "Explore opportunities", exact: true })
    .click();
  await expect(page.locator(".career-job")).toHaveCount(28);
});
