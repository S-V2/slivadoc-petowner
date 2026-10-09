import { expect, test } from "@playwright/test";
import { careerSignedIn } from "./career-auth-setup";
test.beforeEach(async ({ page }) => careerSignedIn(page));

test("career header stays fixed and the job list fills the desktop viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/career/pet-sitter");
  const header = page.locator(".career-header");
  const panel = page.locator(".career-results-panel");
  const list = page.locator(".career-job-list");
  await expect(page.locator(".career-location")).toHaveText(
    "DKI Jakarta, Indonesia",
  );
  await expect(page.locator(".career-list-location")).toHaveText(
    Array(28).fill("DKI Jakarta, Indonesia"),
  );
  await page.getByRole("combobox", {name:"Lokasi",exact:true}).click();
  await expect(page.getByRole("option")).toHaveText(["Semua lokasi", "DKI Jakarta, Indonesia"]);
  await page.keyboard.press("Escape");
  await page.mouse.move(1100, 900);
  await page.mouse.wheel(0, 640);
  await expect(async () => {
    const head = await header.boundingBox();
    const aside = await panel.boundingBox();
    expect(head!.y).toBe(0);
    expect(aside!.y).toBe(head!.height + 16);
    expect(Math.round(aside!.y + aside!.height)).toBe(1100);
    expect((await list.boundingBox())!.height).toBeGreaterThan(800);
  }).toPass();
  const pageY = await page.evaluate(() => window.scrollY);
  const listY = await list.evaluate((node) => node.scrollTop);
  const bounds = (await list.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 120);
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => list.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(listY);
  expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
  await page.screenshot({
    path: testInfo.outputPath("career-fixed-header-full-sidebar.png"),
  });

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator(".career-location")).toHaveText(
    "DKI Jakarta, Indonesia",
  );
  await page
    .getByRole("link", { name: "Apply for this role", exact: true })
    .click();
  await expect(async () => {
    const form = await page.locator("#career-application").boundingBox();
    const head = await header.boundingBox();
    expect(form!.y).toBeGreaterThanOrEqual(head!.height);
  }).toPass();
});

test("mobile header remains visible without covering career content", async ({
  page,
}) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/career?employment=PART_TIME");
    await page
      .getByRole("link", { name: "Jelajahi peluang", exact: true })
      .click();
    await expect(async () => {
      expect((await page.locator(".career-header").boundingBox())!.y).toBe(0);
      const content = (await page.locator("#career-positions").boundingBox())!;
      expect(content.y).toBeGreaterThanOrEqual(74);
      expect(content.y).toBeLessThan(150);
    }).toPass();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".career-job-bottom > span")).toHaveText(
      Array(6).fill("DKI Jakarta, Indonesia"),
    );
  }
});
