import assert from "node:assert/strict";
import test from "node:test";
import {
  branchCountsLabel,
  branchListOptions,
  directionsUrl,
  formatDistanceKm,
  openingHoursRows,
  type ClinicFilters,
} from "../src/clinics.ts";

const base: ClinicFilters = { type: "all", search: "", radiusKm: 0, openNow: false };
const page = { limit: 20, offset: 0 };
const jakarta = { latitude: -6.2, longitude: 106.8, label: "Jakarta" };

test("radius and coordinates are only sent together with a chosen location", () => {
  assert.deepEqual(branchListOptions({ ...base, radiusKm: 5 }, page), page);
  assert.deepEqual(branchListOptions({ ...base, location: jakarta, radiusKm: 5 }, page), {
    latitude: -6.2,
    longitude: 106.8,
    max_distance_km: 5,
    ...page,
  });
  assert.equal("max_distance_km" in branchListOptions({ ...base, location: jakarta }, page), false);
});

test("type, search and open-now filters map to the API query", () => {
  assert.deepEqual(branchListOptions({ ...base, type: "petclinic", search: "  sehat ", openNow: true }, { limit: 20, offset: 40 }), {
    type: "petclinic",
    search: "sehat",
    open_now: true,
    limit: 20,
    offset: 40,
  });
});

test("opening hours follow week order, accept arrays and skip empty days", () => {
  assert.deepEqual(openingHoursRows({ tue: ["08:00-12:00", "13:00-17:00"], mon: "09:00-17:00", wed: "  " }), [
    ["Senin", "09:00-17:00"],
    ["Selasa", "08:00-12:00, 13:00-17:00"],
  ]);
  assert.deepEqual(openingHoursRows({ friday: "10:00-14:00", fri: "08:00-21:00", monday: { open: "09:00", close: "17:00" } }), [
    ["Senin", "09:00-17:00"],
    ["Jumat", "08:00-21:00"],
  ]);
  assert.deepEqual(openingHoursRows({}), []);
  assert.deepEqual(openingHoursRows(null), []);
});

test("distance, counts and directions use the agreed formats", () => {
  assert.equal(formatDistanceKm(0.34, "id-ID"), "340 m");
  assert.equal(formatDistanceKm(1.26, "id-ID"), "1,3 km");
  assert.equal(branchCountsLabel(3, 12, "id"), "3 layanan · 12 produk");
  assert.equal(branchCountsLabel(1, 1, "en"), "1 service · 1 product");
  assert.equal(directionsUrl(-6.2, 106.8), "https://www.google.com/maps/dir/?api=1&destination=-6.2,106.8");
});
