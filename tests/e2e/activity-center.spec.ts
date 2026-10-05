import { expect, test } from "./fixtures";
import {
  activityCenter,
  activityItem,
  paymentIntent,
  petOwner,
  petOwnerBootstrap,
} from "./mock-data";

const hour = 3_600_000;
const enrollmentID = "7a000000-0000-4000-8000-000000000001";
const paymentID = "7b000000-0000-4000-8000-000000000001";
const ticketToken = "7e5d9c1a-4b2f-4c3d-9e8f-0a1b2c3d4e5f";

test("Aktivitas surfaces every commitment, resumes payment and deep links", async ({
  page,
}) => {
  const at = (offset: number) => new Date(Date.now() + offset).toISOString();
  let academyPaid = false;
  let intentPolls = 0;
  const createdIntents: unknown[] = [];

  const academy = () =>
    activityItem({
      id: enrollmentID,
      type: "academy",
      code: "ACD-7A000000-000",
      title: "Kelas Kepatuhan Dasar",
      subtitle: "Sliva Academy · Coach Rina",
      status: academyPaid ? "confirmed" : "pending",
      payment_status: academyPaid ? "paid" : "pending",
      amount: 175_000,
      state: "upcoming",
      needs_action: !academyPaid,
      payable: !academyPaid,
      payment_reference_type: "academy_enrollment",
      scheduled_at: at(72 * hour),
      ends_at: at(74 * hour),
      program_id: "7a000000-0000-4000-8000-000000000101",
      program_title: "Kelas Kepatuhan Dasar",
      academy_name: "Sliva Academy",
      trainer_name: "Coach Rina",
      session_count: 4,
      progress_percent: 0,
      progress_notes: "",
      last_progress_at: null,
      participant_name: "Pet Parent",
      pet_name: "Milo",
      location: "Studio Kemang",
      online_url: "",
      address: "Jalan Kemang Raya 10",
      city: "Jakarta Selatan",
      latitude: null,
      longitude: null,
    });
  const event = activityItem({
    id: "7c000000-0000-4000-8000-000000000001",
    type: "event",
    title: "Pet Fun Run",
    subtitle: "GBK · Jakarta Pusat",
    status: "confirmed",
    payment_status: "paid",
    amount: 50_000,
    needs_action: true,
    payment_reference_type: "event_registration",
    scheduled_at: at(2 * hour),
    ends_at: at(5 * hour),
    event_id: "7c000000-0000-4000-8000-000000000101",
    venue: "GBK",
    address: "Jalan Pintu Satu Senayan",
    city: "Jakarta Pusat",
    latitude: -6.2183,
    longitude: 106.8016,
    ticket_quantity: 1,
    qr_token: ticketToken,
    paid_at: at(-hour),
  });
  const reservation = activityItem({
    id: "7d000000-0000-4000-8000-000000000001",
    type: "reservation",
    code: "PSR-261005-0001",
    title: "Pawstay Cafe",
    subtitle: "Meja Teras",
    status: "confirmed",
    payment_status: "paid",
    amount: 100_000,
    payment_reference_type: "petspot_reservation",
    scheduled_at: at(96 * hour),
    ends_at: at(98 * hour),
    spot_name: "Pawstay Cafe",
    resource_name: "Meja Teras",
    guest_count: 2,
    pet_count: 1,
    deposit_amount: 100_000,
    remaining_amount: 150_000,
    hold_expires_at: at(-hour),
  });
  const hotel = activityItem({
    id: "7f000000-0000-4000-8000-000000000001",
    type: "hotel",
    code: "STY-0001",
    title: "Pet hotel · Kamar Deluxe",
    subtitle: "Klinik Sliva · Cabang Kemang",
    status: "reserved",
    payment_status: "not_required",
    scheduled_at: at(72 * hour),
    ends_at: at(120 * hour),
    room_name: "Kamar Deluxe",
    business_name: "Klinik Sliva",
    branch_name: "Cabang Kemang",
    checked_in_at: null,
    checked_out_at: null,
    pet_name: "Milo",
  });
  const notification = {
    id: "7a100000-0000-4000-8000-000000000001",
    category: "academy",
    title: "Progres kelas diperbarui",
    body: "Kelas Kepatuhan Dasar · progres 25%",
    action_route: "activity",
    metadata: { activity_type: "academy", activity_id: enrollmentID },
    read_at: null,
    created_at: at(-hour),
  };

  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "activity-test-token");
    localStorage.setItem("slivadoc.refresh_token", "activity-test-refresh");
    localStorage.setItem("slivadoc.access_expires_at", String(Date.now() + 3_600_000));
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
      return json({
        ...petOwnerBootstrap(),
        notifications: [notification],
        unread_notifications: 1,
      });
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter([academy(), event, reservation, hotel]));
    if (path === "/api/v1/payment-intents" && request.method() === "POST") {
      createdIntents.push(request.postDataJSON());
      return json(
        paymentIntent({
          id: paymentID,
          reference_id: enrollmentID,
          reference_type: "academy_enrollment",
          amount: 175_000,
        }),
        201,
      );
    }
    if (path === `/api/v1/payment-intents/${paymentID}`) {
      // The first poll still sees the QR waiting; the next one sees it paid.
      intentPolls += 1;
      if (intentPolls > 1) academyPaid = true;
      return json(
        paymentIntent({
          id: paymentID,
          reference_id: enrollmentID,
          reference_type: "academy_enrollment",
          amount: 175_000,
          ...(academyPaid
            ? {
                status: "paid",
                payment_status: "paid",
                paid_at: new Date().toISOString(),
              }
            : {}),
        }),
      );
    }
    if (path === `/api/v1/notifications/${notification.id}/read`)
      return json({ id: notification.id, read: true });

    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });

  const attention = page.getByRole("region", { name: "Perlu tindakan" });
  const academyAction = attention
    .locator("article")
    .filter({ hasText: "Kelas Kepatuhan Dasar" });
  const eventAction = attention
    .locator("article")
    .filter({ hasText: "Pet Fun Run" });
  await expect(academyAction.getByRole("button", { name: "Bayar" })).toBeVisible();
  await expect(
    eventAction.getByRole("button", { name: "Tiket QR" }),
  ).toBeVisible();
  await expect(attention.locator("article")).toHaveCount(2);

  await expect(
    page.getByRole("group", { name: "Jenis aktivitas" }).getByRole("button"),
  ).toHaveText([/^Semua/, /^Kelas/, /^Event/, /^Reservasi/, /^Pet hotel/]);

  const detail = page.locator(".activity-detail-modal");
  await eventAction.getByRole("button", { name: "Tiket QR" }).click();
  await expect(detail.locator(".activity-ticket svg")).toBeVisible();
  await expect(detail.locator(".activity-ticket")).toContainText(
    ticketToken.slice(0, 13).toUpperCase(),
  );
  await detail.getByRole("button", { name: "Selesai" }).click();
  await expect(detail).toBeHidden();

  await academyAction.getByRole("button", { name: "Bayar" }).click();
  await expect(detail.locator(".qris-code svg")).toBeVisible();
  expect(createdIntents).toEqual([
    {
      reference_type: "academy_enrollment",
      reference_id: enrollmentID,
      payment_method: "qris",
    },
  ]);
  await expect(
    detail.getByRole("heading", { name: "Pembayaran berhasil" }),
  ).toBeVisible();
  await expect(detail.locator(".activity-detail-hero em")).toHaveText(
    "Terkonfirmasi",
  );
  await detail.getByRole("button", { name: "Selesai" }).click();
  await expect(detail).toBeHidden();

  await page.getByRole("button", { name: "Notifikasi" }).click();
  await page.getByRole("button", { name: /Progres kelas diperbarui/ }).click();
  await expect(detail.getByRole("heading", { name: "Kelas Kepatuhan Dasar" })).toBeVisible();
  await expect(detail).toContainText("Coach Rina");
});
