import { expect, test } from "@playwright/test";

// Explicit opt-in prevents a general E2E run from writing applicant data to a live API.
const qaAPI = process.env.CAREER_E2E_API_URL;
const qaToken = process.env.CAREER_E2E_ACCESS_TOKEN;
test.beforeEach(async ({ page }) => { if (!qaToken) throw new Error("Set CAREER_E2E_ACCESS_TOKEN to a valid disposable QA account token."); await page.addInitScript(token => { localStorage.setItem("slivadoc.access_token", token); localStorage.setItem("slivadoc.access_expires_at", String(Date.now()+3600000)); }, qaToken); });
test.skip(!qaAPI, "Set CAREER_E2E_API_URL for a disposable local QA database.");
test.beforeAll(() => {
  if (!qaAPI) return;
  const url = new URL(qaAPI);
  if (
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    process.env.NEXT_PUBLIC_PLATFORM_API_URL !== qaAPI
  ) {
    throw new Error("Career E2E requires matching local QA API URLs.");
  }
});

// This suite uses the actual Career API + disposable PostgreSQL QA database.
// NEXT_PUBLIC_PLATFORM_API_URL points the dev server at the QA API.
test("career catalog filters, restores role links, and submits a role-specific application", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/career");
  await expect(
    page.getByRole("heading", {
      name: "Karier yang berarti. Dampak untuk setiap pet.",
    }),
  ).toBeVisible();
  await expect(page.locator(".career-job")).toHaveCount(28);
  await page.screenshot({
    path: testInfo.outputPath("career-mobile.png"),
    fullPage: false,
  });
  await page
    .getByRole("combobox", { name: "Divisi", exact: true })
    .selectOption("engineering");
  await expect(page.locator(".career-job")).toHaveCount(5);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Meaningful careers. An impact for every pet.",
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "View role: Backend Engineer", exact: true })
    .click();
  await expect(page).toHaveURL(/career\/backend-engineer/);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Backend Engineer",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  const form = page.locator(".career-form");
  const submit = form.getByRole("button", {
    name: "Submit application",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  await form.getByLabel("Full name").fill("Slivadoc QA Applicant");
  await form
    .getByLabel("Active email")
    .fill(`career-e2e-${Date.now()}@example.test`);
  await form.getByLabel("Phone number").fill("abc08123-4567890");
  await expect(form.getByLabel("Phone number")).toHaveValue("081234567890");
  await form.getByLabel("City / location").fill("Jakarta");
  await form
    .getByLabel("Education / learning background")
    .fill("Computer Science");
  await form.getByLabel("Relevant experience (years)").fill("3");
  await form.getByLabel("When can you start?").fill("One month notice");
  await form
    .getByLabel("Why would you like to join Slivadoc?")
    .fill(
      "I would like to build reliable APIs that improve pet care experiences.",
    );
  await form
    .getByLabel("Backend languages, databases, and your experience")
    .fill("Go and PostgreSQL: three years building reliable APIs.");
  await form
    .getByLabel("Describe an API or system you have built")
    .fill("A booking and payment system with automated tests and audit logs.");
  await form
    .getByLabel("Portfolio / work samples URL")
    .fill("https://example.test/portfolio");
  await form.getByLabel("CV / resume", { exact: true }).setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF"),
  });
  await form.getByRole("checkbox", { name: /I confirm/ }).check();
  await form.getByRole("checkbox", { name: /I consent/ }).click();
  const dialog = page.getByRole("dialog");
  const agree = dialog.getByRole("button", { name: "I have read and agree" });
  await expect(agree).toBeDisabled();
  await dialog.locator(".legal-consent-scroll").evaluate((node) => {
    node.scrollTop = node.scrollHeight;
    node.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await agree.click();
  await expect(submit).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("career-form-mobile.png"),
    fullPage: true,
  });
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith("/public/career-applications") &&
      response.request().method() === "POST",
  );
  await submit.click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const result = await response.json();
  await expect(page.getByText(result.id, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your application is in!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Browse more roles" }).click();
  await expect(page.locator(".career-job")).toHaveCount(5);
  await page
    .getByRole("combobox", { name: "Department", exact: true })
    .selectOption("");
  await expect(page.locator(".career-job")).toHaveCount(28);
  await page
    .getByRole("link", {
      name: "View role: Veterinary & Medical Governance Advisor",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel(
      "Professional registration / practice license status (no identity upload)",
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Backend languages, databases, and your experience"),
  ).toHaveCount(0);
  await expect(page.getByLabel("Full name")).toHaveValue("");
});

test("career desktop and mobile layouts fit the viewport and expose employment choices", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/career");
  await expect(page.locator(".career-job")).toHaveCount(28);
  await page.screenshot({
    path: testInfo.outputPath("career-desktop.png"),
    fullPage: false,
  });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .getByRole("link", {
      name: "Lihat posisi: UI/UX Product Designer",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Tautan portofolio / contoh karya"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/career/pet-sitter");
  await expect(page.getByLabel("Pilihan jenis kerja")).toHaveValue("");
  await page.getByLabel("Pilihan jenis kerja").selectOption("CONTRACTOR");
  await expect(page.getByLabel("Pilihan jenis kerja")).toHaveValue(
    "CONTRACTOR",
  );
  await expect(
    page.getByRole("button", { name: "Kirim lamaran", exact: true }),
  ).toBeDisabled();
});
