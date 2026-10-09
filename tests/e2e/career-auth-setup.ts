import type { Page } from "@playwright/test";
export async function careerSignedIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "career-ui-test");
    localStorage.setItem(
      "slivadoc.access_expires_at",
      String(Date.now() + 3600000),
    );
  });
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: "5c3e42a1-c440-49b1-aa4f-5b9aab6e24b4",
        email: "career-ui@example.test",
        full_name: "Career QA",
        role: "pet_owner",
      },
    }),
  );
}
