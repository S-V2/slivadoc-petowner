import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../mobile/App.tsx", import.meta.url), "utf8");
const api = readFileSync(
  new URL("../mobile/src/api.ts", import.meta.url),
  "utf8",
);
const marketplace = readFileSync(
  new URL("../mobile/src/screens/MarketplaceScreen.tsx", import.meta.url),
  "utf8",
);
const activities = readFileSync(
  new URL("../mobile/src/screens/ActivityScreen.tsx", import.meta.url),
  "utf8",
);

test("marketplace is a primary mobile destination while services remain available", () => {
  assert.match(app, /id:\s*"marketplace"[\s\S]*label:\s*"Belanja"/);
  assert.match(app, /id:\s*"discover"[\s\S]*label:\s*"Layanan"/);
  assert.match(app, /<MarketplaceScreen/);
});

test("mobile marketplace uses live catalogue, authoritative checkout, and BatPay", () => {
  assert.match(marketplace, /getMobileProducts/);
  assert.match(
    marketplace,
    /quoteMobileOrder\(orderInput, controller\.signal\)/,
  );
  assert.match(marketplace, /createMobileOrder\(orderInput\)/);
  assert.match(marketplace, /createMobilePaymentIntent\(\s*"shop_order"/);
  assert.match(api, /\/api\/v1\/public\/discovery\/products/);
  assert.match(api, /\/api\/v1\/petowner\/orders\/quote/);
});

test("shipping destination uses region master data and quotes automatically", () => {
  for (const endpoint of [
    "/api/v1/regions/provinces",
    "/api/v1/regions/regencies?province_id=",
    "/api/v1/regions/districts?regency_id=",
    "/api/v1/regions/villages?district_id=",
  ]) {
    assert.ok(api.includes(endpoint), `${endpoint} must be integrated`);
  }
  assert.match(marketplace, /<RegionSelectSheet/);
  assert.match(marketplace, /createShippingAutoQuoteKey/);
  assert.match(marketplace, /setTimeout\(\(\) => \{/);
  assert.match(marketplace, /quoteController\.current\?\.abort\(\)/);
  assert.match(
    marketplace,
    /Origin otomatis mengikuti cabang petshop atau petclinic/,
  );
  assert.doesNotMatch(marketplace, /placeholder="KECAMATAN, KOTA"/);
});

test("product detail supports verified-purchase reviews and bounded sheets", () => {
  assert.match(marketplace, /Ulasan & komentar/);
  assert.match(marketplace, /saveMobileProductReview/);
  assert.match(api, /\/api\/v1\/public\/products\/\$\{productId\}\/reviews/);
  assert.match(api, /\/api\/v1\/petowner\/products\/\$\{productId\}\/reviews/);
  assert.match(marketplace, /maxHeight:\s*"88%"/);
});

test("marketplace keeps partner and sales metadata readable when catalogue fields are incomplete", () => {
  assert.match(api, /"Pet Partner Slivadoc"/);
  assert.match(
    api,
    /sold_count:\s*Math\.max\(0, productNumber\(product\.sold_count\)\)/,
  );
  assert.match(marketplace, /partnerById\.get\(product\.business_id\)/);
  assert.match(marketplace, /partner\.businessName/);
  assert.match(marketplace, /styles\.productStoreBadge/);
  assert.match(marketplace, /\{product\.business_name\}/);
  assert.match(
    marketplace,
    /storeChipNameActive:\s*\{\s*color:\s*colors\.navy/,
  );
  assert.match(
    marketplace,
    /storeChipCityActive:\s*\{\s*color:\s*colors\.text/,
  );
});

test("mobile order detail exposes a view-only shipment timeline through delivery", () => {
  assert.match(api, /export type MobileShipmentEvent/);
  assert.match(api, /shipments\?: MobileShipment\[\]/);
  assert.match(activities, /Status pengiriman bersifat view-only/);
  assert.match(activities, /shipmentPresentation/);
  assert.match(activities, /Dalam perjalanan/);
  assert.match(activities, /Sudah diterima/);
  assert.match(activities, /shipment\.events/);
  assert.match(activities, /loadActivities\(true\)/);
  assert.match(activities, /60_000/);
  assert.doesNotMatch(activities, /shipping\/track/);
});
