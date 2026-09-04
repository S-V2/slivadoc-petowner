import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [component, page, layout, homeCss] = await Promise.all([
  readFile(new URL("app/components/PetOwnerApp.tsx", root), "utf8"),
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/layout.tsx", root), "utf8"),
  readFile(new URL("app/revamp-home.css", root), "utf8"),
]);

test("shared mobile cascade is loaded after the home feature stylesheet", () => {
  const mobileIndex = layout.indexOf('import "./mobile-responsive.css"');
  const homeIndex = layout.indexOf('import "./revamp-home.css"');

  assert.ok(homeIndex >= 0);
  assert.ok(mobileIndex > homeIndex);
});

test("home provides a compact hero and app-style quick actions", () => {
  assert.match(component, /className="home-hero-trust"/);
  assert.match(component, /className="home-quick-section"/);
  assert.match(homeCss, /grid-template-rows:\s*repeat\(2, 82px\)/);
  assert.match(homeCss, /grid-auto-flow:\s*column/);
  assert.match(homeCss, /\.home-layout \.hero-card,[\s\S]*?min-height:\s*278px/);
});

test("home mobile cards use compact type instead of inherited body size", () => {
  assert.match(homeCss, /\.service-card-body > p[\s\S]*?font-size:\s*11px\s*!important/);
  assert.match(homeCss, /\.service-title b\s*\{[\s\S]*?font-size:\s*13px/);
  assert.match(homeCss, /\.panel-heading h3\s*\{[\s\S]*?font-size:\s*16px/);
});

test("desktop SEO discovery does not create a mobile gap below the app", () => {
  assert.match(page, /className="app-home-seo"/);
  assert.match(
    homeCss,
    /@media \(max-width: 860px\)[\s\S]*?\.app-home-seo\s*\{[\s\S]*?display:\s*none/,
  );
});

test("empty home data cannot recreate a tall blank card", () => {
  assert.match(
    homeCss,
    /\.timeline-list \.empty-state\.compact\s*\{[\s\S]*?min-height:\s*88px/,
  );
  assert.match(
    homeCss,
    /\.service-row \.empty-state\.compact\s*\{[\s\S]*?min-height:\s*108px/,
  );
});
