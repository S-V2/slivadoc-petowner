import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const api = readFileSync("app/lib/platform-api.ts", "utf8");
const discovery = readFileSync(
  "app/components/platform/PlatformDiscovery.tsx",
  "utf8",
);
const app = readFileSync("app/components/PetOwnerApp.tsx", "utf8");

test("PetSpot event tickets bind one eligible pet and use QRIS", () => {
  assert.match(api, /allowed_pet_species: string\[\]/);
  assert.match(api, /pet_id\?: string/);
  assert.match(discovery, /ticket_unit === "owner_pet"/);
  assert.match(discovery, /pet_id: selectedPetID/);
  assert.match(discovery, /"event_registration",[\s\S]*"qris"/);
});

test("Pet owner app supplies every pet profile to event checkout", () => {
  assert.match(app, /pets=\{petProfiles\.map/);
  assert.match(app, /species: pet\.speciesCode/);
});
