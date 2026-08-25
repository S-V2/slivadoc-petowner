import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("web and mobile Pet Owner track academy detail engagement", () => {
  const api = readFileSync(new URL("../app/lib/platform-api.ts", import.meta.url), "utf8");
  const web = readFileSync(new URL("../app/components/platform/PlatformDiscovery.tsx", import.meta.url), "utf8");
  const mobile = readFileSync(new URL("../mobile/src/screens/WorldScreen.tsx", import.meta.url), "utf8");
  assert.match(api, /public\/academy\/programs\/\$\{programId\}\/click/);
  assert.match(web, /trackAcademyProgramClick\(selectedProgram\.id\)/);
  assert.match(mobile, /trackMobileAcademyProgramClick\(selected\.id\)/);
});
