import assert from "node:assert/strict";
import test from "node:test";
import { petProfilePayload, type PetProfileDraft } from "../shared/pet-profile.ts";
import { translateText } from "../shared/i18n.ts";

const species = [{ code: "cat", label: "Kucing", group: "cat", scientific_name: "Felis catus", emoji: "🐈" }, { code: "other", label: "Spesies lainnya", group: "other", scientific_name: "", emoji: "🐾" }];
const draft: PetProfileDraft = { name: " Milo ", speciesCode: "cat", customSpecies: "", customScientificName: "", breed: " Domestic ", sex: "unknown", birthDate: "2024-02-29", weight: "2,5" };
const today = new Date(2026, 9, 8, 12);
test("pet profile sends a valid catalogue code, original taxonomy and decimal kilograms", () => {
  assert.deepEqual(petProfilePayload(draft, species, today), { name: "Milo", species: "cat", species_common_name: "Kucing", species_scientific_name: "Felis catus", breed: "Domestic", sex: "unknown", birth_date: "2024-02-29", weight_kg: 2.5 });
  const minimal = petProfilePayload({ ...draft, birthDate: "", weight: "" }, species, today);
  assert.equal("birth_date" in minimal, false);
  assert.equal(minimal.weight_kg, 0);
});
test("pet profile refuses missing identity, invalid weight and impossible or future birthdays", () => {
  for (const invalid of [{ name: "A" }, { speciesCode: "not-in-catalogue" }, { weight: "-1" }, { weight: "NaN" }, { weight: "5 kg" }, { birthDate: "2025-02-29" }, { birthDate: "2027-10-08" }]) assert.throws(() => petProfilePayload({ ...draft, ...invalid }, species, today));
});
test("custom species requires its own name and preserves scientific spelling", () => {
  assert.throws(() => petProfilePayload({ ...draft, speciesCode: "other" }, species, today));
  const result = petProfilePayload({ ...draft, speciesCode: "other", customSpecies: "Binturong", customScientificName: "Arctictis binturong" }, species, today);
  assert.equal(result.species, "other");
  assert.equal(result.species_common_name, "Binturong");
  assert.equal(result.species_scientific_name, "Arctictis binturong");
});
test("English pet headings preserve names and correctly translate age and home copy", () => {
  assert.equal(translateText("Hai, Raka!", "en"), "Hi, Raka!");
  assert.equal(translateText("Kondisi Nala", "en"), "Nala's health");
  assert.equal(translateText("Untuk Milo", "en"), "For Milo");
  assert.equal(translateText("AKUN & PERAWATAN", "en"), "ACCOUNT & CARE");
  assert.equal(translateText("Buka PetSpot", "en"), "Open PetSpot");
  assert.equal(translateText("11 th pengalaman · 3156 konsultasi", "en"), "11 years of experience · 3156 consultations");
  assert.equal(translateText("3 tahun 5 bulan", "en"), "3 years 5 months");
  assert.equal(translateText("1 bulan", "en"), "1 month");
  assert.equal(translateText("Yuk, bikin hari pet-mu makin sehat dan happy.", "en"), "Let's make your pet's day healthier and happier.");
});
