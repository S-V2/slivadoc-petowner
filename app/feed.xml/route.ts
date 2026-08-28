import { guidePages } from "../lib/seo-content";
import { SEO, absoluteUrl } from "../lib/seo-config";

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
}

export async function GET() {
  const items = guidePages.map((guide) => `<item><title>${escapeXml(guide.title)}</title><link>${absoluteUrl(`/panduan/${guide.slug}`)}</link><guid isPermaLink="true">${absoluteUrl(`/panduan/${guide.slug}`)}</guid><description>${escapeXml(guide.description)}</description><category>${escapeXml(guide.category)}</category><pubDate>${new Date(`${guide.updatedAt}T00:00:00Z`).toUTCString()}</pubDate></item>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Panduan Pet Parent Slivadoc</title><link>${SEO.siteUrl}</link><description>${escapeXml(SEO.defaultDescription)}</description><language>id-ID</language>${items}</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600, s-maxage=86400" } });
}
