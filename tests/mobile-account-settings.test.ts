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
