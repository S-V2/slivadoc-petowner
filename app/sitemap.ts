import { getSitemapEntries } from "./lib/seo-sitemap";
import { SITEMAP_PAGE_SIZE } from "./lib/seo-xml";
export default async function sitemap() {
  return (await getSitemapEntries()).slice(0, SITEMAP_PAGE_SIZE);
}
