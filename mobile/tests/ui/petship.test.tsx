import { jest, test, expect, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { PetshipScreen } from "../../src/screens/PetshipScreen";
import { LanguageProvider } from "../../src/i18n";
import { mobilePetship } from "../../src/api";
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Icon" }));
jest.mock("../../src/api", () => ({
  mobilePetship: {
    places: jest.fn(),
    presences: jest.fn(),
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    heartbeat: jest.fn(),
  },
}));
const pet = {
  id: "pet-one",
  name: "Milo",
  breed: "Golden Retriever",
  age: "2",
  weight: "20",
  icon: "paw",
  score: 90,
  allergies: "",
};
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(mobilePetship.places)
    .mockResolvedValue({
      data: [
        {
          id: "park-one",
          name: "Sliva Park",
          city: "Jakarta",
          active_petowners: 1,
        },
      ],
    });
  jest.mocked(mobilePetship.presences).mockResolvedValue({ data: [] });
  jest
    .mocked(mobilePetship.checkIn)
    .mockResolvedValue({ message: "Check-in berhasil" });
  jest
    .mocked(mobilePetship.checkOut)
    .mockResolvedValue({ message: "Check-out berhasil" });
});
test("Petship respects the pet prerequisite before sending a check-in", async () => {
  const requirePet = jest.fn(() => false);
  await render(
    <PetshipScreen pet={pet} onRequirePet={requirePet} onAction={jest.fn()} />,
    { wrapper: LanguageProvider },
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Check-in Petship" }),
    ).not.toBeDisabled(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Check-in Petship" }),
  );
  expect(requirePet).toHaveBeenCalled();
  expect(mobilePetship.checkIn).not.toHaveBeenCalled();
});
test("Petship checks the selected pet into the chosen place and can check out", async () => {
  await render(
    <PetshipScreen pet={pet} onRequirePet={() => true} onAction={jest.fn()} />,
    { wrapper: LanguageProvider },
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Check-in Petship" }),
    ).not.toBeDisabled(),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Check-in Petship" }),
  );
  await waitFor(() =>
    expect(mobilePetship.checkIn).toHaveBeenCalledWith("pet-one", "park-one"),
  );
  await fireEvent.press(
    screen.getByRole("button", { name: "Check-out Petship" }),
  );
  await waitFor(() => expect(mobilePetship.checkOut).toHaveBeenCalled());
});
