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
  return activityStatusText(item.status);
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
