import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);

test("mobile header can shrink without exceeding the viewport", () => {
  assert.match(css, /\.topbar\s*>\s*\*/);
  assert.match(css, /\.global-search[\s\S]*?min-width:\s*0/);
  assert.match(css, /@media \(max-width: 580px\)[\s\S]*?\.topbar\s*\{[\s\S]*?gap:\s*8px/);
});

test("registration consent checkboxes do not inherit full-width text input styles", () => {
  assert.match(css, /input:not\(\[type="checkbox"\]\)/);
  assert.match(
    css,
    /\.legal-consents input\[type="checkbox"\][\s\S]*?width:\s*18px\s*!important[\s\S]*?min-height:\s*18px/,
  );
  assert.match(css, /grid-template-columns:\s*18px minmax\(0, 1fr\)/);
});

test("mobile authentication sheet is bounded by its viewport", () => {
  assert.match(
    css,
    /\.petowner-login\{width:100%;max-width:100%;[^}]*overflow-x:hidden/,
  );
});
