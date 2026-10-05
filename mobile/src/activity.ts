import type { Ionicons } from "@expo/vector-icons";

import type { MobileActivityCenterItem, MobileActivityType } from "./api";
import { colors } from "./theme";

type ActivityTypePresentation = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  surface: string;
};

const sky = { color: colors.sky600, surface: colors.sky50 };
const violet = { color: "#6655C7", surface: colors.violet50 };
const mint = { color: "#14836E", surface: colors.mint50 };

export const activityTypePresentation: Record<
  MobileActivityType,
  ActivityTypePresentation
> = {
  booking: { label: "Booking", icon: "calendar-outline", ...sky },
  order: { label: "Belanja", icon: "bag-handle-outline", ...violet },
  consultation: { label: "Konsultasi", icon: "chatbubbles-outline", ...mint },
  academy: { label: "Kelas", icon: "school-outline", ...violet },
  event: { label: "Event", icon: "ticket-outline", ...violet },
  reservation: { label: "Reservasi", icon: "location-outline", ...sky },
  document: { label: "Dokumen", icon: "document-text-outline", ...mint },
  donation: { label: "Donasi", icon: "heart-outline", ...mint },
  hotel: { label: "Pet hotel", icon: "bed-outline", ...sky },
};

export const emptyActivitySummary: Record<MobileActivityType, number> = {
  booking: 0,
  order: 0,
  consultation: 0,
  academy: 0,
  event: 0,
  reservation: 0,
  document: 0,
  donation: 0,
  hotel: 0,
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

export function activityStatusLabel(
  item: Pick<MobileActivityCenterItem, "payable" | "status" | "payment_status">,
) {
  if (item.payable) return "Menunggu pembayaran";
  if (
    item.status === "cancelled" &&
    (item.payment_status === "expired" || item.payment_status === "failed")
  )
    return "Kedaluwarsa";
  return statusLabels[item.status] ?? item.status.replaceAll("_", " ");
}

export function activityAttentionReason(
  item: Pick<MobileActivityCenterItem, "payable" | "type" | "status" | "scheduled_at">,
  formatStart: (value: string) => string,
  now = Date.now(),
) {
  if (item.payable) return "Menunggu pembayaran";
  if (item.type === "document" && item.status === "need_revision")
    return "Dokumen perlu dilengkapi";
  if (item.scheduled_at && Date.parse(item.scheduled_at) > now)
    return `Mulai ${formatStart(item.scheduled_at)}`;
  return "Sedang berlangsung";
}

export function activityStatusTone(
  item: Pick<MobileActivityCenterItem, "status">,
): "blue" | "mint" | "yellow" | "red" {
  if (["completed", "issued", "checked_out", "paid"].includes(item.status))
    return "mint";
  if (
    ["cancelled", "no_show", "rejected", "expired", "failed", "returned"].includes(
      item.status,
    )
  )
    return "red";
  if (
    [
      "active",
      "in_progress",
      "processing",
      "shipped",
      "checked_in",
      "verification",
    ].includes(item.status)
  )
    return "blue";
  return "yellow";
}
