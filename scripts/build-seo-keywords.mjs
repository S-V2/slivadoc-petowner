import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { keywordSeeds } from "./seo-keyword-seeds.mjs";

const root = new URL("../", import.meta.url);
const dataDir = new URL("app/data/regions/", root);
const out = new URL("outputs/seo-2026-10-07/", root);
await mkdir(out, { recursive: true });
const regions = JSON.parse(await readFile(new URL("index.json", dataDir), "utf8"));
for (const file of (await readdir(dataDir)).filter((f) => /^\d{2}\.json$/.test(f)).sort()) regions.push(...JSON.parse(await readFile(new URL(file, dataDir), "utf8")));
regions.sort((a, b) => a.code.localeCompare(b.code));
const byCode = new Map(regions.map((r) => [r.code, r]));
function location(r) {
  const names = [r.name];
  while (r.parent) { r = byCode.get(r.parent); names.push(r.name); }
  return names.join(", ");
}
function regionPath(r) {
  return `/wilayah/${r.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}--${r.code}`;
}
const locationCodes = new Map();
for (const region of regions) {
  const key = location(region).toLowerCase().replace(/\s+/g, " ");
  locationCodes.set(key, [...(locationCodes.get(key) ?? []), region.code]);
}
const headers = ["keyword", "language", "audience", "cluster", "intent", "region_code", "location", "target_path", "readiness", "monthly_search_volume", "source"];
const csv = (values) => values.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(",") + "\r\n";
const stream = createWriteStream(new URL("slivadoc-900000-keywords.csv", out));
stream.write("\uFEFF" + csv(headers));
const seen = new Set();
const counts = { language: {}, cluster: {}, readiness: {} };
const sample = [];
const hash = createHash("sha256");
const regionCoverage = new Set();
async function add(seed, keyword, region = null, market = "Indonesia", readiness = "candidate_validate_demand") {
  keyword = keyword.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  if (seen.has(keyword) || seen.size >= 900000) return;
  seen.add(keyword);
  const codes = region ? locationCodes.get(location(region).toLowerCase().replace(/\s+/g, " ")) : [];
  for (const code of codes) regionCoverage.add(code);
  // Identically named villages share a query and resolve to their parent
  // directory, where both administrative codes are available to the user.
  const targetRegion = region && codes.length > 1 ? byCode.get(region.parent) : region;
  const target = targetRegion && seed.intent === "local" ? regionPath(targetRegion) : seed.path;
  const row = [keyword, seed.language, seed.audience, seed.cluster, seed.intent, codes.join("|"), region ? location(region) : market, target, readiness, "", "Slivadoc editorial taxonomy; Kemendagri 2025 snapshot; unmeasured candidate"];
  for (const field of ["language", "cluster"]) counts[field][seed[field]] = (counts[field][seed[field]] ?? 0) + 1;
  counts.readiness[readiness] = (counts.readiness[readiness] ?? 0) + 1;
  if (sample.length < 300) sample.push(row);
  const line = csv(row);
  hash.update(line);
  if (!stream.write(line)) await once(stream, "drain");
}
// Start with concise head terms so the review sample spans all clusters.
for (const seed of keywordSeeds) await add(seed, seed.keyword, null, seed.language === "en" ? "International / Indonesia entry point" : "Indonesia");
const english = keywordSeeds.filter((s) => s.language === "en");
const countryCodes = "US GB CA AU NZ SG MY TH PH VN IN JP KR TW HK AE SA QA KW BH OM TR IL DE FR ES IT NL BE CH AT SE NO DK FI IE PT PL CZ HU RO GR UA BR MX AR CL CO PE ZA NG KE EG MA GH TZ UG CN BD PK LK NP KH LA MM ID BN TL PG FJ MU SC MV IS LU MT CY EE LV LT HR SI SK BG RS AL GE AM KZ UZ MN".split(" ");
const names = new Intl.DisplayNames(["en"], { type: "region" });
// Foreign-country phrases remain research candidates until supply and
// localization exist; they do not create location pages or coverage claims.
for (const prefix of ["", "find ", "compare ", "best ", "guide to "]) {
  for (const country of countryCodes) {
    for (const seed of english) {
      if ((counts.language.en ?? 0) >= 60000) break;
      await add(seed, `${prefix}${seed.keyword} in ${names.of(country)}`, null, names.of(country), "research_requires_localization_and_supply");
    }
  }
}
const localTerms = ["dokter hewan", "petshop", "pet clinic", "vaksin hewan", "grooming hewan", "pet hotel", "makanan kucing", "kandang kucing"];
for (const region of regions) {
  for (const term of localTerms) {
    const seed = keywordSeeds.find((s) => s.language === "id" && s.keyword === term);
    await add(seed, `${term} di ${location(region)}`, region, "Indonesia", seed.intent === "local" ? "index_only_with_active_local_inventory" : "category_requires_products_check_shipping");
  }
}
const indonesian = keywordSeeds.filter((s) => s.language === "id");
// Round-robin across the 552 province/regency entries for broad geographic
// coverage before extending modifiers. Stop only at the requested total.
for (const prefix of ["", "cari ", "pilihan ", "informasi "]) {
  for (const seed of indonesian) {
    for (const region of regions.filter((r) => r.code.length <= 5)) {
      if (seen.size >= 900000) break;
      await add(seed, `${prefix}${seed.keyword} di ${location(region)}`, region, "Indonesia", seed.cluster === "gratis-lifetime" ? "confirm_program_eligibility" : "candidate_validate_demand_and_inventory");
    }
    if (seen.size >= 900000) break;
  }
  if (seen.size >= 900000) break;
}
stream.end();
await once(stream, "finish");
if (seen.size !== 900000 || regionCoverage.size !== regions.length) throw new Error(`Incomplete bank: ${seen.size}, regions: ${regionCoverage.size}`);
await writeFile(new URL("keyword-summary.json", out), JSON.stringify({ generatedOn: "2026-10-07", uniqueKeywords: seen.size, totalRegions: regionCoverage.size, counts, sha256Rows: hash.digest("hex"), measuredSearchVolume: false, sources: ["https://github.com/cahyadsn/wilayah", "https://developers.google.com/search/docs/essentials/spam-policies", "https://developers.google.com/search/docs/appearance/structured-data/merchant-listing"], notes: ["Candidate keyword bank; not evidence of search demand, rankings or worldwide service availability.", "Monthly search volume intentionally blank. Validate with Search Console / Keyword Planner before prioritizing.", "Do not inject the bank into meta keywords, HTML, sitemaps or automatically publish 900,000 pages.", "Countries are international research markets. /en currently describes Indonesia only."] }, null, 2) + "\n");
await writeFile(new URL("review-sample.json", out), JSON.stringify({ headers, rows: sample }));
console.log(JSON.stringify({ unique: seen.size, regions: regionCoverage.size, languages: counts.language }));
