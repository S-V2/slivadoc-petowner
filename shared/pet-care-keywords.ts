// Search vocabulary and editorial targets, not claims of availability or search volume.
export const petCareTopics = [
  {
    id: "pet-sitter",
    term: "pet sitter",
    aliases: ["petsitter", "penjaga hewan", "jasa jaga hewan"],
    path: "/pet-sitter",
    career: "/career/pet-sitter",
  },
  {
    id: "cat-sitter",
    term: "cat sitter",
    aliases: ["jaga kucing", "penjaga kucing", "catsitter"],
    path: "/pet-sitter",
    career: "/career/pet-sitter",
  },
  {
    id: "dog-sitter",
    term: "dog sitter",
    aliases: ["jaga anjing", "penjaga anjing", "dogsitter"],
    path: "/pet-sitter",
    career: "/career/pet-sitter",
  },
  {
    id: "pet-groomer",
    term: "pet groomer",
    aliases: ["grooming hewan", "pet grooming", "petgroomer"],
    path: "/services/grooming-hewan",
    career: "/career/pet-groomer",
  },
  {
    id: "cat-groomer",
    term: "grooming kucing",
    aliases: ["cat groomer", "cat grooming"],
    path: "/services/grooming-hewan",
    career: "/career/pet-groomer",
  },
  {
    id: "dog-groomer",
    term: "grooming anjing",
    aliases: ["dog groomer", "dog grooming"],
    path: "/services/grooming-hewan",
    career: "/career/pet-groomer",
  },
  {
    id: "dog-walker",
    term: "dog walker",
    aliases: ["dog walking", "jalan anjing", "dogwalker"],
    path: "/pet-sitter",
    career: "/career/dog-walker",
  },
  {
    id: "veterinarian",
    term: "dokter hewan",
    aliases: ["veterinarian", "pet clinic", "klinik hewan", "vet"],
    path: "/services/klinik-hewan",
    career: "/career/veterinarian-services",
  },
  {
    id: "pet-hotel",
    term: "pet hotel",
    aliases: [
      "penitipan hewan",
      "penitipan kucing",
      "penitipan anjing",
      "pet boarding",
    ],
    path: "/services/pet-hotel",
    career: "/career/pet-sitter",
  },
  {
    id: "pet-taxi",
    term: "pet taxi",
    aliases: ["pet transport", "antar jemput hewan", "pettaxi"],
    path: "/career",
    career: "/career/pet-taxi",
  },
] as const;
export const petCareKeywordCities = [
  "Jakarta",
  "Bogor",
  "Depok",
  "Tangerang",
  "Bekasi",
  "Bandung",
  "Surabaya",
  "Semarang",
  "Yogyakarta",
  "Denpasar",
  "Medan",
  "Makassar",
  "Malang",
  "Solo",
  "Batam",
  "Balikpapan",
  "Samarinda",
  "Palembang",
  "Pekanbaru",
  "Manado",
];
const serviceIntents = [
  "jasa",
  "cari",
  "biaya",
  "harga",
  "layanan",
  "tips memilih",
  "persiapan menggunakan",
  "panduan",
  "lowongan part time",
  "freelance",
];
const taxiIntents = [
  "lowongan",
  "loker",
  "lowongan part time",
  "lowongan freelance",
  "mitra",
  "karier",
  "persyaratan melamar",
  "pendaftaran mitra",
  "form lamaran",
  "kesempatan kerja",
];
export const petCareKeywords = petCareTopics.flatMap((topic) =>
  (topic.id === "pet-taxi" ? taxiIntents : serviceIntents).flatMap(
    (intent, i) =>
      petCareKeywordCities.map((city) => ({
        keyword: `${intent} ${topic.term} ${city}`.toLowerCase(),
        service: topic.id,
        city,
        intent,
        target_path:
          topic.id === "pet-taxi" || i >= 8 ? topic.career : topic.path,
      })),
  ),
);
const normalize = (s: string) =>
  s.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
export function matchPetCareKeywords(query: string) {
  const q = normalize(query).slice(0, 180);
  if (q.length < 3) return [];
  const job =
    /\b(lowongan|loker|freelance|part time|full time|karier|career|lamaran|mitra|job)\b/.test(
      q,
    );
  const exact = petCareKeywords.find((k) => normalize(k.keyword) === q);
  const topics = petCareTopics.filter(
    (t) =>
      (exact && exact.service === t.id) ||
      [t.term, ...t.aliases].some((alias) => q.includes(alias)),
  );
  const seen = new Set<string>();
  return topics.flatMap((t) => {
    const href = job || t.id === "pet-taxi" ? "/career" : t.path;
    if (seen.has(href)) return [];
    seen.add(href);
    return [
      {
        title:
          href === "/career"
            ? "Slivadoc Career"
            : t.path === "/pet-sitter"
              ? "Pet Sitter & Dog Walking"
              : t.term,
        href,
      },
    ];
  });
}
