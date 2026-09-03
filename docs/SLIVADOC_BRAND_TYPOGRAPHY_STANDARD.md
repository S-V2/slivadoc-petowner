# Slivadoc Brand & Typography Standard v1.1

Dokumen ini menjadi acuan bersama untuk dashboard multi-role, Pet Owner web, dan aplikasi mobile Slivadoc.

## Logo

- Master mark: `public/brand/slivadoc-logo.png`.
- Logo tidak boleh digambar ulang, diubah proporsinya, diputar, atau diubah warnanya.
- Clear space minimum: 25% dari lebar mark pada seluruh sisi.
- Ukuran minimum mark: 32 px di web dan 28 pt di mobile native.
- Sidebar/header memakai mark + wordmark. Loading, favicon, app icon, dan splash boleh memakai mark saja.
- Background utama: putih, `#F4FAFE`, atau biru Slivadoc dengan kontras yang tetap terbaca.

## Skala tipografi web

| Peran teks | Desktop ≥ 1025 px | Tablet 681–1024 px | Mobile ≤ 680 px | Weight | Line height |
|---|---:|---:|---:|---:|---:|
| Page title / H1 | 32 px | 30 px | 24 px | 760–800 | 1.20–1.22 |
| Feature hero title | 28–36 px | 26–30 px | 22 px | 720–800 | 1.20–1.24 |
| Section title / H2 | 24 px | 22 px | 20 px | 720–780 | 1.30 |
| Card title / H3 | 18 px | 18 px | 16 px | 700–760 | 1.35–1.40 |
| Body large | 16 px | 16 px | 15 px | 450–600 | 1.55–1.60 |
| Paragraph / body | 14 px | 14 px | 14 px | 400–500 | 1.55–1.60 |
| Label / caption | 12 px | 12 px | 11–12 px | 600–800 | 1.45–1.50 |
| Button / control | 14 px | 14 px | 14 px | 650–800 | 1.40 |
| Chip / compact control | 13 px | 13 px | 13 px | 650–800 | 1.40 |
| Input value | 14 px | 14 px | 16 px | 400–500 | 1.50 |

Input teks mobile wajib 16 px agar browser tidak melakukan auto-zoom. Caption 11 px hanya untuk metadata sekunder; informasi penting, status, harga, dan bantuan form wajib minimal 12 px.

### Token implementasi responsive web

| Token CSS | Nilai mobile | Penggunaan |
|---|---:|---|
| `--type-page-title` | 24 px | Judul utama satu kali per layar |
| `--type-section-title` | 20 px | Section, sheet, drawer, dan modal |
| `--type-card-title` | 16 px | Judul kartu/list item |
| `--type-body-large` | 15 px | Intro singkat yang perlu penekanan |
| `--type-body` | 14 px | Paragraf dan isi utama |
| `--type-caption` | 11 px | Metadata sekunder |
| `--type-control` | 14 px | Tombol dan dropdown standar |
| `--type-compact-control` | 13 px | Chip, tab, dan filter |

Token mobile web ditetapkan di `app/mobile-typography.css`. Jangan menambahkan ukuran font mobile per halaman bila salah satu token di atas sudah mewakili peran teksnya.

## Skala aplikasi mobile native

| Token | Ukuran |
|---|---:|
| Display | 32 pt |
| Screen title | 28 pt |
| Section title | 22 pt |
| Card title | 18 pt |
| Body large | 16 pt |
| Body / control | 15 pt |
| Label | 13 pt |
| Caption | 12 pt |
| Input | 16 pt |

Token native tersedia di `mobile/src/theme.ts` dan harus digunakan oleh komponen baru.

## Presisi dan keterbacaan

- Judul memakai tracking `-0.025em`; body memakai tracking normal.
- Panjang paragraf ideal 45–72 karakter per baris di desktop dan 28–45 karakter di mobile.
- Gunakan sentence case. Huruf kapital penuh hanya untuk eyebrow/status singkat.
- Nilai angka dan uang harus memakai angka tabular agar kolom sejajar.
- Judul memakai balanced wrapping; paragraf memakai pretty wrapping dan tidak boleh terpotong tanpa affordance untuk membuka detail.
- Satu halaman hanya memiliki satu H1. Hirarki setelahnya harus H2 lalu H3.
- Gunakan ukuran font untuk peran teks, bukan untuk mengejar tinggi komponen. Tinggi tombol dan input diatur melalui `min-height` dan `padding`.
- Target sentuh tombol, tab, input, dan icon button minimal 44 × 44 px walaupun ukuran teksnya 13–14 px.
- Hero mobile maksimal 22 px dan tidak boleh mengambil lebih dari sekitar 40% tinggi layar sebelum konten utama mulai terlihat.
- Filter horizontal boleh digulir, tetapi kontrol sort atau ringkasan hasil tidak boleh membuat teks terjepit menjadi satu kata per baris.

## Checklist responsive mobile

Perubahan UI dianggap siap bila sudah diperiksa pada lebar 320, 360, 375, 390, dan 430 px:

- Tidak ada horizontal scroll pada header, konten halaman, modal, drawer, atau bottom sheet.
- H1, hero title, H2, dan H3 mengikuti skala di atas dan tidak memakai nilai mobile khusus yang lebih besar.
- Body utama 14 px; metadata 11–12 px; chip 13 px; tombol 14 px; input teks 16 px.
- Teks tidak bertabrakan, terpotong tanpa affordance, atau terjepit oleh elemen di sampingnya.
- Tombol dan input tetap memiliki target sentuh minimal 44 px.
- Bottom navigation tetap satu baris, label terbaca, dan menghormati safe-area perangkat.
- Layout tetap rapi saat text zoom 125% dan orientasi portrait.

## Loading

- Full-page loading selalu memakai master mark Slivadoc, satu kalimat status, dan satu kalimat konteks singkat.
- Loading data di dalam halaman memakai compact brand loader.
- Tombol tetap memakai spinner kecil agar layout tidak bergeser.
- Animasi harus berhenti bila perangkat mengaktifkan `prefers-reduced-motion`.
