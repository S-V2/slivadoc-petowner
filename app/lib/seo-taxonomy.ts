import type { PublicProduct } from "./public-marketplace.ts";
import type { PublicServiceSummary } from "./public-directory.ts";

export const productCategories = [
  { slug: "makanan-kucing", name: "Makanan kucing", description: "Bandingkan dry food, wet food, dan snack kucing. Periksa usia, komposisi, isi kemasan, serta petunjuk pemberian sebelum membeli.", match: /\b(kucing|cat|kitten)\b/i, kind: /makanan|pakan|food|snack|treat|kibble|wet|dry/i },
  { slug: "makanan-anjing", name: "Makanan anjing", description: "Temukan makanan dan snack anjing sesuai tahap hidup, ukuran tubuh, serta kebutuhan pet. Lihat komposisi dan harga dari penjual.", match: /\b(anjing|dog|puppy)\b/i, kind: /makanan|pakan|food|snack|treat|kibble|wet|dry/i },
  { slug: "makanan-hewan", name: "Makanan hewan", description: "Jelajahi pakan untuk beragam hewan. Cocokkan produk dengan spesies, tahap hidup, dan petunjuk produsen; diet medis perlu arahan dokter hewan.", match: /makanan|pakan|food|feed|snack|treat|pelet|pellet|hay/i },
  { slug: "kandang-hewan", name: "Kandang & carrier hewan", description: "Cari kandang, carrier, dan tempat tinggal hewan. Periksa ukuran, ventilasi, bahan, kemudahan pembersihan, serta keamanan pintu.", match: /kandang|carrier|kennel|cage|crate|akuarium|aquarium|terrarium|sangkar/i },
  { slug: "aksesoris-hewan", name: "Aksesoris hewan", description: "Pilih kalung, harness, tali jalan, pakaian, dan perlengkapan pet. Ukur tubuh pet dan periksa panduan ukuran sebelum memesan.", match: /aksesor|aksesoris|aksesori|accessor|kalung|collar|harness|leash|tali|baju|pakaian|bandana/i },
  { slug: "mainan-hewan", name: "Mainan hewan", description: "Temukan mainan untuk aktivitas dan pengayaan pet. Pilih ukuran aman, bahan sesuai, dan awasi pemakaian agar bagian kecil tidak tertelan.", match: /mainan|toy|teaser|scratcher|garukan|bola|puzzle/i },
  { slug: "kebersihan-hewan", name: "Kebersihan & grooming", description: "Cari pasir kucing, litter box, sampo, sikat, dan alat grooming. Periksa kecocokan spesies dan petunjuk pemakaian setiap produk.", match: /pasir|litter|shampoo|sampo|shampo|sikat|sisir|brush|grooming|pembersih|popok|diaper/i },
  { slug: "perlengkapan-hewan", name: "Perlengkapan hewan", description: "Jelajahi tempat makan, tempat minum, alas tidur, dan perlengkapan harian. Bandingkan bahan, kapasitas, serta kemudahan perawatannya.", match: /tempat makan|tempat minum|bowl|feeder|fountain|bed|kasur|alas|perlengkapan|equipment/i },
] as const;
export const categoryBySlug = new Map(productCategories.map((c) => [c.slug as string, c]));
export function productsInCategory(products: PublicProduct[], slug: string) {
  const category = categoryBySlug.get(slug);
  if (!category) return [];
  return products.filter((p) => {
    const text = `${p.name} ${p.category}`;
    return category.match.test(text) && (!("kind" in category) || category.kind.test(text));
  });
}
const serviceMatchers: Record<string, RegExp> = {
  "dokter-hewan-online": /online|telemed|telekonsul|konsultasi|consultation/i,
  "klinik-hewan": /klinik|clinic|pemeriksaan|check.?up|veterin|medical/i,
  petshop: /petshop|pet.shop|retail/i,
  "grooming-hewan": /groom|mandi|potong kuku|salon/i,
  "vaksinasi-hewan": /vaksin|vaccin|imunisasi/i,
  "pet-hotel": /hotel|boarding|penitipan|daycare/i,
  "home-service-hewan": /home.?service|home.?visit|panggilan|kunjungan rumah/i,
  "adopsi-hewan": /adopsi|adoption/i,
};
export function serviceMatches(slug: string, service: PublicServiceSummary) {
  return serviceMatchers[slug]?.test(`${service.category} ${service.name}`) ?? false;
}
