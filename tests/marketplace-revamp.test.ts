import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const web = readFileSync(
  new URL("../app/components/marketplace/ShopMarketplace.tsx", import.meta.url),
  "utf8",
);
const api = readFileSync(
  new URL("../app/lib/platform-api.ts", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../app/marketplace.css", import.meta.url),
  "utf8",
);
const mobile = readFileSync(
  new URL("../mobile/src/screens/MarketplaceScreen.tsx", import.meta.url),
  "utf8",
);

test("web marketplace cards expose purchase-critical product data", () => {
  for (const field of [
    "product.brand",
    "product.city",
    "product.stock",
    "product.rating",
    "product.reviewCount",
    "product.soldCount",
    "product.price",
  ]) {
    assert.ok(web.includes(field), `${field} must remain visible in the marketplace`);
  }
  assert.match(web, /Sliva Point/);
  assert.match(web, /aria-label=\{`Lihat detail \$\{product\.name\}`\}/);
});

test("product cards deep-link to detail and verified review APIs", () => {
  assert.match(web, /searchParams\.set\("product", product\.id\)/);
  assert.match(web, /function ProductDetail/);
  assert.match(web, /Ulasan & komentar/);
  assert.match(web, /saveProductReview/);
  assert.match(api, /\/api\/v1\/public\/products\/\$\{productId\}\/reviews/);
  assert.match(api, /\/api\/v1\/petowner\/products\/\$\{productId\}\/reviews/);
  assert.match(web, /Pembelian terverifikasi/);
});

test("web marketplace stays responsive from phone grid through desktop", () => {
  assert.match(css, /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("native marketplace mirrors richer card and review detail data", () => {
  assert.match(mobile, /productFulfillment/);
  assert.match(mobile, /productReward/);
  assert.match(mobile, /detailFacts/);
  assert.match(mobile, /reviewDistribution/);
  assert.match(mobile, /saveMobileProductReview/);
});
