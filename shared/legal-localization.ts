import { legalDocuments, legalSources, LEGAL_EFFECTIVE_DATE, type LegalPolicy } from "./legal";
import { englishLegalDocuments } from "./legal-en";

export type LegalLanguage = "id" | "en";
export const getLegalDocument = (policy: LegalPolicy, language: LegalLanguage) =>
  (language === "en" ? englishLegalDocuments : legalDocuments)[policy];

const englishSourceTitles = [
  "Law 11/2008 on Electronic Information and Transactions (UU ITE)",
  "Law 19/2016: First Amendment to UU ITE",
  "Law 1/2024: Second Amendment to UU ITE",
  "Law 27/2022 on Personal Data Protection (UU PDP)",
  "Government Regulation 71/2019 on Electronic Systems and Transactions",
  "Government Regulation 80/2019 on Electronic Commerce",
  "Law 8/1999 on Consumer Protection",
  "Law 28/2014 on Copyright",
  "Law 18/2009 on Livestock and Animal Health, as amended",
  "Law 21/2019 on Animal, Fish, and Plant Quarantine",
  "Government Regulation 29/2023 implementing the Quarantine Law",
  "Government Regulation 17/2025 on Child Protection in Electronic Systems",
  "Ministerial Regulation 9/2026 implementing Government Regulation 17/2025 on Child Protection",
];
export const getLegalSources = (language: LegalLanguage) => legalSources.map((source, index) => ({
  ...source, title: language === "en" ? englishSourceTitles[index] : source.title,
}));

export const legalCopy = {
  id: {
    back: "Kembali", backRegistration: "Kembali ke registrasi", backHome: "Kembali ke beranda", home: "Beranda",
    language: "Bahasa dokumen", hub: "PANDUAN SLIVADOC", termsKicker: "HAK & TANGGUNG JAWAB", privacyKicker: "DATA & PRIVASI ANDA",
    version: "Versi", effective: "Berlaku", date: LEGAL_EFFECTIVE_DATE, sections: "bagian", clauses: "klausul",
    intro: "Kenali hak Anda", content: "Isi dokumen", section: "BAGIAN", readProgress: "Progres baca",
    scrollHint: "Baca hingga akhir untuk membuka tombol persetujuan.", ready: "Anda sudah mencapai akhir dokumen.",
    agree: "Saya sudah membaca dan menyetujui", end: "Akhir dokumen", endNote: "Terima kasih telah meluangkan waktu untuk memahami ketentuan ini.",
    sources: "Rujukan peraturan resmi", sourcesNote: "Rujukan dibaca bersama perubahan dan ketentuan pelaksana yang berlaku sesuai jenis layanan.",
    sourceError: "Rujukan belum dapat dibuka. Coba kembali saat koneksi tersedia.",
    contents: "Daftar isi", contentsLabel: "Daftar isi dokumen", sectionsLabel: "Daftar bagian dokumen",
    translationNote: "Tersedia dalam Bahasa Indonesia dan English. Jika ada perbedaan makna, penafsiran memperhatikan teks Indonesia dan hak konsumen.",
    otherTerms: "Baca Syarat dan Ketentuan", otherPrivacy: "Baca Kebijakan Privasi",
  },
  en: {
    back: "Back", backRegistration: "Back to registration", backHome: "Back to home", home: "Home",
    language: "Document language", hub: "SLIVADOC GUIDE", termsKicker: "RIGHTS & RESPONSIBILITIES", privacyKicker: "YOUR DATA & PRIVACY",
    version: "Version", effective: "Effective", date: "9 October 2026", sections: "sections", clauses: "clauses",
    intro: "Understand your rights", content: "Document content", section: "SECTION", readProgress: "Reading progress",
    scrollHint: "Read to the end to enable the agreement button.", ready: "You have reached the end of the document.",
    agree: "I have read and agree", end: "End of document", endNote: "Thank you for taking the time to understand these terms.",
    sources: "Official legal references", sourcesNote: "Read these references together with amendments and implementing provisions applicable to each service.",
    sourceError: "Unable to open this reference. Please try again when a connection is available.",
    contents: "Contents", contentsLabel: "Document contents", sectionsLabel: "Document sections",
    translationNote: "Available in Bahasa Indonesia and English. If meanings differ, interpretation considers the Indonesian text and consumer rights.",
    otherTerms: "Read the Terms and Conditions", otherPrivacy: "Read the Privacy Policy",
  },
} as const;

export function legalReadingProgress(offset: number, viewport: number, height: number) {
  if (viewport <= 0 || height <= 0) return 0;
  if (offset + viewport >= height - 8) return 100;
  return Math.min(99, Math.max(0, Math.floor(offset / Math.max(1, height - viewport) * 100)));
}
