import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import * as ExpoLocation from "expo-location";
import * as SecureStore from "expo-secure-store";

import { reverseMobileGeocode, searchMobileLocation } from "../../src/api";
import { LanguageProvider } from "../../src/i18n";
import { DEVICE_LOCATION_LABEL } from "../../src/location";

jest.mock("../../src/api", () => ({
  reverseMobileGeocode: jest.fn(),
  searchMobileLocation: jest.fn(),
}));
jest.mock("expo-location", () => ({
  ...jest.requireActual<typeof import("expo-location")>("expo-location"),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
// An accidental value import must reproduce the startup crash, even if the
// modal is closed or its map URLs have not been configured.
jest.mock("@maplibre/maplibre-react-native", () => {
  throw new Error("MLRNCameraModule could not be found");
});

const originalStyleURL = process.env.EXPO_PUBLIC_MAP_STYLE_URL;
const originalTilesURL = process.env.EXPO_PUBLIC_MAP_PMTILES_URL;
process.env.EXPO_PUBLIC_MAP_STYLE_URL = "https://maps.example.test/style.json";
process.env.EXPO_PUBLIC_MAP_PMTILES_URL = "https://maps.example.test/map.pmtiles";
const { LocationModal } = jest.requireActual<typeof import("../../src/components/LocationModal")>("../../src/components/LocationModal");
if (originalStyleURL === undefined) delete process.env.EXPO_PUBLIC_MAP_STYLE_URL;
else process.env.EXPO_PUBLIC_MAP_STYLE_URL = originalStyleURL;
if (originalTilesURL === undefined) delete process.env.EXPO_PUBLIC_MAP_PMTILES_URL;
else process.env.EXPO_PUBLIC_MAP_PMTILES_URL = originalTilesURL;

function Providers({ children }: { children: ReactNode }) {
  return <SafeAreaProvider><LanguageProvider>{children}</LanguageProvider></SafeAreaProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(SecureStore, "getItemAsync").mockResolvedValue(null);
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

test("Expo Go opens the location sheet without importing unavailable MapLibre or fetching its style", async () => {
  const fetchStyle = jest.spyOn(global, "fetch");
  const view = await render(
    <LocationModal visible={false} authenticated={false} onRequireLogin={jest.fn()} onSelect={jest.fn()} onClose={jest.fn()} />,
    { wrapper: Providers },
  );
  await view.rerender(<LocationModal visible authenticated={false} onRequireLogin={jest.fn()} onSelect={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText("Peta belum tersedia. Gunakan lokasi perangkat.")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: /Gunakan lokasi perangkat/ })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Simpan lokasi" })).toBeDisabled();
  expect(fetchStyle).not.toHaveBeenCalled();
});

test("guests can still choose device coordinates without native maps or a geocoding login", async () => {
  jest.mocked(ExpoLocation.requestForegroundPermissionsAsync).mockResolvedValue({ status: ExpoLocation.PermissionStatus.GRANTED, granted: true, canAskAgain: true, expires: "never" });
  jest.mocked(ExpoLocation.getCurrentPositionAsync).mockResolvedValue({
    timestamp: 1,
    coords: { latitude: -6.2, longitude: 106.8, altitude: null, accuracy: 10, altitudeAccuracy: null, heading: null, speed: null },
  });
  const select = jest.fn();
  await render(<LocationModal visible authenticated={false} onRequireLogin={jest.fn()} onSelect={select} onClose={jest.fn()} />, { wrapper: Providers });
  await fireEvent.press(screen.getByRole("button", { name: /Gunakan lokasi perangkat/ }));
  await waitFor(() => expect(select).toHaveBeenCalledWith({ latitude: -6.2, longitude: 106.8, label: DEVICE_LOCATION_LABEL }));
  expect(reverseMobileGeocode).not.toHaveBeenCalled();
});

test("signed-in users can search and save an address without native maps", async () => {
  const result = { id: "jakarta", latitude: -6.2, longitude: 106.8, label: "Jakarta Pusat" };
  jest.mocked(searchMobileLocation).mockResolvedValue([result]);
  const select = jest.fn();
  await render(<LocationModal visible authenticated onRequireLogin={jest.fn()} onSelect={select} onClose={jest.fn()} />, { wrapper: Providers });
  await fireEvent.changeText(screen.getByLabelText("Cari alamat atau area"), "Jakarta");
  await fireEvent.press(screen.getByLabelText("Cari"));
  await waitFor(() => expect(screen.getByText("Jakarta Pusat")).toBeOnTheScreen());
  await fireEvent.press(screen.getByText("Jakarta Pusat"));
  await fireEvent.press(screen.getByRole("button", { name: "Simpan lokasi" }));
  expect(searchMobileLocation).toHaveBeenCalledWith("Jakarta");
  expect(select).toHaveBeenCalledWith({ latitude: -6.2, longitude: 106.8, label: "Jakarta Pusat" });
});
