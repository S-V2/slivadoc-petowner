import { jest, test, expect, beforeEach, afterEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { ManualClinicSheet } from "../../src/components/ManualClinicSheet";
import { getDiscoveryBranch, type MobileDiscoveryBranch } from "../../src/api";

jest.mock("../../src/api", () => ({ getDiscoveryBranch: jest.fn() }));
jest.mock("../../src/i18n", () => ({ LocalizedText: jest.requireActual<typeof import("react-native")>("react-native").Text }));
jest.mock("../../src/components/LocalizedPressable", () => ({ LocalizedPressable: jest.requireActual<typeof import("react-native")>("react-native").Pressable }));
const load = jest.mocked(getDiscoveryBranch);
const place: MobileDiscoveryBranch = {
  branch_id: "manual-id", place_id: "manual-id", business_id: null,
  business_name: "Andara Vet", branch_name: "Andara Vet", type: "petclinic", source: "manual", verified: false,
  logo_url: null, banner_url: null, address: "Jl. Margasatwa 51", district: "Cilandak", city: "Jakarta Selatan",
  latitude: -6.31, longitude: 106.8, distance_km: null, opening_hours: { mon: "09:00-18:00" }, timezone: "Asia/Jakarta",
  is_open_now: null, rating: 4.9, review_count: 633, product_count: 0, service_count: 0, phone: "0817-0791-919", website: "https://example.com",
};
beforeEach(() => { load.mockReset(); load.mockResolvedValue(place); });
afterEach(() => { jest.restoreAllMocks(); });
test("manual places show contacts and directions without a store account", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const close = jest.fn();
  await render(<ManualClinicSheet placeID="manual-id" onClose={close} />);
  await waitFor(() => expect(screen.getByText("Andara Vet")).toBeTruthy());
  expect(load).toHaveBeenCalledWith("manual-id");
  expect(screen.getByText("Informasi tempat")).toBeTruthy();
  expect(screen.queryByText("Verified")).toBeNull();
  expect(screen.getByText("09:00-18:00")).toBeTruthy();
  await fireEvent.press(screen.getByText("Hubungi tempat"));
  expect(open).toHaveBeenCalledWith("tel:08170791919");
  await fireEvent.press(screen.getByText("Petunjuk arah"));
  expect(open).toHaveBeenCalledWith("https://www.google.com/maps/dir/?api=1&destination=-6.31,106.8");
  await fireEvent.press(screen.getByLabelText("Kembali ke direktori"));
  expect(close).toHaveBeenCalled();
});
test("a hidden or removed place reports unavailable and allows retry", async () => {
  load.mockRejectedValueOnce(new Error("404"));
  await render(<ManualClinicSheet placeID="hidden-id" onClose={jest.fn()} />);
  await waitFor(() => expect(screen.getByText("Tempat tidak tersedia atau belum dapat dimuat.")).toBeTruthy());
  expect(screen.queryByText("Hubungi tempat")).toBeNull();
  await fireEvent.press(screen.getByText("Coba lagi"));
  await waitFor(() => expect(screen.getByText("Andara Vet")).toBeTruthy());
});
