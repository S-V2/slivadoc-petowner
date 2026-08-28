import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const addPet = readFileSync(
  new URL("../app/components/integrations/AddPetExperience.tsx", import.meta.url),
  "utf8",
);
const api = readFileSync(
  new URL("../app/lib/platform-api.ts", import.meta.url),
  "utf8",
);

test("add-pet uses the server taxonomy and supports custom species", () => {
  assert.match(api, /\/api\/v1\/public\/pet-species/);
  assert.match(addPet, /getPetSpecies\(\)/);
  assert.match(addPet, /Object\.entries\(groupedSpecies\)/);
  assert.match(addPet, /species_common_name/);
  assert.match(addPet, /species_scientific_name/);
  assert.doesNotMatch(addPet, /const typeOptions/);
});
