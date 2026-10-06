import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const activity = readFileSync(
  new URL("../mobile/src/screens/ActivityScreen.tsx", import.meta.url),
  "utf8",
);
const activityPresentation = readFileSync(
  new URL("../mobile/src/activity.ts", import.meta.url),
  "utf8",
);
const mobileApi = readFileSync(
  new URL("../mobile/src/api.ts", import.meta.url),
  "utf8",
);
const home = readFileSync(
  new URL("../mobile/src/screens/HomeScreen.tsx", import.meta.url),
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
  assert.match(
    mobileApi,
    /petowner\/activities\?view=center&type=all&state=all&limit=100/,
  );
  assert.match(activity, /id:\s*"booking"/);
  assert.match(activity, /id:\s*"order"/);
  assert.match(activity, /id:\s*"consultation"/);
});

test("home and activity screens tolerate activity kinds outside the current presentation map", () => {
  assert.match(activityPresentation, /fallbackActivityTypePresentation/);
  assert.match(activityPresentation, /getActivityTypePresentation/);
  assert.match(home, /getActivityTypePresentation\(item\.type\)/);
  assert.doesNotMatch(home, /activityTypePresentation\[item\.type\]/);
  assert.doesNotMatch(activity, /activityTypePresentation\[item\.type\]/);
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

test("activity detail cancels eligible bookings, shows home service rows and resubmits documents", () => {
  assert.match(mobileApi, /"home_service"/);
  assert.match(mobileApi, /\/api\/v1\/petowner\/bookings\/\$\{id\}\/cancel/);
  assert.match(mobileApi, /cancelMobileBooking/);
  assert.match(mobileApi, /\/api\/v1\/pet-document-requests\/\$\{id\}\/documents/);
  assert.match(mobileApi, /method: "PATCH"/);
  assert.match(activity, /item\.source !== "clinic"/);
  assert.match(activity, /Date\.now\(\) <= Date\.parse\(item\.cancellable_until/);
  assert.match(activity, /Batalkan booking/);
  assert.match(activity, /Bisa dibatalkan hingga \$\{item\.cancellation_cutoff_hours\} jam sebelum jadwal/);
  assert.match(activity, /Dana akan dikembalikan setelah diverifikasi tim finance/);
  assert.match(activity, /item\.type === "home_service"/);
  for (const field of ["job_code", "service_type", "pickup_address", "destination_address", "driver_name"])
    assert.match(activity, new RegExp(`item\\.${field}`));
  assert.match(activity, /Lengkapi dokumen/);
  assert.match(activity, /resubmitMobileDocuments\(item\.reference_id/);
  assert.match(world, /DocumentPhotoPicker/);
  assert.match(world, /submitted_documents: submittedDocuments/);
  assert.doesNotMatch(world, /submitted_documents: \[\]/);
});
