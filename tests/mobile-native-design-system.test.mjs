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
const rootPackage = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const expoStarter = await readFile(
  new URL("../mobile/scripts/start-expo.mjs", import.meta.url),
  "utf8",
);
const ui = await readFile(
  new URL("../mobile/src/components/ui.tsx", import.meta.url),
  "utf8",
);
const activity = await readFile(
  new URL("../mobile/src/screens/ActivityScreen.tsx", import.meta.url),
  "utf8",
);
const iconSources = await Promise.all([
  "../mobile/src/components/BatpayPayment.tsx",
  "../mobile/src/components/SlivaCareModal.tsx",
  "../mobile/src/screens/ActivityScreen.tsx",
  "../mobile/src/screens/CommunityGroups.tsx",
  "../mobile/src/screens/CommunityScreen.tsx",
  "../mobile/src/screens/DiscoverScreen.tsx",
  "../mobile/src/screens/HealthScreen.tsx",
  "../mobile/src/screens/HomeScreen.tsx",
  "../mobile/src/screens/MarketplaceScreen.tsx",
  "../mobile/src/screens/PetHubExperience.tsx",
  "../mobile/src/screens/ProfileScreen.tsx",
  "../mobile/src/screens/WorldScreen.tsx",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

function themeColor(name) {
  const value = theme.match(new RegExp(`${name}:\\s*"(#[0-9A-F]{6})"`, "i"))?.[1];
  assert.ok(value, `theme color ${name} must exist`);
  return value;
}

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrastRatio(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

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

test("mobile typography keeps a soft hierarchy without extra-heavy weights", () => {
  const mobileSource = [app, ui, ...iconSources].join("\n");
  assert.doesNotMatch(mobileSource, /fontWeight:\s*"(?:800|900)"/);
  assert.match(ui, /sectionHeading:[^\n]*fontWeight:\s*"600"/);
  assert.match(home, /heroTitle:[^\n]*fontWeight:\s*"700"/);
});

test("mobile semantic text colors remain readable on light surfaces", () => {
  for (const background of [themeColor("white"), themeColor("canvas")]) {
    for (const foreground of ["navy", "text", "muted", "sky600", "mint", "violet", "red", "yellow"].map(themeColor)) {
      assert.ok(
        contrastRatio(foreground, background) >= 4.5,
        `${foreground} must keep a WCAG AA contrast ratio on ${background}`,
      );
    }
  }
});

test("white copy only uses high-contrast filled surfaces", () => {
  const mobileSource = [app, ui, ...iconSources].join("\n");
  assert.doesNotMatch(mobileSource, /backgroundColor:\s*colors\.sky500/);
  assert.doesNotMatch(mobileSource, /color=\{colors\.sky500\}/);
  assert.doesNotMatch(mobileSource, /placeholderTextColor="#[0-9A-F]{6}"/i);
  assert.doesNotMatch(mobileSource, /color:\s*"rgba\(255,255,255,\.[0-7][0-9]*\)"/);
  for (const surface of ["navy", "sky600", "mint", "violet", "red"].map(themeColor)) {
    assert.ok(
      contrastRatio(themeColor("white"), surface) >= 4.5,
      `${surface} must keep white labels readable`,
    );
  }
});

test("home uses a compact illustrated hero and dense quick actions", () => {
  assert.match(home, /minHeight:\s*220/);
  assert.match(home, /heroTitle:[^\n]*fontSize:\s*typography\.screenTitle/);
  assert.match(home, /quickFeatureCard:[^\n]*minHeight:\s*104/);
  assert.match(home, /quickMiniRow:[^\n]*flexDirection:\s*"row"/);
  assert.doesNotMatch(home, /ImageBackground/);
});

test("home hero inspires a daily pet moment without duplicating quick actions", () => {
  const hero = home.match(
    /<LinearGradient[^>]*style=\{styles\.hero\}>[\s\S]*?<\/LinearGradient>/,
  )?.[0];
  assert.ok(hero);
  assert.match(hero, /DAILY PET MOMENT/);
  assert.match(hero, /10 menit quality time/);
  assert.doesNotMatch(hero, /Buat booking|Tanya dokter/);
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
    rootPackage.scripts.android,
    "npm --prefix mobile run android --",
  );
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
  assert.match(expoStarter, /\[\s*"start",\s*"--android",\s*"--clear"/);
  assert.match(expoStarter, /platform === "android" \? "8082" : "8081"/);
  assert.match(expoStarter, /SLIVADOC_ANDROID_PORT/);
  assert.match(expoStarter, /hasExplicitPort/);
});

test("ios start bypasses Expo AppleScript activation and opens through simctl", () => {
  assert.equal(rootPackage.scripts.ios, "npm --prefix mobile run ios --");
  assert.equal(mobilePackage.scripts.ios, "node ./scripts/start-expo.mjs ios");
  assert.match(expoStarter, /spawnSync\("open", \["-a", "Simulator"\]/);
  assert.match(expoStarter, /\["simctl", "openurl", "booted", projectUrl\]/);
  assert.match(expoStarter, /platform === "ios"[\s\S]*?\["start", "--clear"/);
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

test("notification sheet uses compact controls and top-aligned cards", () => {
  assert.match(app, /notificationSheetWrap:\s*\{[\s\S]*?height:\s*"86%"/);
  assert.match(app, /notificationFiltersContent:\s*\{\s*gap:\s*7/);
  assert.match(app, /notificationToolbar:\s*\{[\s\S]*?marginBottom:\s*8/);
  assert.match(app, /notificationListContent:\s*\{\s*gap:\s*8/);
  assert.match(app, /notification:[\s\S]*?alignItems:\s*"flex-start"/);
  assert.match(app, /formatNotificationTime/);
  assert.match(app, /Tandai dibaca/);
});

test("native UI exposes a reusable modern icon surface", () => {
  assert.match(ui, /export function AppIcon/);
  assert.match(ui, /AppIconTone/);
  assert.match(ui, /Ionicons name=\{name\}/);
  assert.match(activity, /BoundedBottomSheet/);
});

test("primary mobile experiences use vector icons instead of functional emoji", () => {
  const emoji = /[\u{1F300}-\u{1FAFF}]/u;
  for (const source of iconSources) assert.doesNotMatch(source, emoji);
});
