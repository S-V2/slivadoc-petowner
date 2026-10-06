import assert from "node:assert/strict";
import test from "node:test";

import { buildMobilePawDatingDiscoveryPath } from "../mobile/src/pawdating.ts";

test("mobile PAW Dating uses location for distance without hiding remote profiles", () => {
  const path = buildMobilePawDatingDiscoveryPath({
    latitude: -8.65,
    longitude: 115.2167,
  });

  assert.match(path, /min_level=2/);
  assert.match(path, /min_health_score=80/);
  assert.match(path, /latitude=-8\.65/);
  assert.match(path, /longitude=115\.2167/);
  assert.doesNotMatch(path, /max_distance_km/);
});

test("mobile PAW Dating discovery also works without location permission", () => {
  assert.equal(
    buildMobilePawDatingDiscoveryPath(),
    "/api/v1/public/pawdating/profiles?min_level=2&min_health_score=80",
  );
});
