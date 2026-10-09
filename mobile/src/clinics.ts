import type { MobileBranchType } from "./api.ts";
import type { StoredLocation } from "./location.ts";

export const RADIUS_OPTIONS_KM = [3, 5, 10, 25] as const;
export type ClinicTypeFilter = "all" | "petclinic" | "petshop";
export type ClinicFilters = {
  location?: StoredLocation;
  type: ClinicTypeFilter;
  search: string;
  // 0 means any distance.
  radiusKm: number;
  openNow: boolean;
};

// Insertion order is the display order.
const DAY_LABELS: Record<string, string> = {
  mon: "Senin",
  tue: "Selasa",
  wed: "Rabu",
  thu: "Kamis",
  fri: "Jumat",
  sat: "Sabtu",
  sun: "Minggu",
};

export function branchTypeLabel(type: MobileBranchType) {
  if (type === "petclinic") return "Klinik";
  if (type === "petshop") return "Petshop";
  return "Klinik & Petshop";
}

export function directionsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

export function formatDistanceKm(km: number, locale: string) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(km)} km`;
}

// Radius only applies with a chosen location; the server ignores it otherwise.
export function branchListOptions(filters: ClinicFilters, paging: { limit: number; offset: number }) {
  const { location } = filters;
  return {
    ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
    ...(location && filters.radiusKm > 0 ? { max_distance_km: filters.radiusKm } : {}),
    ...(filters.type === "all" ? {} : { type: filters.type }),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.openNow ? { open_now: true } : {}),
    ...paging,
  };
}

const LONG_DAYS: Record<string, string> = {
  mon: "monday", tue: "tuesday", wed: "wednesday", thu: "thursday", fri: "friday", sat: "saturday", sun: "sunday",
};
const WEEKDAY_KEYS = new Set([...Object.keys(LONG_DAYS), ...Object.values(LONG_DAYS)]);

function formatHours(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatHours).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    const { open, close } = value as { open?: unknown; close?: unknown };
    return typeof open === "string" && typeof close === "string" ? `${open}-${close}` : "";
  }
  return typeof value === "string" ? value.trim() : "";
}

// Weekdays are keyed "mon" or "monday"; like the backend, the short key wins when both exist.
export function openingHoursRows(hours: Record<string, unknown> | null | undefined) {
  const schedule: Record<string, unknown> = Object.fromEntries(
    Object.entries(hours ?? {}).map(([day, value]) => [day.toLowerCase(), value]),
  );
  const known = Object.entries(DAY_LABELS).flatMap(([key, label]) => {
    const text = formatHours(key in schedule ? schedule[key] : schedule[LONG_DAYS[key] ?? key]);
    return text ? [[label, text] as const] : [];
  });
  const other = Object.entries(hours ?? {})
    .filter(([day]) => !WEEKDAY_KEYS.has(day.toLowerCase()))
    .flatMap(([day, value]) => {
      const text = formatHours(value);
      return text ? [[day === "daily" ? "Setiap hari" : day, text] as const] : [];
    });
  return [...known, ...other];
}

export function branchCountsLabel(services: number, products: number, language: "id" | "en") {
  return language === "en"
    ? `${services} ${services === 1 ? "service" : "services"} · ${products} ${products === 1 ? "product" : "products"}`
    : `${services} layanan · ${products} produk`;
}
