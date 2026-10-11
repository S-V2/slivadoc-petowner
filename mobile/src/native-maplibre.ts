import { TurboModuleRegistry, type TurboModule } from "react-native";

export function loadNativeMapLibre(): typeof import("@maplibre/maplibre-react-native") | null {
  // Expo Go does not include MapLibre. Check before evaluating the package:
  // its top-level getEnforcing calls otherwise crash the entire app on startup.
  if (
    !TurboModuleRegistry.get<TurboModule>("MLRNCameraModule") ||
    !TurboModuleRegistry.get<TurboModule>("MLRNMapViewModule")
  ) {
    return null;
  }

  // Keep this synchronous import behind the native-module checks for Expo Go.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@maplibre/maplibre-react-native");
}
