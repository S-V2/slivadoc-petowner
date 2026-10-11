import * as Location from "expo-location";
import { DEVICE_LOCATION_LABEL, type StoredLocation } from "./location";

// Expo's one-shot GPS request has no timeout option. Keep unavailable GPS from
// blocking the picker or the foreground refresher indefinitely.
export async function readDeviceLocation(): Promise<StoredLocation> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Lokasi perangkat belum dapat ditemukan.")), 20_000);
      }),
    ]);
    const { latitude, longitude } = position.coords;
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      throw new Error("Lokasi perangkat belum dapat ditemukan.");
    }
    return { latitude, longitude, label: DEVICE_LOCATION_LABEL };
  } finally { if (timer) clearTimeout(timer); }
}
