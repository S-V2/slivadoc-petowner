import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CLINIC_ENTRY_POINT,
  ENTRY_POINT_KEY,
  clearEntryPoint,
  readEntryPoint,
  recordStoreOpen,
} from "../app/lib/entry-point.ts";
import {
  clinicQuery,
  clinicTypeLabel,
  defaultClinicFilters,
  directionsUrl,
  formatDistanceKm,
  hasClinicFilters,
  openingHoursRows,
} from "../app/lib/clinic-directory.ts";
import { resolveLocation } from "../app/lib/device-location.ts";
import {
  clearPlatformCache,
  createPetOwnerBooking,
  createPetOwnerOrder,
  discoveryBranchQuery,
  getDiscoveryBranch,
  getDiscoveryBranches,
  quotePetOwnerOrder,
  trackPetOwnerEvent,
} from "../app/lib/platform-api.ts";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

type Call = { url: URL; method: string; body: Record<string, unknown> | undefined };

async function withApi(
  run: (calls: Call[], session: MemoryStorage, failNext: () => void) => Promise<void>,
) {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const session = new MemoryStorage();
  const calls: Call[] = [];
  let fail = false;
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: session } });
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    calls.push({
      url: new URL(String(input)),
      method: String(init.method ?? "GET").toUpperCase(),
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (fail) {
      fail = false;
      return { ok: false, status: 500, json: async () => ({ message: "boom" }) } as Response;
    }
    return { ok: true, status: 200, json: async () => ({ id: "created", data: [], count: 0, has_more: false }) } as Response;
  }) as typeof globalThis.fetch;
  clearPlatformCache();
  try {
    await run(calls, session, () => { fail = true; });
  } finally {
    globalThis.fetch = originalFetch;
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    clearPlatformCache();
  }
}

const here = { latitude: -6.2, longitude: 106.8 };

test("the radius is only sent together with a location", () => {
  const withRadius = { ...defaultClinicFilters, radiusKm: 10 };
  assert.equal(clinicQuery(withRadius, null).max_distance_km, undefined);
  assert.equal(clinicQuery(withRadius, here).max_distance_km, 10);
  assert.equal(clinicQuery(defaultClinicFilters, here).max_distance_km, undefined);
  // The API contract: latitude and longitude travel as a pair or not at all.
  assert.equal(discoveryBranchQuery({ latitude: -6.2, max_distance_km: 5 }), "");
  assert.equal(
    discoveryBranchQuery({ ...here, max_distance_km: 5, limit: 20 }),
    "latitude=-6.2&longitude=106.8&max_distance_km=5&limit=20",
  );
});

test("type chips map to the API type; Semua means no type", () => {
  assert.equal(clinicQuery({ ...defaultClinicFilters, type: "all" }, null).type, undefined);
  assert.equal(clinicQuery({ ...defaultClinicFilters, type: "clinic" }, null).type, "petclinic");
  assert.equal(clinicQuery({ ...defaultClinicFilters, type: "petshop" }, null).type, "petshop");
  assert.equal(discoveryBranchQuery(clinicQuery({ ...defaultClinicFilters, type: "all" }, null)), "limit=20");
});

test("search, open now and paging are built into the query", () => {
  const query = discoveryBranchQuery(
    clinicQuery({ type: "petshop", search: "  Sehat  ", radiusKm: null, openNow: true }, here, 40),
  );
  const params = new URLSearchParams(query);
  assert.equal(params.get("search"), "Sehat");
  assert.equal(params.get("open_now"), "true");
  assert.equal(params.get("offset"), "40");
  assert.equal(params.get("limit"), "20");
  assert.equal(params.get("type"), "petshop");
  assert.equal(new URLSearchParams(discoveryBranchQuery(clinicQuery(defaultClinicFilters, null))).has("offset"), false);
  assert.equal(hasClinicFilters(defaultClinicFilters), false);
  assert.equal(hasClinicFilters({ ...defaultClinicFilters, openNow: true }), true);
});

test("branch endpoints hit the public discovery routes", async () => {
  await withApi(async (calls) => {
    await getDiscoveryBranches({ ...here, limit: 6 });
    await getDiscoveryBranch("b/1", here);
    await getDiscoveryBranch("b2");
    assert.equal(calls[0].url.pathname, "/api/v1/public/discovery/branches");
    assert.equal(calls[0].url.search, "?latitude=-6.2&longitude=106.8&limit=6");
    assert.equal(calls[1].url.pathname, "/api/v1/public/discovery/branches/b%2F1");
    assert.equal(calls[1].url.search, "?latitude=-6.2&longitude=106.8");
    assert.equal(calls[2].url.search, "");
  });
});

test("a card click event posts the branch and business", async () => {
  await withApi(async (calls) => {
    await trackPetOwnerEvent({ event: "clinic_card_click", branch_id: "br", business_id: "biz" });
    assert.equal(calls[0].method, "POST");
    assert.equal(calls[0].url.pathname, "/api/v1/petowner/events");
    assert.deepEqual(calls[0].body, { event: "clinic_card_click", branch_id: "br", business_id: "biz" });
  });
});

test("entry point: the menu marks the session, any other store open clears it", () => {
  const store = new MemoryStorage();
  assert.equal(readEntryPoint(store), undefined);
  recordStoreOpen(CLINIC_ENTRY_POINT, store);
  assert.equal(store.getItem(ENTRY_POINT_KEY), "klinik_petshop");
  assert.equal(readEntryPoint(store), "klinik_petshop");
  recordStoreOpen("other", store);
  assert.equal(readEntryPoint(store), undefined);
  recordStoreOpen(CLINIC_ENTRY_POINT, store);
  clearEntryPoint(store);
  assert.equal(store.getItem(ENTRY_POINT_KEY), null);
  store.setItem(ENTRY_POINT_KEY, "something_else");
  assert.equal(readEntryPoint(store), undefined);
});

test("an order and a booking send the entry point once, then clear it", async () => {
  await withApi(async (calls, session, failNext) => {
    const order = { items: [{ product_id: "p", quantity: 1 }] };
    recordStoreOpen(CLINIC_ENTRY_POINT);
    await quotePetOwnerOrder(order);
    assert.equal(calls[0].body?.entry_point, undefined, "quotes never carry attribution");
    assert.equal(readEntryPoint(), "klinik_petshop");

    failNext();
    await assert.rejects(createPetOwnerOrder(order));
    assert.equal(calls[1].body?.entry_point, "klinik_petshop");
    assert.equal(session.getItem(ENTRY_POINT_KEY), "klinik_petshop", "a failed create keeps it for the retry");

    await createPetOwnerOrder(order);
    assert.equal(calls[2].body?.entry_point, "klinik_petshop");
    assert.equal(session.getItem(ENTRY_POINT_KEY), null);

    await createPetOwnerOrder(order);
    assert.equal("entry_point" in (calls[3].body ?? {}), false, "no attribution once cleared");

    recordStoreOpen(CLINIC_ENTRY_POINT);
    await createPetOwnerBooking({ service_id: "s", branch_id: "b" });
    assert.equal(calls[4].url.pathname, "/api/v1/petowner/bookings");
    assert.equal(calls[4].body?.entry_point, "klinik_petshop");
    assert.equal(calls[4].body?.service_id, "s");
    assert.equal(session.getItem(ENTRY_POINT_KEY), null);
  });
});

test("guests keep device coordinates without reverse geocoding; members still geocode", async () => {
  let reversed = 0;
  const reverse = async (latitude: number, longitude: number) => {
    reversed += 1;
    return { latitude, longitude, label: "Jl. Merdeka, Jakarta" };
  };
  const guest = await resolveLocation(here, { authenticated: false, reverse, guestLabel: "Lokasi perangkat" });
  assert.deepEqual(guest, { ...here, label: "Lokasi perangkat" });
  assert.equal(reversed, 0);
  const member = await resolveLocation(here, { authenticated: true, reverse, guestLabel: "Lokasi perangkat" });
  assert.equal(member.label, "Jl. Merdeka, Jakarta");
  assert.equal(reversed, 1);
});

test("the location modal gates address search for guests and never geocodes for them", () => {
  const modal = source("../app/components/integrations/LocationModal.tsx");
  assert.match(modal, /if \(!authenticated\) \{\s*setLoginPrompt\(true\);\s*return;\s*\}\s*setLoading\(true\);/);
  assert.match(modal, /resolveLocation\(/);
  assert.doesNotMatch(modal, /await reverseGeocode\(/);
});

test("card helpers format type, distance, hours and directions", () => {
  assert.equal(clinicTypeLabel("hybrid"), "Klinik & Petshop");
  assert.equal(clinicTypeLabel("hybrid", "en"), "Clinic & Pet Shop");
  assert.equal(formatDistanceKm(null), "");
  assert.equal(formatDistanceKm(0.456), "460 m");
  assert.equal(formatDistanceKm(2.46), "2.5 km");
  assert.deepEqual(
    openingHoursRows({
      friday: "10:00-14:00",
      fri: "08:00-21:00",
      monday: { open: "09:00", close: "17:00" },
      daily: ["08:00-17:00", "19:00-21:00"],
    }),
    [
      { day: "Senin", hours: "09:00-17:00" },
      { day: "Jumat", hours: "08:00-21:00" },
      { day: "Setiap hari", hours: "08:00-17:00, 19:00-21:00" },
    ],
  );
  assert.deepEqual(openingHoursRows({}), []);
  assert.equal(
    directionsUrl({ latitude: -6.2, longitude: 106.8 }),
    "https://www.google.com/maps/dir/?api=1&destination=-6.2,106.8",
  );
});

test("Klinik & Petshop is a guest-visible menu item in the more sheet, not the primary tabs", () => {
  const app = source("../app/components/PetOwnerApp.tsx");
  const domain = source("../app/lib/petowner-domain.ts");
  assert.match(domain, /\| "clinics"/);
  assert.match(app, /\{ id: "clinics", label: "Klinik & Petshop", icon: "clinic" \}/);
  assert.match(app, /items: \["messages", "discover", "clinics", "world", "health", "profile"\]/);
  assert.match(app, /const moreIds: AppView\[\] = \["messages", "discover", "clinics", "health", "profile"\]/);
  assert.match(app, /const primaryIds: AppView\[\] = \["home", "shop", "community", "bookings"\]/);
  assert.match(app, /const protectedViews: AppView\[\] = \[\s*"pets",\s*"favorites",\s*"notifications",\s*"support",\s*\]/);
  assert.match(app, /featureView === "clinics" && \(\s*<ClinicDirectory/);
  assert.match(app, /clinics: \{\s*title: "Klinik & Petshop"/);
});

test("the store page takes the branch, drops it for other stores, and the SEO CTA deep links to it", () => {
  const shop = source("../app/components/marketplace/ShopMarketplace.tsx");
  assert.match(shop, /getDiscoveryBranch\(/);
  assert.match(shop, /recordStoreOpen\("other"\)/);
  assert.match(shop, /<ClinicBranchInfo branch=\{branch\}/);
  const place = source("../app/tempat/[slug]/page.tsx");
  assert.match(place, /href=\{`\/\?view=clinics&branch=\$\{place\.branchId\}`\}/);
  const app = source("../app/components/PetOwnerApp.tsx");
  assert.match(app, /recordStoreOpen\("other"\);\s*setActiveView\("shop"\)/);
  assert.match(app, /getDiscoveryBranches\(\{ limit: 6/);
});

test("new directory copy has English and no dashes", () => {
  const extra = source("../shared/english-extra.ts");
  const files = [
    "../app/components/clinics/ClinicDirectory.tsx",
    "../app/components/clinics/ClinicBranchInfo.tsx",
    "../app/lib/clinic-directory.ts",
    "../app/lib/device-location.ts",
  ];
  for (const file of files) assert.doesNotMatch(source(file), /[\u2013\u2014]/, file);
  const block = extra.slice(extra.indexOf("// Klinik & Petshop directory"));
  assert.doesNotMatch(block, /[\u2013\u2014]/);
  for (const key of ["Klinik & Petshop", "Sedang tutup", "Muat lagi", "Rating toko", "Stok dikirim dari cabang terdekat yang tersedia"])
    assert.ok(block.includes(`"${key}"`), key);
});
