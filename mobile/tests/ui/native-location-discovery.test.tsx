import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useState, type ReactNode } from "react";
import { AppState, Text, View, Pressable } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as ExpoLocation from "expo-location";
import * as SecureStore from "expo-secure-store";
import { LanguageProvider } from "../../src/i18n";
import { LocationProvider, useCurrentLocation } from "../../src/LocationProvider";
import { DEVICE_LOCATION_LABEL, LOCATION_REFRESH_MS } from "../../src/location";
import { WorldScreen } from "../../src/screens/WorldScreen";
import { ClinicsScreen } from "../../src/screens/ClinicsScreen";
import { PetSitterScreen } from "../../src/screens/PetSitterScreen";
import { PetshipScreen } from "../../src/screens/PetshipScreen";
import * as api from "../../src/api";

jest.mock("expo-location", () => ({
  ...jest.requireActual<typeof import("expo-location")>("expo-location"),
  getForegroundPermissionsAsync: jest.fn(), requestForegroundPermissionsAsync: jest.fn(), getCurrentPositionAsync: jest.fn(),
}));
jest.mock("expo-video", () => ({ useVideoPlayer: jest.fn(), VideoView: "VideoView" }));
jest.mock("../../src/api", () => ({
  ...jest.requireActual<typeof import("../../src/api")>("../../src/api"),
  getDiscoveryBranches: jest.fn(), getMobilePetSpots: jest.fn(), getMobilePawDatingProfiles: jest.fn(),
  getMobileAcademy: jest.fn(), getMobileEvents: jest.fn(), getMobileConsultationPlans: jest.fn(),
  getMobileTrainerConsultationPlans: jest.fn(), getMobileAdoptions: jest.fn(), getMobileDocumentProducts: jest.fn(),
  mobileSitterClient: { list: jest.fn() },
  mobilePetship: { places: jest.fn(), presences: jest.fn() },
}));
const point = { latitude: -6.2, longitude: 106.8, label: DEVICE_LOCATION_LABEL };
const manual = { latitude: -6.9, longitude: 107.6, label: "Bandung pilihan" };
const branch: api.MobileDiscoveryBranch = {
  branch_id: "near", place_id: "near", business_id: null, business_name: "Petshop dekat", branch_name: "Petshop dekat",
  type: "petshop", source: "manual", verified: false, logo_url: null, banner_url: null, address: "Jl. Pet Jakarta",
  district: "Kemang", city: "Jakarta", latitude: -6.2, longitude: 106.8, distance_km: 1, opening_hours: {}, timezone: "Asia/Jakarta",
  is_open_now: null, rating: null, review_count: 0, product_count: 0, service_count: 0, phone: "", website: "",
};
const position = (latitude = point.latitude, longitude = point.longitude): ExpoLocation.LocationObject => ({
  timestamp: Date.now(), coords: { latitude, longitude, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
});
const permission = (status: ExpoLocation.PermissionStatus): ExpoLocation.LocationPermissionResponse => ({
  status, granted: status === "granted", canAskAgain: true, expires: "never",
});
let saved: Map<string, string>;
let stateListeners: Array<(state: "active" | "background") => void>;
function Providers({ children }: { children: ReactNode }) {
  return <SafeAreaProvider><LanguageProvider><LocationProvider>{children}</LocationProvider></LanguageProvider></SafeAreaProvider>;
}
function LocationProbe() {
  const { location, ready, selectLocation } = useCurrentLocation();
  return <View><Text testID="position">{ready ? JSON.stringify(location ?? null) : "loading"}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose Bandung" onPress={() => selectLocation(manual)}><Text>Manual</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Device point" onPress={() => selectLocation(point, "device")}><Text>Device</Text></Pressable>
  </View>;
}
function DiscoveryHarness() {
  const [view, setView] = useState<"clinics" | "petspot" | "sitter" | "petship">("clinics");
  return <><LocationProbe /><Pressable accessibilityRole="button" accessibilityLabel="Open PetSpot" onPress={() => setView("petspot")}><Text>PetSpot</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Open clinics" onPress={() => setView("clinics")}><Text>Clinics</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Open sitter" onPress={() => setView("sitter")}><Text>Sitter</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Open petship" onPress={() => setView("petship")}><Text>Petship</Text></Pressable>
    {view === "clinics" ? <ClinicsScreen onOpenBranch={() => undefined} onOpenNotifications={() => undefined} />
      : view === "sitter" ? <PetSitterScreen pets={[]} authenticated={false} onLogin={() => undefined} />
      : view === "petship" ? <PetshipScreen onAction={() => undefined} onRequirePet={() => false} />
      : <WorldScreen mode="petspot" onModeChange={() => undefined} onIntentHandled={() => undefined} refreshVersion={0} onAction={() => undefined} onOpenNotifications={() => undefined} hasPet={false} onLogin={() => undefined} onRequirePet={() => undefined} onOpenActivity={() => undefined} />}
  </>;
}
beforeEach(() => {
  jest.clearAllMocks(); jest.useFakeTimers(); jest.setSystemTime(new Date("2026-10-11T12:00:00Z")); AppState.currentState = "active";
  saved = new Map(); stateListeners = [];
  jest.spyOn(SecureStore, "getItemAsync").mockImplementation(async key => saved.get(key) ?? null);
  jest.spyOn(SecureStore, "setItemAsync").mockImplementation(async (key, value) => { saved.set(key, value); });
  jest.spyOn(AppState, "addEventListener").mockImplementation((_, callback) => {
    const listener = callback as (state: "active" | "background") => void;
    stateListeners.push(listener);
    return { remove: () => { stateListeners = stateListeners.filter(value => value !== listener); } };
  });
  jest.mocked(ExpoLocation.getForegroundPermissionsAsync).mockResolvedValue(permission(ExpoLocation.PermissionStatus.GRANTED));
  jest.mocked(ExpoLocation.getCurrentPositionAsync).mockResolvedValue(position());
  for (const fetch of [api.getMobileAcademy, api.getMobileEvents, api.getMobileConsultationPlans, api.getMobileTrainerConsultationPlans, api.getMobileAdoptions, api.getMobileDocumentProducts, api.getMobilePawDatingProfiles]) jest.mocked(fetch).mockResolvedValue({ data: [] });
  jest.mocked(api.getDiscoveryBranches).mockResolvedValue({ data: [], count: 0, has_more: false });
  jest.mocked(api.getMobilePetSpots).mockResolvedValue({ data: [] });
  jest.mocked(api.mobileSitterClient.list).mockResolvedValue({ data: [] });
  jest.mocked(api.mobilePetship.places).mockResolvedValue({ data: [] });
  jest.mocked(api.mobilePetship.presences).mockResolvedValue({ data: [] });
});
afterEach(async () => { await cleanup(); jest.useRealTimers(); jest.restoreAllMocks(); });

test("permission already granted automatically supplies one shared GPS point across native discovery screens", async () => {
  await render(<DiscoveryHarness />, { wrapper: Providers });
  await waitFor(() => expect(api.getDiscoveryBranches).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: point.latitude, longitude: point.longitude })));
  await fireEvent.press(screen.getByRole("button", { name: "Open PetSpot" }));
  await waitFor(() => expect(api.getMobilePetSpots).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: point.latitude, longitude: point.longitude, max_distance_km: 25 })));
  await fireEvent.press(screen.getByRole("button", { name: "Open clinics" }));
  await waitFor(() => expect(api.getDiscoveryBranches).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: point.latitude, longitude: point.longitude })));
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  expect(ExpoLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

test("native PetSpot sorts nearest first and sends radius, category and address search to the API", async () => {
  jest.mocked(api.getMobilePetSpots).mockResolvedValue({ data: [
    { id: "far", name: "Cafe jauh", category: "cafe", distance_km: 9 },
    { id: "near", name: "Cafe dekat", category: "cafe", distance_km: 1 },
    { id: "outside", name: "Di luar radius", category: "cafe", distance_km: 30 },
    { id: "missing", name: "Tanpa pin", category: "cafe", distance_km: null },
  ] });
  await render(<DiscoveryHarness />, { wrapper: Providers });
  await waitFor(() => expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(point)));
  await fireEvent.press(screen.getByRole("button", { name: "Open PetSpot" }));
  await waitFor(() => expect(screen.getAllByRole("button", { name: /Lihat detail Cafe/ }).map(item => item.props.accessibilityLabel)).toEqual(["Lihat detail Cafe dekat", "Lihat detail Cafe jauh"]));
  expect(screen.queryByText("Di luar radius")).toBeNull(); expect(screen.queryByText("Tanpa pin")).toBeNull();
  await fireEvent.press(screen.getByLabelText("Radius pencarian"));
  await fireEvent.press(screen.getByRole("radio", { name: "3 km" }));
  await waitFor(() => expect(api.getMobilePetSpots).toHaveBeenLastCalledWith(expect.objectContaining({ max_distance_km: 3 })));
  expect(screen.queryByText("Cafe jauh")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Cafe" }));
  await waitFor(() => expect(api.getMobilePetSpots).toHaveBeenLastCalledWith(expect.objectContaining({ category: "cafe", max_distance_km: 3 })));
  // This venue was absent from the first response, so the API must be queried for new filters.
  jest.mocked(api.getMobilePetSpots).mockResolvedValue({ data: [{ id: "address-match", name: "Tempat baru", address: "Jalan Merdeka", category: "cafe", distance_km: 2 }] });
  await fireEvent.changeText(screen.getByLabelText("Cari tempat ramah pet"), "Merdeka");
  await act(async () => { jest.advanceTimersByTime(400); });
  await waitFor(() => expect(api.getMobilePetSpots).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Merdeka", latitude: point.latitude, max_distance_km: 3 })));
  await waitFor(() => expect(screen.getByText("Tempat baru")).toBeOnTheScreen());
});

test("native clinic and petshop queries combine type, radius and search while preserving nearest order", async () => {
  jest.mocked(api.getDiscoveryBranches).mockResolvedValue({ data: [
    { ...branch, branch_id: "far", business_name: "Petshop jauh", branch_name: "Petshop jauh", distance_km: 4 }, branch,
  ], count: 2, has_more: false });
  await render(<DiscoveryHarness />, { wrapper: Providers });
  await waitFor(() => expect(api.getDiscoveryBranches).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: point.latitude })));
  expect(screen.getAllByText(/Petshop dekat|Petshop jauh/).map(item => item.props.children)).toEqual(["Petshop dekat", "Petshop jauh"]);
  await fireEvent.press(screen.getByRole("button", { name: "Petshop" }));
  await fireEvent.press(screen.getByRole("button", { name: "5 km" }));
  await fireEvent.changeText(screen.getByLabelText("Cari klinik atau petshop"), "Kemang");
  await act(async () => { jest.advanceTimersByTime(400); });
  expect(api.getDiscoveryBranches).toHaveBeenLastCalledWith(expect.objectContaining({ type: "petshop", search: "Kemang", max_distance_km: 5, latitude: point.latitude, longitude: point.longitude }));
});

test("Pet Sitter and Petship reuse the shared point, including after resetting sitter filters", async () => {
  await render(<DiscoveryHarness />, { wrapper: Providers });
  await waitFor(() => expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(point)));
  await fireEvent.press(screen.getByRole("button", { name: "Open sitter" }));
  await waitFor(() => expect(api.mobileSitterClient.list).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: point.latitude, longitude: point.longitude, max_distance_km: 25 })));
  await fireEvent.press(screen.getByRole("button", { name: "Reset filter" }));
  expect(api.mobileSitterClient.list).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: point.latitude, longitude: point.longitude, max_distance_km: 25 }));
  await fireEvent.press(screen.getByRole("button", { name: "Open petship" }));
  await waitFor(() => expect(api.mobilePetship.places).toHaveBeenCalledWith(point));
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
});

test("foreground GPS refreshes at 15 minutes and updates the active discovery query", async () => {
  await render(<DiscoveryHarness />, { wrapper: Providers });
  await waitFor(() => expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(point)));
  jest.mocked(ExpoLocation.getCurrentPositionAsync).mockResolvedValue(position(-6.3, 106.9));
  await act(async () => { jest.advanceTimersByTime(LOCATION_REFRESH_MS - 5_000); });
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(5_000); });
  await waitFor(() => expect(api.getDiscoveryBranches).toHaveBeenLastCalledWith(expect.objectContaining({ latitude: -6.3, longitude: 106.9 })));
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(JSON.parse(saved.get("slivadoc.location")!)).toMatchObject({ latitude: -6.3 }));
});

test("manual picks remain fixed, including restoration of an older saved address", async () => {
  saved.set("slivadoc.location", JSON.stringify(manual));
  await render(<LocationProbe />, { wrapper: Providers });
  await waitFor(() => expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(manual)));
  await act(async () => { jest.advanceTimersByTime(2 * LOCATION_REFRESH_MS); });
  expect(ExpoLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "Device point" }));
  await act(async () => { jest.advanceTimersByTime(LOCATION_REFRESH_MS); });
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
});

test("denied permission never prompts automatically and radius stays disabled without coordinates", async () => {
  jest.mocked(ExpoLocation.getForegroundPermissionsAsync).mockResolvedValue(permission(ExpoLocation.PermissionStatus.DENIED));
  await render(<DiscoveryHarness />, { wrapper: Providers });
  await fireEvent.press(screen.getByRole("button", { name: "Open PetSpot" }));
  await waitFor(() => expect(api.getMobilePetSpots).toHaveBeenCalledWith({ category: undefined, search: undefined }));
  expect(screen.getByLabelText("Radius pencarian")).toBeDisabled();
  expect(ExpoLocation.getCurrentPositionAsync).not.toHaveBeenCalled(); expect(ExpoLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

test("background pauses GPS; returning active refreshes overdue coordinates and GPS failure preserves the last point", async () => {
  await render(<LocationProbe />, { wrapper: Providers });
  await waitFor(() => expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(point)));
  AppState.currentState = "background";
  await act(async () => { jest.advanceTimersByTime(LOCATION_REFRESH_MS); });
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
  jest.mocked(ExpoLocation.getCurrentPositionAsync).mockRejectedValue(new Error("GPS unavailable"));
  await act(async () => { AppState.currentState = "active"; stateListeners.forEach(listener => listener("active")); });
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(point));
  jest.mocked(ExpoLocation.getForegroundPermissionsAsync).mockResolvedValue(permission(ExpoLocation.PermissionStatus.DENIED));
  await act(async () => { jest.advanceTimersByTime(LOCATION_REFRESH_MS); });
  expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(2);
});

test("a delayed GPS response cannot overwrite a newer manual selection", async () => {
  let finish!: (value: ExpoLocation.LocationObject) => void;
  jest.mocked(ExpoLocation.getCurrentPositionAsync).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await render(<LocationProbe />, { wrapper: Providers });
  await waitFor(() => expect(ExpoLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1));
  await fireEvent.press(screen.getByRole("button", { name: "Choose Bandung" }));
  await act(async () => { finish(position()); });
  expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(manual));
  await waitFor(() => expect(JSON.parse(saved.get("slivadoc.location")!)).toEqual(manual));
});

test("a delayed PetSpot query cannot replace results for a newer location", async () => {
  let finish!: (value: { data: api.WorldItem[] }) => void;
  jest.mocked(api.getMobilePetSpots).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  await render(<DiscoveryHarness />, { wrapper: Providers });
  await waitFor(() => expect(screen.getByTestId("position").props.children).toBe(JSON.stringify(point)));
  await fireEvent.press(screen.getByRole("button", { name: "Open PetSpot" }));
  await waitFor(() => expect(api.getMobilePetSpots).toHaveBeenCalledTimes(1));
  jest.mocked(api.getMobilePetSpots).mockResolvedValue({ data: [{ id: "bandung", name: "Tempat Bandung", distance_km: 2 }] });
  await fireEvent.press(screen.getByRole("button", { name: "Choose Bandung" }));
  await waitFor(() => expect(screen.getByText("Tempat Bandung")).toBeOnTheScreen());
  await act(async () => { finish({ data: [{ id: "old", name: "Hasil lokasi lama", distance_km: 1 }] }); });
  expect(screen.queryByText("Hasil lokasi lama")).toBeNull();
});
