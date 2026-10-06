import type { IconName } from "../components/Icon.tsx";
import type {
  ActivityType,
  PetOwnerActivityCenterItem,
} from "./platform-api.ts";

export const activityTypeMeta: Record<
  ActivityType,
  { label: string; icon: IconName; tone: "sky" | "mint" | "violet" }
> = {
  booking: { label: "Booking", icon: "calendar", tone: "sky" },
  order: { label: "Belanja", icon: "bag", tone: "violet" },
  consultation: { label: "Konsultasi", icon: "chat", tone: "mint" },
  academy: { label: "Kelas", icon: "sparkle", tone: "violet" },
  event: { label: "Event", icon: "star", tone: "violet" },
  reservation: { label: "Reservasi", icon: "map", tone: "sky" },
  document: { label: "Dokumen", icon: "shield", tone: "mint" },
  donation: { label: "Donasi", icon: "heart", tone: "mint" },
  hotel: { label: "Pet hotel", icon: "home", tone: "sky" },
  home_service: { label: "Layanan jemput", icon: "map", tone: "sky" },
};

export const activityTypeOrder = Object.keys(
  activityTypeMeta,
) as ActivityType[];

const fallbackActivityTypeMeta = {
  label: "Aktivitas",
  icon: "calendar" as IconName,
  tone: "sky" as const,
};

export function getActivityTypeMeta(type: string | null | undefined) {
  if (!type) return fallbackActivityTypeMeta;
  return activityTypeMeta[type as ActivityType] ?? fallbackActivityTypeMeta;
}

// Only the three original kinds can be repeated; the newer ones are one-off
// commitments (a class seat, a ticket, a document).
export const activityRepeatLabels: Partial<Record<ActivityType, string>> = {
  booking: "Booking lagi",
  order: "Beli lagi",
  consultation: "Konsultasi ulang",
};

const statusLabels: Record<string, string> = {
  requested: "Menunggu konfirmasi",
  pending: "Menunggu pembayaran",
  pending_payment: "Menunggu pembayaran",
  confirmed: "Terkonfirmasi",
  scheduled: "Terjadwal",
  reserved: "Terjadwal",
  waiting: "Menunggu dokter",
  active: "Berjalan",
  in_progress: "Berjalan",
  processing: "Diproses",
  shipped: "Dikirim",
  checked_in: "Sudah check-in",
  checked_out: "Selesai",
  completed: "Selesai",
  issued: "Terbit",
  verification: "Diverifikasi",
  need_revision: "Perlu revisi",
  submitted: "Diajukan",
  draft: "Draf",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  no_show: "Tidak hadir",
  returned: "Dikembalikan",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  refunded: "Dana dikembalikan",
  refund_pending: "Menunggu pengembalian dana",
  assigned: "Driver ditugaskan",
  on_the_way: "Driver menuju lokasi",
  picked_up: "Pet dijemput",
  in_service: "Sedang dilayani",
  returning: "Dalam perjalanan pulang",
};

export function activityStatusText(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

export function activityStatusLabel(
  item: Pick<PetOwnerActivityCenterItem, "status" | "payment_status" | "payable">,
) {
  if (item.payable) return "Menunggu pembayaran";
  if (
    item.status === "cancelled" &&
    (item.payment_status === "expired" || item.payment_status === "failed")
  )
    return "Kedaluwarsa";
  // A queued or finished refund is what the payer wants to see, ahead of the
  // cancelled/closed state that caused it.
  if (item.payment_status === "refund_pending" || item.payment_status === "refunded")
    return activityStatusText(item.payment_status);
  return activityStatusText(item.status);
}

// Lion Parcel shipment status -> owner-facing label and progress stage (0-3).
export function shipmentPresentation(status: string): {
  label: string;
  stage: number;
} {
  const normalized = status.toLowerCase();
  if (normalized === "delivered") return { label: "Sudah diterima", stage: 3 };
  if (normalized === "returning")
    return { label: "Dalam perjalanan retur", stage: 2 };
  if (normalized === "returned")
    return { label: "Diretur ke pengirim", stage: 2 };
  if (normalized === "exception")
    return { label: "Ada kendala pengiriman", stage: 2 };
  if (normalized === "in_transit")
    return { label: "Dalam perjalanan", stage: 2 };
  if (normalized === "booked") return { label: "Menunggu pickup", stage: 1 };
  if (normalized === "pickup_requested")
    return { label: "Pickup dijadwalkan", stage: 1 };
  if (normalized === "cancelled")
    return { label: "Pengiriman dibatalkan", stage: 0 };
  return { label: "Sedang diproses", stage: 0 };
}

export function activityAttentionReason(
  item: Pick<
    PetOwnerActivityCenterItem,
    "type" | "status" | "payable" | "scheduled_at"
  >,
  now = new Date(),
) {
  if (item.payable) return "Menunggu pembayaran";
  if (item.type === "document" && item.status === "need_revision")
    return "Dokumen perlu dilengkapi";
  if (item.scheduled_at && new Date(item.scheduled_at) > now)
    return `Mulai ${new Date(item.scheduled_at).toLocaleString("id-ID", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  return "Sedang berlangsung";
}

export function formatActivityDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
