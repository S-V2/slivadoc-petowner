import assert from "node:assert/strict";
import test from "node:test";

import { finiteNumber, safeFixed } from "../app/lib/safe-number.ts";

test("PetSpot distance tolerates null API values", () => {
  assert.equal(finiteNumber(null), null);
  assert.equal(safeFixed(null, 1), "—");
  assert.equal(safeFixed(undefined, 2, "Aktifkan lokasi"), "Aktifkan lokasi");
  assert.equal(safeFixed(2.345, 2), "2.35");
});
