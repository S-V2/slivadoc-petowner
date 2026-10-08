export type WorldCollectionMode = "academy" | "events" | "consult" | "adoption" | "documents";

export const worldCollections = {
  academy: { label: "Pet Academy", title: "Belajar bersama. Bertumbuh bersama.", note: "Temukan kelas dan trainer untuk setiap tahap tumbuh pet-mu." },
  events: { label: "Pet Event", title: "Agenda seru untuk pet dan kamu.", note: "Jelajahi kegiatan, cek lokasi dan jadwal, lalu pilih event favoritmu." },
  consult: { label: "Konsultasi", title: "Pendamping tepat untuk pet-mu.", note: "Pilih dokter atau pet trainer, lalu tentukan paket dan jadwal." },
  adoption: { label: "Adopsi", title: "Temukan keluarga. Mulai cerita baru.", note: "Kenali karakter, kesehatan, dan kebutuhan pet sebelum mengajukan adopsi." },
  documents: { label: "Pet Documents", title: "Dokumen rapi. Perjalanan lebih tenang.", note: "Pilih dokumen, lengkapi checklist, dan pantau prosesnya." },
} satisfies Record<WorldCollectionMode, { label: string; title: string; note: string }>;

/** Two columns on phones; add a column only when each card has useful space. */
export function worldGridColumns(width: number, kind: "petspot" | "collection" = "collection") {
  const columns = width >= 1000 ? 5 : width >= 820 ? 4 : width >= 600 ? 3 : 2;
  return kind === "petspot" ? Math.min(3, columns) : columns;
}

export function worldCardWidth(width: number, columns: number, gap = 12) {
  return Math.max(0, (width - gap * (columns - 1)) / columns);
}
