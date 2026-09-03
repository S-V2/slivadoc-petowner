import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const theme = await readFile(
  new URL("../mobile/src/theme.ts", import.meta.url),
  "utf8",
);
const home = await readFile(
  new URL("../mobile/src/screens/HomeScreen.tsx", import.meta.url),
  "utf8",
);
const discover = await readFile(
  new URL("../mobile/src/screens/DiscoverScreen.tsx", import.meta.url),
  "utf8",
);
const app = await readFile(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const mobilePackage = JSON.parse(
  await readFile(new URL("../mobile/package.json", import.meta.url), "utf8"),
);
const expoStarter = await readFile(
  new URL("../mobile/scripts/start-expo.mjs", import.meta.url),
  "utf8",
);

test("native mobile theme keeps the compact commerce-style hierarchy", () => {
  assert.match(theme, /screenTitle:\s*22/);
  assert.match(theme, /sectionTitle:\s*17/);
  assert.match(theme, /cardTitle:\s*15/);
  assert.match(theme, /body:\s*13/);
  assert.match(theme, /control:\s*13/);
  assert.match(theme, /caption:\s*10/);
});

test("native mobile theme preserves Slivadoc sky blue as the primary color", () => {
  assert.match(theme, /sky500:\s*"#19A7F2"/);
  assert.match(theme, /canvas:\s*"#F6FBFF"/);
  assert.match(theme, /sky50:\s*"#EBF8FF"/);
});

test("home uses a compact illustrated hero and dense quick actions", () => {
  assert.match(home, /minHeight:\s*208/);
  assert.match(home, /heroTitle:[^\n]*fontSize:\s*typography\.screenTitle/);
  assert.match(home, /quickFeatureCard:[^\n]*minHeight:\s*104/);
  assert.match(home, /quickMiniRow:[^\n]*flexDirection:\s*"row"/);
  assert.doesNotMatch(home, /ImageBackground/);
});

test("pet selector lives inside the health snapshot only", () => {
  assert.match(home, /HEALTH SNAPSHOT[\s\S]*Pilih profil hewan/);
  assert.equal(home.match(/Pilih profil hewan/g)?.length, 1);
  assert.doesNotMatch(home, /petPicker/);
});

test("home care sections use lively layered cards instead of rigid panels", () => {
  assert.match(home, /healthGlowLarge/);
  assert.match(home, /petSwitchButton/);
  assert.match(home, /healthOverview/);
  assert.match(home, /careTimeline/);
  assert.match(home, /Buat care plan pertama/);
  assert.match(home, /serviceFavorite/);
  assert.match(home, /TOP PICK/);
  assert.match(home, /serviceGradient\(service\.tone\)/);
});

test("android start replaces stale project Metro and clears its cache", () => {
  assert.equal(
    mobilePackage.scripts.android,
    "node ./scripts/start-expo.mjs android",
  );
  assert.equal(
    mobilePackage.scripts.preandroid,
    "node ./scripts/ensure-dependencies.mjs",
  );
  assert.match(expoStarter, /findStaleExpoProcesses/);
  assert.match(expoStarter, /process\.kill\(pid, "SIGTERM"\)/);
  assert.match(expoStarter, /\["start", `--\$\{platform\}`, "--clear"/);
});

test("home header prioritizes global search and never renders location copy", () => {
  assert.match(home, /Cari dokter, layanan, produk/);
  assert.match(home, /getMobileGlobalSearch/);
  assert.match(home, /PENCARIAN POPULER/);
  assert.doesNotMatch(home, /locationTitle|onLocation|Lokasi kamu/);
});

test("discovery cards scan horizontally on a phone viewport", () => {
  assert.match(discover, /serviceCard:[^\n]*flexDirection:\s*"row"/);
  assert.match(discover, /serviceVisual:[^\n]*width:\s*105/);
  assert.match(discover, /title:[^\n]*fontSize:\s*22/);
});

test("bottom navigation stays compact without sacrificing tap space", () => {
  assert.match(app, /tabBar:[\s\S]*?height:\s*66/);
  assert.match(app, /tabItem:[\s\S]*?minHeight:\s*56/);
  assert.match(app, /tabLabel:[^\n]*fontSize:\s*10/);
});

test("mobile sheets preserve tappable space above the panel", () => {
  assert.match(home, /searchSheet:[^\n]*height:\s*"86%"/);
  assert.match(app, /sheetWrap:\s*\{\s*maxHeight:\s*"88%"/);
  assert.match(app, /loginSheetWrap:\s*\{\s*maxHeight:\s*"88%"/);
  assert.match(app, /bookingWrap:\s*\{\s*maxHeight:\s*"88%"/);
});
