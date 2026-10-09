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

test("Academy catalogue and detail expose real cohort proof, galleries, and verified reviews", () => {
  assert.match(webApi, /getAcademyProgramReviews/);
  assert.match(webApi, /saveAcademyProgramReview/);
  assert.match(academy, /participant_count/);
  assert.match(academy, /running_since/);
  assert.match(academy, /WorldImageGallery/);
  assert.match(academy, /Kirim review terverifikasi/);
  assert.match(mobileApi, /saveMobileAcademyProgramReview/);
  assert.match(mobileWorld, /academyProgramVisual/);
  assert.match(mobileWorld, /academyProgramStats/);
  assert.match(mobileWorld, /Review & komentar/);
  assert.match(mobileWorld, /verified_enrollment/);
});

test("Academy promotions retain the original price and final payable price", () => {
  assert.match(webApi, /original_price/);
  assert.match(webApi, /discount_percent/);
  assert.match(academy, /AcademyPrice/);
  assert.match(academy, /<DiscountBadge percent=\{program\.discount_percent\}/);
  assert.match(mobileWorld, /cardOriginalPrice/);
  assert.match(mobileWorld, /worldPromoPrice/);
});

test("Event and Academy details keep a bounded independently scrollable body", () => {
  assert.match(discoveryCss, /\.world-modal\s*\{[\s\S]*?overflow:\s*hidden/);
  assert.match(discoveryCss, /\.world-modal>\.modal-world-body\s*\{[\s\S]*?flex:\s*1 1 0[\s\S]*?overflow-y:\s*scroll/);
  assert.match(discoveryCss, /\.academy-trainer-profile-body\s*\{[\s\S]*?overflow-y:\s*auto/);
  assert.match(mobileWorld, /sheetWrap:\s*\{[^\n]*height:\s*"92%"/);
  assert.match(mobileWorld, /sheet:\s*\{[\s\S]*?flex:\s*1,[\s\S]*?minHeight:\s*0/);
  assert.match(mobileWorld, /sheetScroll:\s*\{\s*flex:\s*1,\s*minHeight:\s*0\s*\}/);
  assert.match(mobileWorld, /trainerSheetScroll:\s*\{\s*flex:\s*1,\s*minHeight:\s*0\s*\}/);
  assert.match(mobileWorld, /<View style=\{styles\.backdrop\}>[\s\S]*?accessibilityLabel="Tutup detail"[\s\S]*?<View style=\{styles\.sheet\}>/);
  assert.match(mobileWorld, /<View style=\{styles\.trainerSheet\}>[\s\S]*?<ScrollView[\s\S]*?scrollEnabled[\s\S]*?alwaysBounceVertical/);
  assert.doesNotMatch(mobileWorld, /<Pressable style=\{styles\.(?:sheet|trainerSheet)\}/);
});

test("Academy rails and Pet Event cards expose swipe and next-button affordances", () => {
  assert.match(academy, /<RailArrows rail=\{speciesRailRef\} label="jenis pet"/);
  assert.match(academy, /<RailArrows rail=\{trainerRailRef\} label="pet trainer"/);
  assert.match(discoveryCss, /grid-auto-columns:calc\(\(100% - 16px\)\/3\)/);
  assert.match(academy, /event-card--experience/);
  assert.match(academy, /event-social-summary/);
  assert.match(mobileWorld, /academySpeciesChoice/);
  assert.match(mobileWorld, /accessibilityLabel="Lihat pet trainer berikutnya"/);
  assert.match(mobileWorld, /eventExperienceVisual/);
  assert.match(mobileWorld, /eventSocialSummary/);
});
