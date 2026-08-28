import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Slivadoc — Ekosistem Pet Care",
    short_name: "Slivadoc",
    description: "Dokter hewan, pet clinic, petshop, grooming, dan kebutuhan anabul dalam satu ekosistem.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fcfe",
    theme_color: "#24a9e2",
    lang: "id-ID",
    categories: ["medical", "lifestyle", "shopping"],
    icons: [
      { src: "/brand/slivadoc-favicon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
