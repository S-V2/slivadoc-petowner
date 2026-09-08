import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const api = read("mobile/src/api.ts");
const app = read("mobile/App.tsx");
const marketplace = read("mobile/src/screens/MarketplaceScreen.tsx");
const community = read("mobile/src/screens/CommunityScreen.tsx");
const groups = read("mobile/src/screens/CommunityGroups.tsx");
const petHub = read("mobile/src/screens/PetHubExperience.tsx");
const world = read("mobile/src/screens/WorldScreen.tsx");
const ui = read("mobile/src/components/ui.tsx");

test("the API client denies pet-owner mutations after bootstrap confirms there is no pet", () => {
  assert.match(api, /mobileOwnerHasPet = pets\.length > 0/);
  assert.match(api, /mobileMutationRequiresPet\(path, method\)/);
  assert.match(api, /PET_PROFILE_REQUIRED_MESSAGE/);
  assert.match(api, /\/api\\\/v1\\\/community/);
  assert.match(api, /\/api\\\/v1\\\/petowner\\\/\(\?:bookings\|orders/);
  assert.match(api, /\/api\\\/v1\\\/consultations/);
});

test("accounts without pets see a clear read-only notice and a path to add a pet", () => {
  assert.match(ui, /export function PetRequiredNotice/);
  assert.match(ui, /Mode lihat saja/);
  assert.match(ui, /Tambah pet/);
  assert.match(app, /const hasPet = pets\.length > 0/);
  assert.match(app, /Akunmu sedang dalam mode lihat saja/);
  assert.match(marketplace, /<PetRequiredNotice/);
  assert.match(community, /<PetRequiredNotice/);
  assert.match(world, /<PetRequiredNotice/);
});

test("marketplace and social mutations require a pet while public content remains readable", () => {
  assert.match(marketplace, /if \(!hasPet\) \{\s*onRequirePet\(\)/);
  assert.match(community, /hasPet \? setComposer\(true\) : onRequirePet\(\)/);
  assert.match(groups, /hasPet \? setCreateOpen\(true\) : onRequirePet\(\)/);
  assert.match(groups, /if \(!hasPet\) \{\s*onRequirePet\(\)/);
  assert.match(groups, /editable=\{hasPet && !sending\}/);
  assert.match(petHub, /if \(!hasPet\) \{\s*onRequirePet\(\)/);
  assert.match(world, /!hasPet && mode !== "petspot" && mode !== "pethub"/);
  assert.match(groups, /getMobileCommunityGroupMessages/);
});
