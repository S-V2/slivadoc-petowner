import { expect, test } from "./fixtures";
import { petOwner, petOwnerBootstrap } from "./mock-data";

const veterinarianID = "57000000-0000-4000-8000-000000000401";
const planID = "57000000-0000-4000-8000-000000000402";
const consultationID = "57000000-0000-4000-8000-000000000403";
const slot = "2026-10-10T03:00:00Z";

test("doctor booking searches providers and submits a server-provided slot", async ({
  page,
}) => {
  let consultationBody: Record<string, unknown> | undefined;
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "consultation-test-token");
    localStorage.setItem("slivadoc.refresh_token", "consultation-test-refresh");
    localStorage.setItem(
      "slivadoc.access_expires_at",
      String(Date.now() + 3_600_000),
    );
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });

    if (path === "/api/v1/auth/me")
      return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities")
      return json({
        data: [],
        count: 0,
        summary: { booking: 0, order: 0, consultation: 0 },
      });
    if (
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/public/veterinarians")
      return json({
        data: [
          {
            id: veterinarianID,
            full_name: "drh. Rani Satwa",
            strv_number: "STRV-TEST-401",
            specialties: ["Dermatologi"],
            bio: "Menangani masalah kulit dan alergi hewan kecil.",
            photo_url: "",
            experience_years: 8,
            rating: 4.9,
            consultation_count: 321,
            languages: ["Bahasa Indonesia", "English"],
            availability_status: "online",
            starting_price: 0,
          },
        ],
        count: 1,
      });
    if (path === "/api/v1/public/consultation-plans")
      return json({
        data: [
          {
            id: planID,
            veterinarian_id: veterinarianID,
            doctor_name: "drh. Rani Satwa",
            specialties: ["Dermatologi"],
            name: "Video Pemeriksaan Kulit",
            mode: "video",
            description: "Konsultasi video terjadwal.",
            duration_minutes: 30,
            followup_days: 3,
            chat_quota: 5,
            voice_minutes: 0,
            video_minutes: 30,
            price: 0,
            discount_percent: 0,
            features: [],
          },
        ],
        count: 1,
      });
    if (
      path === "/api/v1/public/trainers" ||
      path === "/api/v1/public/trainer-consultation-plans"
    )
      return json({ data: [], count: 0 });
    if (
      path ===
      `/api/v1/public/veterinarians/${veterinarianID}/availability`
    )
      return json({
        data: [{ starts_at: slot, duration_minutes: 30 }],
        count: 1,
        timezone: "Asia/Jakarta",
        from: "2026-10-04T00:00:00+07:00",
        until: "2026-10-18T00:00:00+07:00",
      });
    if (path === "/api/v1/consultations" && request.method() === "POST") {
      consultationBody = request.postDataJSON();
      return json(
        {
          id: consultationID,
          order_number: "VET-261004000000-TEST01",
          room_key: "57000000-0000-4000-8000-000000000404",
          amount: 0,
          status: "scheduled",
          payment_status: "paid",
          reference_type: "consultation",
          provider_type: "veterinarian",
        },
        201,
      );
    }
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.goto("/?view=consult", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("searchbox", {
    name: "Cari dokter hewan atau pet trainer",
  });
  await search.fill("alergi");
  await expect(page.getByText("drh. Rani Satwa")).toBeVisible();
  await search.fill("");
  await page.getByRole("button", { name: "Lihat paket" }).click();
  await page.getByRole("button", { name: /Video Pemeriksaan Kulit/ }).click();
  await page
    .getByRole("textbox", { name: /Keluhan utama/ })
    .fill("Kulit kemerahan dan sering digaruk sejak kemarin.");
  await page.getByLabel("Slot jadwal · Asia/Jakarta").selectOption(slot);
  await page.getByRole("button", { name: "Mulai konsultasi gratis" }).click();

  await expect.poll(() => consultationBody?.scheduled_at).toBe(slot);
  expect(consultationBody).toMatchObject({
    veterinarian_id: veterinarianID,
    plan_id: planID,
    scheduled_at: slot,
  });
});
