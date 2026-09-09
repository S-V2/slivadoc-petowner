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

test("home follows the native daily-moment and quick-action composition", () => {
  assert.match(component, /className="home-greeting"/);
  assert.match(component, /className="home-daily-hero"/);
  assert.match(component, /DAILY PET MOMENT/);
  assert.match(component, /className="home-quick-feature-row"/);
  assert.match(component, /className="home-quick-mini-grid"/);
  assert.match(homeCss, /\.home-daily-hero\s*\{[\s\S]*?min-height:\s*220px/);
  assert.match(homeCss, /\.home-quick-feature-row\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(homeCss, /\.home-quick-mini-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
});

test("home health snapshot uses native filled-sky card and service dimensions", () => {
  assert.match(component, /className="home-health-card"/);
  assert.match(component, /className="home-pet-switch"/);
  assert.match(component, /className="home-care-card"/);
  assert.match(homeCss, /\.home-health-card\s*\{[\s\S]*?background:\s*linear-gradient\(135deg, #075F91, var\(--sky-600\), #0A6F9C\)/);
  assert.match(homeCss, /\.home-service-visual\s*\{[\s\S]*?height:\s*112px/);
  assert.match(homeCss, /\.home-service-card\s*\{[\s\S]*?min-width:\s*188px/);
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
    /\.home-care-empty\s*\{[\s\S]*?min-height:\s*88px/,
  );
  assert.match(
    homeCss,
    /\.home-service-row > \.empty-state\.compact\s*\{[\s\S]*?min-height:\s*108px/,
  );
});
