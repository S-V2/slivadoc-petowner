import { PetOwnerLanguageProvider } from "./components/PetOwnerI18n";
import { SiteFooter } from "./components/SiteFooter";
import { SlivaDialogHost } from "./components/SlivaDialog";
import type { Metadata } from "next";
import "./globals.css";
import "./revamp-home.css";
import "./mobile-responsive.css";
import "./marketplace.css";
import "./seo.css";
import "./genz-revamp.css";
import "./promo-tickets.css";
import "./adoption-passport.css";
import "./sliva-select.css";
import "./sliva-controls.css";
import "./bottom-sheets.css";
import "./legal.css";
import "./career.css";
import "./site-shell.css";
import "./site-footer.css";
import { SEO, absoluteUrl } from "./lib/seo-config";

export const metadata: Metadata = {
  metadataBase: new URL(SEO.siteUrl),
  applicationName: SEO.brand,
  title: {
    default: SEO.defaultTitle,
    template: `%s | ${SEO.brand}`,
  },
  description: SEO.defaultDescription,
  keywords: [
    "Slivadoc",
    "pet care Indonesia",
    "dokter hewan",
    "pet clinic",
    "petshop",
    "grooming hewan",
    "kesehatan anabul",
  ],
  category: "pet care",
  creator: SEO.legalName,
  publisher: SEO.legalName,
  alternates: {
    canonical: absoluteUrl("/"),
    types: {
      "application/rss+xml": absoluteUrl("/feed.xml"),
    },
  },
  robots: {
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
    type: "website",
    locale: SEO.locale,
    siteName: SEO.brand,
    url: absoluteUrl("/"),
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: [{ url: absoluteUrl("/slivadoc-pet-hero.png"), alt: "Slivadoc, ekosistem pet care Indonesia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.defaultTitle,
    description: SEO.defaultDescription,
    images: [absoluteUrl("/slivadoc-pet-hero.png")],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/slivadoc-favicon.png",
    shortcut: "/brand/slivadoc-favicon.png",
    apple: "/brand/slivadoc-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={SEO.language}>
      <body id="slivadoc-top" className="antialiased"><PetOwnerLanguageProvider>{children}<SiteFooter /><SlivaDialogHost /></PetOwnerLanguageProvider></body>
    </html>
  );
}
