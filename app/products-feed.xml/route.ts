import { getPublicProducts } from "../lib/public-marketplace";
import { SEO, absoluteUrl } from "../lib/seo-config";
import { httpImage, validGtin } from "../lib/product-discovery";
import { escapeXml, xmlResponse } from "../lib/seo-xml";

export async function GET() {
  try {
    const products = await getPublicProducts(true);
    const items = products.filter((p) => p.description && p.price > 0 && httpImage(p.imageUrl, SEO.siteUrl)).map((p) => {
      const fields = { "g:id": p.id, "g:title": p.name, "g:description": p.description, "g:link": absoluteUrl(`/shop/${p.slug}`), "g:image_link": httpImage(p.imageUrl, SEO.siteUrl), "g:availability": p.available ? "in_stock" : "out_of_stock", "g:price": `${p.price.toFixed(2)} IDR`, "g:condition": "new", "g:product_type": p.category, ...(p.brandName ? { "g:brand": p.brandName } : {}), ...(validGtin(p.barcode) ? { "g:gtin": p.barcode } : {}) };
      return `<item>${Object.entries(fields).map(([tag, value]) => `<${tag}>${escapeXml(value)}</${tag}>`).join("")}</item>`;
    });
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Slivadoc Marketplace</title><link>${escapeXml(SEO.siteUrl)}</link><description>Produk aktif dari mitra Slivadoc</description>${items.join("")}</channel></rss>`);
  } catch {
    return new Response("Catalog temporarily unavailable", { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } });
  }
}
