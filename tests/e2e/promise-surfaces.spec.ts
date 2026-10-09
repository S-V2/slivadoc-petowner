import type { Page, Route } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  activityCenter,
  activityItem,
  paymentIntent,
  petOwner,
  petOwnerBootstrap,
} from "./mock-data";

const hour = 3_600_000;
const at = (offset: number) => new Date(Date.now() + offset).toISOString();

type Handler = (
  path: string,
  route: Route,
  json: (body: unknown, status?: number) => Promise<void>,
) => Promise<void> | void | undefined;

// Signed-in pet owner whose platform API answers through `handle`; anything
// the handler leaves alone gets the empty catalogue answers every view needs.
async function signIn(page: Page, handle: Handler) {
  await page.addInitScript(() => {
    localStorage.setItem("slivadoc.access_token", "promise-test-token");
    localStorage.setItem("slivadoc.refresh_token", "promise-test-refresh");
    localStorage.setItem(
      "slivadoc.access_expires_at",
      String(Date.now() + 3_600_000),
    );
  });
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let answered = false;
    const json = (body: unknown, status = 200) => {
      answered = true;
      return route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    };
    if (path === "/api/v1/auth/me")
      return json({ ...petOwner, role: "pet_owner" });
    await handle(path, route, json);
    if (answered) return;
    if (
      path === "/api/v1/public/discovery/services" ||
      path === "/api/v1/public/discovery/products" ||
      path === "/api/v1/public/campaigns"
    )
      return json({ data: [], count: 0 });
    return route.fulfill({ status: 404, body: "Unmocked API route" });
  });
}

const shipment = {
  id: "8a000000-0000-4000-8000-000000000011",
  shipping_number: "SLV-ORD-0001",
  provider: "Lion Parcel",
  provider_shipment_id: "C1-0001",
  stt_no: "STT-0001-XYZ",
  service_code: "REGPACK",
  status: "in_transit",
  provider_status: "IN_TRANSIT",
  pickup_status: "success",
  fee: 12_000,
  estimated_sla: "2 - 3 Hari",
  print_url: "",
  receiver: {},
  events: [
    {
      status_code: "PUP",
      status: "picked_up",
      description: "Paket dijemput Lion Parcel",
      location: "Gudang Jakarta",
      journey_type: "",
      reference_stt_no: "",
      occurred_at: "2026-10-05T09:00:00Z",
    },
  ],
};

test("Aktivitas order detail shows each shipment with its tracking events", async ({
  page,
}) => {
  const order = activityItem({
    id: "8a000000-0000-4000-8000-000000000001",
    type: "order",
    code: "SHOP-0001",
    title: "Pesanan SHOP-0001",
    subtitle: "Pet Shop QA",
    status: "shipped",
    amount: 62_000,
    state: "ongoing",
    subtotal: 50_000,
    shipping_fee: 12_000,
    total_amount: 62_000,
    item_count: 1,
    items: [
      {
        id: "8a000000-0000-4000-8000-000000000021",
        product_id: "8a000000-0000-4000-8000-000000000031",
        name: "Pakan QA",
        quantity: 2,
        unit_price: 25_000,
        line_total: 50_000,
      },
    ],
    shipments: [shipment],
  });
  await signIn(page, (path, _route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter([order]));
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /^Berlangsung/ }).click();
  await page.getByRole("button", { name: /Pesanan SHOP-0001/ }).click();
  const card = page.locator(".activity-detail-modal .activity-shipment");
  await expect(card).toContainText("SLV-ORD-0001");
  await expect(card).toContainText("Dalam perjalanan");
  await expect(card).toContainText("STT-0001-XYZ");
  await expect(card).toContainText("Paket dijemput Lion Parcel");
});

test("booking cancel is offered before the cutoff and queues the refund", async ({
  page,
}) => {
  const bookingID = "8b000000-0000-4000-8000-000000000001";
  let cancelled = false;
  const cancelBodies: unknown[] = [];
  const booking = () =>
    activityItem({
      id: bookingID,
      type: "booking",
      code: "PO-CANCEL-001",
      title: "Grooming Small",
      subtitle: "Paws & Care · Kemang",
      status: cancelled ? "cancelled" : "confirmed",
      payment_status: cancelled ? "refund_pending" : "paid",
      amount: 120_000,
      state: cancelled ? "history" : "upcoming",
      scheduled_at: at(72 * hour),
      service_name: "Grooming Small",
      service_duration_minutes: 90,
      business_name: "Paws & Care",
      branch_name: "Kemang",
      pet_name: "Luna",
      cancellable_until: at(48 * hour),
      cancellation_cutoff_hours: 24,
      cancellation_policy: "Pembatalan gratis sampai 24 jam sebelum jadwal.",
    });
  const pastCutoff = activityItem({
    id: "8b000000-0000-4000-8000-000000000002",
    type: "booking",
    code: "PO-LATE-002",
    title: "Vaksin Rutin",
    subtitle: "Klinik Sliva · Kemang",
    status: "confirmed",
    amount: 90_000,
    scheduled_at: at(6 * hour),
    service_name: "Vaksin Rutin",
    cancellable_until: at(-2 * hour),
    cancellation_cutoff_hours: 24,
    cancellation_policy: "",
  });
  const clinic = activityItem({
    id: "8b000000-0000-4000-8000-000000000003",
    type: "booking",
    code: "CLN-003",
    title: "Kontrol Klinik",
    subtitle: "Klinik Sliva",
    status: "confirmed",
    payment_status: "not_required",
    scheduled_at: at(96 * hour),
    source: "clinic",
  });
  await signIn(page, async (path, route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap({ withPet: true }));
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter([booking(), pastCutoff, clinic]));
    if (path === `/api/v1/petowner/bookings/${bookingID}/cancel`) {
      cancelBodies.push(route.request().postDataJSON());
      cancelled = true;
      return json({ id: bookingID, status: "cancelled", refund_queued: true });
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: /Kontrol Klinik/ }).click();
  const detail = page.locator(".activity-detail-modal");
  await expect(detail).toContainText("CLN-003");
  await expect(detail.getByRole("button", { name: "Batalkan booking" })).toHaveCount(0);
  await detail.getByRole("button", { name: "Selesai" }).click();

  await page.getByRole("button", { name: /Vaksin Rutin/ }).click();
  await expect(detail).toContainText("Batas pembatalan sudah lewat");
  await expect(detail.getByRole("button", { name: "Batalkan booking" })).toHaveCount(0);
  await detail.getByRole("button", { name: "Selesai" }).click();

  await page.getByRole("button", { name: /Grooming Small/ }).click();
  await expect(detail).toContainText("Bisa dibatalkan hingga 24 jam sebelum jadwal");
  await detail.getByRole("button", { name: "Batalkan booking" }).click();
  await expect(detail).toContainText(
    "Pembatalan gratis sampai 24 jam sebelum jadwal.",
  );
  await detail.getByRole("button", { name: "Ya, batalkan" }).click();
  await expect(detail).toContainText("Dana akan dikembalikan");
  expect(cancelBodies).toEqual([{}]);
  await expect(detail.locator(".activity-detail-hero em")).toHaveText(
    "Menunggu pengembalian dana",
  );
});

test("a document in need_revision takes the missing uploads and goes back to verification", async ({
  page,
}) => {
  const requestID = "8c000000-0000-4000-8000-000000000001";
  const patches: unknown[] = [];
  let resubmitted = false;
  const document = () =>
    activityItem({
      id: requestID,
      type: "document",
      code: "DOC-0001",
      title: "Surat Kesehatan Hewan",
      subtitle: "Jakarta → Bali",
      status: resubmitted ? "verification" : "need_revision",
      payment_status: "paid",
      amount: 150_000,
      needs_action: !resubmitted,
      payment_reference_type: "document_request",
      product_name: "Surat Kesehatan Hewan",
      missing_requirements: resubmitted ? [] : ["Surat vaksin"],
      issued_document_url: "",
    });
  await page.route("**/api/uploads/documents", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://files.example.test/surat-vaksin.pdf",
        publicId: "documents/surat-vaksin",
        mimeType: "application/pdf",
        bytes: 4,
      }),
    }),
  );
  await signIn(page, async (path, route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap({ withPet: true }));
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter([document()]));
    if (path === "/api/v1/pet-document-requests" && route.request().method() === "GET")
      return json({
        data: [
          {
            id: requestID,
            request_number: "DOC-0001",
            product_name: "Surat Kesehatan Hewan",
            status: "need_revision",
            payment_status: "paid",
            amount: 150_000,
            origin_city: "Jakarta",
            destination_city: "Bali",
            departure_at: null,
            missing_requirements: ["Surat vaksin"],
            submitted_documents: [
              {
                requirement: "KTP pemilik",
                url: "https://files.example.test/ktp.pdf",
                file_name: "ktp.pdf",
                mime_type: "application/pdf",
              },
            ],
            issued_document_url: "",
            notes: "",
            created_at: "2026-10-01T08:00:00Z",
          },
        ],
        count: 1,
      });
    if (path === `/api/v1/pet-document-requests/${requestID}/documents`) {
      patches.push(route.request().postDataJSON());
      resubmitted = true;
      return json({ id: requestID, status: "verification" });
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Surat Kesehatan Hewan/ }).first().click();
  const detail = page.locator(".activity-detail-modal");
  await expect(detail).toContainText("Surat vaksin");
  const send = detail.getByRole("button", { name: "Kirim dokumen" });
  await expect(send).toBeDisabled();
  await detail
    .locator('input[type="file"]')
    .setInputFiles({
      name: "surat-vaksin.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF"),
    });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(detail).toContainText("sedang diverifikasi ulang");
  expect(patches).toEqual([
    {
      submitted_documents: [
        {
          requirement: "KTP pemilik",
          url: "https://files.example.test/ktp.pdf",
          file_name: "ktp.pdf",
          mime_type: "application/pdf",
        },
        {
          requirement: "Surat vaksin",
          url: "https://files.example.test/surat-vaksin.pdf",
          file_name: "surat-vaksin.pdf",
          mime_type: "application/pdf",
        },
      ],
    },
  ]);
  await expect(detail.locator(".activity-detail-hero em")).toHaveText(
    "Diverifikasi",
  );
});

test("an expired QR is not shown as a payable code", async ({ page }) => {
  const enrollmentID = "8d000000-0000-4000-8000-000000000001";
  const academy = activityItem({
    id: enrollmentID,
    type: "academy",
    code: "ACD-8D000000-000",
    title: "Kelas Kepatuhan Dasar",
    subtitle: "Sliva Academy",
    status: "pending",
    payment_status: "pending",
    amount: 175_000,
    needs_action: true,
    payable: true,
    payment_reference_type: "academy_enrollment",
    scheduled_at: at(72 * hour),
    program_title: "Kelas Kepatuhan Dasar",
    academy_name: "Sliva Academy",
  });
  await signIn(page, (path, route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap({ withPet: true }));
    if (path === "/api/v1/petowner/activities")
      return json(activityCenter([academy]));
    if (path === "/api/v1/payment-intents" && route.request().method() === "POST")
      return json(
        paymentIntent({
          id: "8d000000-0000-4000-8000-000000000002",
          reference_id: enrollmentID,
          reference_type: "academy_enrollment",
          amount: 175_000,
          status: "expired",
          payment_status: "expired",
        }),
        201,
      );
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=bookings", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("region", { name: "Perlu tindakan" })
    .getByRole("button", { name: "Bayar" })
    .click();
  const detail = page.locator(".activity-detail-modal");
  await expect(detail).toContainText(
    "QR kedaluwarsa. Buat pembayaran baru dari Aktivitas.",
  );
  await expect(detail.locator(".qris-code")).toHaveCount(0);
});

test("the notification badge counts every unread item and the center lists up to 100", async ({
  page,
}) => {
  const notification = (index: number) => ({
    id: `8e000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    category: "health",
    title: `Pengingat ${index}`,
    body: "Jadwal perawatan",
    action_route: "health",
    metadata: {},
    read_at: null,
    created_at: at(-index * hour),
  });
  const all = Array.from({ length: 12 }, (_, index) => notification(index + 1));
  const queries: string[] = [];
  await signIn(page, (path, route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json({
        ...petOwnerBootstrap(),
        notifications: all.slice(0, 8),
        unread_notifications: 12,
      });
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/notifications") {
      queries.push(new URL(route.request().url()).search);
      return json({ data: all, count: all.length, unread_count: 12 });
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=notifications", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".notification-center-head b")).toHaveText("12");
  await expect(page.locator(".notification-center-list button")).toHaveCount(12);
  expect(queries[0]).toContain("limit=100");
  await expect(
    page.getByRole("button", { name: "Notifikasi" }).locator(".notif-dot"),
  ).toBeVisible();
});

test("the bell shows no unread dot when everything is read", async ({ page }) => {
  await signIn(page, (path, _route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Notifikasi" })).toBeVisible();
  await expect(page.locator(".notif-dot")).toHaveCount(0);
});

test("a support ticket opens its conversation and sends a reply", async ({
  page,
}) => {
  const ticketID = "8f000000-0000-4000-8000-000000000001";
  const messages = [
    {
      id: "8f000000-0000-4000-8000-000000000011",
      ticket_id: ticketID,
      sender_id: petOwner.id,
      sender_name: "Pet Parent",
      sender_role: "owner",
      body: "Pesanan belum sampai.",
      created_at: "2026-10-05T08:00:00Z",
    },
    {
      id: "8f000000-0000-4000-8000-000000000012",
      ticket_id: ticketID,
      sender_id: "8f000000-0000-4000-8000-0000000000aa",
      sender_name: "Tim Support",
      sender_role: "support",
      body: "Kami cek ke kurir ya.",
      created_at: "2026-10-05T09:00:00Z",
    },
  ];
  const sent: unknown[] = [];
  await signIn(page, async (path, route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json(petOwnerBootstrap());
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
    if (path === "/api/v1/petowner/support-tickets")
      return json({
        data: [
          {
            id: ticketID,
            ticket_number: "TKT-0001",
            category: "shipping",
            priority: "normal",
            subject: "Pengiriman tertunda",
            description: "Pesanan belum sampai setelah lima hari.",
            status: "waiting_customer",
            resolution: "",
            reference_type: "other",
            reference_id: null,
            response_due_at: null,
            first_response_at: "2026-10-05T09:00:00Z",
            created_at: "2026-10-05T08:00:00Z",
            updated_at: "2026-10-05T09:00:00Z",
            resolved_at: null,
          },
        ],
        count: 1,
      });
    if (path === `/api/v1/petowner/support-tickets/${ticketID}/messages`) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        sent.push(body);
        return json(
          {
            id: "8f000000-0000-4000-8000-000000000013",
            ticket_id: ticketID,
            sender_id: petOwner.id,
            sender_name: "Pet Parent",
            sender_role: "owner",
            body: body.body,
            created_at: "2026-10-05T10:00:00Z",
          },
          201,
        );
      }
      return json({ data: messages, count: messages.length });
    }
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=support", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Percakapan & balas" }).click();
  await expect(page.locator(".support-thread")).toContainText("Kami cek ke kurir ya.");
  await expect(page.locator(".support-thread li.support b")).toHaveText("Tim Slivadoc");
  await page.getByLabel("Balasan ticket").fill("Terima kasih, saya tunggu.");
  await page.getByRole("button", { name: "Kirim", exact: true }).click();
  await expect(page.locator(".support-thread")).toContainText(
    "Terima kasih, saya tunggu.",
  );
  expect(sent).toEqual([{ body: "Terima kasih, saya tunggu." }]);
});

test("a family-shared pet is badged and hides the owner-only actions", async ({
  page,
}) => {
  const pet = {
    id: "90000000-0000-4000-8000-000000000001",
    name: "Biscuit",
    species: "dog",
    species_group: "dog",
    species_common_name: "Dog",
    species_scientific_name: "Canis lupus familiaris",
    species_attributes: {},
    emoji: "🐶",
    type: "Dog",
    breed: "Beagle",
    sex: "male",
    birth_date: "2022-01-01",
    age_months: 57,
    color: "Brown",
    weight_kg: 11,
    microchip_number: "",
    allergies: "",
    medical_notes: "",
    vaccination_status: "complete",
    photo_url: "",
    medical_record_count: 0,
    health_score: 90,
    last_medical_record_at: null,
    access_role: "viewer",
    permissions: ["health"],
  };
  await signIn(page, (path, _route, json) => {
    if (path === "/api/v1/petowner/bootstrap")
      return json({ ...petOwnerBootstrap(), pets: [pet] });
    if (path === "/api/v1/petowner/activities") return json(activityCenter());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=pets", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pet-profile-card")).toContainText("Dibagikan");
  await expect(page.getByRole("button", { name: /Edit profil/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Kelola akses keluarga" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Kelola Lost Pet Mode" }),
  ).toHaveCount(0);
});

test.describe("PetSpot review link", () => {
  test("accepts one review and thanks the visitor", async ({ page }) => {
    const posted: unknown[] = [];
    await page.route("**/api/v1/public/petspot-reviews/tok-ok", async (route) => {
      if (route.request().method() === "POST") {
        posted.push(route.request().postDataJSON());
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            status: "completed",
            message: "Terima kasih, ulasanmu sudah tampil.",
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          spot_name: "Pawstay Cafe",
          recipient_name: "Rani",
          status: "opened",
        }),
      });
    });
    await page.goto("/reviews/tok-ok", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /Pawstay Cafe/ }),
    ).toBeVisible();
    const submit = page.getByRole("button", { name: "Kirim ulasan" });
    await expect(submit).toBeDisabled();
    await page.getByRole("radio", { name: "4 bintang" }).click();
    await page.getByLabel("Komentar (opsional)").fill("Ramah dan bersih.");
    await submit.click();
    await expect(
      page.getByRole("heading", { name: "Ulasanmu sudah terkirim" }),
    ).toBeVisible();
    expect(posted).toEqual([{ rating: 4, comment: "Ramah dan bersih." }]);
  });

  test("explains an unknown link and an already used link", async ({ page }) => {
    await page.route("**/api/v1/public/petspot-reviews/tok-missing", (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          code: "review_request_not_found",
          message: "Link ulasan tidak ditemukan",
        }),
      }),
    );
    await page.route("**/api/v1/public/petspot-reviews/tok-used", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          spot_name: "Pawstay Cafe",
          recipient_name: "Rani",
          status: "completed",
        }),
      }),
    );
    await page.goto("/reviews/tok-missing", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Link ulasan tidak valid" }),
    ).toBeVisible();
    await page.goto("/reviews/tok-used", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Ulasan sudah dikirim" }),
    ).toBeVisible();
  });
});
