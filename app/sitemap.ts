import type { MetadataRoute } from "next";
import { cityPages, guidePages, servicePages } from "./lib/seo-content";
import { absoluteUrl } from "./lib/seo-config";
import { getPublicPlaces } from "./lib/public-directory";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const publicPlaces = await getPublicPlaces();
  const guideDates = new Map(guidePages.map((item) => [item.slug, new Date(`${item.updatedAt}T00:00:00Z`)]));
  const core: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/layanan"), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/panduan"), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "weekly", priority: 0.85 },
    { url: absoluteUrl("/kota"), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/tempat"), lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: absoluteUrl("/tentang"), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/mitra"), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "weekly", priority: 0.75 },
  ];
  const services: MetadataRoute.Sitemap = servicePages.map((item) => ({ url: absoluteUrl(`/layanan/${item.slug}`), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "weekly", priority: 0.85 }));
  const guides: MetadataRoute.Sitemap = guidePages.map((item) => ({ url: absoluteUrl(`/panduan/${item.slug}`), lastModified: guideDates.get(item.slug), changeFrequency: "monthly", priority: 0.75 }));
  const cities: MetadataRoute.Sitemap = cityPages.map((item) => ({ url: absoluteUrl(`/kota/${item.slug}`), lastModified: new Date("2026-08-28T00:00:00Z"), changeFrequency: "weekly", priority: 0.7 }));
  const places: MetadataRoute.Sitemap = publicPlaces.map((item) => ({ url: absoluteUrl(`/tempat/${item.slug}`), lastModified: new Date(), changeFrequency: "daily", priority: 0.8 }));
  return [...core, ...services, ...guides, ...cities, ...places];
}
