# Slivadoc Brand & Typography Standard v2.0

Dokumen ini menjadi acuan bersama untuk dashboard multi-role, Pet Owner web, dan aplikasi mobile Slivadoc. Seluruh token desain web kini diselaraskan 1:1 dengan tema mobile React Native (`mobile/src/theme.ts`) sebagai single source of truth.

## 1. Source of Truth & Filosofi Desain

- **Single Source of Truth**: Tema React Native di `mobile/src/theme.ts` adalah acuan absolut untuk token warna, tipografi, spacing, radius, dan shadow.
- **Skala Lama Dipensiunkan (Retired)**: Skala web lama (H1 32/30/24 px, body 14 px, caption 11–12 px, sky `#159de8`, mint `#22b99a`) telah resmi dipensiunkan.
- **Unified Scale**: Web dan native berbagi skala tipografi dan token warna yang sama persis (px = pt). Tidak ada lagi skala terpisah yang lebih besar untuk web desktop.
- **Font Family**: **Inter bukan typeface produk Slivadoc**. Produk menggunakan font sistem (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `Helvetica Neue`, `sans-serif`) agar selaras dengan tipografi native iOS (San Francisco) dan Android (Roboto).

## 2. Logo

- **Master mark**: `public/brand/slivadoc-logo.png`.
- **Integritas mark**: Logo tidak boleh digambar ulang (*no redraw*), diubah proporsinya, diputar, atau diubah warnanya.
- **Clear space minimum**: 25% dari lebar mark pada seluruh sisi.
- **Ukuran minimum mark**: 32 px di web dan 28 pt di mobile native.
- **Penerapan**: Sidebar dan header memakai kombinasi mark + wordmark. Loading, favicon, app icon, dan splash boleh memakai mark saja.
- **Latar belakang**: Background utama memakai canvas `#F6FBFF`, putih `#FFFFFF`, atau aksen Slivadoc navy/sky dengan kontras yang terjamin keterbacaannya.

## 3. Token Native (`mobile/src/theme.ts`)

### Warna (Colors)
```
canvas:    #F6FBFF
white:     #FFFFFF
navy:      #153B5B
text:      #2E4A62
muted:     #5F7486
line:      #E2EEF5
sky50:     #EBF8FF
sky100:    #D8F1FF
sky400:    #55C4FA
sky500:    #19A7F2
sky600:    #05689F
mint:      #08725F
mint50:    #E8FAF5
violet:    #5B48B5
violet50:  #F1EEFF
red:       #B5344E
red50:     #FFF0F4
yellow:    #8B5A00
yellow50:  #FFF7DE
peach50:   #FFF1E9
pink50:    #FFF0F7
```

### Tipografi (Typography: px = pt)
```
display:      24
screenTitle:  22
sectionTitle: 17
cardTitle:    15
bodyLarge:    14
body:         13
control:      13
label:        12
caption:      10
input:        14
```

### Spacing
```
xs:  4
sm:  8
md: 12
lg: 16
xl: 20
```

### Radius
```
sm:   12
md:   16
lg:   22
pill: 999
```

### Shadow
```
shadowColor:   #2879A7
shadowOpacity: 0.065 (6.5%)
shadowRadius:  16
shadowOffset:  { width: 0, height: 6 } (r16 y6)
elevation:     2
```

## 4. Skala Tipografi Terpadu (Unified Type Scale)

Web dan mobile native berbagi skala tipografi yang sama persis (1 pt native = 1 px web). Tidak ada skala terpisah yang diperbesar untuk layar desktop.

| Peran Teks | Native (pt) | Web (px) | CSS Variable | Weight | Line Height | Penggunaan |
|---|---:|---:|---|---:|---:|---|
| Display | 24 pt | 24 px | `--type-display` | 760–800 | 1.20–1.24 | Hero display, banner visual, milestone besar |
| Page / Screen title (H1) | 22 pt | 22 px | `--type-page-title` | 760–800 | 1.20–1.22 | Judul halaman utama, satu kali per layar |
| Section title (H2) | 17 pt | 17 px | `--type-section-title` | 700–780 | 1.30 | Section, header modal, drawer, bottom sheet |
| Card title (H3) | 15 pt | 15 px | `--type-card-title` | 650–760 | 1.35 | Judul kartu, header panel, item list utama |
| Body large | 14 pt | 14 px | `--type-body-large` | 450–600 | 1.50–1.55 | Teks pengantar (lead), intro singkat berpenekanan |
| Paragraph / body | 13 pt | 13 px | `--type-body` | 400–500 | 1.50–1.55 | Paragraf reguler, deskripsi utama, teks tabel |
| Button / control | 13 pt | 13 px | `--type-control` | 650–800 | 1.40 | Tombol standar (`.primary-button`, `.secondary-button`), dropdown |
| Compact control | 13 pt | 13 px | `--type-compact-control` | 650–800 | 1.40 | Chip, tab bar, filter pill |
| Label | 12 pt | 12 px | `--type-label` | 600–700 | 1.40–1.45 | Label input form, eyebrow, status badge |
| Caption | 10 pt | 10 px | `--type-caption` | 400–600 | 1.40 | Metadata sekunder, timestamp, caption |
| Input value | 14 pt | 14 px* | `--type-input` | 400–500 | 1.45–1.50 | Value textfield (*Pengecualian web: 16 px pada mobile) |

### Pengecualian Khusus Web (Web-Only Exception)
- **Input teks & textarea pada mobile**: Pada lebar mobile (viewport ≤ 680 px / ≤ 860 px), elemen `<input>` dan `<textarea>` wajib berukuran **16 px** untuk mencegah browser iOS Safari melakukan auto-zoom saat fokus.
- **Tombol tetap 13 px**: Ukuran font tombol (`.primary-button`, `.secondary-button`, submit/action) tetap **13 px** di semua breakpoint dan tidak diperbesar menjadi 16 px.
- **Caption 10 px diizinkan**: Nilai caption 10 px diizinkan untuk metadata sekunder, timestamp, dan teks bantuan form.

## 5. Pemetaan Token CSS Web

Token CSS global didefinisikan di `app/globals.css` dan dikunci untuk mobile di `app/mobile-responsive.css`:

### Tipografi
```css
:root {
  --type-page-title: 22px;
  --type-section-title: 17px;
  --type-card-title: 15px;
  --type-body-large: 14px;
  --type-body: 13px;
  --type-caption: 10px;
  --type-control: 13px;
  --type-compact-control: 13px;
}
```

### Warna Utama
```css
:root {
  --canvas: #F6FBFF;
  --navy: #153B5B;
  --sky-500: #19A7F2;
  --sky-600: #05689F;
  --mint: #08725F;
}
```

## 6. Presisi, Hierarki, dan Keterbacaan

- **Tracking**: Judul memakai tracking `-0.025em`; teks body memakai tracking normal.
- **Wrapping**: Judul memakai `text-wrap: balance`; paragraf memakai `text-wrap: pretty` dan tidak boleh terpotong tanpa affordance.
- **Panjang Baris**: Ideal 45–72 karakter per baris di desktop dan 28–45 karakter di mobile.
- **Kapitalisasi**: Gunakan sentence case secara konsisten. Huruf kapital penuh (*all-caps*) hanya untuk eyebrow atau status tag singkat.
- **Angka & Moneter**: Nilai angka, kuantitas, dan nominal uang harus memakai angka tabular (`font-variant-numeric: tabular-nums`) agar kolom sejajar rapi.
- **Hierarki Heading**: Tepat satu H1 per halaman (`--type-page-title: 22px`). Struktur di bawahnya bertingkat secara tertib: H2 (`--type-section-title: 17px`), lalu H3 (`--type-card-title: 15px`).
- **Dimensi Komponen**: Gunakan ukuran font untuk peran teks, bukan untuk mengejar tinggi fisik komponen. Tinggi tombol dan input diatur melalui `min-height` dan `padding`.
- **Target Sentuh**: Target sentuh tombol, tab, input, dan icon button minimal **44 × 44 px** meskipun ukuran font-nya 13–14 px.
- **Hero Banner**: Judul hero maksimal 24 px (display) / 22 px (page title) dan tidak boleh mengambil lebih dari ~40% tinggi layar mobile sebelum konten utama mulai terlihat.
- **Filter Horizontal**: Rail filter boleh di-scroll horizontal, namun teks sort dan ringkasan tidak boleh membuat teks terjepit menjadi satu kata per baris.

## 7. Loading dan Animasi

- **Full-page loading**: Selalu memakai master mark Slivadoc (`<BrandLogo markOnly priority />`), satu kalimat status ("Menyiapkan Slivadoc"), dan satu kalimat konteks singkat.
- **In-page loading**: Menampilkan compact brand loader untuk pemuatan data parsial di dalam halaman.
- **Tombol**: Memakai spinner kecil terintegrasi agar ukuran dan layout tombol tidak bergeser saat state loading aktif.
- **Reduced motion**: Seluruh animasi harus dinonaktifkan atau berhenti seketika bila sistem operasi atau browser mengaktifkan `prefers-reduced-motion`.

## 8. Checklist Responsif Mobile

Setiap perubahan UI wajib diuji dan lulus pada lebar **320, 375, 414, dan 768 px**:

1. **Bebas Horizontal Scroll**: Tidak ada scroll horizontal yang tidak disengaja pada header, konten halaman, modal, drawer, maupun bottom sheet pada lebar 320, 375, 414, dan 768 px.
2. **Kesesuaian Skala Tipografi**: Judul H1 (22 px), H2 (17 px), H3 (15 px), dan body (13 px) mematuhi skala terpadu; tidak ada ukuran mobile terpisah yang lebih besar dari skala native.
3. **Pengecualian Input**: Input teks dan textarea pada mobile menggunakan 16 px (mencegah auto-zoom iOS Safari), sementara tombol tetap 13 px dan caption 10 px diizinkan.
4. **Target Sentuh 44×44 px**: Tombol, icon button, tab, dan kontrol form memenuhi target sentuh minimum 44 × 44 px.
5. **Kerapian Teks**: Teks tidak bertabrakan, tidak terpotong tanpa elipsis/affordance, dan tidak terjepit elemen di sekitarnya.
6. **Bottom Navigation**: Tetap satu baris, label terbaca jelas, icon proporsional, dan menghormati `safe-area-inset-bottom` perangkat.
7. **Floating & Fixed Controls**: Kontrol fixed/floating tidak menutupi aksi penting atau mencuri klik dari elemen di bawahnya.
8. **Pengujian Terotomatisasi**: Menjalankan `npm run test:responsive` untuk memvalidasi kontrak layout responsif di Chromium.
9. **Aksesibilitas Zoom**: Tampilan tetap utuh, rapi, dan dapat digunakan pada text zoom 125% dalam orientasi portrait.
