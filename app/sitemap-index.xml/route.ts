import { getSitemapEntries } from "../lib/seo-sitemap";
import { absoluteUrl } from "../lib/seo-config";
import { escapeXml, SITEMAP_PAGE_SIZE, xmlResponse } from "../lib/seo-xml";
export async function GET() {
  try {
    const entries = await getSitemapEntries();
    const count = Math.max(1, Math.ceil(entries.length / SITEMAP_PAGE_SIZE));
    const urls = Array.from({ length: count }, (_, i) => absoluteUrl(i === 0 ? "/sitemap.xml" : `/sitemaps/${i}.xml`));
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`).join("")}</sitemapindex>`);
  } catch {
    return new Response("Catalog temporarily unavailable", { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } });
  }
}
