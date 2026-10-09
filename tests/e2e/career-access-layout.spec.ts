import { expect, test } from "@playwright/test";
import { petOwner, petOwnerBootstrap } from "./mock-data";
test("career redirects guests to the existing login and restores the requested role", async ({
  page,
}) => {
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/v1/public/")) return route.continue();
    if (path === "/api/v1/auth/login")
      return route.fulfill({
        json: {
          access_token: "career-login-test",
          refresh_token: "career-refresh",
          expires_in: 3600,
          user: { ...petOwner, role: "pet_owner" },
        },
      });
    if (path === "/api/v1/auth/me")
      return route.fulfill({ json: { ...petOwner, role: "pet_owner" } });
    if (path === "/api/v1/petowner/bootstrap")
      return route.fulfill({ json: petOwnerBootstrap() });
    return route.fulfill({ json: { data: [] } });
  });
  await page.goto("/career/pet-sitter?employment=PART_TIME#career-role-title");
  await expect(page).toHaveURL(/login=1/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(
    "/career/pet-sitter?employment=PART_TIME#career-role-title",
  );
  const modal = page.locator(".petowner-login");
  await expect(modal).toBeVisible();
  await modal.locator('input[type="email"]').fill("career@example.test");
  await modal.locator('input[type="password"]').fill("ExamplePass123!");
  await modal.locator(".primary-button").click();
  await expect(page).toHaveURL(
    /career\/pet-sitter\?employment=PART_TIME#career-role-title/,
  );
  await expect(page.locator("#career-role-title")).toHaveText("Pet Sitter");
  await page.reload();
  await expect(page.locator("#career-role-title")).toBeVisible();
  await page.evaluate(() => {
    localStorage.removeItem("slivadoc.access_token");
    localStorage.removeItem("slivadoc.refresh_token");
    window.dispatchEvent(new Event("slivadoc:session-ended"));
  });
  await expect(page).toHaveURL(/login=1/);
});
test("sitter search, header frost and discovery align on desktop and mobile", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/?view=sitter");
  const search = page.locator(".sitter-search-layout");
  await expect(search).toBeVisible();
  const nearby = page.getByRole("button", {
    name: "Sitter terdekat",
    exact: true,
  });
  await expect(nearby).toBeVisible();
  const form = await page.locator(".sitter-search").boundingBox(),
    geo = await nearby.boundingBox();
  expect(geo!.x).toBeGreaterThan(form!.x + form!.width);
  await page.evaluate(() => window.scrollTo(0, 270));
  const frost = await page
    .locator(".main-shell")
    .evaluate((el) => ({
      filter: getComputedStyle(el, "::before").backdropFilter,
      height: getComputedStyle(el, "::before").height,
    }));
  expect(frost.filter).toContain("blur");
  expect(frost.height).toBe("14px");
  await page.screenshot({
    path: info.outputPath("sitter-search-frost-desktop.png"),
  });
  const discovery = page.locator(".sliva-discovery");
  await discovery.scrollIntoViewIfNeeded();
  const groups = await discovery
    .locator(".seo-discovery-columns > div")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getBoundingClientRect().toJSON()),
    );
  expect(groups).toHaveLength(4);
  expect(new Set(groups.map((g) => g.y)).size).toBe(1);
  expect(groups[0].x).toBeGreaterThan(276);
  await page.screenshot({
    path: info.outputPath("slivadoc-discovery-revamp.png"),
  });
  await expect(page.getByRole("contentinfo")).toContainText("© 2023");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await search.scrollIntoViewIfNeeded();
    await expect(nearby).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
