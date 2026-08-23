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

Tanpa `OPENAI_API_KEY`, SlivaCare tetap berjalan dalam mode dataset lokal. Upload foto baru aktif setelah credential Cloudinary diisi.

## 2. Menjalankan web

Buka terminal kedua:

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Buka alamat lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

## 3. Menjalankan mobile Android/iOS

Buka terminal ketiga:

```bash
cd mobile
npm ci
npm start
```

Tekan `a` untuk Android Emulator atau `i` untuk iOS Simulator. Default koneksi API sudah disesuaikan:

- Android Emulator: `http://10.0.2.2:8090`
- iOS Simulator: `http://localhost:8090`
- HP fisik: salin `mobile/.env.example` menjadi `mobile/.env`, lalu ganti dengan IP LAN komputer, misalnya `http://192.168.1.10:8090`

HP dan komputer harus berada di Wi-Fi yang sama. Pastikan port `8090` tidak diblokir firewall.

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

Gateway saat ini menyimpan posting dan chat ke file JSON lokal di `services/petowner-api/data/`. Ini cocok untuk development/demo. Tahap produksi berikutnya adalah memindahkan route ke `slivadoc-backend`, memakai PostgreSQL, auth bearer Slivadoc, signed user identity, object moderation, push notification, dan horizontal scaling Socket.IO dengan Redis adapter.

## Validasi

```bash
npm run api:test
npm run lint
npm run build
npm test
cd mobile && npm run typecheck
```

## Struktur

```text
app/                        web Pet Owner
mobile/                     Expo Android/iOS
services/petowner-api/      Express + Socket.IO integration gateway
  knowledge/pet-care.json   curated pet-care knowledge
public/                     web assets
```
