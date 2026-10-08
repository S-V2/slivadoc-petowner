import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.goto("/tests/fixtures/sliva-select.html");
  await expect(page.getByRole("combobox", { name: "Role akses", exact: true })).toBeVisible();
});

test("custom choices preserve required validation, submitted values, disabled fields and reset", async ({ page }) => {
  await expect(page.locator("select, datalist")).toHaveCount(0);
  const role = page.getByRole("combobox", { name: "Role akses", exact: true });
  const category = page.getByRole("combobox", { name: "Kategori wajib", exact: true });
  await expect(role).toHaveText("Caregiver");
  await role.click();
  await expect(page.getByRole("option", { name: "Owner", exact: true })).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("option", { name: "Owner", exact: true }).click({ force: true });
  await expect(role).toHaveText("Caregiver");
  await page.getByRole("option", { name: "Viewer", exact: true }).click();
  await page.getByRole("button", { name: "Kirim formulir" }).click();
  await expect(category).toHaveAttribute("aria-invalid", "true");
  await expect(category).toBeFocused();
  await expect(page.getByRole("status", { name: "Hasil formulir" })).toHaveText("");
  await category.click();
  await page.getByRole("option", { name: "Kesehatan", exact: true }).click();
  await page.getByRole("button", { name: "Kirim formulir" }).click();
  await expect(page.getByRole("status", { name: "Hasil formulir" })).toHaveText('{"role":"viewer","category":"health","province":"","tickets":"1"}');
  await page.getByRole("button", { name: "Reset formulir" }).click();
  await expect(role).toHaveText("Caregiver");
  await expect(category).toHaveText("Pilih kategori");
  await expect(category).not.toHaveAttribute("aria-invalid", "true");
});

test("keyboard navigation skips disabled choices, commits with Enter and cancels with Escape", async ({ page }) => {
  const role = page.getByRole("combobox", { name: "Role akses", exact: true });
  await role.focus();
  await role.press("ArrowDown");
  await role.press("Home");
  await role.press("ArrowDown");
  await role.press("Enter");
  await expect(role).toHaveText("Viewer");
  await role.press("ArrowUp");
  await role.press("Home");
  await role.press("Escape");
  await expect(role).toHaveText("Viewer");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await role.press("v");
  await expect(page.getByRole("listbox")).toBeVisible();
  await role.press("Tab");
  await expect(page.getByRole("combobox", { name: "Kategori wajib", exact: true })).toBeFocused();
});

test("region search and cascading choices update a controlled form without clipped menus", async ({ page }) => {
  const province = page.getByRole("combobox", { name: "Provinsi", exact: true });
  const city = page.getByRole("combobox", { name: "Kabupaten / kota", exact: true });
  await expect(city).toBeDisabled();
  await province.click();
  const search = page.getByRole("combobox", { name: "Cari opsi Provinsi", exact: true });
  await expect(search).toBeFocused();
  await search.fill("tidak ada");
  await expect(page.getByText("Pilihan tidak ditemukan. Coba kata lain.")).toBeVisible();
  await search.fill("jawa barat");
  await expect(page.getByRole("option")).toHaveCount(1);
  await search.press("Enter");
  await expect(province).toHaveText("Jawa Barat");
  await city.click();
  await page.getByRole("option", { name: "Kota Bandung", exact: true }).click();
  await expect(city).toHaveText("Kota Bandung");
  await province.click();
  await page.getByRole("option", { name: "Aceh", exact: true }).click();
  await expect(city).toHaveText("Pilih kabupaten / kota");
  await province.click();
  await page.getByRole("heading", { name: "Dropdown Slivadoc" }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await province.click();
  await page.getByRole("combobox", { name: "Cari opsi Provinsi", exact: true }).press("Tab");
  await expect(city).toBeFocused();
});

test("popup remains inside a small phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  const city = page.getByRole("combobox", { name: "Kabupaten / kota", exact: true });
  await page.getByRole("combobox", { name: "Provinsi", exact: true }).click();
  await page.getByRole("option", { name: "Jawa Barat", exact: true }).click();
  await city.click();
  const bounds = await page.locator(".sliva-select-popup").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640);
  expect(await page.locator("body").evaluate((body) => body.scrollWidth)).toBeLessThanOrEqual(390);
});
