import type { MetadataRoute } from "next";
import { SEO, absoluteUrl } from "./lib/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/services/", "/shop/", "/guides/", "/cities/", "/places/", "/about", "/partners"],
        disallow: ["/api/", "/backend-test/", "/setup/", "/reviews/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap-index.xml"),
    host: SEO.siteUrl,
  };
}
