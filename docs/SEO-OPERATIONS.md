# Operasional SEO Slivadoc

Dokumen ini adalah handoff implementasi SEO web Pet Owner. Fondasi teknisnya berada di source; verifikasi kepemilikan mesin pencari, profil bisnis, dan kalender konten tetap perlu dijalankan oleh tim yang memiliki akun produksi.

## Cakupan yang sudah diimplementasikan

- Metadata unik, canonical URL, Open Graph, Twitter Card, robots policy, dan bahasa `id-ID`.
- Schema JSON-LD untuk `Organization`, `WebSite`, `Service`, `Article`, `FAQPage`, `BreadcrumbList`, `ItemList`, `City`, `VeterinaryCare`, `PetStore`, dan `LocalBusiness` sesuai isi halaman.
- Sitemap dinamis untuk halaman inti, layanan, panduan, kota, serta profil mitra aktif.
- `robots.txt`, web app manifest, dan RSS panduan.
- Delapan landing page layanan, delapan panduan awal, dan sepuluh hub kota dengan internal linking.
- Direktori `/tempat` yang membentuk profil local SEO dari API publik mitra. Profil tanpa data aktif tidak diterbitkan sebagai URL sitemap.
- Endpoint IndexNow terautentikasi untuk mengirim URL baru, berubah, atau dihapus.
- Tes otomatis untuk metadata, canonical, indexability, schema, sitemap, robots, RSS, dan seluruh URL sitemap.

## Konfigurasi produksi

Isi secret di environment deployment, bukan di repository:

```dotenv
NEXT_PUBLIC_SITE_URL=https://slivadoc.id
GOOGLE_SITE_VERIFICATION=<token-meta-google>
BING_SITE_VERIFICATION=<token-meta-bing>
INDEXNOW_KEY=<8-128-karakter-key>
SEO_WEBHOOK_SECRET=<random-secret-panjang>
```

`NEXT_PUBLIC_PLATFORM_API_URL` harus menunjuk backend produksi agar direktori mitra dapat membentuk halaman bisnis lokal dan sitemap dinamis.

## Aktivasi Google dan Bing

1. Tambahkan properti domain `slivadoc.id` di Google Search Console melalui verifikasi DNS.
2. Kirim `https://slivadoc.id/sitemap.xml` pada laporan Sitemaps.
3. Periksa URL beranda, satu layanan, satu panduan, satu kota, dan satu profil mitra melalui URL Inspection.
4. Tambahkan situs ke Bing Webmaster Tools dan kirim sitemap yang sama.
5. Aktifkan key IndexNow dan uji satu URL yang baru diperbarui.
6. Jangan memakai Google Indexing API untuk halaman pet care umum; API tersebut bukan jalur indexing umum.

Contoh pengiriman IndexNow dari pipeline publikasi:

```bash
curl -X POST "https://slivadoc.id/api/seo/indexnow" \
  -H "Authorization: Bearer $SEO_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://slivadoc.id/panduan/panduan-vaksin-kucing"]}'
```

Panggil endpoint setelah konten dipublikasikan, diperbarui, dinonaktifkan, atau URL profil mitra berubah.

## Standar local SEO mitra

Profil cabang hanya layak diindeks ketika memiliki:

- nama bisnis dan nama cabang yang konsisten;
- alamat lengkap, kota, dan koordinat valid;
- minimal satu layanan aktif;
- kategori bisnis yang benar;
- jam operasional, nomor telepon, foto, dan area layanan ketika field backend tersedia;
- rating hanya bila berasal dari ulasan nyata dan terlihat pada halaman.

Nama, alamat, dan telepon harus sama di Slivadoc, Google Business Profile, website mitra, serta direktori lain. Setiap cabang fisik memakai satu profil Google Business Profile yang valid. Jangan membuat halaman kota atau cabang kosong untuk mengejar kata kunci.

## Model content cluster

Gunakan satu halaman utama per intent, lalu hubungkan artikel pendukung:

| Cluster | Halaman utama | Konten pendukung |
| --- | --- | --- |
| Kesehatan | Dokter hewan online, klinik hewan | gejala, pemeriksaan, vaksin, pencegahan, perawatan lanjutan |
| Retail | Petshop | nutrisi, pemilihan produk, keamanan produk, tahap hidup |
| Perawatan | Grooming, home service | bulu, kulit, kuku, persiapan, perilaku |
| Lifestyle | Pet hotel, adopsi | checklist penitipan, adaptasi, perjalanan, komitmen adopsi |
| Lokal | Kota dan profil cabang | layanan aktif, area, akses, fasilitas, panduan kunjungan |

Untuk artikel kesehatan, tampilkan penulis atau reviewer yang benar-benar bertanggung jawab, tanggal ditinjau, sumber primer, serta catatan bahwa konten tidak menggantikan diagnosis. Jangan menerbitkan konten massal yang hanya mengganti nama kota.

## KPI operasional

Pantau mingguan untuk error dan bulanan untuk pertumbuhan:

- URL valid, tidak terindeks, crawled-not-indexed, dan duplicate canonical;
- klik, impresi, CTR, posisi rata-rata, serta query per cluster;
- halaman local SEO yang menghasilkan klik arah, booking, telepon, atau kunjungan profil;
- Core Web Vitals: LCP ≤ 2,5 detik, INP < 200 ms, CLS < 0,1 pada persentil ke-75;
- error structured data dan perubahan jumlah item valid;
- backlink berkualitas, mention brand, serta konsistensi profil cabang;
- conversion rate dari organic landing page menuju pencarian, login, booking, atau transaksi.

Tidak ada implementasi yang dapat menjamin posisi pertama untuk semua pencarian. Target yang sehat adalah memperluas cakupan query relevan, membangun otoritas topik, menerbitkan data lokal yang benar, dan meningkatkan konversi secara bertahap tanpa doorway page atau keyword stuffing.
