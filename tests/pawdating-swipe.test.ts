import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const web = readFileSync(
  "app/components/pawdating/PawDatingExperience.tsx",
  "utf8",
);
const api = readFileSync("app/lib/platform-api.ts", "utf8");
const mobile = readFileSync("mobile/src/screens/WorldScreen.tsx", "utf8");

test("PAW Dating discovery uses left and right swipe decisions", () => {
  assert.match(web, /PawDatingSwipeDeck/);
  assert.match(web, /offset > 0 \? "like" : "pass"/);
  assert.match(api, /decision: "pass"/);
  assert.match(mobile, /MobilePawDatingDeck/);
  assert.match(mobile, /gesture\.dx > 85/);
  assert.match(mobile, /gesture\.dx < -85/);
});

test("registration uploads a vaccine-book photo before review", () => {
  for (const marker of [
    "Foto buku vaksin wajib diunggah",
    "vaccine_book_urls: [vaccineUpload.url]",
    "uploadImage(vaccineBook, \"documents\")",
    "Profil masuk antrean approval Marketplace",
  ]) {
    assert.ok(web.includes(marker), marker);
  }
  assert.match(mobile, /vaccine_book_urls: \[upload\.url\]/);
  assert.match(mobile, /submitMobilePawDatingProfile/);
});

test("public detail presents owner identity and distance", () => {
  assert.match(web, /PET OWNER/);
  assert.match(web, /JARAK DARI ANDA/);
  assert.match(web, /profile\.owner\?\.name/);
  assert.match(mobile, /Pet owner/);
  assert.match(mobile, /selected\?\.owner\?\.name/);
});
