import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../mobile/${path}`, import.meta.url), "utf8");
const api = await read("src/api.ts");
const world = await read("src/screens/WorldScreen.tsx");
const adoption = await read("src/screens/AdoptionManager.tsx");

test("adoption mode lists my applications with withdraw and lister review", () => {
  assert.match(api, /\/api\/v1\/petowner\/adoption-applications"/);
  assert.match(api, /adoption-applications\/\$\{applicationId\}\/withdraw/);
  assert.match(api, /petowner\/adoptions\/\$\{listingId\}\/applications/);
  assert.match(api, /adoption-applications\/\$\{applicationId\}\/status[\s\S]{0,80}method: "PATCH"/);
  assert.match(world, /<AdoptionManager onAction=\{onAction\} \/>/);
  assert.match(adoption, /Lamaran saya/);
  assert.match(adoption, /Tarik lamaran/);
  assert.match(adoption, /submitted: \["screening", "rejected"\]/);
  assert.match(adoption, /Catatan untuk pelamar/);
});

test("group owner approves or rejects pending join requests", async () => {
  const groups = await read("src/screens/CommunityGroups.tsx");
  assert.match(api, /community\/groups\/\$\{id\}\/members\?status=\$\{status\}/);
  assert.match(api, /members\/\$\{userId\}`[\s\S]{0,80}method: "PATCH"/);
  assert.match(groups, /group\.owner \? <JoinRequests/);
  assert.match(groups, /getMobileCommunityGroupMembers\(group\.id, "pending"\)/);
  assert.match(groups, /Permintaan bergabung/);
  assert.match(groups, /review\(member, "active"\)[\s\S]*Setujui/);
  assert.match(groups, /review\(member, "blocked"\)[\s\S]*Tolak/);
});
