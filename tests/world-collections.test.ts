import assert from "node:assert/strict";
import test from "node:test";
import { worldCardWidth, worldCollections, worldGridColumns } from "../shared/world-collections.ts";
import { translateText } from "../shared/i18n.ts";

test("World grids preserve two phone columns and add columns only with room", () => {
  for (const width of [288, 358, 568]) assert.equal(worldGridColumns(width), 2);
  assert.equal(worldGridColumns(720), 3); assert.equal(worldGridColumns(900), 4); assert.equal(worldGridColumns(1072), 5);
  assert.equal(worldGridColumns(1072, "petspot"), 3);
  for (const width of [288, 358, 720, 1072]) {
    const columns = worldGridColumns(width), card = worldCardWidth(width, columns);
    assert.equal(card * columns + 12 * (columns - 1), width);
    assert.ok(card >= 138);
  }
});
test("every revamped World collection has reviewed English header copy", () => {
  for (const { title, note } of Object.values(worldCollections)) {
    assert.notEqual(translateText(title, "en"), title);
    assert.notEqual(translateText(note, "en"), note);
  }
});
