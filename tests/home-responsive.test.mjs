import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [component, page, layout, homeCss, genzCss] = await Promise.all([
  readFile(new URL("app/components/PetOwnerApp.tsx", root), "utf8"),
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/layout.tsx", root), "utf8"),
  readFile(new URL("app/revamp-home.css", root), "utf8"),
  readFile(new URL("app/genz-revamp.css", root), "utf8"),
]);

test("shared mobile cascade is loaded after the home feature stylesheet", () => {
  const mobileIndex = layout.indexOf('import "./mobile-responsive.css"');
  const homeIndex = layout.indexOf('import "./revamp-home.css"');

  assert.ok(homeIndex >= 0);
  assert.ok(mobileIndex > homeIndex);
});

test("home follows the native member-card and quick-action composition", () => {
  assert.match(component, /className="home-greeting"/);
  assert.match(component, /home-member-card/);
  assert.match(component, /PET OWNER MEMBER/);
  assert.match(component, /SLV-PO-/);
  assert.match(component, /className="home-quick-feature-row"/);
  assert.match(component, /className="home-quick-mini-grid"/);
  assert.match(genzCss, /\.home-member-card\s*\{[\s\S]*?min-height:\s*278px/);
  assert.match(homeCss, /\.home-quick-feature-row\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(homeCss, /\.home-quick-mini-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
});

test("responsive home keeps nearby partners before recommended doctors", () => {
  assert.match(homeCss, /\.home-services-section\s*\{\s*order:\s*6/);
  assert.match(homeCss, /\.home-doctors-section\s*\{\s*order:\s*7/);
  assert.match(homeCss, /\.home-campaign\s*\{\s*order:\s*8/);
});

test("web forms share readable native-sized labels and inputs", () => {
  assert.match(genzCss, /font-size:\s*14px\s*!important/);
  assert.match(genzCss, /input::placeholder[\s\S]*?font-size:\s*14px\s*!important/);
  assert.match(genzCss, /\.consult-booking,[\s\S]*?font-size:\s*12px\s*!important/);
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
