import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

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

test("home service shortcuts open a filtered catalogue before booking", async ({
  page,
}) => {
  const services = [
    ["62000000-0000-4000-8000-000000000001", "62000000-0000-4000-8000-000000000011", "Home Visit Sehat"],
    ["62000000-0000-4000-8000-000000000002", "62000000-0000-4000-8000-000000000012", "Home Visit Nyaman"],
  ].map(([id, branchID, name], index) => ({
    id,
    branch_id: branchID,
    business_id: "62000000-0000-4000-8000-000000000021",
    business_name: "Sliva Home Care",
    branch_name: `Cabang ${index + 1}`,
    name,
    category: "home_care",
    image_url: `https://example.com/service-${index + 1}-a.jpg`,
    image_urls: [
      `https://example.com/service-${index + 1}-a.jpg`,
      `https://example.com/service-${index + 1}-b.jpg`,
    ],
    duration_minutes: 60,
    price: 250_000 + index * 50_000,
    address: `Jalan Sehat ${index + 1}`,
    city: "Jakarta Selatan",
    latitude: -6.26,
    longitude: 106.81,
    distance_km: 1.2 + index,
    description: "Perawatan pet di rumah oleh mitra terverifikasi.",
    inclusions: ["Asesmen awal", "Catatan digital"],
    supported_species: ["dog", "cat"],
    cancellation_policy: "Pembatalan gratis maksimal 6 jam sebelum jadwal.",
    business_license_status: "verified" as const,
  }));
  await page.route("**/api/v1/public/**", async (route) => {
    const url = new URL(route.request().url());
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (url.pathname === "/api/v1/public/discovery/services")
      return json({ data: services, count: services.length });
    const detail = services.find(
      (service) =>
        url.pathname === `/api/v1/public/discovery/services/${service.id}`,
    );
    if (detail) {
      const serviceDetail = Object.fromEntries(
        Object.entries(detail).filter(([key]) => key !== "distance_km"),
      );
      return json({
        ...serviceDetail,
        capacity: 1,
        phone: "+622112345678",
        timezone: "Asia/Jakarta",
        opening_hours: {},
        exclusions: [],
        preparation: [],
        aftercare: [],
        pet_requirements: {},
        reschedule_policy: "Perubahan jadwal mengikuti slot tersedia.",
        business_license_number: "NIB-TEST-001",
      });
    }
    if (
      url.pathname === "/api/v1/public/discovery/products" ||
      url.pathname === "/api/v1/public/campaigns" ||
      url.pathname === "/api/v1/public/veterinarians"
    )
      return json({ data: [], count: 0 });
    return route.fallback();
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await openApp(page);

  await page.getByRole("button", { name: /Home Care/ }).click();
  await expect(page).toHaveURL(/view=discover.*service_type=Home(?:\+|%20)Care/);
  await expect(page.locator(".booking-modal")).toBeHidden();
  await expect(page.locator(".service-result-card")).toHaveCount(2);

  await page.getByRole("button", { name: "Lihat detail" }).first().click();
  await expect(page.locator(".service-detail-modal")).toBeVisible();
  await expect(page).toHaveURL(/service=[0-9a-f-]+/);

  const pager = page.locator(".service-image-pager span");
  await expect(pager).toBeVisible();
  const initialImage = await pager.textContent();
  await expect.poll(() => pager.textContent(), { timeout: 2_500 }).not.toBe(initialImage);
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

test("narrow header keeps the native search launcher and controls tappable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openApp(page);

  const search = page.locator(".global-search");
  const input = search.getByRole("searchbox", { name: "Cari di seluruh Slivadoc" });
  const launcher = await search.boundingBox();
  expect(launcher!.width).toBeGreaterThanOrEqual(200);
  expect(launcher!.height).toBeGreaterThanOrEqual(44);
  await search.click();
  await expect(input).toBeFocused();

  const notification = page.getByRole("button", { name: "Notifikasi" });
  await expect(notification).toBeVisible();
  const notificationBox = await notification.boundingBox();
  expect(notificationBox!.width).toBeGreaterThanOrEqual(44);
  expect(notificationBox!.height).toBeGreaterThanOrEqual(44);

  await page.getByRole("button", { name: "Tutup", exact: true }).click();
  await expect(page.locator(".owner-search-results")).toBeHidden();
  const undersized = await page.evaluate(() =>
    [...document.querySelectorAll(".topbar button, .mobile-nav button")]
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
