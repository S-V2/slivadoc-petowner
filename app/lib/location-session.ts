import type { LocationResult } from "./petowner-api.ts";

export const LOCATION_KEY = "slivadoc.location";
export const LOCATION_PREFERENCES_KEY = "slivadoc.location_preferences";
export const LOCATION_REFRESH_MS = 15 * 60 * 1000;
export type LocationSource = "device" | "manual";
export type LocationPreferences = { source?: LocationSource; updatedAt: number };

export function parseStoredLocation(raw: string | null): LocationResult | null {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (!value || typeof value.latitude !== "number" || !Number.isFinite(value.latitude) || Math.abs(value.latitude) > 90
      || typeof value.longitude !== "number" || !Number.isFinite(value.longitude) || Math.abs(value.longitude) > 180
      || typeof value.label !== "string") return null;
    return value;
  } catch { return null; }
}

export function parseLocationPreferences(raw: string | null): LocationPreferences {
  if (!raw) return { updatedAt: 0 };
  try {
    const value = JSON.parse(raw);
    return { source: value?.source === "manual" || value?.source === "device" ? value.source : undefined,
      updatedAt: typeof value?.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0 };
  } catch { return { updatedAt: 0 }; }
}
