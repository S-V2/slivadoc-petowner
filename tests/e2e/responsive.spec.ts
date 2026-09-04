import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { width: 320, height: 700 },
  { width: 375, height: 812 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
];

const appPaths = [
  "/",
  "/?view=discover",
  "/?view=community",
  "/?view=academy",
  "/?view=events",
  "/?view=petspot",
  "/?view=pethub",
  "/?view=shop",
  "/?view=adoption",
  "/?view=documents",
  "/?view=pawdating",
  "/?view=petship",
  "/?view=fundraising",
  "/?view=bookings",
  "/?view=health",
  "/?view=favorites",
  "/?view=notifications",
];

const publicPaths = [
  "/layanan",
  "/layanan/dokter-hewan-online",
  "/panduan",
  "/kota",
  "/tempat",
  "/mitra",
  "/tentang",
];

async function openApp(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.locator(".app-shell").waitFor();
}

for (const viewport of viewports) {
  test(`app views contain horizontal overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize(viewport);
    for (const path of appPaths) {
      await openApp(page, path);
      const dimensions = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scrollWidth, path).toBeLessThanOrEqual(
        dimensions.clientWidth,
      );
    }
  });
}

test("public routes contain horizontal overflow at 320px", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of publicPaths) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, path).toBeLessThanOrEqual(
      dimensions.clientWidth,
    );
  }
});

test("mobile fixed navigation never covers page actions", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openApp(page);

  await expect(page.locator(".floating-chat")).toBeHidden();
  await page.getByRole("button", { name: "Lainnya" }).click();
  await page.getByRole("button", { name: "SlivaCare", exact: true }).click();
  await expect(page.locator(".chat-drawer")).toBeVisible();
});

test("community search and live status occupy separate rows on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openApp(page, "/?view=community");

  const boxes = await page.locator(".community-tools-live").evaluate((container) => {
    const search = container.querySelector("label")!.getBoundingClientRect();
    const status = container.querySelector(":scope > span")!.getBoundingClientRect();
    return {
      search: { left: search.left, right: search.right, bottom: search.bottom },
      status: { left: status.left, right: status.right, top: status.top },
    };
  });

  expect(boxes.search.right).toBeLessThanOrEqual(375);
  expect(boxes.status.right).toBeLessThanOrEqual(375);
  expect(boxes.status.top).toBeGreaterThanOrEqual(boxes.search.bottom);
});

test("PetHub tab rail keeps every tab reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openApp(page, "/?view=pethub");

  const rail = page.locator(".hub-tabs");
  const thread = page.getByRole("button", { name: "Thread", exact: true });
  await thread.scrollIntoViewIfNeeded();

  const boxes = await Promise.all([rail.boundingBox(), thread.boundingBox()]);
  expect(boxes[0]).not.toBeNull();
  expect(boxes[1]).not.toBeNull();
  const subpixelTolerance = 1;
  expect(boxes[1]!.x).toBeGreaterThanOrEqual(
    boxes[0]!.x - subpixelTolerance,
  );
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(
    boxes[0]!.x + boxes[0]!.width + subpixelTolerance,
  );
});

test("narrow header search expands and mobile controls remain tappable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openApp(page);

  const search = page.locator(".global-search");
  const input = search.getByRole("searchbox", { name: "Cari di seluruh Slivadoc" });
  const collapsedSearch = await search.boundingBox();
  expect(collapsedSearch!.width).toBe(44);
  expect(collapsedSearch!.height).toBeGreaterThanOrEqual(44);
  await search.click();
  await expect(input).toBeFocused();
  expect((await search.boundingBox())!.width).toBeGreaterThanOrEqual(300);

  await page.keyboard.press("Escape");
  await page.locator("body").click({ position: { x: 1, y: 100 } });
  const undersized = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        ".topbar button, .hero-actions button, .mobile-nav button",
      ),
    ]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          label: element.getAttribute("aria-label") || element.textContent?.trim(),
          width: box.width,
          height: box.height,
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44),
  );
  expect(undersized).toEqual([]);
});

test("SlivaCare mobile copy and suggestions meet the shared floor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openApp(page);
  await page.getByRole("button", { name: "Lainnya" }).click();
  await page.getByRole("button", { name: "SlivaCare", exact: true }).click();

  const metrics = await page.locator(".chat-drawer").evaluate((drawer) => {
    const selectors = [
      ".chat-header p",
      ".chat-context small",
      ".chat-date",
      ".message p",
      ".quick-replies button",
    ];
    const textSizes = selectors.flatMap((selector) =>
      [...drawer.querySelectorAll(selector)].map((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    );
    const replyHeights = [...drawer.querySelectorAll(".quick-replies button")].map(
      (element) => element.getBoundingClientRect().height,
    );
    return {
      minimumTextSize: Math.min(...textSizes),
      minimumReplyHeight: Math.min(...replyHeights),
    };
  });

  expect(metrics.minimumTextSize).toBeGreaterThanOrEqual(11);
  expect(metrics.minimumReplyHeight).toBeGreaterThanOrEqual(44);
});
