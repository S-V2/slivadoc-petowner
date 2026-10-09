# Operasional SEO Slivadoc

Dokumen ini adalah handoff implementasi SEO web Pet Owner. Fondasi teknisnya berada di source; verifikasi kepemilikan mesin pencari, profil bisnis, dan kalender konten tetap perlu dijalankan oleh tim yang memiliki akun produksi.

## Cakupan yang sudah diimplementasikan

- Metadata unik, canonical URL, Open Graph, Twitter Card, robots policy, dan bahasa `id-ID`.
- Schema JSON-LD untuk `Organization`, `WebSite`, `Service`, `Article`, `FAQPage`, `BreadcrumbList`, `ItemList`, `City`, `VeterinaryCare`, `PetStore`, dan `LocalBusiness` sesuai isi halaman.
- Sitemap dinamis untuk halaman inti, layanan, panduan, kota, serta profil mitra aktif.
- `robots.txt`, web app manifest, dan RSS panduan.
- Delapan landing page layanan, delapan panduan awal, dan sepuluh hub kota dengan internal linking.
- Direktori `/places` yang membentuk profil local SEO dari API publik mitra. Profil tanpa data aktif tidak diterbitkan sebagai URL sitemap.
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
2. Kirim `https://slivadoc.id/sitemap-index.xml` pada laporan Sitemaps. `/sitemap.xml` tetap menjadi bagian pertama untuk kompatibilitas.
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

## Perluasan 7 Oktober 2026

Implementasi berada di repository Pet Owner, backend, dan metadata Partners. Belum merupakan bukti perubahan sudah diterapkan pada domain produksi atau sudah diindeks Google.

### Rute publik

| Rute | Isi dan kebijakan indeks |
| --- | --- |
| `/regions` | Direktori 38 provinsi, 514 kabupaten/kota, 7.285 kecamatan, 83.762 desa/kelurahan |
| `/regions/[nama]--[kode]` | Navigasi berdasarkan kode Kemendagri dan layanan cabang di wilayah itu; `noindex,follow` jika tidak ada layanan aktif |
| `/shop/category/[slug]` | Delapan kategori makanan, kandang, aksesoris, mainan, kebersihan, perlengkapan; `noindex,follow` jika tidak ada produk |
| `/services/[slug]` | Panduan kategori ditambah daftar layanan mitra yang cocok dan tautan ke detail booking |
| `/for/[slug]` | Manfaat pet-owner, dokter-hewan, klinik-hewan, petshop, grooming, pet-hotel |
| `/free` | Akses aplikasi gratis dan program lifetime 1.000 mitra pertama; harga barang/jasa terpisah |
| `/en` | Pengantar berbahasa Inggris untuk pengguna internasional yang mencari layanan di Indonesia |
| `/sitemap-index.xml` | Indeks sitemap, maksimal 40.000 URL per bagian; hanya kategori/wilayah dengan data aktif |
| `/products-feed.xml` | RSS atribut Google Merchant Center dari produk nyata; harga IDR, stok, gambar, merek dan GTIN valid jika ada |

Data wilayah diturunkan dari migration backend `20260825100000_indonesia_regions_2025.sql`, bukan dibuat dari tebakan nama lokasi. Sumber: [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah), snapshot 13 Februari 2026, Kemendagri 2025. Ini cakupan master data, bukan pernyataan bahwa setiap daerah sudah memiliki mitra. Shard per provinsi dimuat di server sesuai kebutuhan, tidak dikirim sebagai database nasional ke browser. Jalankan `node scripts/build-seo-regions.mjs` setelah memperbarui sumber data dan tinjau perubahan jumlah/kode.

### Bank 900.000 kandidat keyword

Jalankan `node scripts/build-seo-keywords.mjs`. Hasil berada di `outputs/seo-2026-10-07/`, di luar bundle dan direktori publik. Terdapat 840.000 frasa Indonesia dan 60.000 frasa Inggris, 23 cluster, audiens B2B/B2C, intent, lokasi, kode wilayah, tujuan halaman, dan status kesiapan.

- `monthly_search_volume` sengaja kosong: belum ada ekspor Search Console / Keyword Planner untuk mengukur permintaan. Kuantitas ini bukan 900.000 keyword yang terbukti memiliki volume atau akan mendapat ranking.
- Frasa internasional adalah kandidat riset pasar; memerlukan pasokan mitra, lokalisasi, mata uang, ketentuan dan halaman yang benar sebelum ditargetkan. `/en` saat ini hanya menjelaskan Indonesia. Jangan menambahkan hreflang ke halaman yang bukan terjemahan setara.
- Desa/kelurahan dengan nama dan hierarki identik memiliki satu frasa dengan beberapa kode dipisahkan `|`; targetnya direktori induk agar pengunjung dapat memilih kode yang benar.
- Kolom `target_path` menunjukkan halaman tujuan yang relevan, bukan instruksi membuat satu halaman per keyword. Halaman noindex baru layak diindeks setelah data lokal/produk tersedia.
- Jangan menempelkan CSV ke HTML/meta keywords. Google [tidak menggunakan meta keywords untuk ranking](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag). Penggandaan halaman tanpa nilai tambahan berisiko melanggar [kebijakan spam](https://developers.google.com/search/docs/essentials/spam-policies).

Prioritas awal: query bermerek dan kebutuhan yang sudah mempunyai katalog/mitra; kategori produk; layanan lokal dengan alamat lengkap; manfaat software B2B; kemudian konten edukasi yang ditinjau pihak kompeten. Ukur impresi, klik, permintaan booking dan transaksi per cluster sebelum memperluas bahasa atau negara.

### Backend dan peluncuran

1. Deploy perubahan backend terlebih dahulu: discovery `products` dan `services` kini menerima `limit` (1–100) dan `offset`, mengembalikan `has_more`. Services juga menerima `region_code`, mengembalikan kode wilayah cabang serta menggemakan filter pada respons. Tes SQL integrasi membutuhkan database pengujian yang telah menjalankan migration.
2. Deploy web Pet Owner dengan `NEXT_PUBLIC_SITE_URL` sesuai domain utama yang benar dan `NEXT_PUBLIC_PLATFORM_API_URL` menunjuk API produksi. Pastikan domain alternatif mengalihkan 301/308 ke domain utama di konfigurasi hosting. Source saat ini memakai default `https://slivadoc.id`; jangan mengganti domain canonical tanpa memastikan domain produksi.
3. Uji produk di halaman kedua API, desa yang mempunyai mitra, desa kosong, slug tidak valid (404), canonical, Open Graph/X, robots, sitemap dan feed. Backend lama yang belum menggemakan `region_code` tidak akan dianggap memberikan hasil lokal yang sah.
4. Kirim sitemap index ke Search Console dan Bing Webmaster. Kepemilikan domain dan akses akun diperlukan. Tidak ada proses submit/claim akun yang dilakukan dari implementasi ini.
5. Di Google Merchant Center, gunakan `/products-feed.xml` sebagai sumber data terjadwal setelah verifikasi domain dan kelayakan marketplace. Lengkapi kebijakan pengiriman/retur, identitas bisnis, wilayah target dan pengaturan pajak sesuai operasi nyata. Feed hanya memuat produk dengan deskripsi, harga positif, dan URL gambar HTTP(S); jangan mengarang GTIN, ongkir, jaminan atau rating. Feed belum berarti produk disetujui Google Shopping. Ikuti [dokumentasi data produk Google](https://developers.google.com/search/docs/specialty/ecommerce/share-your-product-data-with-google).
6. Uji Rich Results Test untuk produk dan layanan nyata. JSON-LD serta metadata membantu interpretasi dan kelayakan tampilan, bukan jaminan rich result atau ranking.

Sitemap/feed mengembalikan error saat katalog gagal dimuat agar outage tidak dipublikasikan sebagai penghapusan seluruh inventori. Catalog client berhenti dan melaporkan error jika pagination tidak konsisten atau melewati 100.000 item; untuk skala di atas itu, pindahkan pembuatan sitemap/feed ke snapshot publikasi dengan cursor database. Jangan menaikkan batas tanpa mengukur memori dan latensi. Tanggal `lastmod` inventori tidak diisi dengan waktu request palsu; tambahkan timestamp perubahan sumber ketika kontrak API menyediakannya.

Klaim lifetime mengikuti materi program yang ditemukan: 1.000 mitra pertama. Portal Partners juga menawarkan akses aplikasi gratis bagi partner terdaftar. Konfirmasi cakupan program sebelum memperluas janji lifetime; halaman menjelaskan kelayakan, ketersediaan kuota yang harus dikonfirmasi, serta biaya transaksi terpisah.

### Hasil verifikasi lokal

- Build produksi `npm run build`: lulus.
- 12 tes SEO unit/HTML: lulus, termasuk pagination >100 hasil, kategori sesuai spesies, navigasi sampai Papua Barat Daya, URL tidak valid, redirect canonical, Open Graph/X, sitemap, noindex halaman kosong, XML escaping, GTIN dan respons 503 ketika katalog gagal.
- ESLint pada file SEO yang berubah: lulus.
- Tes metadata Partners: lulus.
- Tes Go unit dan integrasi discovery produk/layanan: lulus menggunakan PostgreSQL 18 sementara, 114 migration, tanpa database produksi. Pagination, kode wilayah sampai desa, status aktif, aturan publikasi dan filter kategori diuji melalui handler serta kontrak OpenAPI.
- Browser: navigasi provinsi → Kota Sorong → Maladum Mes → Tanjung Kasuari berhasil; viewport 390 px tidak overflow, canonical benar, halaman tanpa hasil `noindex, follow`, tidak ada error console.
- Validasi CSV independen: 900.000 frasa unik, nol duplikat, 91.599 kode wilayah, 23 cluster, 840.000 ID dan 60.000 EN. Ringkasan XLSX dirender dan diperiksa.
- Typecheck seluruh repository belum bersih: deklarasi `cloudflare:workers`, `Fetcher`, `D1Database` belum tersedia dan dua akses membership opsional di tes `sliva-rewards.test.ts` perlu ditangani. Tidak ada error TypeScript yang dilaporkan pada file SEO yang diubah.

Artefak lokal: `outputs/seo-2026-10-07/Slivadoc-SEO-900000.zip` dan `Slivadoc-SEO-Ringkasan.xlsx`. ZIP berisi CSV UTF-8, ringkasan, validasi, petunjuk dan lisensi sumber wilayah. Belum ada deploy produksi, submit sitemap, atau persetujuan Merchant Center dalam verifikasi ini.
