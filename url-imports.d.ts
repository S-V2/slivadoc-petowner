// Bundler asset-URL imports (Vite/rolldown `?url` suffix). GeoMap imports
// maplibre-gl's worker file this way so the bundler emits it and the URL stays
// version-locked to the installed maplibre-gl. tsc does not know the suffix.
declare module "*.mjs?url" {
  const url: string;
  export default url;
}
