import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Pet Owner UI currently serves local static assets from `public/`.
  // Disabling runtime image optimization keeps local Vite/Vinext development
  // independent from Cloudflare's optional ASSETS and IMAGES bindings.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
