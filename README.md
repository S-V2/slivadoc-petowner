# Slivadoc Pet Owner

Prototype UI lintas platform untuk sisi end user/pet owner Slivadoc. Repository ini terpisah dari dashboard operasional `slivadoc-frontend` dan backend `slivadoc-backend`.

## Platform

- Web responsive: Next.js-compatible React 19 + Vinext + TypeScript
- Mobile Android/iOS: Expo SDK 54 + React Native 0.81 + TypeScript
- Data: dummy lokal, disusun dengan identifier yang siap dipetakan ke API
- Branding: sky blue, white, navy, mint, dan aksen violet

## Fitur UI

- Beranda personal per hewan dan health score
- Multi-pet profile, Pet ID, microchip, akses keluarga, dan Lost Pet Mode
- Pencarian klinik, grooming, pet shop, pet hotel, serta home care
- Booking tiga langkah dan konfirmasi pembayaran dummy
- Aktivitas booking, konsultasi, pengiriman, riwayat, dan invoice
- Rekam medis, vaksin, laboratorium, obat, pengingat, dan dokumen
- Chat/video consultation dengan SlivaCare
- Pet shop, wishlist, keranjang, voucher, checkout, dan auto-repeat
- Membership SlivaCare+, SlivaPay, Sliva Points, dan metode pembayaran
- Komunitas, grup, adopsi terverifikasi, serta Lost & Found
- Notifikasi, emergency 24/7, keamanan, privasi, dan profil pet parent

## Menjalankan web

```bash
npm ci
npm run dev
```

Validasi web:

```bash
npm run lint
npm run build
```

## Menjalankan aplikasi mobile

```bash
cd mobile
npm ci
npx expo start
```

Kemudian tekan `a` untuk Android Emulator atau `i` untuk iOS Simulator. Expo SDK 54 dipilih agar prototype mudah dibuka melalui Expo Go yang tersedia di App Store/Play Store.

Validasi mobile:

```bash
cd mobile
npm run typecheck
```

Konfigurasi identitas aplikasi berada di `mobile/app.json`:

- iOS bundle ID: `com.slivadoc.petowner`
- Android application ID: `com.slivadoc.petowner`
- Deep-link scheme: `slivadoc://`
- API base URL dummy: `http://localhost:8080`

## Kontrak data yang disiapkan

Data UI sengaja memakai konsep yang konsisten dengan ekosistem Slivadoc: `customer_id`, `pet_id`, `service_id`, `branch_id`, `booking_id`, `home_service_id`, `session_id`, `access_token`, dan `refresh_token`. Seluruh aksi saat ini masih berupa state lokal/toast dan belum mengirim request jaringan.

## Struktur utama

```text
app/
  components/       Web app, icon set, drawer, dan modal
  data/             Mock data web
mobile/
  App.tsx           Shell, bottom navigation, modal booking/chat/notifikasi
  src/components/   Shared native UI
  src/screens/      Home, Discover, Activity, Health, Profile
  src/data.ts       Mock data mobile
  assets/           Hero, app icon, splash, adaptive icon
public/             Aset web
```

UI ini adalah prototype dummy untuk iterasi desain. Tahap berikutnya adalah memecah kontrak API end-user, menambahkan autentikasi pet owner, persistence, push notification, maps/location, payment, serta mengintegrasikan backend Slivadoc.
