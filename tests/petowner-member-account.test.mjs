import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { worldFeatures } from "../mobile/src/petowner-flow.ts";

const root = new URL("../", import.meta.url);
const [web, webI18n, webCss, mobileApp, mobileHome, mobileProfile, mobileHealth, mobileMarket, mobileI18n] =
  await Promise.all([
    readFile(new URL("app/components/PetOwnerApp.tsx", root), "utf8"),
    readFile(new URL("app/components/PetOwnerI18n.tsx", root), "utf8"),
    readFile(new URL("app/genz-revamp.css", root), "utf8"),
    readFile(new URL("mobile/App.tsx", root), "utf8"),
    readFile(new URL("mobile/src/screens/HomeScreen.tsx", root), "utf8"),
    readFile(new URL("mobile/src/screens/ProfileScreen.tsx", root), "utf8"),
    readFile(new URL("mobile/src/screens/HealthScreen.tsx", root), "utf8"),
    readFile(new URL("mobile/src/screens/MarketplaceScreen.tsx", root), "utf8"),
    readFile(new URL("mobile/src/i18n.tsx", root), "utf8"),
  ]);

test("web and native profile keep the server-backed Slivadoc member identity", () => {
  for (const source of [web, mobileProfile]) {
    assert.match(source, /PET OWNER MEMBER/);
    assert.match(source, /public_code/);
    assert.match(source, /SLV-PO-/);
    assert.match(source, /membership\?*\.?name|membership\.name/);
  }
  assert.match(webCss, /profile-member-card--royal/);
  assert.match(mobileProfile, /tierKey\.includes\("royal"\)/);
  assert.doesNotMatch(mobileHome, /style=\{styles\.memberCard\}/);
});

test("language selectors expose exactly Indonesian and English", () => {
  assert.match(webI18n, /PetOwnerLanguage = "id" \| "en"/);
  assert.match(mobileI18n, /AppLanguage = "id" \| "en"/);
  assert.doesNotMatch(mobileI18n, /code: "zh"/);
  assert.match(web, /setLanguage\("id"\)/);
  assert.match(web, /setLanguage\("en"\)/);
});

test("native medical records open a detailed bounded sheet", () => {
  assert.match(mobileHealth, /setSelectedRecord\(record\)/);
  assert.match(mobileHealth, /BoundedBottomSheet/);
  assert.match(mobileHealth, /Keluhan utama/);
  assert.match(mobileHealth, /Tindakan & terapi/);
  assert.match(mobileHealth, /next_control_at/);
});

test("More exposes SlivaWorld destinations directly and marketplace has no fake all-store chip", () => {
  assert.deepEqual(worldFeatures.map((feature) => feature.mode), ["academy", "events", "petspot", "pethub", "consult", "adoption", "documents", "pawdating"]);
  assert.match(mobileApp, /worldFeatures as sharedWorldFeatures/);
  assert.match(mobileApp, /sharedWorldFeatures\.map/);
  assert.doesNotMatch(mobileMarket, /id: "Semua toko"/);
  assert.doesNotMatch(mobileMarket, /name: "Semua toko"/);
});
