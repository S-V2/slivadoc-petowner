import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(
  new URL("../app/mobile-responsive.css", import.meta.url),
  "utf8",
);
const layout = await readFile(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);
const guideline = await readFile(
  new URL("../docs/SLIVADOC_BRAND_TYPOGRAPHY_STANDARD.md", import.meta.url),
  "utf8",
);

test("root layout loads the consolidated mobile responsive cascade", () => {
  const globalsIndex = layout.indexOf('import "./globals.css"');
  const mobileIndex = layout.indexOf('import "./mobile-responsive.css"');

  assert.ok(globalsIndex >= 0);
  assert.ok(mobileIndex > globalsIndex);
});

test("mobile semantic type scale stays compact and readable", () => {
  assert.match(css, /--type-page-title:\s*24px/);
  assert.match(css, /--type-section-title:\s*20px/);
  assert.match(css, /--type-card-title:\s*16px/);
  assert.match(css, /--type-body:\s*14px/);
  assert.match(css, /--type-caption:\s*11px/);
  assert.match(css, /--type-compact-control:\s*13px/);
  assert.match(css, /input:not\(\[type="checkbox"\]\)[\s\S]*?font-size:\s*16px\s*!important/);
});

test("all feature heroes share the compact mobile display size", () => {
  for (const selector of [
    ".hero-copy h2",
    ".discover-search-card h2",
    ".world-hero h2",
    ".care-hero h2",
    ".adoption-hero h2",
    ".document-hero h2",
    ".pawdating-hero h2",
    ".shop-banner h2",
  ]) {
    assert.ok(css.includes(selector), `${selector} must use the shared scale`);
  }
  assert.match(css, /font-size:\s*22px\s*!important/);
});

test("discovery results stack their sorter instead of squeezing summary copy", () => {
  assert.match(
    css,
    /\.app-shell \.discover-result-head\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/,
  );
  assert.match(
    css,
    /\.app-shell \.discover-result-head select\s*\{[\s\S]*?width:\s*100%/,
  );
});

test("mobile guideline documents tokens, touch targets, and target widths", () => {
  assert.match(guideline, /--type-compact-control/);
  assert.match(guideline, /44 × 44 px/);
  assert.match(guideline, /320, 375, 414, dan 768 px/);
});
