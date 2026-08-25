import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../app/components/PetOwnerApp.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../app/lib/platform-api.ts", import.meta.url), "utf8");
const features = readFileSync(new URL("../app/components/platform/PetshipFundraising.tsx", import.meta.url), "utf8");
const mobile = readFileSync(new URL("../mobile/App.tsx", import.meta.url), "utf8");

test("Petship and Animal Fund are visible and integrated with platform APIs", () => {
  assert.match(app, /id: "petship"/);
  assert.match(app, /id: "fundraising"/);
  for (const endpoint of ["public/petship/places", "petowner/petship/presence", "public/fundraisers", "petowner/fundraisers"]) {
    assert.match(api, new RegExp(endpoint));
  }
  assert.match(features, /heartbeatPetship/);
  assert.match(features, /simulateFundraiserDonationPaid/);
});

test("web and mobile registration require both legal consents and a leading-zero phone", () => {
  assert.match(app, /pattern="0\[0-9\]\{8,15\}"/);
  assert.match(app, /Syarat dan Ketentuan/);
  assert.match(app, /Kebijakan Privasi/);
  assert.match(mobile, /\^0\[0-9\]\{8,15\}\$/);
  assert.match(mobile, /terms&&privacy/);
});
