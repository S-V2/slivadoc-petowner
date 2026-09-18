import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const api = readFileSync("mobile/src/api.ts", "utf8");
const screen = readFileSync("mobile/src/screens/WorldScreen.tsx", "utf8");

test("mobile PetSpot exposes server-backed availability and reservation APIs", () => {
  assert.match(api, /public\/petspots\/\$\{spotId\}\/availability/);
  assert.match(api, /petowner\/petspot-reservations/);
  assert.match(api, /reference_type: "petspot_reservation"/);
});

test("mobile PetSpot requires resource selection and mandatory DP payment", () => {
  assert.match(screen, /Pilih meja atau unit yang masih tersedia/);
  assert.match(screen, /DP WAJIB/);
  assert.match(screen, /Reservasi & bayar DP/);
  assert.match(screen, /createMobilePaymentIntent\(\s*"petspot_reservation"/);
});

test("mobile PetSpot renders an availability legend and positioned resources", () => {
  assert.match(screen, /Tersedia/);
  assert.match(screen, /Sudah direservasi/);
  assert.match(screen, /x_percent/);
  assert.match(screen, /y_percent/);
});
