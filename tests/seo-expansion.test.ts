import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalog } from "../app/lib/public-catalog.ts";
import { regionContext, regionCode, regionSlug, regionSource } from "../app/lib/seo-regions.ts";
import { validGtin, httpImage } from "../app/lib/product-discovery.ts";
import { productsInCategory, serviceMatches } from "../app/lib/seo-taxonomy.ts";
import type { PublicProduct } from "../app/lib/public-marketplace.ts";
import type { PublicServiceSummary } from "../app/lib/public-directory.ts";

test("public catalog retrieves every page and scopes regions to acknowledged backend filters", async (t) => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const offsets: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    const offset = url.searchParams.get("offset")!;
    offsets.push(offset);
    return Response.json({ data: Array.from({ length: offset === "0" ? 100 : 7 }, (_, i) => ({ id: Number(offset) + i })), has_more: offset === "0", region_code: url.searchParams.get("region_code") });
  };
  const items = await publicCatalog<{ id: number }>("services", "31.73");
  assert.equal(items.length, 107);
  assert.equal(items[106].id, 106);
  assert.deepEqual(offsets, ["0", "100"]);
  globalThis.fetch = async () => Response.json({ data: [{ id: "wrong-city" }] });
  assert.deepEqual(await publicCatalog("services", "31.73"), []);
  globalThis.fetch = async () => new Response(null, { status: 503 });
  await assert.rejects(publicCatalog("products"), /503/);
  globalThis.fetch = async () => Response.json({ data: [], has_more: true });
  await assert.rejects(publicCatalog("products"), /pagination/);
});

test("administrative navigation reaches Papua villages and rejects fabricated codes", async () => {
  assert.deepEqual(regionSource.counts, { provinces: 38, regencies: 514, districts: 7285, villages: 83762 });
  const ctx = await regionContext("96.71.10.1004");
  assert.ok(ctx);
  assert.equal(ctx.region.name, "Tanjung Kasuari");
  assert.deepEqual(ctx.ancestors.map((r) => r.code), ["96", "96.71", "96.71.10"]);
  assert.equal(regionCode(regionSlug(ctx.region)), ctx.region.code);
  assert.equal((await regionContext("96.71.10"))?.children.some((r) => r.code === ctx.region.code), true);
  assert.equal(await regionContext("99"), null);
  assert.equal(await regionContext("31.99"), null);
  assert.equal(regionCode("jakarta--31.73.00.11111"), "");
});

test("taxonomy separates food species and matches actual service offers", () => {
  const products = [{ name: "Dry Food Kucing", category: "Makanan" }, { name: "Dog Food", category: "Makanan" }, { name: "Kandang Kucing", category: "Kandang" }] as PublicProduct[];
  assert.deepEqual(productsInCategory(products, "makanan-kucing"), [products[0]]);
  assert.deepEqual(productsInCategory(products, "makanan-anjing"), [products[1]]);
  assert.deepEqual(productsInCategory(products, "kandang-hewan"), [products[2]]);
  assert.deepEqual(productsInCategory(products, "unknown"), []);
  assert.equal(serviceMatches("grooming-hewan", { name: "Mandi kucing", category: "grooming" } as PublicServiceSummary), true);
  assert.equal(serviceMatches("vaksinasi-hewan", { name: "Mandi kucing", category: "grooming" } as PublicServiceSummary), false);
});

test("merchant identifiers and image URLs are validated without invented identifiers", () => {
  assert.equal(validGtin("4006381333931"), true);
  assert.equal(validGtin("4006381333932"), false);
  assert.equal(validGtin("SKU-CAT-01"), false);
  assert.equal(httpImage("javascript:alert(1)", "https://slivadoc.id"), "");
  assert.equal(httpImage("//untrusted.test/a.jpg", "https://slivadoc.id"), "");
  assert.equal(httpImage("/cat.jpg", "https://slivadoc.id"), "https://slivadoc.id/cat.jpg");
});
