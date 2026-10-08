import { englishGenerated } from "./english-generated.ts";
import { cachedTranslation, requestTranslation } from "./translation-store.ts";
import { englishCopy as baseCopy } from "./english-copy.ts";
import { englishExtra } from "./english-extra.ts";
const englishCopy = { ...englishGenerated, ...baseCopy, ...englishExtra };
export type SlivaLanguage = "id" | "en";
const folded = new Map([...Object.entries(englishGenerated), ...Object.entries(baseCopy), ...Object.entries(englishExtra)].map(([key, value]) => [key.toLocaleLowerCase("id"), value]));
const englishOutputs = new Set([...Object.values(baseCopy), ...Object.values(englishExtra)].map(value => value.toLocaleLowerCase("en")));
export function translateText(value: string, language: SlivaLanguage, forceContent = false): string {
  if (language === "id" || !value.trim()) return value;
  if (value.length > 12000) {
    const parts: string[] = [];
    for (let start = 0; start < value.length;) {
      let end = Math.min(start + 3000, value.length);
      if (end < value.length) {
        const boundary = Math.max(value.lastIndexOf("\n", end), value.lastIndexOf(". ", end), value.lastIndexOf(" ", end));
        if (boundary > start + 1000) end = boundary + 1;
      }
      parts.push(translateText(value.slice(start, end), language, forceContent));
      start = end;
    }
    return parts.join("");
  }
  const core = value.trim();
  // Primitives can nest: an English label must never be translated a second time.
  if (englishOutputs.has(core.toLocaleLowerCase("en"))) return value;
  const exact = Object.prototype.hasOwnProperty.call(englishCopy, core) ? englishCopy[core] : folded.get(core.toLocaleLowerCase("id"));
  let translated: string | undefined = exact;
  if (!translated) {
    const patterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
      [/^Hai, (.+)!$/i, m => `Hi, ${m[1]}!`],
      [/^Kondisi (.+)$/i, m => `${m[1]}'s health`],
      [/^Untuk (.+)$/i, m => `For ${m[1]}`],
      [/^Buka (.+)$/i, m => `Open ${translateText(m[1]!, language)}`],
      [/^(\d+) th pengalaman · (\d+) konsultasi$/i, m => `${m[1]} ${m[1] === "1" ? "year" : "years"} of experience · ${m[2]} ${m[2] === "1" ? "consultation" : "consultations"}`],
      [/^Ganti profil pet aktif, saat ini (.+)$/i, m => `Switch active pet, currently ${m[1]}`],
      [/^(\d+) tahun (\d+) bulan$/i, m => `${m[1]} ${m[1] === "1" ? "year" : "years"} ${m[2]} ${m[2] === "1" ? "month" : "months"}`],
      [/^(\d+) bulan$/i, m => `${m[1]} ${m[1] === "1" ? "month" : "months"}`],
      [/^(\d+) catatan$/i, m => `${m[1]} ${m[1] === "1" ? "record" : "records"}`],
      [/^(\d+) bintang$/i, m => `${m[1]} ${m[1] === "1" ? "star" : "stars"}`],
      [/^(\d+) tersedia$/i, m => `${m[1]} available`],
      [/^(\d+) (produk|layanan) ditemukan$/i, m => `${m[1]} ${m[2]?.toLowerCase() === "produk" ? "products" : "services"} found`],
      [/^(\d+) (toko|terjual|komentar|suka|aktivitas|item|menit|tiket|kursi|ulasan|hari|minggu|tahun)$/i, m => `${m[1]} ${({toko:"stores",terjual:"sold",komentar:"comments",suka:"likes",aktivitas:"activities",item:"items",menit:"minutes",tiket:"tickets",kursi:"seats",ulasan:"reviews",hari:"days",minggu:"weeks",tahun:"years"} as Record<string,string>)[m[2]!.toLowerCase()]}`],
      [/^Belum ada rekam medis untuk (.+)\.?$/i, m => `No medical records for ${m[1]} yet.`],
      [/^(.+) masuk keranjang$/i, m => `${m[1]} added to cart`],
      [/^Pesanan (.+) siap dibayar$/i, m => `Order ${m[1]} is ready for payment`],
      [/^Pesan sebagai (.+)…$/i, m => `Message as ${m[1]}…`],
      [/^Mengapa ingin mengadopsi (.+)\?$/i, m => `Why would you like to adopt ${m[1]}?`],
      [/^Keranjang \((\d+)\)$/i, m => `Cart (${m[1]})`],
      [/^(\d+) orang · (\d+) pet$/i, m => `${m[1]} people · ${m[2]} pets`],
      [/^Undangan akses (.+) berhasil dikirim$/i, m => `Access invitation for ${m[1]} sent`],
      [/^Akses (.+)$/i, m => `${m[1]}'s access`],
      [/^Izin (.+)$/i, m => `${m[1]} permission`],
      [/^Detail (.+)$/i, m => `${m[1]} details`],
      [/^Hapus alamat (.+)\?$/i, m => `Delete address ${m[1]}?`],
      [/^sejak (.+)$/i, m => `since ${m[1]}`],
      [/^Update (.+)$/i, m => `Updated ${m[1]}`],
      [/^Mulai (.*\d.*)$/, m => `Starts ${m[1]}`],
      [/^Rencana (.*\d.*)$/, m => `Planned ${m[1]}`],
      [/^Aktual (.*\d.*)$/, m => `Actual ${m[1]}`],
    ];
    for (const [pattern, render] of patterns) { const match = core.match(pattern); if (match) { translated = render(match); break; } }
  }
  if (!translated) {
    translated = cachedTranslation(core);
    if (!translated) { requestTranslation(core, forceContent); return value; }
  }
  if (core === core.toUpperCase() && /[A-Z]/.test(core)) translated = translated.toUpperCase();
  return value.slice(0, value.indexOf(core)) + translated + value.slice(value.indexOf(core) + core.length);
}
// Catalogue names and descriptions keep their exact original unless a reviewed
// translation exists; identifiers, brand names, prices and user input are untouched.
export function localizedContent(source: string, language: SlivaLanguage, translations?: Partial<Record<SlivaLanguage, string>>) {
  return translations?.[language] || translateText(source, language);
}
