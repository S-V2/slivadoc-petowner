import assert from "node:assert/strict";
import test from "node:test";
import { facilityNames, worldLabel } from "../shared/world-presentation.ts";
import { translateText } from "../shared/i18n.ts";

test("venue amenities have readable names without changing partner names or API codes", () => {
  assert.equal(worldLabel("pet_menu"), "Pet menu");
  assert.equal(worldLabel("private_restroom"), "private restroom");
  assert.equal(worldLabel("Wi-Fi lounge"), "Wi-Fi lounge");
  assert.deepEqual(facilityNames(["indoor", { name: "pet_menu" }, "Indoor", " ", "water_bowl"]), ["Indoor", "Pet menu", "Mangkuk minum"]);
});
test("World explorer and amenity names have reviewed offline English copy", () => {
  for (const [source, expected] of [["Fasilitas", "Amenities"], ["Mangkuk minum", "Water bowls"], ["Dunia pet, satu destinasi", "Your pet's world, in one place"], ["Cari dari posisi saya", "Search near me"]]) assert.equal(translateText(source!, "en"), expected);
});
