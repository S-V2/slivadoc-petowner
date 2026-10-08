import { getSitemapEntries } from "../../lib/seo-sitemap";
import { escapeXml, SITEMAP_PAGE_SIZE, xmlResponse } from "../../lib/seo-xml";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d{0,4}\.xml$/.test(id)) return new Response("Not found", { status: 404 });
  try {
    const entries = await getSitemapEntries();
    const offset = Number.parseInt(id, 10) * SITEMAP_PAGE_SIZE;
    if (offset >= entries.length) return new Response("Not found", { status: 404 });
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.slice(offset, offset + SITEMAP_PAGE_SIZE).map((entry) => `<url><loc>${escapeXml(entry.url)}</loc>${entry.lastModified ? `<lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>` : ""}</url>`).join("")}</urlset>`);
  } catch {
    return new Response("Catalog temporarily unavailable", { status: 503, headers: { "Retry-After": "300", "Cache-Control": "no-store" } });
  }
}
