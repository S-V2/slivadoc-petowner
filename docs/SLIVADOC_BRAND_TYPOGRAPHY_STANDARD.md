# Slivadoc Brand & Typography Standard v1.0

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
| Page title / H1 | 32 px | 30 px | 26 px | 760–800 | 1.20–1.22 |
| Section title / H2 | 24 px | 22 px | 22 px | 720–780 | 1.30 |
| Card title / H3 | 18 px | 18 px | 18 px | 700–760 | 1.35–1.40 |
| Body large | 16 px | 16 px | 16 px | 450–600 | 1.60 |
| Paragraph / body | 14 px | 14 px | 15 px | 400–500 | 1.60 |
| Label / caption | 12 px | 12 px | 12 px | 600–800 | 1.45–1.50 |
| Button / control | 14 px | 14 px | 14 px | 650–800 | 1.40 |
| Input value | 14 px | 14 px | 16 px | 400–500 | 1.50 |

Input mobile wajib 16 px agar browser tidak melakukan auto-zoom. Caption tidak boleh lebih kecil dari 12 px untuk informasi yang perlu dibaca pengguna.

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

## Loading

- Full-page loading selalu memakai master mark Slivadoc, satu kalimat status, dan satu kalimat konteks singkat.
- Loading data di dalam halaman memakai compact brand loader.
- Tombol tetap memakai spinner kecil agar layout tidak bergeser.
- Animasi harus berhenti bila perangkat mengaktifkan `prefers-reduced-motion`.
