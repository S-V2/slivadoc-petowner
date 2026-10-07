import index from "../data/regions/index.json" with { type: "json" };
import source from "../data/regions/source.json" with { type: "json" };
import { regionLoaders } from "../data/regions/loaders.ts";

export type SeoRegion = { code: string; parent: string; name: string };
export const regionSource = source;
export const regionIndex: SeoRegion[] = index;
export const provinces = regionIndex.filter((r) => !r.parent);
export function regionSlug(region: SeoRegion) {
  return `${region.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}--${region.code}`;
}
export const regionPath = (region: SeoRegion) => `/wilayah/${regionSlug(region)}`;
export function regionCode(slug: string) {
  return slug.match(/--(\d{2}(?:\.\d{2}(?:\.\d{2}(?:\.\d{4})?)?)?)$/)?.[1] ?? "";
}
export async function regionContext(code: string) {
  const loader = regionLoaders[code.slice(0, 2) as keyof typeof regionLoaders];
  if (!loader) return null;
  // Province pages need only the lightweight national index.
  const rows: SeoRegion[] = code.length === 2 ? regionIndex : [...regionIndex, ...await loader()];
  const region = rows.find((r) => r.code === code);
  if (!region) return null;
  const ancestors: SeoRegion[] = [];
  let parent = region.parent;
  while (parent) {
    const entry = rows.find((r) => r.code === parent);
    if (!entry) break;
    ancestors.unshift(entry);
    parent = entry.parent;
  }
  return { region, ancestors, children: rows.filter((r) => r.parent === code) };
}
export function regionLevel(code: string) {
  return ({ 2: "Provinsi", 5: "Kabupaten/kota", 8: "Kecamatan", 13: "Desa/kelurahan" })[code.length] ?? "Wilayah";
}
