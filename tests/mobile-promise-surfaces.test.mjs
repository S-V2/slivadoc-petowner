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
