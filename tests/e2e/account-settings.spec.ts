import { expect, test } from "./fixtures";
import { activityCenter, petOwner, petOwnerBootstrap } from "./mock-data";

test("account settings update the profile, filter security alerts, and manage family access", async ({
  page,
}) => {
  const petID = "58000000-0000-4000-8000-000000000101";
  const ownerAccessID = "58000000-0000-4000-8000-000000000201";
  const caregiverAccessID = "58000000-0000-4000-8000-000000000202";
  const invitedAccessID = "58000000-0000-4000-8000-000000000203";
  let profile = { ...petOwner };
  let profileUpdate: Record<string, unknown> | undefined;
  let familyInvite: Record<string, unknown> | undefined;
  let revokedAccessID = "";
  let family = [
    {
      id: ownerAccessID,
      member_user_id: petOwner.id,
      email: petOwner.email,
      full_name: petOwner.full_name,
      role: "owner",
      permissions: ["profile", "health", "booking"],
      status: "active",
      accepted_at: "2026-01-01T08:00:00Z",
      created_at: "2026-01-01T08:00:00Z",
    },
    {
      id: caregiverAccessID,
      member_user_id: "",
      email: "caregiver@example.test",
      full_name: "Care Giver",
      role: "caregiver",
      permissions: ["profile", "health", "booking"],
      status: "pending",
      accepted_at: null,
      created_at: "2026-10-01T08:00:00Z",
    },
  ];
  const securityNotification = {
    id: "58000000-0000-4000-8000-000000000301",
    category: "security",
    title: "Login baru terdeteksi",
    body: "Perangkat baru masuk ke akun Slivadoc kamu.",
    action_route: "profile",
    metadata: {},
    read_at: null,
    created_at: "2026-10-06T01:00:00Z",
  };
  const healthNotification = {
    id: "58000000-0000-4000-8000-000000000302",
    category: "health",
    title: "Jadwal vaksin Milo",
    body: "Vaksin berikutnya jatuh tempo minggu ini.",
    action_route: "health",
    metadata: {},
    read_at: null,
    created_at: "2026-10-06T00:00:00Z",
  };

  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "account-settings-token");
    localStorage.setItem("slivadoc.refresh_token", "account-settings-refresh");
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
      return json({ ...profile, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap")
      return json({
        ...petOwnerBootstrap(),
        user: {
          ...profile,
          public_code: "7K2Q9M",
          member_since: "2026-01-01T08:00:00Z",
        },
        pets: [
          {
            id: petID,
            name: "Milo",
            species: "dog",
            species_group: "dog",
            species_common_name: "Dog",
            species_scientific_name: "Canis lupus familiaris",
            species_attributes: {},
            emoji: "🐶",
            type: "Dog",
            breed: "Golden Retriever",
            sex: "male",
            birth_date: "2022-01-01",
            age_months: 57,
            color: "Golden",
            weight_kg: 28,
            microchip_number: "",
            allergies: "",
            medical_notes: "",
            vaccination_status: "complete",
            photo_url: "",
            medical_record_count: 2,
            last_medical_record_at: "2026-09-01T08:00:00Z",
            health_score: 92,
            access_role: "owner",
            permissions: ["profile", "health", "booking", "family", "lost_mode"],
          },
        ],
        notifications: [securityNotification, healthNotification],
        unread_notifications: 2,
      });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns" ||
      path === "/api/v1/public/veterinarians"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/petowner/shipping-addresses")
      return json({ addresses: [] });
    if (
      path === "/api/v1/petowner/profile" &&
      request.method() === "PATCH"
    ) {
      profileUpdate = request.postDataJSON();
      profile = { ...profile, ...profileUpdate };
      return json({
        full_name: profile.full_name,
        phone: profile.phone,
        message: "Profil berhasil diperbarui",
      });
    }
    if (path === `/api/v1/petowner/pets/${petID}/family`) {
      if (request.method() === "GET")
        return json({ data: family, count: family.length });
      familyInvite = request.postDataJSON();
      family = [
        ...family,
        {
          id: invitedAccessID,
          member_user_id: "",
          email: String(familyInvite?.email ?? ""),
          full_name: String(familyInvite?.full_name ?? ""),
          role: String(familyInvite?.role ?? "viewer"),
          permissions: ["profile", "health", "booking"],
          status: "pending",
          accepted_at: null,
          created_at: "2026-10-06T02:00:00Z",
        },
      ];
      return json(
        { id: invitedAccessID, message: "Undangan keluarga berhasil dibuat" },
        201,
      );
    }
    if (
      path.startsWith("/api/v1/petowner/family/") &&
      request.method() === "DELETE"
    ) {
      revokedAccessID = path.split("/").at(-1) ?? "";
      family = family.filter((item) => item.id !== revokedAccessID);
      return json({ message: "Akses berhasil dicabut" });
    }

    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=home", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".app-shell")).toBeVisible();
  await expect(page.locator(".home-member-card")).toHaveCount(0);

  await page.goto("/?view=profile", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".profile-member-card")).toContainText("SLV-PO-7K2Q9M");

  await page.getByRole("button", { name: "Edit profil" }).click();
  const editProfile = page.getByRole("heading", { name: "Edit profil pet parent" });
  await expect(editProfile).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Nama lengkap" })).toHaveValue(
    "Pet Parent",
  );
  await expect(page.getByRole("textbox", { name: "Nomor telepon" })).toHaveValue(
    "081234567890",
  );
  await page.getByRole("textbox", { name: "Nama lengkap" }).fill("Pet Parent Baru");
  await page.getByRole("textbox", { name: "Nomor telepon" }).fill("081298765432");
  await page.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect.poll(() => profileUpdate).toEqual({
    full_name: "Pet Parent Baru",
    phone: "081298765432",
  });
  await expect(page.locator(".profile-person h2")).toHaveText("Pet Parent Baru");

  await page.getByRole("button", { name: /Privasi & keamanan/ }).click();
  const notificationDrawer = page.locator(".notification-drawer");
  await expect(notificationDrawer).toBeVisible();
  await expect(
    notificationDrawer.getByRole("button", { name: "Keamanan" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(notificationDrawer).toContainText("Login baru terdeteksi");
  await expect(notificationDrawer).not.toContainText("Jadwal vaksin Milo");
  await notificationDrawer.locator("header button").click();

  await page.getByRole("button", { name: /Keluarga & akses/ }).click();
  const familyModal = page.locator(".family-modal");
  await expect(familyModal).toBeVisible();
  await expect(familyModal).toContainText("Pet Parent");
  await expect(familyModal).toContainText("Care Giver");
  await familyModal.getByRole("textbox", { name: "Nama lengkap" }).fill("Trusted Sibling");
  await familyModal.getByRole("textbox", { name: "Email" }).fill("sibling@example.test");
  await familyModal.getByRole("combobox", { name: "Role akses" }).selectOption("viewer");
  await familyModal.getByRole("button", { name: "Kirim undangan" }).click();
  await expect.poll(() => familyInvite).toEqual({
    email: "sibling@example.test",
    full_name: "Trusted Sibling",
    role: "viewer",
    permissions: ["profile", "health", "booking"],
  });
  await expect(familyModal).toContainText("Trusted Sibling");

  const invitedMember = familyModal
    .locator(".family-access-list > div")
    .filter({ hasText: "Trusted Sibling" });
  await invitedMember.getByRole("button", { name: "Cabut" }).click();
  await expect.poll(() => revokedAccessID).toBe(invitedAccessID);
  await expect(familyModal).not.toContainText("Trusted Sibling");
});
