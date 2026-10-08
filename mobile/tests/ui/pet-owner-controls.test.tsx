import { describe, expect, jest, test, beforeEach } from "@jest/globals";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { LanguageProvider } from "../../src/i18n";
import { AddPetSheet } from "../../src/components/AddPetSheet";
import { SlivaDatePicker } from "../../src/components/SlivaDatePicker";
import { MobileQrisModal } from "../../src/components/QrisPayment";
import { createMobilePet, getMobilePetSpecies, getMobilePaymentIntent, type MobilePaymentIntent } from "../../src/api";

jest.mock("../../src/api", () => ({ PETOWNER_API_URL: "http://localhost:0", createMobilePet: jest.fn(), getMobilePetSpecies: jest.fn(), getMobilePaymentIntent: jest.fn() }));
const species = [{ code: "cat", label: "Kucing", group: "cat", scientific_name: "Felis catus", emoji: "🐈" }, { code: "other", label: "Spesies lainnya", group: "other", scientific_name: "", emoji: "🐾" }, { code: "guinea_pig", label: "Marmut", group: "small_mammal", scientific_name: "Cavia porcellus", emoji: "🐹" }];
function Providers({ children }: { children: ReactNode }) { return <SafeAreaProvider><LanguageProvider>{children}</LanguageProvider></SafeAreaProvider>; }
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(SecureStore, "getItemAsync").mockResolvedValue(null);
  jest.mocked(getMobilePetSpecies).mockResolvedValue({ data: species, count: species.length });
});
describe("native Slivadoc controls", () => {
  test("pet form and searchable species picker render English labels without a translation service", async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue("en");
    const user = userEvent.setup();
    await render(<AddPetSheet onClose={() => {}} onSaved={async () => {}}/>, { wrapper: Providers });
    await waitFor(() => expect(screen.getByRole("button", { name: "Save pet profile" })).toBeEnabled());
    expect(screen.getByText("Add pet profile")).toBeOnTheScreen();
    expect(screen.getByText("NEW FAMILY MEMBER")).toBeOnTheScreen();
    expect(screen.getByLabelText("Pet name")).toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Animal type" }));
    await user.type(screen.getByLabelText("Search options"), "cat");
    expect(screen.getByRole("radio", { name: "Cat" })).toBeOnTheScreen();
    await user.clear(screen.getByLabelText("Search options"));
    await user.type(screen.getByLabelText("Search options"), "guinea");
    expect(screen.getByRole("radio", { name: "Guinea pig" })).toBeOnTheScreen();
  });
  test("first pet form validates identity and retries profile refresh without creating a duplicate pet", async () => {
    const user = userEvent.setup();
    const saved = jest.fn<(id: string) => Promise<void>>().mockRejectedValueOnce(new Error("Network down")).mockResolvedValue(undefined);
    const close = jest.fn();
    jest.mocked(createMobilePet).mockResolvedValue({ id: "test-pet", species: "other", species_group: "other", message: "Saved" });
    await render(<AddPetSheet onClose={close} onSaved={saved}/>, { wrapper: Providers });
    await waitFor(() => expect(screen.getByRole("button", { name: "Simpan profil hewan" })).toBeEnabled());
    await user.press(screen.getByRole("button", { name: "Simpan profil hewan" }));
    expect(screen.getByText("Lengkapi nama dan pilih jenis hewan")).toBeOnTheScreen();
    expect(createMobilePet).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Nama pet"), "Test Binturong");
    await user.press(screen.getByRole("button", { name: "Jenis hewan" }));
    await user.type(screen.getByLabelText("Cari pilihan"), "lainnya");
    await user.press(screen.getByRole("radio", { name: "Spesies lainnya" }));
    await user.type(screen.getByLabelText("Nama spesies"), "Binturong");
    await user.type(screen.getByLabelText("Berat badan (kg)"), "2,5");
    await user.press(screen.getByRole("button", { name: "Simpan profil hewan" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Muat ulang profil" })).toBeEnabled());
    expect(createMobilePet).toHaveBeenCalledWith(expect.objectContaining({ name: "Test Binturong", species: "other", species_common_name: "Binturong", weight_kg: 2.5 }));
    await user.press(screen.getByRole("button", { name: "Muat ulang profil" }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(createMobilePet).toHaveBeenCalledTimes(1);
    expect(saved).toHaveBeenCalledTimes(2);
  });
  test("species catalogue failure explains the problem and recovers through its retry button", async () => {
    jest.mocked(getMobilePetSpecies).mockRejectedValueOnce(new Error("Offline"));
    const user = userEvent.setup();
    await render(<AddPetSheet onClose={() => {}} onSaved={async () => {}}/>, { wrapper: Providers });
    await waitFor(() => expect(screen.getByText("Katalog spesies belum dapat dimuat. Coba lagi.")).toBeOnTheScreen());
    expect(screen.getByRole("button", { name: "Simpan profil hewan" })).toBeDisabled();
    await user.press(screen.getByRole("button", { name: "Coba lagi" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Simpan profil hewan" })).toBeEnabled());
    expect(getMobilePetSpecies).toHaveBeenCalledTimes(2);
  });
  test("custom calendar selects a leap day and blocks dates after the permitted birthday", async () => {
    const change = jest.fn();
    const user = userEvent.setup();
    await render(<SlivaDatePicker label="Tanggal lahir" value="2024-02-28" max="2024-03-01" onChangeText={change}/>, { wrapper: Providers });
    await user.press(screen.getByRole("button", { name: "Tanggal lahir" }));
    const label = (day: number) => new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date(2024, 1, day, 12));
    expect(screen.getByRole("button", { name: label(31) })).toBeDisabled();
    await user.press(screen.getByRole("button", { name: label(29) }));
    expect(change).toHaveBeenCalledWith("2024-02-29");
    expect(screen.queryByText("Kalender Slivadoc")).not.toBeOnTheScreen();
  });
  test("QRIS expiry never offers a payable QR and its close control remains usable", async () => {
    const payment = { id: "test-payment", order_id: "test-order", amount: 50000, status: "expired", qr_string: "test-qr" } as MobilePaymentIntent;
    const close = jest.fn();
    const user = userEvent.setup();
    await render(<MobileQrisModal payment={payment} onClose={close} onPaid={() => {}}/>, { wrapper: Providers });
    expect(screen.getByText("QR kedaluwarsa. Buat pembayaran baru dari Aktivitas.")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Kode QRIS pembayaran")).not.toBeOnTheScreen();
    await user.press(screen.getByRole("button", { name: "Tutup pembayaran" }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(getMobilePaymentIntent).not.toHaveBeenCalled();
  });
});
