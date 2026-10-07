import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/translations", async (route) => {
    const body = route.request().postDataJSON() as { sources: string[]; target: string };
    expect(body.target).toBe("en");
    const entries = body.sources.map((source) => [source, source === "Racikan kunyit segar spesial mitra" ? "Partner's special fresh turmeric blend" : source]);
    await route.fulfill({ contentType: "application/json", json: { target: "en", translations: Object.fromEntries(entries) } });
  });
  await page.goto("/tests/fixtures/sliva-controls.html");
  await expect(page.getByRole("heading", { name: "Tambah pet", exact: true })).toBeVisible();
});

test("English translates new partner content, preserves identities and survives reload", async ({ page }) => {
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Add pet", exact: true })).toBeVisible();
  await expect(page.getByText("Partner's special fresh turmeric blend", { exact: true })).toBeVisible();
  await expect(page.getByText("Milo", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Add pet", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ID", exact: true }).click();
  await expect(page.getByText("Racikan kunyit segar spesial mitra", { exact: true })).toBeVisible();
});

for (const viewport of [{ width: 320, height: 640 }, { width: 768, height: 1024 }, { width: 1024, height: 600 }]) {
  test(`custom calendar submits a leap day at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.locator('input[type="date"], input[type="time"], input[type="datetime-local"], select')).toHaveCount(0);
    await page.getByRole("button", { name: "Choose a date", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Slivadoc Calendar", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Thursday, February 29, 2024", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Birth date", exact: true })).toHaveValue("2024-02-29");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("status", { name: "Submitted payload" })).toHaveText('{"birth_date":"2024-02-29","time":"09:00"}');
    await page.getByRole("button", { name: "Choose a date", exact: true }).click();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    await dialog.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Birth date" })).toBeFocused();
    await page.getByRole("textbox", { name: "Birth date" }).fill("2024-02-30");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("status", { name: "Submitted payload" })).toContainText("2024-02-29");
  });
}


test("custom time controls enforce schedule bounds and keep HH:mm payloads", async ({ page }) => {
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await page.getByRole("button", { name: "Choose a time", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Slivadoc Calendar", exact: true });
  await dialog.getByRole("combobox", { name: "Hour", exact: true }).click();
  await page.getByRole("option", { name: "07", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Done", exact: true })).toBeDisabled();
  await expect(dialog.getByRole("status")).toContainText("schedule limits");
  await dialog.getByRole("combobox", { name: "Hour", exact: true }).click();
  await page.getByRole("option", { name: "10", exact: true }).click();
  await dialog.getByRole("combobox", { name: "Minute", exact: true }).click();
  await page.getByRole("option", { name: "30", exact: true }).click();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Time", exact: true })).toHaveValue("10:30");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status", { name: "Submitted payload" })).toHaveText('{"birth_date":"2024-02-28","time":"10:30"}');
});
