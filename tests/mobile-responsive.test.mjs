import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [css, layout] = await Promise.all([
  readFile(new URL("../app/mobile-responsive.css", import.meta.url), "utf8"),
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
]);

test("root layout loads the consolidated mobile responsive cascade last", () => {
  const globalsIndex = layout.indexOf('import "./globals.css"');
  const homeIndex = layout.indexOf('import "./revamp-home.css"');
  const mobileIndex = layout.indexOf('import "./mobile-responsive.css"');

  assert.ok(globalsIndex >= 0);
  assert.ok(homeIndex > globalsIndex);
  assert.ok(mobileIndex > homeIndex);
});

test("mobile semantic type scale matches the RN 22/17/15/13/10 contract", () => {
  assert.match(css, /--type-page-title:\s*22px;/);
  assert.match(css, /--type-section-title:\s*17px;/);
  assert.match(css, /--type-card-title:\s*15px;/);
  assert.match(css, /--type-body:\s*13px;/);
  assert.match(css, /--type-caption:\s*10px;/);
  assert.match(css, /--type-control:\s*13px;/);
  assert.match(css, /--type-compact-control:\s*13px;/);
  assert.match(
    css,
    /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)[\s\S]*?font-size:\s*16px\s*!important/,
  );
});

test("mobile feature heroes use the native compact title token", () => {
  for (const selector of [
    ".world-hero h2",
    ".event-banner h2",
    ".care-hero h2",
    ".adoption-hero h2",
    ".document-hero h2",
    ".pawdating-hero h2",
    ".shop-banner h2",
  ]) {
    assert.ok(css.includes(selector), `${selector} must use the shared scale`);
  }
  assert.match(css, /font-size:\s*var\(--type-page-title\)\s*!important/);
});

test("discovery results stack their sorter instead of squeezing summary copy", () => {
  assert.match(
    css,
    /\.discover-result-head\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /\.discover-result-head select\s*\{[\s\S]*?width:\s*100%/,
  );
});

test("mobile shell keeps search and notification controls at native touch size", () => {
  assert.match(css, /\.global-search\s*\{[\s\S]*?height:\s*44px/);
  assert.match(css, /\.top-actions \.icon-button \+ \.icon-button\s*\{[\s\S]*?width:\s*44px/);
  assert.match(css, /\.mobile-more-sheet::before[\s\S]*?width:\s*42px[\s\S]*?height:\s*5px/);
});
