import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const api = readFileSync("app/lib/platform-api.ts", "utf8");
const discovery = readFileSync(
  "app/components/platform/PlatformDiscovery.tsx",
  "utf8",
);
const app = readFileSync("app/components/PetOwnerApp.tsx", "utf8");

test("PetSpot event tickets bind one eligible pet and use QRIS", () => {
  assert.match(api, /allowed_pet_species: string\[\]/);
  assert.match(api, /pet_id\?: string/);
  assert.match(discovery, /ticket_unit === "owner_pet"/);
  assert.match(discovery, /pet_id: selectedPetID/);
  assert.match(discovery, /"event_registration",\s*registration\.id,\s*paymentMethod/);
});

test("Pet owner app supplies every pet profile to event checkout", () => {
  const source = ts.createSourceFile("PetOwnerApp.tsx", app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let pets: ts.JsxAttribute | undefined;
  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "PlatformDiscovery") {
      pets = node.attributes.properties.find((attribute): attribute is ts.JsxAttribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "pets");
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(pets, "PlatformDiscovery pets prop was not found");
  assert.match(pets.getText(source), /pets=\{petProfiles\.map/);
  assert.match(pets.getText(source), /species: pet\.speciesCode/);
});
