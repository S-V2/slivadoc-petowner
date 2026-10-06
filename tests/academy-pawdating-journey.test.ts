import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [webApi, academy, pawDating, mobileApi, mobileWorld, discoveryCss] =
  await Promise.all([
    readFile(new URL("../app/lib/platform-api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/platform/PlatformDiscovery.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/pawdating/PawDatingExperience.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../mobile/src/api.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../mobile/src/screens/WorldScreen.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/platform-discovery.css", import.meta.url), "utf8"),
  ]);

test("an accepted PAW Dating request opens an API-backed private chat", () => {
  assert.match(pawDating, /action === "accept" && result\.match_id/);
  assert.match(pawDating, /setChatInterest\(/);
  assert.match(mobileApi, /pawdating\/interests/);
  assert.match(mobileApi, /pawdating\/matches\/\$\{matchId\}\/messages/);
  assert.match(mobileWorld, /await openPawDatingChat\(/);
  assert.match(mobileWorld, /createMobilePawDatingMessage/);
});

test("Academy detail selects a compatible owned pet and a live class schedule", () => {
  assert.match(webApi, /public\/academy\/trainers/);
  assert.match(webApi, /public\/academy\/programs\/\$\{programId\}/);
  assert.match(academy, /eligiblePets/);
  assert.match(academy, /name="participant_name"/);
  assert.match(academy, /schedule_id: selectedScheduleID/);
  assert.match(academy, /createPaymentIntent\(\s*"academy_enrollment"/);
  assert.match(mobileWorld, /selectedAcademyPetID/);
  assert.match(mobileWorld, /selectedAcademyScheduleID/);
  assert.match(mobileWorld, /createMobilePaymentIntent\(\s*"academy_enrollment"/);
});

test("Event and Academy details keep a bounded independently scrollable body", () => {
  assert.match(discoveryCss, /\.world-modal\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(discoveryCss, /\.world-modal>\.modal-world-body\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(mobileWorld, /sheetWrap:\s*\{[^\n]*height:\s*"88%"/);
  assert.match(mobileWorld, /sheet:\s*\{[\s\S]*?flex:\s*1,[\s\S]*?minHeight:\s*0/);
  assert.match(mobileWorld, /sheetScroll:\s*\{\s*flex:\s*1,\s*minHeight:\s*0\s*\}/);
});
