import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const api = readFileSync("app/lib/platform-api.ts", "utf8");
const web = readFileSync("app/components/PetOwnerApp.tsx", "utf8");
const mobile = readFileSync("mobile/src/screens/ProfileScreen.tsx", "utf8");

test("Pet Owner memakai rumus reward dinamis dan redemption server-side", () => {
  assert.match(api, /redeem_points:redeemPoints/);
  assert.match(web, /rewardFormula\.max_redemption_bps/);
  assert.match(api, /points_discount:number/);
  assert.match(web, /pointsDiscount/);
  assert.match(web, /createPetOwnerOrder\([\s\S]*appliedRedeemPoints/);
  assert.doesNotMatch(web, /floor\(nilai transaksi bersih ÷ Rp10\.000\)/);
  assert.doesNotMatch(mobile, /floor\(nilai transaksi bersih ÷ Rp10\.000\)/);
});
