import type { GeoPoint } from "../components/platform/GeoMap";
import type { LocationResult } from "./petowner-api";

export const DEVICE_LOCATION_LABEL = "Lokasi perangkat";
export const PIN_LOCATION_LABEL = "Titik di peta";

// Reverse geocoding needs a session (the petowner API keeps /api/location/*
// authenticated), so a guest keeps the raw coordinates under a fixed label.
export async function resolveLocation(
  point: GeoPoint,
  options: {
    authenticated: boolean;
    reverse: (latitude: number, longitude: number) => Promise<LocationResult>;
    guestLabel: string;
  },
): Promise<LocationResult> {
  if (options.authenticated) return options.reverse(point.latitude, point.longitude);
  return { latitude: point.latitude, longitude: point.longitude, label: options.guestLabel };
}
