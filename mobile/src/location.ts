import * as SecureStore from "expo-secure-store";

export type StoredLocation = { latitude: number; longitude: number; label: string };
export type LocationSource = "device" | "manual";
export type LocationPreferences = { source?: LocationSource; updatedAt: number };
export const LOCATION_REFRESH_MS = 15 * 60 * 1000;

// SecureStore is the key-value store the app already uses; keys allow "." and "_".
const LOCATION_KEY = "slivadoc.location";
const LOCATION_PREFERENCES_KEY = "slivadoc.location_preferences";
export const DEVICE_LOCATION_LABEL = "Lokasi perangkat";
export const PIN_LOCATION_LABEL = "Titik pilihan di peta";

export async function loadStoredLocation(): Promise<StoredLocation | undefined> {
  try {
    const raw = await SecureStore.getItemAsync(LOCATION_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<StoredLocation>;
    if (
      typeof value.latitude === "number" && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
      typeof value.longitude === "number" && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
    ) {
      return { latitude: value.latitude, longitude: value.longitude, label: String(value.label ?? DEVICE_LOCATION_LABEL) };
    }
  } catch {
    // A corrupt or unavailable entry means no chosen location.
  }
  return undefined;
}

export async function loadLocationPreferences(): Promise<LocationPreferences> {
  try {
    const raw = await SecureStore.getItemAsync(LOCATION_PREFERENCES_KEY);
    const value = raw ? JSON.parse(raw) : undefined;
    return {
      source: value?.source === "device" || value?.source === "manual" ? value.source : undefined,
      updatedAt: typeof value?.updatedAt === "number" && Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
    };
  } catch { return { updatedAt: 0 }; }
}

export async function saveStoredLocation(location: StoredLocation, preferences?: LocationPreferences) {
  try {
    await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(location));
    if (preferences) await SecureStore.setItemAsync(LOCATION_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // The in-memory choice still applies for this session.
  }
}

export function nearestFirst<T extends { distance_km?: number | null }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const a = typeof left.distance_km === "number" && Number.isFinite(left.distance_km) ? left.distance_km : Infinity;
    const b = typeof right.distance_km === "number" && Number.isFinite(right.distance_km) ? right.distance_km : Infinity;
    return a === b ? 0 : a - b;
  });
}
