import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const web = readFileSync(new URL("../app/components/PetOwnerApp.tsx", import.meta.url), "utf8");
const webApi = readFileSync(new URL("../app/lib/platform-api.ts", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const mobileApi = readFileSync(new URL("../mobile/src/api.ts", import.meta.url), "utf8");
const mobileInbox = readFileSync(new URL("../mobile/src/screens/ChatInboxScreen.tsx", import.meta.url), "utf8");

test("web chat header opens an API-backed categorized inbox", () => {
  assert.match(web, /aria-label="Buka daftar chat"/);
  assert.match(web, /<ChatInboxView/);
  assert.match(web, /Toko/);
  assert.match(web, /Dokter Hewan/);
  assert.match(web, /Cari nama toko/);
  assert.match(web, /Memuat percakapan/);
  assert.match(webApi, /petowner\/marketplace\/chats/);
});

test("native chat header and inbox mirror the web flow", () => {
  assert.match(mobile, /<ChatInboxScreen/);
  assert.match(mobile, /openChatInbox=/);
  assert.match(mobileInbox, /Toko/);
  assert.match(mobileInbox, /Dokter Hewan/);
  assert.match(mobileInbox, /Cari nama toko/);
  assert.match(mobileInbox, /ActivityIndicator/);
  assert.match(mobileApi, /getMobileMarketplaceChats/);
});
