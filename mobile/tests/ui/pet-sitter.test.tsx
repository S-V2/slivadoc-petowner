import * as Location from "expo-location";
import { afterEach, expect, jest, test } from "@jest/globals";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "../../src/i18n";
import { PetSitterScreen } from "../../src/screens/PetSitterScreen";
import {
  mobileSitterClient,
  clearMobileSession,
  setPlatformAccessToken,
} from "../../src/api";
import type { SittingBooking } from "../../../shared/pet-sitter";
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: async () => ({ status: "denied" }),
  getCurrentPositionAsync: async () => ({}),
}));
function Providers({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider>
      <LanguageProvider>{children}</LanguageProvider>
    </SafeAreaProvider>
  );
}
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  await clearMobileSession();
});

test("guests browse sitters but sign in before opening private bookings", async () => {
  const login = jest.fn();
  jest.spyOn(mobileSitterClient, "list").mockResolvedValue({ data: [] });
  const privateList = jest.spyOn(mobileSitterClient, "bookings");
  await render(
    <PetSitterScreen pets={[]} authenticated={false} onLogin={login} />,
    { wrapper: Providers },
  );
  await screen.findByText("Teman yang tepat sedang kami siapkan");
  await fireEvent.press(screen.getByRole("button", { name: "Perawatan saya" }));
  expect(login).toHaveBeenCalledTimes(1);
  expect(privateList).not.toHaveBeenCalled();
});

test("a care notification opens the matching private booking through the authenticated API", async () => {
  setPlatformAccessToken("pet-sitter-ui-test-token");
  const booking = {
    id: "test-booking",
    booking_number: "SIT-TEST",
    sitter_name: "Rani Test",
    starts_on: "2026-10-09",
    ends_on: "2026-10-15",
    preferred_time: "09:00",
    amount: 630000,
    display_status: "cancelled",
    payment_status: "refunded",
    address: "Alamat demo pengujian",
    pets: [{ id: "cat", name: "Luna", species: "cat" }],
    cancellation_requested: true,
  } as SittingBooking;
  const calls: Array<{ path: string; auth: string | null }> = [];
  jest.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    const path = new URL(String(url)).pathname;
    calls.push({ path, auth: new Headers(init?.headers).get("Authorization") });
    if (path.endsWith("/public/pet-sitters"))
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    if (path.endsWith("/bookings"))
      return new Response(JSON.stringify({ data: [booking] }), { status: 200 });
    if (path.endsWith("/bookings/test-booking"))
      return new Response(
        JSON.stringify({
          booking,
          updates: [
            {
              id: "log",
              kind: "message",
              author_name: "Rani Test",
              body: "Siap menemani Luna.",
              created_at: "2026-10-09T00:00:00Z",
              photo_url: "",
            },
          ],
        }),
        { status: 200 },
      );
    throw new Error(`Unexpected route ${path}`);
  });
  await render(
    <PetSitterScreen
      pets={[{ id: "cat", name: "Luna" }]}
      authenticated
      initialBookingId="test-booking"
      onLogin={() => {}}
    />,
    { wrapper: Providers },
  );
  await screen.findByText("Siap menemani Luna.");
  const privateCalls = calls.filter((c) => c.path.includes("/pet-sitting/"));
  expect(privateCalls).toHaveLength(2);
  expect(
    privateCalls.every((c) => c.auth === "Bearer pet-sitter-ui-test-token"),
  ).toBe(true);
  expect(screen.getByText("SIT-TEST")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "Dana telah dikembalikan. Periksa detail pengembalian dana di notifikasi.",
    ),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText(
      "Pembatalan sedang ditinjau Operasional. Jadwal tetap berlaku sampai ada keputusan.",
    ),
  ).toBeNull();
});

const sitterFixture = {
  id: "sitter-rani",
  display_name: "Rani Test",
  city: "Jakarta Selatan",
  district: "",
  bio: "Teman perawatan untuk Luna.",
  photo_url: "",
  experience_years: 3,
  species: ["cat"],
  service_modes: ["home_visit"],
  daily_rate: 100000,
  weekly_rate: 630000,
  extra_pet_rate: 25000,
  max_pets: 3,
  visit_minutes: 60,
  inclusions: "Makan, bermain, dan kabar harian.",
  cancellation_policy: "Ditinjau Operasional.",
  rating: 0,
  review_count: 0,
  identity_verified: true,
  interview_verified: true,
  safety_verified: true,
} satisfies import("../../../shared/pet-sitter").PetSitter;

test("the mobile booking steps preserve weekly scheduling and pet details when navigating back", async () => {
  jest
    .spyOn(mobileSitterClient, "list")
    .mockResolvedValue({ data: [sitterFixture] });
  jest.spyOn(mobileSitterClient, "detail").mockResolvedValue({
    sitter: sitterFixture,
    reviews: [],
    unavailable_dates: [],
  });
  const quote = jest.spyOn(mobileSitterClient, "quote").mockResolvedValue({
    available: true,
    quote: {
      days: 7,
      base_amount: 630000,
      extra_pet_amount: 0,
      total_amount: 630000,
      savings: 70000,
      visit_minutes: 60,
      package: "weekly",
      currency: "IDR",
    },
  });
  await render(
    <PetSitterScreen
      pets={[{ id: "luna", name: "Luna" }]}
      authenticated
      onLogin={() => {}}
    />,
    { wrapper: Providers },
  );
  await fireEvent.press(
    await screen.findByRole("button", {
      name: "Kenalan & cek jadwal Rani Test",
    }),
  );
  await screen.findByText("Sesuai ritme si kecil.");
  expect(screen.queryByLabelText("Alamat kunjungan lengkap")).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Mingguan" }));
  await fireEvent.press(
    screen.getByRole("button", { name: "Lanjut · kebutuhan pet" }),
  );
  await fireEvent.press(screen.getByRole("checkbox", { name: "Luna" }));
  await fireEvent.changeText(
    screen.getByLabelText("Alamat kunjungan lengkap"),
    "Alamat pengujian lokal",
  );
  await fireEvent.changeText(
    screen.getByLabelText("Telepon kontak darurat"),
    "081200000000",
  );
  await fireEvent.press(screen.getByRole("button", { name: "Jadwal" }));
  expect(screen.getByText("7 hari")).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole("button", { name: "Kebutuhan pet" }));
  expect(screen.getByDisplayValue("Alamat pengujian lokal")).toBeOnTheScreen();
  expect(
    screen.getByRole("checkbox", { name: "Luna", checked: true }),
  ).toBeOnTheScreen();
  await fireEvent.press(
    screen.getByRole("button", { name: "Cek jadwal & biaya" }),
  );
  await screen.findByRole("button", { name: "Kirim permintaan" });
  expect(quote).toHaveBeenCalledWith(
    "sitter-rani",
    expect.objectContaining({
      package: "weekly",
      pet_ids: ["luna"],
      address: "Alamat pengujian lokal",
      emergency_phone: "081200000000",
    }),
  );
});

test("quick species filters send the selected pet and keep care filters collapsed initially", async () => {
  const list = jest
    .spyOn(mobileSitterClient, "list")
    .mockResolvedValue({ data: [sitterFixture] });
  await render(
    <PetSitterScreen pets={[]} authenticated={false} onLogin={() => {}} />,
    { wrapper: Providers },
  );
  await screen.findByText("Rani Test");
  expect(screen.queryByRole("button", { name: "Jenis perawatan" })).toBeNull();
  await fireEvent.press(screen.getByRole("button", { name: "Kucing" }));
  expect(list).toHaveBeenLastCalledWith({ city: "", species: "cat", mode: "" });
  await fireEvent.press(
    screen.getByRole("button", { name: "Filter perawatan" }),
  );
  expect(
    screen.getByRole("button", { name: "Jenis perawatan" }),
  ).toBeOnTheScreen();
});

test("nearest search passes coordinates and radius, and reset removes every filter", async () => {
  jest.spyOn(Location, "requestForegroundPermissionsAsync").mockResolvedValue({
    status: "granted",
    granted: true,
    canAskAgain: true,
    expires: "never",
  } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>);
  jest.spyOn(Location, "getCurrentPositionAsync").mockResolvedValue({
    coords: {
      latitude: -6.244,
      longitude: 106.8,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  });
  const list = jest
    .spyOn(mobileSitterClient, "list")
    .mockResolvedValue({ data: [] });
  await render(
    <PetSitterScreen pets={[]} authenticated={false} onLogin={() => {}} />,
    { wrapper: Providers },
  );
  await screen.findByText("Teman yang tepat sedang kami siapkan");
  await fireEvent.press(
    screen.getByRole("button", { name: "Sitter terdekat" }),
  );
  await screen.findByText("Terdekat dalam 25 km · sesuai jangkauan sitter");
  expect(list).toHaveBeenLastCalledWith({
    city: "",
    species: "",
    mode: "",
    latitude: -6.244,
    longitude: 106.8,
    max_distance_km: 25,
  });
  await fireEvent.press(screen.getByLabelText("Kucing"));
  expect(list).toHaveBeenLastCalledWith({
    city: "",
    species: "cat",
    mode: "",
    latitude: -6.244,
    longitude: 106.8,
    max_distance_km: 25,
  });
  await fireEvent.press(screen.getByRole("button", { name: "Reset filter" }));
  expect(list).toHaveBeenLastCalledWith({ city: "", species: "", mode: "" });
});

test("denied location keeps city search usable without sending invented coordinates", async () => {
  jest.spyOn(Location, "requestForegroundPermissionsAsync").mockResolvedValue({
    status: "denied",
    granted: false,
    canAskAgain: true,
    expires: "never",
  } as Awaited<ReturnType<typeof Location.requestForegroundPermissionsAsync>>);
  const position = jest.spyOn(Location, "getCurrentPositionAsync");
  const list = jest
    .spyOn(mobileSitterClient, "list")
    .mockResolvedValue({ data: [] });
  await render(
    <PetSitterScreen pets={[]} authenticated={false} onLogin={() => {}} />,
    { wrapper: Providers },
  );
  await screen.findByText("Teman yang tepat sedang kami siapkan");
  await fireEvent.press(
    screen.getByRole("button", { name: "Sitter terdekat" }),
  );
  await screen.findByText("Izinkan akses lokasi atau cari berdasarkan kota.");
  expect(position).not.toHaveBeenCalled();
  expect(list).toHaveBeenCalledTimes(1);
});
