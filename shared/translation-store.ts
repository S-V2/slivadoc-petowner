type Translator = (sources: string[]) => Promise<Record<string, string>>;
let translator: Translator | undefined;
let revision = 0;
let flushing = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const cache = new Map<string, string>();
const pending = new Set<string>();
const busy = new Set<string>();
const failures = new Map<string, number>();
const listeners = new Set<() => void>();
export function translationSnapshot() { return revision; }
export function subscribeTranslations(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function notify() { revision++; for (const listener of listeners) listener(); }
export function configureTranslator(next: Translator) { translator = next; notify(); }
export function cachedTranslation(source: string) { return cache.get(source); }
export function needsTranslation(source: string) {
  if (!source.trim() || source.length > 12000 || /^https?:|^[\d\s\W]+$|^[\w.+-]+@\S+$/.test(source)) return false;
  return /\b(keterangan|pengaturan|syarat|ketentuan|kebijakan|aturan|kategori|penerima|bantuan|temukan|gunakan|lengkapi|masukkan|tentang|kode|galeri|nilai|status|hewan|kucing|anjing|makanan|pakan|kandang|aksesoris|perawatan|kesehatan|layanan|produk|petshop|dokter|klinik|vaksin|obat|vitamin|mainan|untuk|dengan|dari|dan|yang|atau|kamu|anda|kami|saya|ini|itu|belum|sudah|tidak|jangan|akan|bisa|dapat|ada|tanpa|setelah|sebelum|silakan|pilih|lihat|tutup|buka|memuat|menyiapkan|menyimpan|mengirim|mencari|berhasil|gagal|menunggu|jadwal|jumlah|lokasi|nama|alamat|nomor|tanggal|bulan|tahun|jam|menit|hari|minggu|pesanan|pembayaran|pengiriman|biaya|harga|stok|gratis|berat|ras|jenis|kelamin|jantan|betina|usia|pemilik|anggota|komentar|ulasan|terverifikasi|terdaftar|riwayat|diterima|dikirim|dimulai|berlaku|tersedia|berikutnya|sebelumnya|selanjutnya|terdekat|terbaik|terbaru|seluruh|semua|setiap|lebih|paling|khusus|lainnya|tambahkan|hapus|ubah|kirim|balas|bagikan|ikuti|mulai|akhir|selesai|tambah|konfirmasi|batal|terjual|terkumpul|terisi|terakhir|tersimpan|dibatalkan|dibaca|dicatat|ditinjau|diajukan|ditampilkan|pengajuan|permintaan|kebutuhan|pilihan|cerita|pengalaman|rincian|keamanan|ke|di|sampai|hingga)\b/i.test(source);
}
export function requestTranslation(source: string, force = false) {
  if (!source.trim() || source.length > 12000 || /^https?:|^[\d\s\W]+$|^[\w.+-]+@\S+$/.test(source)) return;
  if (!translator || cache.has(source) || busy.has(source) || (failures.get(source) ?? 0) >= 3 || (!force && !needsTranslation(source))) return;
  pending.add(source);
  schedule();
}
function schedule() { if (!timer && !flushing && pending.size) timer = setTimeout(() => { timer = undefined; void flush(); }, 50); }
async function flush() {
  if (!translator || flushing) return;
  flushing = true;
  const sources: string[] = [];
  let characters = 0;
  for (const source of pending) {
    if (sources.length >= 20 || characters + source.length > 32000) break;
    sources.push(source); characters += source.length; pending.delete(source); busy.add(source);
  }
  if (!sources.length) { flushing = false; return; }
  try {
    const results = await translator(sources);
    for (const source of sources) {
      if (typeof results[source] === "string" && results[source]?.trim()) { cache.set(source, results[source]!); failures.delete(source); }
      else failures.set(source, (failures.get(source) ?? 0) + 1);
    }
    if (cache.size > 10000) for (const key of [...cache.keys()].slice(0, cache.size - 10000)) cache.delete(key);
  } catch {
    for (const source of sources) failures.set(source, (failures.get(source) ?? 0) + 1);
  } finally {
    for (const source of sources) busy.delete(source);
    notify();
    flushing = false;
    // Back off after an unavailable service; never spin on a failed request.
    if (pending.size) timer = setTimeout(() => { timer = undefined; void flush(); }, sources.some(source => failures.has(source)) ? 3000 : 50);
  }
}
