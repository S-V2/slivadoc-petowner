import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getPublicProduct,
  getPublicProducts,
  productIDFromSlug,
  productSlug,
} from "../app/lib/public-marketplace.ts";

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

test("public marketplace normalizes API data into safe canonical products", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const id = "91a9f2b2-3aa4-4e5d-8c77-135d27c26690";
  globalThis.fetch = async () =>
    Response.json({
      data: [
        {
          id,
          name: "Vitamin Bulu & Kulit",
          business_id: "business-1",
          business_name: "NusaPet Official",
          branch_id: "branch-1",
          branch_name: "NusaPet Jakarta",
          city: "Jakarta",
          sku: "NP-VIT-01",
          category: "Vitamin",
          price: "125000",
          stock: "8",
          minimum_stock: "2",
          available: true,
          rating: "9",
          review_count: "4.4",
          sold_count: "17",
        },
        { id: "not-a-uuid", name: "Invalid" },
      ],
    });

  const products = await getPublicProducts();
  assert.equal(products.length, 1);
  assert.deepEqual(products[0], {
    id,
    slug: `vitamin-bulu-kulit-${id}`,
    businessId: "business-1",
    businessName: "NusaPet Official",
    branchId: "branch-1",
    branchName: "NusaPet Jakarta",
    city: "Jakarta",
    name: "Vitamin Bulu & Kulit",
    sku: "NP-VIT-01",
    barcode: "",
    category: "Vitamin",
    description: "Produk kebutuhan pet dari partner terverifikasi Slivadoc.",
    imageUrl: "",
    price: 125000,
    stock: 8,
    minimumStock: 2,
    available: true,
    rating: 5,
    reviewCount: 4,
    soldCount: 17,
  });
  assert.equal(productSlug("  Àksesori Kucing!  ", id), `aksesori-kucing-${id}`);
  assert.equal(productIDFromSlug(products[0].slug), id);
  assert.equal(productIDFromSlug("produk-tanpa-id"), "");
});

test("public product detail uses its handler and falls back to the catalogue", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  const detailID = "18a9f2b2-3aa4-4e5d-8c77-135d27c26691";
  const fallbackID = "28a9f2b2-3aa4-4e5d-8c77-135d27c26692";
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith(detailID))
      return Response.json({
        id: detailID,
        name: "Makanan Anjing",
        stock: 3,
        available: true,
      });
    if (url.endsWith(fallbackID)) return new Response(null, { status: 503 });
    return Response.json({
      data: [
        {
          id: fallbackID,
          name: "Mainan Interaktif",
          stock: 2,
          available: true,
        },
      ],
    });
  };

  const detail = await getPublicProduct(productSlug("Makanan Anjing", detailID));
  assert.equal(detail?.id, detailID);
  assert.equal(detail?.available, true);
  const fallback = await getPublicProduct(
    productSlug("Mainan Interaktif", fallbackID),
  );
  assert.equal(fallback?.id, fallbackID);
  assert.equal(await getPublicProduct("slug-tidak-valid"), null);
});
