import { expect, test } from "@playwright/test";
import { careerSignedIn } from "./career-auth-setup";
test.beforeEach(async ({ page }) => careerSignedIn(page));

// Read-only discovery checks; no applicant submissions or catalog mutations.
test("filters persist through grid, split detail, refresh and browser history", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/career");
  await expect(page.locator(".career-job")).toHaveCount(28);
  await expect(page.locator(".career-brand img")).toHaveAttribute(
    "src",
    /slivadoc-logo/,
  );
  expect(
    await page
      .locator(".career-brand img")
      .evaluate(
        (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
      ),
  ).toBe(true);
  const card = page.locator(".career-job").first();
  await expect(card).toBeVisible();
  await expect(card.locator(".career-work-mode")).toHaveText("On-site");
  const gap = await card.evaluate((node) => {
    const badges = node.querySelector(".career-meta")!.getBoundingClientRect();
    const footer = node
      .querySelector(".career-job-bottom")!
      .getBoundingClientRect();
    return footer.top - badges.bottom;
  });
  expect(gap).toBeGreaterThanOrEqual(20);
  await page
    .getByRole("combobox", { name: "Jenis kerja", exact: true })
    .selectOption("PART_TIME");
  await page
    .getByRole("combobox", { name: "Sistem kerja", exact: true })
    .selectOption("on_site");
  await expect(page.locator(".career-job")).toHaveCount(6);
  await page
    .getByRole("link", { name: "Lihat posisi: Pet Sitter", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pet Sitter", level: 1, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".career-list-item")).toHaveCount(6);
  await expect(
    page.locator('.career-list-item[aria-current="page"]'),
  ).toContainText("Pet Sitter");
  const left = await page.locator(".career-results-panel").boundingBox();
  const right = await page.locator(".career-selected-position").boundingBox();
  expect(left!.x + left!.width).toBeLessThan(right!.x);
  await page.screenshot({
    path: testInfo.outputPath("career-split-desktop.png"),
    fullPage: false,
  });
  await page
    .getByRole("link", { name: "Lihat posisi: Pet Groomer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pet Groomer", level: 1, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".career-list-item")).toHaveCount(6);
  await expect(
    page.getByRole("combobox", { name: "Jenis kerja", exact: true }),
  ).toHaveValue("PART_TIME");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Pet Sitter", level: 1, exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator(".career-job")).toHaveCount(6);
  await expect(
    page.getByRole("combobox", { name: "Sistem kerja", exact: true }),
  ).toHaveValue("on_site");
});

test("all filters, English copy, empty states and application drafts work together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    "/career?department=engineering&employment=FULL_TIME&mode=on_site&location=DKI%20Jakarta&status=talent_pool&sort=title&q=backend",
  );
  await expect(page.locator(".career-job")).toHaveCount(1);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page
    .getByRole("link", { name: "View role: Backend Engineer", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Work arrangement", exact: true }),
  ).toHaveValue("on_site");
  await expect(
    page.getByRole("heading", { name: "Backend Engineer", level: 1 }),
  ).toBeVisible();
  await page.getByLabel("Full name").fill("Draft preserved");
  await page
    .getByRole("combobox", { name: "Work arrangement", exact: true })
    .selectOption("remote");
  await expect(page.locator(".career-list-item")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "outside your current filters",
  );
  await expect(page.getByLabel("Full name")).toHaveValue("Draft preserved");
  await page.locator(".career-filter-panel").getByRole("button").click();
  await expect(page.locator(".career-list-item")).toHaveCount(28);
  await expect(page.getByLabel("Full name")).toHaveValue("Draft preserved");
});

test("responsive discovery and back-to-results navigation keep all filters", async ({
  page,
}, testInfo) => {
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/career?employment=PART_TIME");
    await expect(page.locator(".career-job")).toHaveCount(6);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Lihat posisi: Pet Sitter", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Pet Sitter", level: 1 }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("combobox", { name: "Jenis kerja", exact: true }),
    ).toHaveValue("PART_TIME");
    if (width <= 900)
      await expect(page.locator(".career-results-panel")).toBeHidden();
    if (width === 390)
      await page.screenshot({
        path: testInfo.outputPath("career-detail-mobile.png"),
        fullPage: false,
      });
    await page.getByRole("link", { name: /Kembali ke posisi/ }).click();
    await expect(page.locator(".career-job")).toHaveCount(6);
  }
});
