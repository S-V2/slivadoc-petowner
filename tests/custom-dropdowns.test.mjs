import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function sources(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) return sources(url);
    return /\.tsx?$/.test(entry.name) ? [{ url, text: await readFile(url, "utf8") }] : [];
  }))).flat();
}

test("Pet Owner renders no browser-native dropdowns and names every custom selector", async () => {
  const violations = [];
  let customCount = 0;
  for (const { url, text } of await sources(new URL("../app/", import.meta.url))) {
    const ast = ts.createSourceFile(url.pathname, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(ast);
        if (tag === "select" || tag === "datalist") violations.push(`${url.pathname}: native ${tag}`);
        if (tag === "SlivaSelect") {
          customCount++;
          const named = node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute)
            && ["aria-label", "aria-labelledby"].includes(attribute.name.getText(ast)));
          if (!named) violations.push(`${url.pathname}: unnamed SlivaSelect`);
        }
      }
      if (ts.isCallExpression(node) && /(?:^|\.)createElement$/.test(node.expression.getText(ast))
        && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
        && ["select", "datalist"].includes(node.arguments[0].text)) {
        violations.push(`${url.pathname}: native createElement dropdown`);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert.ok(customCount > 0, "custom dropdowns must be present");
  assert.deepEqual(violations, []);
});
