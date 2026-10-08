# Play Console — Data Safety Worksheet (Slivadoc Pet Owner)

Draft jawaban form **App content → Data safety** di Play Console. Sumber kebenaran:
kebijakan di `https://slivadoc.com/privasi` (kode: `app/privasi/page.tsx`). Kalau kebijakan
berubah, worksheet ini dan form Play Console WAJIB ikut berubah.

- Package: `com.slivadoc.petowner`
- Privacy policy URL: `https://slivadoc.com/privasi`
- Account deletion URL: `https://slivadoc.com/hapus-akun`

## Ringkasan deklarasi

**Apakah app mengumpulkan atau membagikan data?** Ya.

| Atribut | Jawaban |
|---|---|
| Semua data dikumpulkan diproses secara aman (enkripsi transit) | Ya |
| Data dapat dihapus oleh user atas permintaan | Ya — in-app (Profil → Hapus akun) dan web (`/hapus-akun`) |
| Pengumpulan data bersifat opsional | Sebagian — lokasi & kamera opsional (izin perangkat); akun & transaksi wajib untuk layanan |

## Detail per kategori

Format: **Dikumpulkan** = data about the user collected by app+server kami sendiri;
**Dibagikan** = diteruskan ke pihak ketiga (lihat tabel pihak ketiga di kebijakan).
Tujuan yang valid di form: App functionality, Account management, Analytics, Developer
diagnostics, Fraud prevention, Security, Personalization.

| Kategori Play | Contoh data | Dikumpulkan | Dibagikan | Tujuan | Retensi | Bisa dihapus |
|---|---|---|---|---|---|---|
| Personal info → Name | nama lengkap | Ya | Ya (Lion Parcel, saat user pesan pengiriman) | App functionality | Sampai akun dihapus | Ya |
| Personal info → Email address | email akun | Ya | Ya (Resend untuk OTP; Lion Parcel untuk pengiriman) | Account management, Security | Sampai akun dihapus | Ya |
| Personal info → Phone number | no. HP | Ya | Ya (Lion Parcel saat pengiriman) | App functionality | Sampai akun dihapus | Ya |
| Personal info → User IDs | user id akun | Ya | Ya (OpenAI menerima hash id untuk asisten AI) | App functionality | Sampai akun dihapus | Ya |
| Personal info → Address | alamat pengiriman, kode pos, koordinat | Ya | Ya (Lion Parcel saat pengiriman) | App functionality | Sampai akun dihapus | Ya |
| Personal info → Other info | profil hewan (nama, spesies, tanggal lahir, berat, microchip, alergi, catatan medis) | Ya | Sebagian (OpenAI menerima profil hewan yang user kirim ke asisten AI) | App functionality | Sampai akun dihapus | Ya |
| Photos and videos → Photos | foto unggahan (profil, hewan, dokumen) | Ya | Ya (Cloudinary penyimpanan media) | App functionality | Sampai akun dihapus | Ya |
| Messages → In-app messages | chat user (dengan mitra/care team) | Ya | Tidak | App functionality | Sampai akun dihapus | Ya |
| Location → Precise location | koordinat presisi (fitur sekitar, alamat pengiriman) | Ya | Ya (Photon untuk geocoding; Lion Parcel untuk pengiriman) | App functionality | Sampai akun dihapus | Ya |
| Location → Coarse location | lokasi kasar | Ya | Ya (Photon untuk geocoding) | App functionality | Sampai akun dihapus | Ya |
| Financial info → Purchase history | riwayat booking, pesanan, pembayaran (nominal + status) | Ya | Ya (Yokke memproses QRIS: nominal + referensi) | App functionality | ±5 tahun teranonim (kewajiban hukum) | Tidak (retensi hukum, teranonim) |
| App activity → User content | postingan/komentar komunitas, laporan hewan hilang, ulasan, tiket bantuan | Ya | Tidak | App functionality | Sampai akun dihapus | Ya |
| App activity → App interactions | booking, pencarian, interaksi fitur (log audit) | Ya | Tidak | Security, Fraud prevention | ~90 hari (log teknis) | Ya |
| Device or other IDs | alamat IP, user agent, sesi login, OTP | Ya | Tidak | Security | ~90 hari (OTP 7 hari, sesi 30 hari) | Ya |

### Catatan penting saat mengisi form

1. **Financial info**: klaim hanya *Purchase history*. **Jangan** centang *Payment info* /
   *Credit card / bank account* — Yokke memproses QRIS tanpa data kartu/rekening ke server
   kami (bukti: `internal/modules/operations/yokke.go`, payload hanya merchant/terminal/
   amount/partnerRef).
2. **Bukan data user (jangan diklaim)**: data hewan peliharaan bukan "Health info" manusia.
   Masukkannya sebagai *Other info* (baris profil hewan di atas). Kalau reviewer meminta
   lebih konservatif, pindahkan ke *Health info* — konsekuensinya label data sensitif.
3. **Tidak ada SDK analytics/ads/crash di APK** (dicek: `mobile/package.json`, Expo managed
   build). Jika nanti menambah SDK (Firebase Analytics, Sentry, AdMob, dll), deklarasi
   WAJIB diperbarui dan kebijakan ikut.
4. **Data children**: app tidak ditujukan untuk anak <13 tahun. Di bagian *Target audience*
   jangan centang "designed for families / children".
5. **Data publik** (laporan hewan hilang, komunitas) bukan "shared with third parties" di
   form Data Safety (itu konten yang user pilih untuk publikasikan), tapi tetap dijelaskan
   di kebijakan (sudah ada).
6. **Hash ≠ anonim untuk Play**: pengenal user yang dikirim ke OpenAI tetap dihitung
   *User IDs shared*. Jangan centang "not shared" untuk User IDs.
7. **Location**: centang *Precise* karena alamat pengiriman menyimpan lat/lng dan Lion
   Parcel menerima koordinat.

## Jawaban "Data deletion"

- **In-app deletion**: Ya — Profil → Pengaturan akun → Hapus akun (konfirmasi OTP,
  masa tenggang 14 hari).
- **Web deletion**: `https://slivadoc.com/hapus-akun` (form email + OTP).
- Keduanya wajib tampil di Play Console → App content → Data safety → Data deletion.

## Perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-10-08 | Worksheet pertama, disusun bersamaan dengan revisi kebijakan privasi untuk rilis APK. |
