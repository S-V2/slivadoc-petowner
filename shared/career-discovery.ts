import {
  careerDepartments,
  careerEmploymentTypes,
  careerLocationArea,
  type CareerLanguage,
  type CareerPosition,
} from "./careers.ts";

export const careerWorkModes = {
  on_site: "On-site",
  hybrid: "Hybrid",
  remote: "WFH",
} as const;

export const careerDiscoveryCopy = {
  id: {
    heading: "Temukan peran yang cocok untukmu",
    intro: "Temukan kesempatanmu, kenali perannya, lalu kirim lamaranmu.",
    filters: "Filter lowongan",
    employment: "Jenis kerja",
    mode: "Sistem kerja",
    location: "Lokasi",
    department: "Divisi",
    status: "Kesempatan",
    sort: "Urutkan",
    allTypes: "Semua jenis kerja",
    allModes: "Semua sistem kerja",
    allLocations: "Semua lokasi",
    allStatuses: "Semua kesempatan",
    future: "Kesempatan mendatang",
    recommended: "Urutan default",
    newest: "Terbaru dipublikasikan",
    alphabet: "Nama posisi A–Z",
    unspecified: "Belum ditentukan",
    national: "Indonesia · Kota belum ditentukan",
    selected: "Dipilih",
    list: "Daftar posisi",
    apply: "Lamar posisi ini",
    interest: "Daftarkan minat",
    outside:
      "Posisi ini berada di luar filter yang dipilih. Ubah atau hapus filter untuk menampilkannya di daftar.",
    resultNote: "Pilih posisi untuk melihat detailnya",
    filtered: "filter aktif",
  },
  en: {
    heading: "Find a role that fits you",
    intro:
      "Find your opportunity, explore the role, and send your application.",
    filters: "Job filters",
    employment: "Employment type",
    mode: "Work arrangement",
    location: "Location",
    department: "Department",
    status: "Opportunity",
    sort: "Sort by",
    allTypes: "All employment types",
    allModes: "All work arrangements",
    allLocations: "All locations",
    allStatuses: "All opportunities",
    future: "Future opportunities",
    recommended: "Default order",
    newest: "Recently published",
    alphabet: "Position name A–Z",
    unspecified: "Not specified",
    national: "Indonesia · City not specified",
    selected: "Selected",
    list: "Position list",
    apply: "Apply for this role",
    interest: "Register your interest",
    outside:
      "This role is outside your current filters. Change or clear filters to include it in the list.",
    resultNote: "Choose a role to see the details",
    filtered: "active filters",
  },
} as const;

export type CareerFilters = {
  q: string;
  department: string;
  employment: string;
  mode: string;
  location: string;
  status: string;
  sort: string;
};
const filterKeys = [
  "q",
  "department",
  "employment",
  "mode",
  "location",
  "status",
  "sort",
] as const;
export function readCareerFilters(
  params: Pick<URLSearchParams, "get">,
): CareerFilters {
  const value = (key: string) => params.get(key) ?? "";
  const allowed = (key: string, values: string[]) =>
    values.includes(value(key)) ? value(key) : "";
  return {
    q: value("q").slice(0, 150),
    department: value("department").slice(0, 100),
    employment: allowed("employment", Object.keys(careerEmploymentTypes)),
    mode: allowed("mode", Object.keys(careerWorkModes)),
    location: value("location").slice(0, 150),
    status: allowed("status", ["open", "talent_pool"]),
    sort: allowed("sort", ["newest", "title"]),
  };
}
export function careerFilterQuery(filters: CareerFilters): string {
  const params = new URLSearchParams();
  for (const key of filterKeys) if (filters[key]) params.set(key, filters[key]);
  const query = params.toString();
  return query ? `?${query}` : "";
}
export function careerLocationKey(p: CareerPosition): string {
  return careerLocationArea(p) || "indonesia";
}
export function careerWorkMode(
  p: CareerPosition,
  language: CareerLanguage,
): string {
  return p.work_mode
    ? careerWorkModes[p.work_mode]
    : careerDiscoveryCopy[language].unspecified;
}
export function discoverCareerPositions(
  catalog: CareerPosition[],
  filters: CareerFilters,
  language: CareerLanguage,
): CareerPosition[] {
  const terms = filters.q
    .toLocaleLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const result = catalog.filter((p) => {
    if (filters.department && p.department !== filters.department) return false;
    if (filters.employment && !p.employment_types?.includes(filters.employment))
      return false;
    if (filters.mode && p.work_mode !== filters.mode) return false;
    if (filters.location && careerLocationKey(p) !== filters.location)
      return false;
    if (filters.status && p.status !== filters.status) return false;
    const haystack = [
      p.title.id,
      p.title.en,
      p.summary.id,
      p.summary.en,
      p.city,
      p.region,
      careerDepartments[p.department]?.id,
      careerDepartments[p.department]?.en,
      ...p.requirements.flatMap((r) => [r.id, r.en]),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  if (filters.sort === "title")
    result.sort((a, b) =>
      a.title[language].localeCompare(b.title[language], language),
    );
  if (filters.sort === "newest") {
    const published = (p: CareerPosition) =>
      p.published_at ? Date.parse(p.published_at) || 0 : 0;
    result.sort((a, b) => published(b) - published(a));
  }
  return result;
}
