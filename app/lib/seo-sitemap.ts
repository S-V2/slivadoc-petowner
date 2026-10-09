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
  const [publicPlaces, publicProducts] = await Promise.all([
    getPublicPlaces("", true),
    getPublicProducts(true),
  ]);
  const guideDates = new Map(
    guidePages.map((item) => [
      item.slug,
      new Date(`${item.updatedAt}T00:00:00Z`),
    ]),
  );
  const core: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/services"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/guides"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/cities"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/places"),
        changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/shop"),
        changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/about"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/partners"),
      lastModified: new Date("2026-08-28T00:00:00Z"),
      changeFrequency: "weekly",
      priority: 0.75,
    },
    {
      url: absoluteUrl("/help"),
      lastModified: new Date("2026-10-04T00:00:00Z"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: new Date("2026-10-08T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/delete-account"),
      lastModified: new Date("2026-10-08T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: absoluteUrl("/terms"),
      lastModified: new Date("2026-10-04T00:00:00Z"),
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];
  const services: MetadataRoute.Sitemap = servicePages.map((item) => ({
    url: absoluteUrl(`/services/${item.slug}`),
    lastModified: new Date("2026-08-28T00:00:00Z"),
    changeFrequency: "weekly",
    priority: 0.85,
  }));
  const guides: MetadataRoute.Sitemap = guidePages.map((item) => ({
    url: absoluteUrl(`/guides/${item.slug}`),
    lastModified: guideDates.get(item.slug),
    changeFrequency: "monthly",
    priority: 0.75,
  }));
  const places: MetadataRoute.Sitemap = publicPlaces.map((item) => ({
    url: absoluteUrl(`/places/${item.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));
  const partnerServices: MetadataRoute.Sitemap = publicPlaces.flatMap((place) =>
    place.services.map((service) => ({
      url: absoluteUrl(`/places/${place.slug}/services/${service.id}`),
        changeFrequency: "daily" as const,
      priority: 0.78,
    })),
  );
  const products: MetadataRoute.Sitemap = publicProducts.map((item) => ({
    url: absoluteUrl(`/shop/${item.slug}`),
    changeFrequency: "daily",
    priority: 0.8,
  }));
  const regions = await Promise.all([...new Set(publicPlaces.flatMap((place) => place.regionCodes ?? []))].map(regionContext));
  const expansion: MetadataRoute.Sitemap = [
    ...["/regions", "/en", "/free", ...audiencePages.map((p) => `/for/${p.slug}`)].map((path) => ({ url: absoluteUrl(path), lastModified: new Date("2026-10-07T00:00:00Z") })),
    ...productCategories.filter((c) => productsInCategory(publicProducts, c.slug).length > 0).map((c) => ({ url: absoluteUrl(`/shop/category/${c.slug}`) })),
    ...regions.filter((r) => r !== null).map((r) => ({ url: absoluteUrl(regionPath(r.region)) })),
  ];
  return [
    ...core,
    ...services,
    ...guides,
    ...expansion,
    ...places,
    ...partnerServices,
    ...products,
  ].sort((a, b) => a.url.localeCompare(b.url));
});
