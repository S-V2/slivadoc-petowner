import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [layout, css, petowner, mobileApp, mobileTheme] = await Promise.all([
  readFile(new URL("app/layout.tsx", root), "utf8"),
  readFile(new URL("app/genz-revamp.css", root), "utf8"),
  readFile(new URL("app/components/PetOwnerApp.tsx", root), "utf8"),
  readFile(new URL("mobile/App.tsx", root), "utf8"),
  readFile(new URL("mobile/src/theme.ts", root), "utf8"),
]);

test("Sky Playground is the final web design-system cascade", () => {
  const revampIndex = layout.indexOf('import "./genz-revamp.css"');
  assert.ok(revampIndex > layout.indexOf('import "./mobile-responsive.css"'));
  assert.ok(revampIndex > layout.indexOf('import "./marketplace.css"'));
  assert.match(css, /--sky-pop:\s*#25b8ff/);
  assert.match(css, /--radius-hero:\s*32px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("desktop navigation groups features by pet-parent intent", () => {
  assert.match(petowner, /Hari-hari bareng pet/);
  assert.match(petowner, /Cari & seru-seruan/);
  assert.match(petowner, /Lebih banyak/);
  assert.match(petowner, /className="side-nav-group"/);
});

test("native mobile shares playful sky tokens and a filled active tab", () => {
  assert.match(mobileTheme, /aqua:\s*"#2FC9B1"/);
  assert.match(mobileTheme, /lavender:\s*"#8874EF"/);
  assert.match(mobileApp, /activeTabItem:\s*\{[\s\S]*?backgroundColor:\s*colors\.sky600/);
  assert.match(mobileApp, /activeTabIcon:\s*\{\s*backgroundColor:\s*"transparent"/);
  assert.match(mobileApp, /color=\{active \? colors\.white : colors\.muted\}/);
});
