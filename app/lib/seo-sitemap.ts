import { getPublicCareers } from "./public-careers";
import { cache } from "react";
import { audiencePages } from "./seo-audiences";
import { productCategories, productsInCategory } from "./seo-taxonomy";
import { regionContext, regionPath } from "./seo-regions";
import type { MetadataRoute } from "next";
import { guidePages, servicePages } from "./seo-content";
import { absoluteUrl } from "./seo-config";
import { getPublicPlaces } from "./public-directory";
import { getPublicProducts } from "./public-marketplace";

export const getSitemapEntries = cache(async (): Promise<MetadataRoute.Sitemap> => {
  const [publicPlaces, publicProducts, careers] = await Promise.all([
    getPublicPlaces("", true),
    getPublicProducts(true),
    getPublicCareers(),
  ]);
  const guideDates = new Map(
    guidePages.map((item) => [
      item.slug,
      new Date(`${item.updatedAt}T00:00:00Z`),
    ]),
  );
  const core: MetadataRoute.Sitemap = [
    {url: absoluteUrl("/pet-sitter"), changeFrequency: "daily", priority: 0.85},
    {url: absoluteUrl("/career"), changeFrequency: "weekly", priority: 0.7},
    {
      url: absoluteUrl("/"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/layanan"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/panduan"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/kota"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/tempat"),
        changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/belanja"),
        changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/tentang"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/mitra"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/bantuan"),
      lastModified: new Date("2026-10-04T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/privasi"),
      lastModified: new Date("2026-10-08T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/hapus-akun"),
      lastModified: new Date("2026-10-08T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/syarat-ketentuan"),
      lastModified: new Date("2026-10-04T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
  const services: MetadataRoute.Sitemap = servicePages.map((item) => ({
    url: absoluteUrl(`/layanan/${item.slug}`),
    lastModified: new Date("2026-08-28T00:00:00Z"),
    changeFrequency: "weekly",
    priority: 0.85,
  }));
  const guides: MetadataRoute.Sitemap = guidePages.map((item) => ({
    url: absoluteUrl(`/panduan/${item.slug}`),
    lastModified: guideDates.get(item.slug),
    changeFrequency: "monthly",
    priority: 0.75,
  }));
  const places: MetadataRoute.Sitemap = publicPlaces.map((item) => ({
    url: absoluteUrl(`/tempat/${item.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));
  const partnerServices: MetadataRoute.Sitemap = publicPlaces.flatMap((place) =>
    place.services.map((service) => ({
      url: absoluteUrl(`/tempat/${place.slug}/layanan/${service.id}`),
        changeFrequency: "daily" as const,
      priority: 0.78,
    })),
  );
  const products: MetadataRoute.Sitemap = publicProducts.map((item) => ({
    url: absoluteUrl(`/belanja/${item.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));
  const regions = await Promise.all([...new Set(publicPlaces.flatMap((place) => place.regionCodes ?? []))].map(regionContext));
  const expansion: MetadataRoute.Sitemap = [
    ...["/wilayah", "/en", "/gratis", ...audiencePages.map((p) => `/untuk/${p.slug}`)].map((path) => ({ url: absoluteUrl(path), lastModified: new Date("2026-10-07T00:00:00Z") })),
    ...productCategories.filter((c) => productsInCategory(publicProducts, c.slug).length > 0).map((c) => ({ url: absoluteUrl(`/belanja/kategori/${c.slug}`) })),
    ...regions.filter((r) => r !== null).map((r) => ({ url: absoluteUrl(regionPath(r.region)) })),
  ];
  return [
    ...core,
    ...careers.data.map(p => ({ url: absoluteUrl(`/career/${p.id}`), ...(p.updated_at ? { lastModified: new Date(p.updated_at) } : {}), changeFrequency: "daily" as const, priority: 0.7 })),
    ...services,
    ...guides,
    ...expansion,
    ...places,
    ...partnerServices,
    ...products,
  ].sort((a, b) => a.url.localeCompare(b.url));
});
