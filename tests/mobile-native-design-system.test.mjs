import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const theme = await readFile(
  new URL("../mobile/src/theme.ts", import.meta.url),
  "utf8",
);
const home = await readFile(
  new URL("../mobile/src/screens/HomeScreen.tsx", import.meta.url),
  "utf8",
);
const discover = await readFile(
  new URL("../mobile/src/screens/DiscoverScreen.tsx", import.meta.url),
  "utf8",
);
const app = await readFile(new URL("../mobile/App.tsx", import.meta.url), "utf8");

test("native mobile theme keeps the compact commerce-style hierarchy", () => {
  assert.match(theme, /screenTitle:\s*22/);
  assert.match(theme, /sectionTitle:\s*17/);
  assert.match(theme, /cardTitle:\s*15/);
  assert.match(theme, /body:\s*13/);
  assert.match(theme, /control:\s*13/);
  assert.match(theme, /caption:\s*10/);
});

test("native mobile theme preserves Slivadoc sky blue as the primary color", () => {
  assert.match(theme, /sky500:\s*"#19A7F2"/);
  assert.match(theme, /canvas:\s*"#F6FBFF"/);
  assert.match(theme, /sky50:\s*"#EBF8FF"/);
});

test("home uses a compact illustrated hero and dense quick actions", () => {
  assert.match(home, /minHeight:\s*232/);
  assert.match(home, /heroTitle:[^\n]*fontSize:\s*23/);
  assert.match(home, /quickCard:[^\n]*width:\s*69/);
  assert.doesNotMatch(home, /ImageBackground/);
});

test("discovery cards scan horizontally on a phone viewport", () => {
  assert.match(discover, /serviceCard:[^\n]*flexDirection:\s*"row"/);
  assert.match(discover, /serviceVisual:[^\n]*width:\s*105/);
  assert.match(discover, /title:[^\n]*fontSize:\s*22/);
});

test("bottom navigation stays compact without sacrificing tap space", () => {
  assert.match(app, /tabBar:[\s\S]*?height:\s*66/);
  assert.match(app, /tabItem:[\s\S]*?minHeight:\s*56/);
  assert.match(app, /tabLabel:[^\n]*fontSize:\s*10/);
});
