import assert from "node:assert/strict";
import test from "node:test";
import { petSpotBookingWindow, petSpotQuote } from "../app/lib/petspot-booking.ts";

test("PetSpot visit uses WIB independent of browser timezone", () => {
  const value = petSpotBookingWindow({ category: "cafe", date: "2026-10-08", time: "18:00", endDate: "", minutes: 90 });
  assert.equal(value?.starts_at, "2026-10-08T11:00:00.000Z");
  assert.equal(value?.ends_at, "2026-10-08T12:30:00.000Z");
});
test("rejects invalid dates and boarding stays shorter than 30 nights", () => {
  const input = { category: "boarding_house", date: "2026-10-08", time: "14:00", endDate: "2026-11-06", minutes: 90 };
  assert.equal(petSpotBookingWindow(input), null);
  assert.equal(petSpotBookingWindow({ ...input, endDate: "2026-11-07" })?.days, 30);
  assert.equal(petSpotBookingWindow({ ...input, category: "cafe", date: "2026-02-30" }), null);
  assert.equal(petSpotBookingWindow({ ...input, category: "cafe", time: "24:00" }), null);
});
const unit = { base_price: 100000, minimum_deposit_type: "inherit", minimum_deposit_value: 0, booking_rules: {} };
test("visit deposit and total match persisted API amounts", () => {
  assert.deepEqual(petSpotQuote({ category: "restaurant", deposit_type: "percentage", deposit_value: 30 }, unit, 1), { periods: 1, subtotal: 100000, deposit: 30000, remaining: 70000 });
  assert.deepEqual(petSpotQuote({ category: "cafe" }, { ...unit, base_price: 0, minimum_deposit_type: "fixed", minimum_deposit_value: 75000 }, 1), { periods: 1, subtotal: 75000, deposit: 75000, remaining: 0 });
});
test("monthly housing rounds up periods and unit overrides venue DP", () => {
  const result = petSpotQuote({ category: "boarding_house", deposit_type: "percentage", deposit_value: 30 }, { ...unit, booking_rules: { rate_period: "month" }, minimum_deposit_type: "percentage", minimum_deposit_value: 50 }, 31);
  assert.deepEqual(result, { periods: 2, subtotal: 200000, deposit: 100000, remaining: 100000 });
});
