# Slivadoc Pet Owner

Aplikasi end-user Slivadoc dalam satu monorepo: web responsive dan mobile Android/iOS. UI sky-blue ini sudah terhubung ke gateway lokal untuk upload Cloudinary, lokasi OpenStreetMap, komunitas realtime, chat Socket.IO, dan SlivaCare Assistant berbasis OpenAI dengan pembatas topik kesehatan dan perawatan hewan.

## Yang tersedia

- Dashboard personal, multi-pet profile, Pet ID, health score, rekam medis, vaksin, obat, dan reminder
- Discovery klinik/grooming/pet hotel/home care, booking, activity, invoice, shop, cart, wishlist, dan membership
- Tambah pet dan upload foto ke Cloudinary
- Lokasi perangkat, pencarian alamat, reverse geocoding, dan peta OpenStreetMap
- Komunitas realtime: posting foto, like, komentar, share, grup, adopsi, serta Lost & Found
- Chat care team realtime melalui Socket.IO
- SlivaCare Assistant dengan kurasi pengetahuan pet, topic gate, Moderation API, konteks profil pet, dan emergency escalation
- Expo app untuk Android dan iOS dengan lokasi, SlivaCare, komunitas, serta upload foto
- Sliva Academy: katalog training, profil trainer, jadwal, detail, dan enrollment
- Pet Event: featured banner, detail acara, kapasitas, tiket, dan registrasi
- PetSpot: discovery cafe, mall, taman, dan lokasi pet-friendly berbasis jarak
- PetHub: live streaming, channel, feed, pet thread, reaction, komentar, share, dan composer
- SEO publik: landing page layanan, panduan, hub kota, direktori mitra, schema JSON-LD, sitemap dinamis, robots, RSS, dan IndexNow

## Persyaratan

- Node.js 22.13 atau lebih baru
- npm
- Untuk mobile: Android Studio Emulator, iOS Simulator di macOS, atau Expo Go pada HP
- Akun Cloudinary dan OpenAI API key hanya jika ingin mencoba integrasi online terkait

## 1. Menjalankan gateway API

Buka terminal pertama:

```bash
npm run api:install
cp services/petowner-api/.env.example services/petowner-api/.env
npm run api:dev
```

Gateway berjalan di `http://localhost:8090`. Cek status:

```bash
curl http://localhost:8090/health
curl http://localhost:8090/api/config/status
```

`CORS_ORIGINS` pada `services/petowner-api/.env` harus memuat origin web yang benar (tanpa trailing slash). Konfigurasi contoh sudah mencakup port development Slivadoc dan deployment Pet Owner. Pola subdomain seperti `https://*.slivadoc.id` juga didukung.

Tanpa `OPENAI_API_KEY`, SlivaCare tetap berjalan dalam mode dataset lokal. Upload foto baru aktif setelah credential Cloudinary diisi.

## 2. Menjalankan web

Buka terminal kedua:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Buka alamat lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

Fitur Sliva Academy, Pet Event, PetSpot, dan PetHub membaca data dari API utama
Slivadoc di `NEXT_PUBLIC_PLATFORM_API_URL` (default `http://localhost:8080`).

## 3. Menjalankan mobile Android/iOS

Buka terminal ketiga:

```bash
cd mobile
npm ci
npm start
```

Gunakan `npm start` (bukan `npm expo start`). Saat ada dependency baru setelah
`git pull`, perintah start akan menyinkronkan `node_modules` secara otomatis.
Untuk memulai ulang Metro sekaligus membersihkan cache, jalankan
`npm run start:clear`.

Tekan `a` untuk Android Emulator atau `i` untuk iOS Simulator. Default koneksi API sudah disesuaikan:

`npm run android` otomatis menghentikan proses Metro lama milik project mobile
ini dan membangun ulang cache sebelum membuka emulator. Ini mencegah Android
tersambung ke bundle lama ketika dependency berubah setelah `git pull`.

- Android Emulator: `http://10.0.2.2:8090`
- iOS Simulator: `http://localhost:8090`
- HP fisik dengan Expo Go: aplikasi otomatis mencoba IP LAN yang dipakai Metro untuk port `8080` dan `8090`
- Jika deteksi otomatis tidak cocok, salin `mobile/.env.example` menjadi `mobile/.env`, lalu isi IP LAN komputer, misalnya `http://192.168.1.10:8090`

Isi juga `EXPO_PUBLIC_PLATFORM_API_URL` dengan host backend utama pada port
`8080` agar Sliva World memakai data produksi yang sama dengan dashboard.

HP dan komputer harus berada di Wi-Fi yang sama. Jalankan backend pada host `0.0.0.0`, bukan hanya `127.0.0.1`, dan pastikan port `8080` serta `8090` tidak diblokir firewall. Setelah mengubah `.env`, jalankan ulang Metro dengan `npx expo start -c`.

Untuk menguji login di Expo Go, scan QR dari `npm start`, buka menu **Lainnya → Masuk ke akun**, lalu gunakan akun Pet Owner yang tersedia pada backend yang sedang dijalankan. Tarik layar dari atas untuk memuat ulang data tanpa berpindah tab. Tombol Back Android menutup popup terlebih dahulu, kembali ke halaman sebelumnya bila ada, dan mengikuti perilaku sistem saat sudah berada di Beranda.

## Setup Cloudinary

1. Buat akun/proyek Cloudinary dan buka Dashboard.
2. Salin `Cloud name`, `API key`, dan `API secret` ke `services/petowner-api/.env`.
3. Jalankan ulang gateway.
4. Buka tambah pet atau composer komunitas, pilih foto, lalu terbitkan.

```dotenv
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=slivadoc/petowner
```

`API secret` hanya dibaca oleh gateway dan tidak pernah diletakkan di web/mobile bundle. File maksimum 8 MB dan format yang diterima JPEG, PNG, atau WebP.

## Setup OpenAI untuk SlivaCare

Isi key di `services/petowner-api/.env`, jangan di `.env.local` web atau `mobile/.env`:

```dotenv
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.6-luna
```

SlivaCare menggunakan Responses API. Ini bukan fine-tuning model: gateway mengambil konteks dari `services/petowner-api/knowledge/pet-care.json`, menolak pertanyaan non-pet sebelum request ke OpenAI, menjalankan moderation, memberikan instruksi khusus pet, dan menampilkan peringatan dokter hewan untuk kondisi darurat. Dataset dapat diperluas tanpa melatih ulang model.

## Lokasi dan peta

Development memakai geolocation browser/native serta OpenStreetMap/Nominatim melalui gateway. Attribution peta ditampilkan di UI. Endpoint gateway membatasi pencarian ke Indonesia. Untuk trafik produksi, gunakan instance geocoder yang sesuai SLA/kebijakan penggunaan dan tambahkan cache, karena instance publik Nominatim bukan layanan geocoding volume tinggi.

## API lokal

| Kebutuhan | Endpoint / event |
| --- | --- |
| Health/config | `GET /health`, `GET /api/config/status` |
| Upload foto | `POST /api/uploads/images` multipart |
| Lokasi | `GET /api/location/search`, `GET /api/location/reverse` |
| SlivaCare | `POST /api/assistant/chat` |
| Komunitas | `GET/POST /api/community/posts`, like, comments |
| Realtime komunitas | `community:join`, `community:new-post`, `community:update` |
| Realtime chat | `chat:join`, `chat:history`, `chat:send`, `chat:message` |
| Sliva Academy | `GET /api/v1/public/academy/programs`, `POST /api/v1/academy/enrollments` |
| Pet Event | `GET /api/v1/public/events`, `POST /api/v1/events/{eventID}/registrations` |
| PetSpot | `GET /api/v1/public/petspots` dengan koordinat opsional |
| PetHub | public feed/streams, create thread, dan reaction di `/api/v1/pethub/*` |

Gateway menyimpan posting komunitas lama dan chat ke file JSON lokal untuk development. Modul Sliva World sudah terhubung ke `slivadoc-backend`, PostgreSQL, dan bearer session Slivadoc; UI menyediakan fallback lokal agar tetap dapat dipreview ketika backend belum dinyalakan.

## Validasi

```bash
npm run api:test
npm run lint
npm run build
npm test
npm run test:responsive
cd mobile && npm run typecheck
```

Sebelum menjalankan pemeriksaan responsive untuk pertama kali, pasang Chromium
Playwright dengan `npx playwright install chromium`.

Setup verifikasi mesin pencari, environment produksi, standar profil cabang, dan KPI dijelaskan di [`docs/SEO-OPERATIONS.md`](docs/SEO-OPERATIONS.md).

## Struktur

```text
app/                        web Pet Owner
mobile/                     Expo Android/iOS
services/petowner-api/      Express + Socket.IO integration gateway
  knowledge/pet-care.json   curated pet-care knowledge
public/                     web assets
```
