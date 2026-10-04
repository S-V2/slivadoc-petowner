import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const catalog = read("app/belanja/page.tsx");
const detail = read("app/belanja/[slug]/page.tsx");
const marketplace = read("app/lib/public-marketplace.ts");
const sitemap = read("app/sitemap.ts");
const robots = read("app/robots.ts");
const navigation = read("app/components/seo/PublicSite.tsx");

test("crawlable marketplace pages use the public product handler", () => {
  assert.match(
    marketplace,
    /\/api\/v1\/public\/discovery\/products\/\$\{productID\}/,
  );
  assert.match(catalog, /"@type": "ItemList"/);
  assert.match(detail, /"@type": "Product"/);
  assert.match(detail, /"@type": "Offer"/);
  assert.match(detail, /aggregateRating/);
  assert.match(detail, /https:\/\/schema\.org\/InStock/);
});

test("marketplace canonical URLs are discoverable from navigation, robots, and sitemap", () => {
  assert.match(detail, /path: `\/belanja\/\$\{product\.slug\}`/);
  assert.match(detail, /permanentRedirect\(`\/belanja\/\$\{product\.slug\}`\)/);
  assert.match(sitemap, /getPublicProducts/);
  assert.match(sitemap, /`\/belanja\/\$\{item\.slug\}`/);
  assert.match(robots, /"\/belanja\/"/);
  assert.match(navigation, /href="\/belanja"/);
});
