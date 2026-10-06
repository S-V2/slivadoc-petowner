import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../mobile/src/api.ts", import.meta.url), "utf8");
const profile = readFileSync(new URL("../mobile/src/screens/ProfileScreen.tsx", import.meta.url), "utf8");
const chat = readFileSync(new URL("../mobile/src/components/SlivaCareModal.tsx", import.meta.url), "utf8");

test("mobile account settings expose working detail flows", () => {
  assert.match(profile, /title="Keluarga & akses"/);
  assert.match(profile, /title="Privasi & keamanan"/);
  assert.match(profile, /Undang anggota dan atur izin setiap pet/);
  assert.match(profile, /Belum verifikasi/);
  assert.match(app, /Detail notifikasi/);
  assert.match(app, /Lihat detail/);
  assert.match(profile, /ProfileEditSheet/);
  assert.match(profile, /updateMobilePetOwnerProfile/);
  assert.match(api, /petowner\/profile/);
  assert.match(profile, /onOpenNotifications\("security"\)/);
  assert.match(app, /initialCategory=\{notificationCategory\}/);
});

test("family access uses platform endpoints for list, invite, and revoke", () => {
  assert.match(api, /petowner\/pets\/\$\{petId\}\/family/);
  assert.match(api, /petowner\/family\/\$\{accessId\}/);
  assert.match(profile, /inviteMobilePetFamily/);
  assert.match(profile, /revokeMobilePetFamily/);
});

test("help opens the dedicated customer support conversation", () => {
  assert.match(profile, /Chat Customer Support/);
  assert.match(app, /setChatContext\("support"\)/);
  assert.match(chat, /support-\$\{owner\.id\}/);
  assert.match(chat, /Customer Support/);
});

test("notification dot reflects the real unread count everywhere", () => {
  const screens = ["ActivityScreen", "HomeScreen", "MarketplaceScreen", "ProfileScreen"].map((name) =>
    readFileSync(new URL(`../mobile/src/screens/${name}.tsx`, import.meta.url), "utf8"),
  );
  const ui = readFileSync(new URL("../mobile/src/components/ui.tsx", import.meta.url), "utf8");
  for (const source of [...screens, ui]) {
    assert.doesNotMatch(source, /(?<!\? )<View style=\{styles\.(?:headerN|n)otificationDot\}\s*\/>/);
    assert.match(source, /unreadNotifications > 0/);
  }
  assert.match(app, /unreadNotifications=\{bootstrap\?\.unread_notifications \?\? 0\}/);
});

test("notification center loads the full list and routes care and support taps", () => {
  assert.match(api, /\/api\/v1\/notifications\?limit=\$\{limit\}/);
  assert.match(app, /getMobileNotifications\(100\)/);
  assert.match(app, /route === "care"/);
  assert.match(app, /route === "support"/);
});

test("pets shared through family access are badged and not manageable", () => {
  const home = readFileSync(new URL("../mobile/src/screens/HomeScreen.tsx", import.meta.url), "utf8");
  assert.match(api, /access_role\?: string/);
  assert.match(app, /shared: Boolean\(item\.access_role\) && item\.access_role !== "owner"/);
  assert.match(home, /Dibagikan/);
  assert.match(profile, /Dibagikan/);
  assert.match(profile, /onRevoke=\{shared \|\|/);
});

test("legal links stay in registration and are absent from account settings", () => {
  assert.doesNotMatch(profile, /Syarat & Privasi/);
  assert.match(app, /Syarat dan Ketentuan/);
  assert.match(app, /Kebijakan Privasi/);
});

test("logout requires an explicit confirmation", () => {
  assert.match(profile, /Keluar dari akun\?/);
  assert.match(profile, /Tetap masuk/);
  assert.match(profile, /Ya, keluar/);
});
