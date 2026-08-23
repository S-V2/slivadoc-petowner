import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slivadoc Pet Owner",
  description:
    "Satu aplikasi untuk kesehatan, perawatan, kebutuhan, dan kebahagiaan hewan kesayanganmu.",
  openGraph: {
    title: "Slivadoc Pet Owner",
    description: "Rawat, pantau, dan temukan layanan terbaik untuk hewanmu dalam satu aplikasi.",
    images: ["/slivadoc-pet-hero.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slivadoc Pet Owner",
    description: "Pet care super-app untuk seluruh kebutuhan hewan kesayanganmu.",
    images: ["/slivadoc-pet-hero.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
