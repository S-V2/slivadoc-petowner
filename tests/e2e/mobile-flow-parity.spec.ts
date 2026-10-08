import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { activityCenter, activityItem, marketplaceProduct, petOwner, petOwnerBootstrap, petOwnerPet } from "./mock-data";

const product = marketplaceProduct({ id: "52000000-0000-4000-8000-000000000888", name: "Flow Test Food" });
const notification = {
  id: "8e000000-0000-4000-8000-000000000088",
  category: "health", title: "Pengingat kesehatan Milo", body: "Periksa jadwal perawatan Milo.",
  action_route: "health", metadata: {}, read_at: null, created_at: "2026-10-07T08:00:00Z",
};
const event = {
  id: "8e000000-0000-4000-8000-000000000089", title: "Meetup Milo", slug: "meetup-milo",
  category: "meetup", description: "Bertemu pet parent dan pet lainnya.", banner_url: "", image_urls: [],
  venue: "Sliva Park", address: "Jalan Satwa 1", city: "Jakarta", latitude: null, longitude: null,
  starts_at: "2027-10-08T08:00:00Z", ends_at: "2027-10-08T10:00:00Z", capacity: 20,
  registered_count: 0, price: 0, status: "published", featured: false, pet_spot_id: null,
  pet_spot_name: "", ticket_unit: "person", allowed_pet_species: [], pet_requirements: [], terms: "Ikuti tata tertib lokasi.",
};

async function app(page: Page, options: { authenticated?: boolean; withPet?: boolean } = {}) {
  if (options.authenticated) await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "parity-token");
    localStorage.setItem("slivadoc.refresh_token", "parity-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
  });
  const mutations: string[] = [];
  const messages: Record<string, unknown>[] = [];
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() !== "GET") mutations.push(path);
    if (path === "/api/v1/auth/me") return json({ ...petOwner, role: "pet_owner" });
    if (path === "/api/v1/petowner/bootstrap") return json({ ...petOwnerBootstrap({ withPet: options.withPet }), notifications: [notification], unread_notifications: 1 });
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/public/discovery/products") return json({ data: [product], count: 1 });
    if (path === "/api/v1/public/events") return json({ data: [event], count: 1 });
    if (path === "/api/v1/public/search") return json(url.searchParams.get("q")?.toLowerCase().includes("meetup") ? { data: [{ id: event.id, category: "event", title: event.title, subtitle: event.venue, route: "events" }], count: 1 } : { data: [], count: 0 });
    if (path === `/api/v1/public/products/${product.id}/reviews`) return json({ data: [], count: 0, rating: 0 });
    if (path === "/api/v1/public/pawdating/standards") return json({ principles: [], levels: [], minimum_age_months: {}, report_validity_days: 180, blocked_conditions: [] });
    if (path === "/api/v1/public/pawdating/profiles") return json({ data: [], count: 0, filters: { species: "", breed: "", sex: "", city: "", min_level: 2, min_health_score: 80 } });
    if (path === `/api/v1/notifications/${notification.id}/read`) return json({ id: notification.id, read: true });
    if (path === "/api/v1/petowner/support-chat") {
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { body: string };
        const message = { id: "8e000000-0000-4000-8000-000000000090", ticket_id: "8e000000-0000-4000-8000-000000000091", sender_id: petOwner.id, sender_name: petOwner.full_name, sender_role: "owner", body: body.body, created_at: "2026-10-07T08:01:00Z" };
        messages.push(message);
        return json(message, 201);
      }
      return json({ ticket_id: messages.length ? messages[0].ticket_id : null, messages });
    }
    if (path === "/api/v1/petowner/marketplace/chats" || path.startsWith("/api/v1/public/")) return json({ data: [], count: 0 });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
  return mutations;
}

test("guests browse native destinations and explicitly sign in from activity", async ({ page }) => {
  await app(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Masuk untuk melihat aktivitas" })).toBeVisible();
  await expect(page.locator(".petowner-login")).toHaveCount(0);
  await page.getByRole("button", { name: "Lainnya", exact: true }).click();
  const more = page.locator(".mobile-more-sheet");
  await more.getByRole("button", { name: "Masuk ke akun" }).click();
  await expect(page.getByRole("heading", { name: "Masuk ke akun", exact: true })).toBeVisible();
  await page.locator(".profile-language-setting").getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.locator(".profile-language-setting").getByRole("button", { name: "ID", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  await page.getByRole("searchbox", { name: "Cari di seluruh Slivadoc" }).fill("Buat Booking");
  await page.locator(".owner-search-results").getByRole("button", { name: /Buat Booking/ }).click();
  await expect(page).toHaveURL(/view=discover/);
  await expect(page.locator(".petowner-login")).toHaveCount(0);
});

test("Sliva World provides all eight native features and keeps browser history", async ({ page }) => {
  await app(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=world", { waitUntil: "domcontentloaded" });
  const world = page.getByRole("navigation", { name: "Sliva World", exact: true });
  await expect(world.getByRole("button")).toHaveCount(8);
  for (const [mode, label] of [["events", "Pet Event"], ["petspot", "PetSpot"], ["pethub", "PetHub"], ["consult", "Konsultasi"], ["adoption", "Adopsi"], ["documents", "Pet Documents"], ["pawdating", "PAW Dating"]]) {
    await world.getByRole("button", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`world_mode=${mode}`));
    await expect(world.getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
  }
  await page.goBack();
  await expect(world.getByRole("button", { name: "Pet Documents", exact: true })).toHaveAttribute("aria-current", "page");
});

test("an owner without pets sees the native read-only notice and reaches pet setup before buying", async ({ page }) => {
  const mutations = await app(page, { authenticated: true });
  await page.goto(`/?view=shop&product=${product.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Mode lihat saja" })).toBeVisible();
  await page.getByRole("button", { name: "Beli sekarang", exact: true }).click();
  await expect(page).toHaveURL(/view=profile/);
  await expect(page.locator(".add-pet-modal")).toBeVisible();
  expect(mutations.some((path) => path.includes("/orders"))).toBe(false);
});

test("World search opens the selected event, including a second search in the same feature", async ({ page }) => {
  await app(page);
  await page.goto("/?view=world&world_mode=events", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("searchbox", { name: "Cari di seluruh Slivadoc" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await search.fill("Meetup Milo");
    await page.locator(".owner-search-results").getByRole("button", { name: /Meetup Milo/ }).click();
    await expect(page.locator(".world-modal")).toContainText("Meetup Milo");
    await expect(page).toHaveURL(new RegExp(`world_item=${event.id}`));
    await page.getByRole("button", { name: "Tutup detail", exact: true }).click();
  }
});

test("notifications open detail before the target and account support works without a pet", async ({ page }) => {
  await app(page, { authenticated: true });
  await page.goto("/?view=profile", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Mode lihat saja" })).toBeVisible();
  await page.locator(".notification-header-button").click();
  await page.locator(".notification-drawer .notification").click();
  const detail = page.getByRole("dialog", { name: "Detail notifikasi" });
  await expect(detail).toContainText(notification.body);
  await expect(page).toHaveURL(/view=profile/);
  await detail.getByRole("button", { name: "Kembali ke semua update" }).click();
  await expect(page.getByRole("dialog", { name: "Notifikasi", exact: true })).toBeVisible();
  await page.locator(".notification-drawer .notification").click();
  await detail.getByRole("button", { name: "Buka halaman terkait" }).click();
  await expect(page).toHaveURL(/view=health/);
  await page.goto("/?view=profile", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Chat Customer Support/ }).click();
  await expect(page.locator(".chat-drawer")).toContainText("Slivadoc Support");
  await page.getByPlaceholder("Tulis pesan ke Slivadoc Support...").fill("Tolong bantu mengatur akun saya.");
  await page.getByRole("button", { name: "Kirim pesan", exact: true }).click();
  await expect(page.locator(".chat-drawer .chat-messages")).toContainText("Tolong bantu mengatur akun saya.");
});

test("three-step free booking goes directly to its saved activity", async ({ page }) => {
  await app(page, { authenticated: true, withPet: true });
  const service = {
    id: "62000000-0000-4000-8000-000000000081", branch_id: "62000000-0000-4000-8000-000000000082",
    business_id: "62000000-0000-4000-8000-000000000083", business_name: "Sliva Care", branch_name: "Cabang Jakarta",
    name: "Pemeriksaan Milo", category: "clinic", image_url: "", image_urls: [], duration_minutes: 30, price: 0,
    address: "Jalan Satwa 1", city: "Jakarta", latitude: -6.2, longitude: 106.8, distance_km: 1,
    description: "Pemeriksaan awal untuk profil kesehatan pet.", inclusions: ["Pemeriksaan", "Rekam medis"],
    supported_species: ["dog"], cancellation_policy: "Pembatalan hingga enam jam sebelum jadwal.", business_license_status: "verified",
  };
  const bookingID = "62000000-0000-4000-8000-000000000084";
  const startsAt = "2027-10-08T03:00:00Z";
  let booked = false;
  let payload: Record<string, unknown> | undefined;
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/v1/public/discovery/services") return json({ data: [service], count: 1 });
    if (path === `/api/v1/public/discovery/services/${service.id}`) {
      const detail = Object.fromEntries(Object.entries(service).filter(([key]) => key !== "distance_km"));
      return json({ ...detail, capacity: 1, phone: "081234567890", timezone: "Asia/Jakarta", opening_hours: {},
        exclusions: [], preparation: ["Bawa pet"], aftercare: ["Ikuti saran dokter"], pet_requirements: {},
        reschedule_policy: "Pilih jadwal yang tersedia.", business_license_number: "NIB-TEST-081" });
    }
    if (path === `/api/v1/public/discovery/services/${service.id}/availability`) return json({
      service_id: service.id, branch_id: service.branch_id, timezone: "Asia/Jakarta", duration_minutes: 30, reason: "",
      data: [{ date: "2027-10-08", label: "Jumat, 8 Oktober", slots: [{ starts_at: startsAt, ends_at: "2027-10-08T03:30:00Z", local_time: "10:00", remaining_capacity: 1 }] }],
    });
    if (path === "/api/v1/petowner/bookings" && request.method() === "POST") {
      payload = request.postDataJSON();
      booked = true;
      return json({ id: bookingID, booking_code: "BOOK-MILO-081", amount: 0, status: "confirmed", payment_status: "paid", reference_type: "petowner_booking", message: "Booking tersimpan" }, 201);
    }
    if (path === "/api/v1/petowner/activities") return json(activityCenter(booked ? [activityItem({
      id: bookingID, type: "booking", title: service.name, reference_id: bookingID, code: "BOOK-MILO-081", scheduled_at: startsAt,
      pet_id: petOwnerPet.id, pet_name: petOwnerPet.name, service_name: service.name, status: "confirmed", payment_status: "paid",
    })] : []));
    return route.fallback();
  });
  await page.goto(`/?view=discover&service=${service.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".sidebar-pet-badge")).toContainText(petOwnerPet.name);
  await page.getByRole("button", { name: "Pilih jadwal & booking" }).click();
  const booking = page.locator(".booking-modal");
  await expect(booking.locator(".stepper")).toContainText("Layanan");
  await booking.getByRole("button", { name: "Lanjutkan" }).click();
  await expect(booking).toContainText("10:00");
  await booking.getByRole("button", { name: "Lanjutkan" }).click();
  await booking.getByRole("checkbox", { name: /Saya menyetujui kebijakan/ }).check();
  await booking.getByRole("button", { name: "Konfirmasi booking" }).click();
  await expect(page).toHaveURL(/view=bookings/);
  await expect(booking).toBeHidden();
  await expect(page.locator(".activity-detail-modal")).toContainText("BOOK-MILO-081");
  expect(payload).toMatchObject({ pet_id: petOwnerPet.id, service_id: service.id, branch_id: service.branch_id, scheduled_at: startsAt });
});
