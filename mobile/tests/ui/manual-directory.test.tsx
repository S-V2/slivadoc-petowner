import { jest, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LanguageProvider } from "../../src/i18n";
import * as SecureStore from "expo-secure-store";
import type { ReactNode } from "react";
import { ManualClinicSheet } from "../../src/components/ManualClinicSheet";
import { getDiscoveryBranch, type MobileDiscoveryBranch } from "../../src/api";

jest.mock("../../src/api", () => ({ getDiscoveryBranch: jest.fn() }));
const load = jest.mocked(getDiscoveryBranch);
const place: MobileDiscoveryBranch = {
  branch_id: "manual-id", place_id: "manual-id", business_id: null,
  business_name: "Andara Vet", branch_name: "Andara Vet", type: "petclinic", source: "manual", verified: false,
  logo_url: null, banner_url: null, address: "Jl. Margasatwa 51", district: "Cilandak", city: "Jakarta Selatan",
  latitude: -6.31, longitude: 106.8, distance_km: null, opening_hours: { mon: "09:00-18:00" }, timezone: "Asia/Jakarta",
  is_open_now: null, rating: 4.9, review_count: 633, product_count: 0, service_count: 0, phone: "0817-0791-919", website: "https://example.com",
};
function Providers({ children }: { children: ReactNode }) { return <SafeAreaProvider><LanguageProvider>{children}</LanguageProvider></SafeAreaProvider>; }
beforeEach(() => { load.mockReset(); load.mockResolvedValue(place); jest.spyOn(SecureStore, "getItemAsync").mockResolvedValue(null); });
afterEach(() => { jest.restoreAllMocks(); });
test("manual places show contacts and directions without a store account", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const close = jest.fn();
  await render(<ManualClinicSheet placeID="manual-id" onClose={close} />, { wrapper: Providers });
  await waitFor(() => expect(screen.getAllByText("Andara Vet")[0]).toBeTruthy());
  expect(load).toHaveBeenCalledWith("manual-id");
  expect(screen.getByText("Informasi tempat")).toBeTruthy();
  expect(screen.queryByText("Verified")).toBeNull();
  expect(screen.getByText("09:00-18:00")).toBeTruthy();
  await fireEvent.press(screen.getByText("Hubungi tempat"));
  expect(open).toHaveBeenCalledWith("tel:08170791919");
  await fireEvent.press(screen.getAllByLabelText("Petunjuk arah")[0]!);
  expect(open).toHaveBeenCalledWith("https://www.google.com/maps/dir/?api=1&destination=-6.31,106.8");
  await fireEvent.press(screen.getByLabelText("Kembali ke direktori"));
  expect(close).toHaveBeenCalled();
});
test("a hidden or removed place reports unavailable and allows retry", async () => {
  load.mockRejectedValueOnce(new Error("404"));
  await render(<ManualClinicSheet placeID="hidden-id" onClose={jest.fn()} />, { wrapper: Providers });
  await waitFor(() => expect(screen.getByText("Tempat tidak tersedia atau belum dapat dimuat.")).toBeTruthy());
  expect(screen.queryByText("Hubungi tempat")).toBeNull();
  await fireEvent.press(screen.getByText("Coba lagi"));
  await waitFor(() => expect(screen.getAllByText("Andara Vet")[0]).toBeTruthy());
});

test("a published registered place without a pin uses Google Maps address directions and the shared storefront", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  load.mockResolvedValue({ ...place, source: "registered", business_id: "registered-business", verified: false, can_transact: false, latitude: null, longitude: null });
  await render(<ManualClinicSheet placeID="manual-id" onClose={jest.fn()} />, { wrapper: Providers });
  await waitFor(() => expect(screen.getAllByText("Andara Vet")[0]).toBeTruthy());
  await fireEvent.press(screen.getAllByLabelText("Petunjuk arah")[0]!);
  expect(open).toHaveBeenCalledWith("https://www.google.com/maps/dir/?api=1&destination=Andara%20Vet%2C%20Jl.%20Margasatwa%2051%2C%20Cilandak%2C%20Jakarta%20Selatan");
  expect(screen.queryByText("Chat toko")).toBeNull();
  expect(screen.getByRole("tab", { name: "Produk" })).toBeTruthy();
  expect(screen.getByText("Belum ada layanan")).toBeTruthy();
  await fireEvent.press(screen.getByRole("tab", { name: "Produk" }));
  expect(screen.getByText("Belum ada produk")).toBeTruthy();
  await fireEvent.press(screen.getByRole("tab", { name: "Kategori" }));
  expect(screen.getByText("Kategori produk belum tersedia")).toBeTruthy();
  await fireEvent.press(screen.getByRole("tab", { name: "Ulasan (0)" }));
  expect(screen.getByText("Belum ada ulasan toko")).toBeTruthy();
  expect(screen.queryByText(/Pengelola belum memiliki akun/)).toBeNull();
  expect(screen.getByText("Hubungi tempat langsung untuk informasi layanan dan jam buka.")).toBeTruthy();
});

test("reopening a now-hidden place fetches again and removes the previous profile", async () => {
  const close = jest.fn();
  const view = await render(<ManualClinicSheet placeID="manual-id" onClose={close} />, { wrapper: Providers });
  await waitFor(() => expect(screen.getAllByText("Andara Vet")[0]).toBeTruthy());
  await view.rerender(<ManualClinicSheet onClose={close} />);
  load.mockRejectedValueOnce(new Error("404"));
  await view.rerender(<ManualClinicSheet placeID="manual-id" onClose={close} />);
  await waitFor(() => expect(screen.getByText("Tempat tidak tersedia atau belum dapat dimuat.")).toBeTruthy());
  expect(load).toHaveBeenCalledTimes(2);
  expect(screen.queryByText("Andara Vet")).toBeNull();
  expect(screen.queryByLabelText("Petunjuk arah")).toBeNull();
});
