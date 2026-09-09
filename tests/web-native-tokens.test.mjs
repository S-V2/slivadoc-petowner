import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [css, globalsCss, themeTs] = await Promise.all([
  readFile(new URL("../app/mobile-responsive.css", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../mobile/src/theme.ts", import.meta.url), "utf8"),
]);

test("mobile cascade maps RN colors 1:1 at max-width: 860px", () => {
  assert.match(themeTs, /canvas:\s*"#F6FBFF"/);
  assert.match(themeTs, /navy:\s*"#153B5B"/);
  assert.match(themeTs, /sky500:\s*"#19A7F2"/);
  assert.match(themeTs, /sky600:\s*"#05689F"/);
  assert.match(themeTs, /mint:\s*"#08725F"/);

  assert.match(css, /--canvas:\s*#F6FBFF;/);
  assert.match(css, /--navy:\s*#153B5B;/);
  assert.match(css, /--sky-500:\s*#19A7F2;/);
  assert.match(css, /--sky-600:\s*#05689F;/);
  assert.match(css, /--mint:\s*#08725F;/);
});

test("mobile cascade maps RN typography scale 22/17/15/13/10", () => {
  assert.match(themeTs, /screenTitle:\s*22/);
  assert.match(themeTs, /sectionTitle:\s*17/);
  assert.match(themeTs, /cardTitle:\s*15/);
  assert.match(themeTs, /body:\s*13/);
  assert.match(themeTs, /caption:\s*10/);

  assert.match(css, /--type-page-title:\s*22px;/);
  assert.match(css, /--type-section-title:\s*17px;/);
  assert.match(css, /--type-card-title:\s*15px;/);
  assert.match(css, /--type-body:\s*13px;/);
  assert.match(css, /--type-caption:\s*10px;/);
  assert.match(css, /--type-control:\s*13px;/);
  assert.match(css, /--type-compact-control:\s*13px;/);
});

test("floating bottom nav matches RN tabBar metrics", () => {
  assert.match(css, /\.mobile-nav\s*\{[\s\S]*?position:\s*fixed\s*!important/);
  assert.match(css, /\.mobile-nav\s*\{[\s\S]*?left:\s*10px\s*!important/);
  assert.match(css, /\.mobile-nav\s*\{[\s\S]*?right:\s*10px\s*!important/);
  assert.match(css, /\.mobile-nav\s*\{[\s\S]*?height:\s*66px\s*!important/);
  assert.match(css, /\.mobile-nav\s*\{[\s\S]*?border-radius:\s*22px\s*!important/);
});

test("buttons do not use 16px font-size; only text inputs use 16px", () => {
  assert.match(css, /font-size:\s*16px\s*!important;/);
  assert.doesNotMatch(css, /\.primary-button\s*\{[^}]*font-size:\s*16px/);
  assert.doesNotMatch(css, /\.secondary-button\s*\{[^}]*font-size:\s*16px/);
  assert.match(css, /\.primary-button\s*\{[\s\S]*?font-size:\s*13px/);
});

function braceDepth(source, end) {
  return [...source.slice(0, end)].reduce(
    (depth, character) => depth + (character === "{" ? 1 : character === "}" ? -1 : 0),
    0,
  );
}

test("gradient shop hero foreground is defined outside the mobile cascade", () => {
  const titleStart = globalsCss.indexOf(".shop-native-hero h2,");
  const titleRuleEnd = globalsCss.indexOf("}", titleStart);
  const bodyStart = globalsCss.indexOf(".shop-native-hero p,");
  const bodyRuleEnd = globalsCss.indexOf("}", bodyStart);

  assert.ok(titleStart >= 0);
  assert.equal(braceDepth(globalsCss, titleStart), 0);
  assert.match(globalsCss.slice(titleStart, titleRuleEnd), /color:\s*var\(--white\)/);

  assert.ok(bodyStart >= 0);
  assert.equal(braceDepth(globalsCss, bodyStart), 0);
  assert.match(
    globalsCss.slice(bodyStart, bodyRuleEnd),
    /color:\s*rgba\(255,\s*255,\s*255,\s*0\.86\)/,
  );
});
