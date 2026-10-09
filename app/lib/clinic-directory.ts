import type { DiscoveryBranch, DiscoveryBranchParams } from "./platform-api.ts";

export const CLINIC_PAGE_SIZE = 20;
export const CLINIC_RADIUS_OPTIONS = [3, 5, 10, 25] as const;

export type ClinicTypeFilter = "all" | "clinic" | "petshop";

export type ClinicFilters = {
  type: ClinicTypeFilter;
  search: string;
  radiusKm: number | null;
  openNow: boolean;
};

export const defaultClinicFilters: ClinicFilters = {
  type: "all",
  search: "",
  radiusKm: null,
  openNow: false,
};

const typeParam: Record<ClinicTypeFilter, DiscoveryBranchParams["type"]> = {
  all: undefined,
  clinic: "petclinic",
  petshop: "petshop",
};

// UI filters to the API query. The radius is dropped without a point; the API
// ignores it too, but a disabled control must never leak a stale value.
export function clinicQuery(
  filters: ClinicFilters,
  coords: { latitude: number; longitude: number } | null,
  offset = 0,
  limit = CLINIC_PAGE_SIZE,
): DiscoveryBranchParams {
  return {
    ...(coords ?? {}),
    ...(coords && filters.radiusKm ? { max_distance_km: filters.radiusKm } : {}),
    type: typeParam[filters.type],
    search: filters.search.trim() || undefined,
    open_now: filters.openNow || undefined,
    limit,
    offset: offset || undefined,
  };
}

// Ambiguous in the shared dictionary ("Klinik & Petshop" is the plural menu name),
// so the badge and the Daftar/List tab pick their words per language here.
const typeLabels = {
  id: { petclinic: "Klinik", petshop: "Petshop", hybrid: "Klinik & Petshop" },
  en: { petclinic: "Clinic", petshop: "Pet shop", hybrid: "Clinic & Pet Shop" },
} as const;

export const clinicTypeLabel = (type: DiscoveryBranch["type"], language: "id" | "en" = "id") =>
  typeLabels[language][type];

export function formatDistanceKm(km: number | null) {
  if (km === null || !Number.isFinite(km)) return "";
  return km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)} m` : `${km.toFixed(1)} km`;
}

export const branchPlace = (branch: Pick<DiscoveryBranch, "district" | "city">) =>
  [branch.district, branch.city].filter(Boolean).join(", ");

export const directionsUrl = (branch: Pick<DiscoveryBranch, "latitude" | "longitude">) =>
  `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;

// Weekday keys come as "mon" or "monday"; like the backend's parseOpeningWindows,
// the short key wins when a row has both. Other keys ("daily", free text) follow as stored.
const weekdays = [
  ["mon", "monday", "Senin"],
  ["tue", "tuesday", "Selasa"],
  ["wed", "wednesday", "Rabu"],
  ["thu", "thursday", "Kamis"],
  ["fri", "friday", "Jumat"],
  ["sat", "saturday", "Sabtu"],
  ["sun", "sunday", "Minggu"],
] as const;
const weekdayKeys = new Set<string>(weekdays.flatMap(([short, long]) => [short, long]));

function formatHours(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatHours).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const { open, close } = value as { open?: unknown; close?: unknown };
    return typeof open === "string" && typeof close === "string" ? `${open}-${close}` : "";
  }
  return typeof value === "string" ? value : "";
}

export function openingHoursRows(hours: DiscoveryBranch["opening_hours"] | null | undefined) {
  const schedule: Record<string, unknown> = hours ?? {};
  const rows: { day: string; hours: string }[] = [];
  for (const [short, long, label] of weekdays) {
    const value = short in schedule ? schedule[short] : schedule[long];
    const text = formatHours(value);
    if (text) rows.push({ day: label, hours: text });
  }
  for (const [key, value] of Object.entries(schedule)) {
    if (weekdayKeys.has(key.toLowerCase())) continue;
    const text = formatHours(value);
    if (text) rows.push({ day: key === "daily" ? "Setiap hari" : key, hours: text });
  }
  return rows;
}

export const hasClinicFilters = (filters: ClinicFilters) =>
  filters.type !== "all" || Boolean(filters.search.trim()) || filters.radiusKm !== null || filters.openNow;
