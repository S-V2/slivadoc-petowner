import assert from "node:assert/strict";
import test from "node:test";
import { LOCATION_REFRESH_MS, parseStoredLocation, parseLocationPreferences } from "../app/lib/location-session.ts";

test("saved header locations accept previous data and reject invalid coordinates", () => {
  const point = { latitude: -6.2, longitude: 106.8, label: "Jakarta" };
  assert.deepEqual(parseStoredLocation(JSON.stringify(point)), point);
  for (const raw of [null, "broken", "null", JSON.stringify({ ...point, latitude: 91 }), JSON.stringify({ ...point, longitude: 181 }), JSON.stringify({ ...point, label: null }), JSON.stringify({ ...point, latitude: "-6.2" })]) {
    assert.equal(parseStoredLocation(raw), null);
  }
});

test("refresh policy keeps manual picks distinct and uses a fifteen-minute interval", () => {
  assert.equal(LOCATION_REFRESH_MS, 900_000);
  assert.deepEqual(parseLocationPreferences(null), { updatedAt: 0 });
  assert.deepEqual(parseLocationPreferences("broken"), { updatedAt: 0 });
  assert.deepEqual(parseLocationPreferences('{"source":"manual","updatedAt":123}'), { source: "manual", updatedAt: 123 });
  assert.deepEqual(parseLocationPreferences('{"source":"device","updatedAt":123}'), { source: "device", updatedAt: 123 });
});
