import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// MapLibre v6 fetches its tile-decode worker relative to its own chunk URL
// (new URL("./maplibre-gl-worker.mjs", import.meta.url)). Bundlers do not track
// that string, so the file was never emitted and production maps stalled on
// "Worker failed to load" with 0 rendered features. The `?url` import plus
// setWorkerUrl() is the whole fix — this test is the tripwire.
test("GeoMap ships the maplibre worker through the bundler and registers it", () => {
  const source = readFileSync(
    new URL("../app/components/platform/GeoMap.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /import maplibreWorkerUrl from "maplibre-gl\/dist\/maplibre-gl-worker\.mjs\?url"/,
  );
  assert.match(source, /lib\.setWorkerUrl\(maplibreWorkerUrl\)/);
});
