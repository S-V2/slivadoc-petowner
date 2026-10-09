import type { NextConfig } from "next";

// Old Indonesian URLs → English routes. Specific nested rules come first.
// Remove once search engines, store listings and sent review links have moved on.
const sections: [string, string][] = [
  ["kota", "cities"], ["wilayah", "regions"], ["tempat", "places"], ["layanan", "services"],
  ["belanja", "shop"], ["panduan", "guides"], ["ulasan", "reviews"], ["untuk", "for"],
];
const legacyRoutes: [string, string][] = [
  ["/belanja/kategori/:path+", "/shop/category/:path+"],
  ["/tempat/:slug/layanan/:serviceID", "/places/:slug/services/:serviceID"],
  ["/privasi", "/privacy"],
  ["/syarat-ketentuan", "/terms"],
  ["/hapus-akun", "/delete-account"],
  ["/tentang", "/about"],
  ["/bantuan", "/help"],
  ["/gratis", "/free"],
  ["/mitra", "/partners"],
  // Index pages have no trailing path, so `:path+` rules need an exact rule beside them.
  ...sections.flatMap(([from, to]): [string, string][] => [[`/${from}`, `/${to}`], [`/${from}/:path+`, `/${to}/:path+`]]),
];

const nextConfig: NextConfig = {
  // The Pet Owner UI currently serves local static assets from `public/`.
  // Disabling runtime image optimization keeps local Vite/Vinext development
  // independent from Cloudflare's optional ASSETS and IMAGES bindings.
  images: {
    unoptimized: true,
  },
  redirects: async () =>
    legacyRoutes.map(([source, destination]) => ({ source, destination, permanent: true })),
};

export default nextConfig;
