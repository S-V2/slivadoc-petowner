export const sitterModes = [
  {
    value: "home_visit",
    label: "Kunjungan rumah",
    description: "Makan, bermain, dan menjaga rutinitas di rumahmu.",
  },
  {
    value: "house_sitting",
    label: "Temani di rumah",
    description: "Pendampingan di rumah sesuai durasi profil sitter.",
  },
  {
    value: "dog_walking",
    label: "Jalan bersama",
    description: "Aktivitas jalan untuk anjing sesuai kebutuhan.",
  },
] as const;
export type SitterMode = (typeof sitterModes)[number]["value"];
export type PetSitter = {
  id: string;
  is_local_profile?: boolean;
  distance_km?: number | null;
  service_radius_km?: number;
  display_name: string;
  city: string;
  district: string;
  bio: string;
  photo_url: string;
  experience_years: number;
  species: string[];
  service_modes: SitterMode[];
  discount_enabled?: boolean;
  discount_percent?: number;
  daily_rate: number;
  weekly_rate: number;
  extra_pet_rate: number;
  max_pets: number;
  visit_minutes: number;
  inclusions: string;
  cancellation_policy: string;
  rating: number;
  review_count: number;
  identity_verified: boolean;
  interview_verified: boolean;
  safety_verified: boolean;
};
export type SittingQuote = {
  discount_amount?: number;
  discount_percent?: number;
  days: number;
  base_amount: number;
  extra_pet_amount: number;
  total_amount: number;
  savings: number;
  visit_minutes: number;
  package: string;
  currency: string;
};
export type SittingInput = {
  sitter_id: string;
  pet_ids: string[];
  package: "daily" | "weekly";
  service_mode: SitterMode;
  starts_on: string;
  ends_on: string;
  preferred_time: string;
  address: string;
  emergency_phone: string;
  care_notes: string;
  request_key: string;
  pet_count: number;
  expected_amount?: number;
};
export type SittingBooking = SittingInput & {
  id: string;
  booking_number: string;
  sitter_name: string;
  sitter_photo: string;
  city: string;
  amount: number;
  pricing: SittingQuote;
  status: string;
  display_status: string;
  payment_status: string;
  hold_expires_at: string;
  cancellation_requested: boolean;
  cancellation_reason: string;
  owner_name: string;
  pets: Array<{ id: string; name: string; species: string }>;
  review_rating: number | null;
};
export type SittingUpdate = {
  id: string;
  author_name: string;
  kind: string;
  body: string;
  photo_url: string;
  created_at: string;
};
export type SitterDetail = {
  sitter: PetSitter;
  reviews: Array<{
    rating: number;
    body: string;
    owner_name: string;
    created_at: string;
  }>;
  unavailable_dates: Array<{ day: string }>;
};
export const sittingStatuses: Record<string, string> = {
  requested: "Menunggu sitter",
  awaiting_payment: "Siap dibayar",
  confirmed: "Jadwal dikonfirmasi",
  in_progress: "Sedang dirawat",
  completed: "Selesai",
  declined: "Belum cocok",
  cancelled: "Dibatalkan",
  expired: "Permintaan kedaluwarsa",
};
export function sittingEndDate(start: string, days: number) {
  const date = new Date(start + "T00:00:00Z");
  if (!Number.isFinite(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days - 1);
  return date.toISOString().slice(0, 10);
}
export function sittingToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export type SitterFilters = {
  city?: string;
  species?: string;
  mode?: string;
  latitude?: number;
  longitude?: number;
  max_distance_km?: number;
};
export function createSitterClient(
  transport: <T>(path: string, init?: RequestInit) => Promise<T>,
) {
  const request = <T>(path: string, init?: RequestInit) =>
    transport<T>(path, { cache: "no-store", ...init });
  const send = <T>(path: string, body: unknown, method = "POST") =>
    request<T>(path, { method, body: JSON.stringify(body) });
  return {
    list: (filters: SitterFilters = {}) =>
      request<{ data: PetSitter[] }>(
        `/api/v1/public/pet-sitters?${new URLSearchParams(
          Object.entries(filters)
            .filter(([, value]) => value != null)
            .map(([key, value]) => [key, String(value)]),
        )}`,
      ),
    detail: (id: string) =>
      request<SitterDetail>(
        `/api/v1/public/pet-sitters/${encodeURIComponent(id)}`,
      ),
    quote: (id: string, input: Partial<SittingInput>) =>
      send<{ quote: SittingQuote; available: boolean }>(
        `/api/v1/public/pet-sitters/${encodeURIComponent(id)}/quote`,
        input,
      ),
    book: (input: SittingInput) =>
      send<{ id: string; message: string }>(
        "/api/v1/pet-sitting/bookings",
        input,
      ),
    bookings: () =>
      request<{ data: SittingBooking[] }>("/api/v1/pet-sitting/bookings"),
    booking: (id: string) =>
      request<{ booking: SittingBooking; updates: SittingUpdate[] }>(
        `/api/v1/pet-sitting/bookings/${encodeURIComponent(id)}`,
      ),
    change: (id: string, action: string, note = "") =>
      send(
        `/api/v1/pet-sitting/bookings/${encodeURIComponent(id)}`,
        { action, note },
        "PATCH",
      ),
    message: (id: string, body: string) =>
      send(`/api/v1/pet-sitting/bookings/${encodeURIComponent(id)}/updates`, {
        kind: "message",
        body,
      }),
    review: (id: string, rating: number, body: string) =>
      send(`/api/v1/pet-sitting/bookings/${encodeURIComponent(id)}/review`, {
        rating,
        body,
      }),
  };
}

export function sittingCancellationMessage(
  booking: Pick<
    SittingBooking,
    "payment_status" | "display_status" | "cancellation_requested"
  >,
): string {
  if (booking.payment_status === "refunded")
    return "Dana telah dikembalikan. Periksa detail pengembalian dana di notifikasi.";
  if (
    booking.display_status === "cancelled" &&
    booking.payment_status === "paid"
  )
    return "Pembatalan disetujui. Pengembalian dana menunggu proses Finance.";
  if (booking.cancellation_requested)
    return "Pembatalan sedang ditinjau Operasional. Jadwal tetap berlaku sampai ada keputusan.";
  return "";
}

/** Match the server: discount each base package in whole rupiah, excluding extra pets. */
export function sitterDiscountPercent(
  sitter: Pick<PetSitter, "discount_enabled" | "discount_percent">,
) {
  const percent = sitter.discount_percent ?? 0;
  return sitter.discount_enabled &&
    Number.isInteger(percent) &&
    percent > 0 &&
    percent <= 80
    ? percent
    : 0;
}
export function sitterPackageRate(sitter: PetSitter, weekly = false) {
  const rate = weekly ? sitter.weekly_rate : sitter.daily_rate;
  return rate - Math.floor((rate * sitterDiscountPercent(sitter)) / 100);
}
