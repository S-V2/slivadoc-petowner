import { dateKey, validCalendarValue } from "./calendar.ts";

export type PetSpeciesOption = { code: string; label: string; group: string; scientific_name: string; emoji: string };
export type PetProfileDraft = {
  name: string; speciesCode: string; customSpecies: string; customScientificName: string;
  breed: string; sex: "male" | "female" | "unknown"; birthDate: string; weight: string;
};
export function petProfilePayload(draft: PetProfileDraft, species: readonly PetSpeciesOption[], today = new Date()) {
  const selected = species.find((item) => item.code === draft.speciesCode);
  if (draft.name.trim().length < 2 || !selected) throw new Error("Lengkapi nama dan pilih jenis hewan");
  if (selected.code === "other" && draft.customSpecies.trim().length < 2) throw new Error("Isi nama spesies untuk pilihan Spesies lainnya");
  const weight = draft.weight.trim().replace(",", ".");
  if (weight && (!/^\d+(?:\.\d+)?$/.test(weight) || !Number.isFinite(Number(weight)))) throw new Error("Berat harus berupa angka nol atau lebih dalam kg.");
  if (draft.birthDate && !validCalendarValue(draft.birthDate, "date", undefined, dateKey(today))) throw new Error("Tanggal lahir harus valid dan tidak boleh di masa depan.");
  return {
    name: draft.name.trim(), species: selected.code,
    species_common_name: selected.code === "other" ? draft.customSpecies.trim() : selected.label,
    species_scientific_name: selected.code === "other" ? draft.customScientificName.trim() : selected.scientific_name,
    breed: draft.breed.trim(), sex: draft.sex,
    ...(draft.birthDate ? { birth_date: draft.birthDate } : {}),
    weight_kg: weight ? Number(weight) : 0,
  };
}
