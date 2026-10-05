import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const i18n = await readFile(new URL("../mobile/src/i18n.tsx", import.meta.url), "utf8");
const profile = await readFile(new URL("../mobile/src/screens/ProfileScreen.tsx", import.meta.url), "utf8");
const marketplace = await readFile(new URL("../mobile/src/screens/MarketplaceScreen.tsx", import.meta.url), "utf8");
const theme = await readFile(new URL("../mobile/src/theme.ts", import.meta.url), "utf8");
const ui = await readFile(new URL("../mobile/src/components/ui.tsx", import.meta.url), "utf8");

const localizedScreens = await Promise.all([
  "ActivityScreen.tsx",
  "CommunityGroups.tsx",
  "CommunityScreen.tsx",
  "DiscoverScreen.tsx",
  "HealthScreen.tsx",
  "HomeScreen.tsx",
  "MarketplaceScreen.tsx",
  "PetHubExperience.tsx",
  "ProfileScreen.tsx",
  "WorldScreen.tsx",
].map((name) => readFile(new URL(`../mobile/src/screens/${name}`, import.meta.url), "utf8")));

test("mobile language preference supports Indonesian and English", () => {
  assert.match(i18n, /export type AppLanguage = "id" \| "en"/);
  assert.match(i18n, /nativeLabel: "Bahasa Indonesia"/);
  assert.match(i18n, /nativeLabel: "English"/);
  assert.doesNotMatch(i18n, /code: "zh"/);
  assert.match(i18n, /SecureStore\.getItemAsync\(LANGUAGE_KEY\)/);
  assert.match(i18n, /SecureStore\.setItemAsync\(LANGUAGE_KEY/);
  assert.match(app, /<LanguageProvider>/);
});

test("language selector is available for both guest and authenticated accounts", () => {
  assert.ok((profile.match(/title="Bahasa aplikasi"/g) ?? []).length >= 2);
  assert.match(profile, /languageOptions\.map/);
  assert.match(profile, /setLanguage\(nextLanguage\)/);
  assert.match(profile, /BoundedBottomSheet[^>]*maxHeight="72%"/);
});

test("core journeys include curated English copy", () => {
  for (const phrase of [
    '"Beranda": ["Home",',
    '"Belanja kebutuhan pet": ["Shop pet essentials",',
    '"Aktivitas": ["Activity",',
    '"Kesehatan": ["Health",',
    '"Komunitas": ["Community",',
    '"Privasi & keamanan": ["Privacy & security",',
  ]) assert.ok(i18n.includes(phrase), `${phrase} must be translated`);
});

test("all primary mobile screens render localized text primitives", () => {
  for (const source of localizedScreens) {
    assert.match(source, /LocalizedText as Text/);
    const nativeImports = [...source.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*"react-native";/g)];
    for (const match of nativeImports) {
      assert.doesNotMatch(match[1], /(?:^|,)\s*Text\s*(?:,|$)/);
      assert.doesNotMatch(match[1], /(?:^|,)\s*TextInput\s*(?:,|$)/);
    }
  }
});

test("locale-aware formatters replace hard-coded Indonesian formatting", () => {
  assert.match(i18n, /"id-ID"/);
  assert.match(i18n, /"en-US"/);
  assert.doesNotMatch(i18n, /zh:\s*"zh-CN"/);
  assert.match(i18n, /currency:\s*"IDR"/);
  assert.doesNotMatch([app, ...localizedScreens].join("\n"), /toLocaleString\("id-ID"/);
});

test("marketplace cards use a compact smooth commerce hierarchy", () => {
  assert.match(marketplace, /productCard:[^\n]*borderRadius:\s*16/);
  assert.match(marketplace, /productCard:[^\n]*borderColor:\s*colors\.sky100/);
  assert.match(marketplace, /productCommerceRow/);
  assert.match(marketplace, /productStoreBadge/);
  assert.doesNotMatch(marketplace, />Tambah<\/Text>/);
  assert.doesNotMatch(marketplace, /name="cart-outline"/);
});

test("shared surfaces consistently use Slivadoc sky styling", () => {
  assert.match(theme, /lg:\s*22/);
  assert.match(theme, /shadowRadius:\s*16/);
  assert.match(ui, /card:[^\n]*borderColor:\s*colors\.sky100/);
  assert.match(ui, /name="sparkles"/);
});
