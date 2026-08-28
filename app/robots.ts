import type { MetadataRoute } from "next";
import { SEO, absoluteUrl } from "./lib/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/layanan/", "/panduan/", "/kota/", "/tempat/", "/tentang", "/mitra"],
        disallow: ["/api/", "/backend-test/", "/setup/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SEO.siteUrl,
  };
}
