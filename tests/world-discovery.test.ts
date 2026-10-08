import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesWorldEvent } from "../shared/world-discovery.ts";
test("event discovery combines city/title search with the original category identifier", () => {
  const event = { title: "Paw Run", city: "Bandung", category: "charity_run" };
  assert.equal(matchesWorldEvent(event, " BANDUNG ", "all"), true);
  assert.equal(matchesWorldEvent(event, "charity run", "charity_run"), true);
  assert.equal(matchesWorldEvent(event, "Paw", "festival"), false);
  assert.equal(matchesWorldEvent(event, "Bogor", "all"), false);
  assert.equal(event.category, "charity_run");
});
