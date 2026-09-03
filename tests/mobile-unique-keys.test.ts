import assert from "node:assert/strict";
import test from "node:test";

import { uniqueById } from "../mobile/src/collections.ts";

test("mobile API collections keep only the first item for a repeated id", () => {
  const duplicateId = "dc426a61-589e-4816-a92b-fa003620ab3a";
  const result = uniqueById([
    { id: duplicateId, source: "stream" },
    { id: "another-id", source: "feed" },
    { id: duplicateId, source: "feed" },
  ]);

  assert.deepEqual(result, [
    { id: duplicateId, source: "stream" },
    { id: "another-id", source: "feed" },
  ]);
});

test("mobile API collections preserve their original order", () => {
  const result = uniqueById([{ id: "first" }, { id: "second" }]);
  assert.deepEqual(
    result.map((item) => item.id),
    ["first", "second"],
  );
});
