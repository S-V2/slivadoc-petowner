import { test, expect } from "./fixtures";

test("career cards and details show live totals and reuse the visitor on reload", async ({ page, browser }, info) => {
  const seen = new Set<string>();
  const visits: string[] = [];
  const track = async (route: import("@playwright/test").Route) => {
    const body = route.request().postDataJSON() as { visitor_id: string };
    expect(body.visitor_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    visits.push(body.visitor_id);
    seen.add(body.visitor_id);
    return route.fulfill({ json: { applicant_count: 17, detail_viewer_count: 100 + seen.size } });
  };
  await page.route("**/api/v1/public/careers/*/views", track);
  await page.goto("/career?employment=PART_TIME#career-positions");
  const card = page.locator(".career-job").filter({ has: page.getByRole("heading", { name: "Pet Sitter", exact: true }) });
  await expect(card.locator(".career-metrics dt")).toHaveText(["Pelamar", "Pengunjung"]);
  await expect(card.locator(".career-metrics dd")).toHaveText([/^\d[\d.]*$/, /^\d[\d.]*$/]);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await card.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const clipped = await card.locator(".career-metrics, .career-job-location, .career-job-bottom a").evaluateAll(nodes => nodes.some(node => node.scrollWidth > node.clientWidth + 1));
    expect(clipped).toBe(false);
    await card.screenshot({ path: info.outputPath(`career-card-${width}.png`) });
  }
  expect(visits).toEqual([]);
  await card.getByRole("link", { name: "Lihat posisi: Pet Sitter", exact: true }).click();
  const stats = page.locator(".career-role-hero .career-metrics");
  await expect(stats.locator("dd")).toHaveText(["17", "101"]);
  await expect(page.locator('.career-list-item[aria-current="page"] .career-metrics dd')).toHaveText(["17", "101"]);
  await page.reload();
  await expect(stats.locator("dd")).toHaveText(["17", "101"]);
  expect(new Set(visits).size).toBe(1);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(stats.locator("dt")).toHaveText(["Applicants", "Visitors"]);
  expect(new Set(visits).size).toBe(1);
  await page.screenshot({ path: info.outputPath("career-detail-desktop.png") });
  const other = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const second = await other.newPage();
    await second.route("**/api/v1/public/careers/*/views", track);
    await second.goto("/career/pet-sitter");
    await expect(second.locator(".career-role-hero .career-metrics dd")).toHaveText(["17", "102"]);
  } finally { await other.close(); }
  expect(seen.size).toBe(2);
});
