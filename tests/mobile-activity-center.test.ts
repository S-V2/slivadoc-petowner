import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../mobile/src/api.ts", import.meta.url), "utf8");
const activity = readFileSync(
  new URL("../mobile/src/screens/ActivityScreen.tsx", import.meta.url),
  "utf8",
);
const marketplace = readFileSync(
  new URL("../mobile/src/screens/MarketplaceScreen.tsx", import.meta.url),
  "utf8",
);
const world = readFileSync(
  new URL("../mobile/src/screens/WorldScreen.tsx", import.meta.url),
  "utf8",
);

test("activity center loads booking, order, and consultation filters from the database API", () => {
  assert.match(api, /\/api\/v1\/petowner\/activity-center\?type=/);
  assert.match(activity, /getMobileActivityCenter\(typeFilter, stateFilter\)/);
  assert.match(activity, /id:\s*"booking"/);
  assert.match(activity, /id:\s*"order"/);
  assert.match(activity, /id:\s*"consultation"/);
  assert.doesNotMatch(activity, /activities:\s*MobileActivity\[\]/);
});

test("every activity exposes details and a contextual repeat action", () => {
  assert.match(activity, /Lihat detail/);
  assert.match(activity, /Booking lagi/);
  assert.match(activity, /Beli lagi/);
  assert.match(activity, /Konsultasi ulang/);
  assert.match(activity, /Informasi booking/);
  assert.match(activity, /Produk dalam pesanan/);
  assert.match(activity, /Informasi konsultasi/);
  assert.match(activity, /maxHeight:\s*"88%"/);
});

test("new booking opens all services while reorder and reconsult keep their database references", () => {
  assert.match(app, /if \(!service\) \{\s*navigateTo\("discover"\)/);
  assert.match(app, /items:\s*items\.map\(\(item\)/);
  assert.match(app, /setWorldIntent\(\{ token: nextIntentToken\(\), mode: "consult", itemId \}\)/);
  assert.match(marketplace, /intent\.items\.reduce/);
  assert.match(marketplace, /setCart\(restored\)/);
  assert.match(world, /items\.consult\.find\(\(item\) => item\.id === intent\.itemId\)/);
});

test("activity center stays compact while preserving contextual creation", () => {
  assert.doesNotMatch(activity, /function ActivitySummary/);
  assert.doesNotMatch(activity, /function NewAction/);
  assert.match(activity, /typeCount/);
  assert.match(activity, /activityToolbar/);
  assert.match(activity, /label="Buat baru"/);
  assert.match(activity, /maxHeight="68%"/);
  assert.match(activity, /Booking layanan/);
  assert.match(activity, /Belanja produk/);
  assert.match(activity, /Konsultasi dokter/);
});
