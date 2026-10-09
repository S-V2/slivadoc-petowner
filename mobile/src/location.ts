import * as SecureStore from "expo-secure-store";

export type StoredLocation = { latitude: number; longitude: number; label: string };

// SecureStore is the key-value store the app already uses; keys allow "." and "_".
const LOCATION_KEY = "slivadoc.location";
export const DEVICE_LOCATION_LABEL = "Lokasi perangkat";
export const PIN_LOCATION_LABEL = "Titik pilihan di peta";

export async function loadStoredLocation(): Promise<StoredLocation | undefined> {
  try {
    const raw = await SecureStore.getItemAsync(LOCATION_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw) as Partial<StoredLocation>;
    if (
      typeof value.latitude === "number" && Number.isFinite(value.latitude) &&
      typeof value.longitude === "number" && Number.isFinite(value.longitude)
    ) {
      return { latitude: value.latitude, longitude: value.longitude, label: String(value.label ?? DEVICE_LOCATION_LABEL) };
    }
  } catch {
    // A corrupt or unavailable entry means no chosen location.
  }
  return undefined;
}

export async function saveStoredLocation(location: StoredLocation) {
  try {
    await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(location));
  } catch {
    // The in-memory choice still applies for this session.
  }
}
