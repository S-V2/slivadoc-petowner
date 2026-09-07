import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("../mobile/src/api.ts", import.meta.url), "utf8");
const marketplace = readFileSync(
  new URL("../mobile/src/screens/MarketplaceScreen.tsx", import.meta.url),
  "utf8",
);

test("marketplace is a primary mobile destination while services remain available", () => {
  assert.match(app, /id:\s*"marketplace"[\s\S]*label:\s*"Belanja"/);
  assert.match(app, /id:\s*"discover"[\s\S]*label:\s*"Layanan"/);
  assert.match(app, /<MarketplaceScreen/);
});

test("mobile marketplace uses live catalogue, authoritative checkout, and BatPay", () => {
  assert.match(marketplace, /getMobileProducts/);
  assert.match(marketplace, /quoteMobileOrder\(orderInput\)/);
  assert.match(marketplace, /createMobileOrder\(orderInput\)/);
  assert.match(marketplace, /createMobilePaymentIntent\(\s*"shop_order"/);
  assert.match(api, /\/api\/v1\/public\/discovery\/products/);
  assert.match(api, /\/api\/v1\/petowner\/orders\/quote/);
});

test("product detail supports verified-purchase reviews and bounded sheets", () => {
  assert.match(marketplace, /Ulasan & komentar/);
  assert.match(marketplace, /saveMobileProductReview/);
  assert.match(api, /\/api\/v1\/public\/products\/\$\{productId\}\/reviews/);
  assert.match(api, /\/api\/v1\/petowner\/products\/\$\{productId\}\/reviews/);
  assert.match(marketplace, /maxHeight:\s*"88%"/);
});
