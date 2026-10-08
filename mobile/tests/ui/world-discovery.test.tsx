import { beforeEach, afterEach, expect, jest, test } from "@jest/globals";
import { act, fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { LanguageProvider } from "../../src/i18n";
import { FacilityTicker } from "../../src/components/FacilityTicker";
import { PetSpotCard } from "../../src/components/PetSpotExperience";
import { PetHubPhotos } from "../../src/components/PetHubPhotos";
import { WorldCatalogCard } from "../../src/components/WorldCatalogCard";
import { WorldCollectionHeader } from "../../src/components/WorldCollectionHeader";
import { WorldPhoto } from "../../src/components/WorldPhoto";

function Providers({ children }: { children: ReactNode }) { return <SafeAreaProvider><LanguageProvider>{children}</LanguageProvider></SafeAreaProvider>; }
beforeEach(() => {
  jest.useFakeTimers(); AppState.currentState = "active";
  jest.spyOn(SecureStore, "getItemAsync").mockResolvedValue(null);
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
});
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

test("venue photos remain static while readable amenities rotate once per second", async () => {
  await render(<PetSpotCard item={{ id: "test-venue", name: "Test Cafe", city: "Jakarta Selatan", cover_url: "https://example.test/first.jpg", image_urls: ["https://example.test/first.jpg", "https://example.test/second.jpg"], pet_facilities: ["indoor", "pet_menu", "water_bowl", "parking"] }} onOpen={() => {}}/>, { wrapper: Providers });
  expect(screen.getByText("Indoor")).toBeOnTheScreen();
  expect(screen.getByText("3+")).toBeOnTheScreen();
  expect(screen.getByLabelText("Foto Test Cafe").props.source.uri).toBe("https://example.test/first.jpg");
  await act(async () => { jest.advanceTimersByTime(1_100); });
  expect(screen.getByText("Pet menu")).toBeOnTheScreen();
  expect(screen.getByLabelText("Foto Test Cafe").props.source.uri).toBe("https://example.test/first.jpg");
  expect(screen.queryByText("1/2")).toBeNull();
});
test("reduced motion keeps the amenity readable in English without animation", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("en");
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await render(<FacilityTicker facilities={["water_bowl", "pet_menu"]}/>, { wrapper: Providers });
  await waitFor(() => expect(screen.getByText("Amenities")).toBeOnTheScreen());
  await act(async () => { jest.advanceTimersByTime(3_000); });
  expect(screen.getByText("Water bowls")).toBeOnTheScreen();
  expect(screen.queryByText("Pet menu")).toBeNull();
});
test("a feed album shows only its first photo and keeps gallery navigation in the expanded detail", async () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await render(<PetHubPhotos urls={["https://example.test/first.jpg", "https://example.test/second.jpg"]} author="Test Parent"/>, { wrapper: Providers });
  await act(async () => { jest.advanceTimersByTime(2_200); });
  expect(screen.getByLabelText("Foto Test Parent").props.source.uri).toBe("https://example.test/first.jpg");
  expect(screen.queryByRole("button", { name: "Foto berikutnya" })).toBeNull();
  await user.press(screen.getByRole("button", { name: "Perbesar foto Test Parent" }));
  expect(screen.getByRole("button", { name: "Foto berikutnya" })).toBeOnTheScreen();
});

test.each(["academy", "events", "consult", "documents"] as const)("the compact %s card opens its detail and displays the server fee", async mode => {
  const open = jest.fn();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await render(<WorldCatalogCard width={138} mode={mode} item={{ id: "compact-card", title: "Kartu Sliva", price: 100000, total_fee: 125000, cover_url: "https://example.test/first.jpg", image_urls: ["https://example.test/second.jpg"], description: "Informasi lengkap.", requirements: ["Foto pet", "Bukti vaksin"], processing_days: 3 }} onOpen={open}/>, { wrapper: Providers });
  expect(screen.getByText(/125[.,]000/)).toBeOnTheScreen();
  if (mode === "academy" || mode === "events") {
    await act(async () => { jest.advanceTimersByTime(2_200); });
    expect(screen.getByLabelText("Foto Kartu Sliva").props.source.uri).toBe("https://example.test/first.jpg");
  }
  await user.press(screen.getByRole("button", { name: "Buka detail Kartu Sliva" }));
  expect(open).toHaveBeenCalledTimes(1);
});

test("the revamped consultation header has reviewed English copy offline", async () => {
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue("en");
  await render(<WorldCollectionHeader mode="consult"/>, { wrapper: Providers });
  await waitFor(() => expect(screen.getByText("The right expert for your pet.")).toBeOnTheScreen());
  expect(screen.getByText("Choose a veterinarian or pet trainer, then pick a package and time.")).toBeOnTheScreen();
});

test("a failed native catalog photo shows a placeholder and accepts a replacement URL", async () => {
  const view = await render(<WorldPhoto title="Test Pet" src="https://example.test/unavailable.jpg"/>, { wrapper: Providers });
  await fireEvent(screen.getByLabelText("Foto Test Pet"), "error");
  expect(screen.getByRole("image", { name: "Test Pet: Foto belum tersedia" })).toBeOnTheScreen();
  await view.rerender(<WorldPhoto title="Test Pet" src="https://example.test/replacement.jpg"/>);
  expect(screen.getByLabelText("Foto Test Pet").props.source.uri).toBe("https://example.test/replacement.jpg");
});
