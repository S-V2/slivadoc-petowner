import { expect, test } from "@playwright/test";
import { careerSignedIn } from "./career-auth-setup";
test.beforeEach(async ({ page }) => careerSignedIn(page));

test("every page uses one complete footer with truthful app availability", async ({
  page,
}) => {
  for (const path of [
    "/career",
    "/career/pet-sitter",
    "/pet-sitter",
    "/privacy",
    "/terms",
    "/",
    "/footer-missing-page",
  ]) {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer).toHaveCount(1);
    await expect(footer).toContainText("09.00–21.00 WIB");
    await expect(
      footer.getByRole("link", { name: "support@slivadoc.com", exact: true }),
    ).toHaveAttribute("href", "mailto:support@slivadoc.com");
    await expect(footer.getByText("Segera hadir", { exact: true })).toHaveCount(
      2,
    );
    await expect(
      footer.locator(".sliva-footer-stores a, .sliva-footer-stores button"),
    ).toHaveCount(0);
    await expect(
      footer.getByRole("link", { name: "Slivadoc Career", exact: true }),
    ).toHaveAttribute("href", "/career");
    await expect(footer.locator(".brand-mark")).toHaveAttribute(
      "src",
      /\/brand\/slivadoc-logo\.png/,
    );
  }
});

test("footer adapts to desktop and mobile, preserves language, and links to help", async ({
  page,
}, testInfo) => {
  await page.goto("/career");
  const footer = page.getByRole("contentinfo");
  for (const width of [1920, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1100 });
    await footer.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(footer.locator(".sliva-footer-email")).toBeVisible();
    if (width === 1440 || width === 390) {
      await footer.screenshot({
        path: testInfo.outputPath(`slivadoc-footer-${width}.png`),
      });
    }
  }
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(footer.getByText("Coming soon", { exact: true })).toHaveCount(2);
  await expect(
    footer.getByRole("heading", { name: "Complaints & customer support" }),
  ).toBeVisible();
  await footer.getByRole("link", { name: "View the help guide" }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(footer).toHaveAttribute("lang", "en");
  await footer.getByRole("link", { name: "Back to top" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goto("/en");
  await expect(footer).toHaveAttribute("lang", "en");
});

test("home footer clears the app sidebar and mobile bottom navigation", async ({
  page,
}) => {
  await page.goto("/?view=home");
  const footer = page.getByRole("contentinfo");
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await footer.scrollIntoViewIfNeeded();
    await expect(async () => {
      const box = (await footer.boundingBox())!;
      expect(box.width + box.x).toBe(width);
      expect(box.x).toBe(width === 1440 ? 276 : width === 1024 ? 258 : 0);
    }).toPass();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const padding = await footer.evaluate((node) =>
    parseFloat(getComputedStyle(node).paddingBottom),
  );
  expect(padding).toBeGreaterThanOrEqual(120);
});
