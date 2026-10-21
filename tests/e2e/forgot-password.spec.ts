import { expect, test } from "./fixtures";

test("forgot password sends OTP, resets, and returns to login with email prefilled", async ({ page }) => {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let otpAccepted = false;
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (path === "/api/v1/auth/forgot-password") {
      calls.push({ path, body: route.request().postDataJSON() });
      return json({ message: "Jika akun ditemukan, OTP reset password akan dikirim ke email." }, 202);
    }
    if (path === "/api/v1/auth/reset-password") {
      const body = route.request().postDataJSON();
      calls.push({ path, body });
      if (body.otp !== "123456") return json({ code: "invalid_otp", message: "OTP salah atau sudah kedaluwarsa" }, 422);
      otpAccepted = true;
      return json({ message: "Password berhasil diperbarui. Silakan login kembali." });
    }
    if (path === "/api/v1/auth/me") return json({ message: "Unauthorized" }, 401);
    return json({ data: [], count: 0 });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=profile", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Masuk / Daftar", exact: true }).click();
  await page.getByRole("button", { name: "Lupa password?" }).click();
  await expect(page.getByRole("heading", { name: "Lupa password?" })).toBeVisible();

  const form = page.locator(".login-form");
  const send = page.getByRole("button", { name: "Kirim kode OTP" });
  await expect(send).toBeDisabled();
  await form.locator('[name="email"]').fill("Parent@Example.test");
  await send.click();
  await expect.poll(() => calls[0]?.body).toEqual({ email: "parent@example.test" });
  await expect(page.getByRole("heading", { name: "Atur ulang password" })).toBeVisible();
  await expect(page.getByText("Jika akun ditemukan, OTP reset password akan dikirim ke email.")).toBeVisible();

  const resend = page.getByRole("button", { name: /Kirim ulang OTP/ });
  await expect(resend).toBeDisabled();

  const submit = page.getByRole("button", { name: "Atur ulang password" });
  await form.locator('[name="otp"]').fill("000000");
  await form.locator('[name="password"]').fill("weakpass");
  await expect(submit).toBeDisabled();
  await form.locator('[name="password"]').fill("NewPetParent#123");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("alert")).toContainText("OTP salah atau sudah kedaluwarsa");
  expect(otpAccepted).toBe(false);

  await form.locator('[name="otp"]').fill("123456");
  await submit.click();
  await expect.poll(() => calls.at(-1)?.body).toEqual({
    email: "parent@example.test",
    otp: "123456",
    new_password: "NewPetParent#123",
  });
  await expect(page.getByRole("heading", { name: "Senang melihatmu kembali" })).toBeVisible();
  await expect(page.getByText("Password berhasil diperbarui. Silakan login kembali.")).toBeVisible();
  await expect(page.locator('.login-form [name="email"]')).toHaveValue("parent@example.test");
});
