import assert from "node:assert/strict";
import test from "node:test";

import {
  activityAttentionReason,
  activityRepeatLabels,
  activityStatusLabel,
  activityStatusText,
  activityTypeOrder,
  getActivityTypeMeta,
} from "../app/lib/activity-center.ts";

test("Aktivitas lists the nine kinds in the chip order and repeats only the original three", () => {
  assert.deepEqual(activityTypeOrder, [
    "booking",
    "order",
    "consultation",
    "academy",
    "event",
    "reservation",
    "document",
    "donation",
    "hotel",
  ]);
  assert.deepEqual(Object.keys(activityRepeatLabels), [
    "booking",
    "order",
    "consultation",
  ]);
});

test("unknown activity kinds use a safe generic presentation", () => {
  assert.deepEqual(getActivityTypeMeta("legacy_service"), {
    label: "Aktivitas",
    icon: "calendar",
    tone: "sky",
  });
  assert.equal(getActivityTypeMeta(undefined).tone, "sky");
});

test("status labels put payability and expiry ahead of the raw status", () => {
  const label = (status: string, payment_status = "paid", payable = false) =>
    activityStatusLabel({ status, payment_status, payable });
  assert.equal(label("requested", "pending", true), "Menunggu pembayaran");
  assert.equal(label("cancelled", "expired"), "Kedaluwarsa");
  assert.equal(label("cancelled", "failed"), "Kedaluwarsa");
  assert.equal(label("cancelled", "paid"), "Dibatalkan");
  assert.equal(label("requested", "pending"), "Menunggu konfirmasi");
  assert.equal(label("reserved", "not_required"), "Terjadwal");
  assert.equal(label("need_revision"), "Perlu revisi");
  assert.equal(label("checked_out"), "Selesai");
  assert.equal(label("on_the_way"), "on the way");
  assert.equal(activityStatusText("refunded"), "Dana dikembalikan");
});

test("the attention reason names what the owner has to do", () => {
  const now = new Date("2026-10-05T08:00:00Z");
  const reason = (
    overrides: Partial<Parameters<typeof activityAttentionReason>[0]>,
  ) =>
    activityAttentionReason(
      {
        type: "event",
        status: "confirmed",
        payable: false,
        scheduled_at: null,
        ...overrides,
      },
      now,
    );
  assert.equal(
    reason({ type: "academy", status: "pending", payable: true }),
    "Menunggu pembayaran",
  );
  assert.equal(
    reason({ type: "document", status: "need_revision" }),
    "Dokumen perlu dilengkapi",
  );
  assert.match(reason({ scheduled_at: "2026-10-05T10:00:00Z" }), /^Mulai \S/);
  assert.equal(
    reason({ scheduled_at: "2026-10-05T07:00:00Z" }),
    "Sedang berlangsung",
  );
});
