import type { Metadata } from "next";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://slivadoc.com";

export const SEO = {
  brand: "Slivadoc",
  legalName: "PT Sliva Technology Indonesia",
  siteUrl: configuredSiteUrl.replace(/\/$/, ""),
  locale: "id_ID",
  language: "id-ID",
  defaultTitle: "Slivadoc — Ekosistem Pet Care & Dokter Hewan Indonesia",
  defaultDescription:
    "Temukan dokter hewan, pet clinic, petshop, grooming, pet hotel, konsultasi online, dan kebutuhan anabul dalam satu ekosistem Slivadoc.",
  themeColor: "#24a9e2",
} as const;

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SEO.siteUrl}${normalizedPath}`;
}

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: "website" | "article";
  noIndex?: boolean;
  image?: { url: string; alt: string };
  locale?: "id_ID" | "en_US";
  languages?: Record<string, string>;
}): Metadata {
  const canonical = absoluteUrl(input.path);
  const socialImage = input.image ?? {
    url: absoluteUrl("/slivadoc-pet-hero.png"),
    alt: "Slivadoc, ekosistem layanan dan kesehatan hewan",
  };
  return {
    title: input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical, ...(input.languages ? { languages: Object.fromEntries(Object.entries(input.languages).map(([lang, path]) => [lang, absoluteUrl(path)])) } : {}) },
    robots: input.noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: input.type ?? "website",
      locale: input.locale ?? SEO.locale,
      siteName: SEO.brand,
      title: input.title,
      description: input.description,
      url: canonical,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [socialImage.url],
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
