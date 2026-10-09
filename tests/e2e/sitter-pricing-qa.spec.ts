import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const qa = process.env.SITTER_PRICING_QA === "1";
test.skip(
  !qa,
  "Opt in only with the disposable local pricing QA API on :18081.",
);
test("sitter saves own prices and discount, reloads them, and customers receive the discounted quote", async ({
  page,
  request,
}, info) => {
  test.setTimeout(90000);
  const base = "http://127.0.0.1:18081";
  const credentialsFile = process.env.SITTER_QA_CREDENTIALS_FILE;
  if (!credentialsFile)
    throw new Error(
      "Set SITTER_QA_CREDENTIALS_FILE to the disposable QA account JSON file.",
    );
  const credentials = JSON.parse(readFileSync(credentialsFile, "utf8"));
  const login = await request.post(base + "/api/v1/auth/login", {
    data: credentials,
  });
  expect(login.status()).toBe(200);
  const tokens = await login.json();
  const reset = await request.put(base + "/api/v1/pet-sitter/pricing", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    data: {
      daily_rate: 100000,
      weekly_rate: 630000,
      extra_pet_rate: 25000,
      discount_enabled: false,
      discount_percent: 0,
    },
  });
  expect(reset.status()).toBe(200);
  await page.addInitScript((t) => {
    sessionStorage.setItem("slivadoc_access_token", t.access_token);
    sessionStorage.setItem("slivadoc_refresh_token", t.refresh_token);
    sessionStorage.setItem(
      "slivadoc_access_expires_at",
      String(Date.now() + 3600000),
    );
    localStorage.removeItem("slivadoc.console_view");
  }, tokens);
  // Forward the browser's actual requests to the isolated API; no mocked responses.
  await page.route("**/api/v1/**", async (route) => {
    const u = new URL(route.request().url());
    const response = await route.fetch({ url: base + u.pathname + u.search });
    await route.fulfill({ response });
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("http://localhost:3000/");
  await page
    .getByRole("button", { name: "Harga & diskon", exact: true })
    .click();
  const save = page.getByRole("button", { name: "Simpan harga & diskon" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Tarif harian (Rp) *", { exact: true }).fill("120000");
  await page.getByLabel("Paket 7 hari (Rp) *", { exact: true }).fill("700000");
  await page.getByLabel("Aktifkan diskon paket", { exact: true }).check();
  await page.getByLabel("Diskon (%) *", { exact: true }).fill("20");
  await expect(page.locator(".psw-price-preview")).toContainText("96.000");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/pet-sitter/pricing") && r.request().method() === "PUT",
  );
  await save.click();
  expect((await response).status()).toBe(200);
  await expect(save).toBeDisabled();
  await page.reload();
  await page
    .getByRole("button", { name: "Harga & diskon", exact: true })
    .click();
  await expect(page.getByLabel("Diskon (%) *", { exact: true })).toHaveValue(
    "20",
  );
  await page
    .locator(".psw-pricing")
    .screenshot({ path: info.outputPath("sitter-pricing-dashboard.png") });
  const catalog = await request.get(base + "/api/v1/public/pet-sitters");
  const sitter = (await catalog.json()).data.find(
    (p: { display_name: string }) => p.display_name === "Pet Sitter Lokal",
  );
  expect(sitter.discount_enabled).toBe(true);
  expect(sitter.daily_rate).toBe(120000);
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const quote = await request.post(
    base + `/api/v1/public/pet-sitters/${sitter.id}/quote`,
    {
      data: {
        package: "daily",
        service_mode: "home_visit",
        starts_on: day,
        ends_on: day,
        pet_count: 1,
      },
    },
  );
  expect(quote.status()).toBe(200);
  expect((await quote.json()).quote).toMatchObject({
    base_amount: 120000,
    discount_amount: 24000,
    total_amount: 96000,
  });
  await page.goto("http://127.0.0.1:4173/?view=sitter");
  const card = page
    .locator(".sitter-card")
    .filter({ hasText: "Pet Sitter Lokal" });
  await expect(card).toContainText("96.000");
  await expect(card).toContainText("Diskon 20%");
  const anonymous = await request.post(
    base + "/api/v1/public/career-applications",
  );
  expect(anonymous.status()).toBe(401);
});
