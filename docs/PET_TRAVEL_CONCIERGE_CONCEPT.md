# Slivadoc Pet Journey — konsep concierge perjalanan pet

Tanggal: 6 Oktober 2026. Status: rancangan produk; belum merupakan layanan travel yang aktif.

Slivadoc menjadi satu pintu koordinasi perjalanan pet: kesiapan kesehatan, dokumen, transportasi, pengurusan karantina bila diwajibkan, dan serah terima. Pengguna memiliki satu nomor perjalanan, satu pendamping, checklist personal, penawaran terperinci, dan pelacakan tahap. Dokter, operator transportasi, serta otoritas tetap mengambil keputusan sesuai kewenangannya; pembayaran bukan jaminan izin atau keberangkatan.

## Ruang lingkup dan paket

| Paket | Kebutuhan | Hasil layanan |
| --- | --- | --- |
| Document Assist | Hanya pengurusan dokumen | Pemeriksaan berkas, koordinasi pemeriksaan pet, pengajuan kepada pihak berwenang, arsip hasil |
| Domestic Journey | Perjalanan dalam negeri / antarpulau | Dokumen sesuai rute, koordinasi pesawat/kapal/darat, pickup–dropoff opsional |
| International Move | Ekspor, impor atau relokasi internasional | Pemeriksaan aturan negara asal, tujuan dan transit; perizinan; carrier; mitra tujuan |
| Quarantine Care | Pendampingan proses karantina bila diwajibkan | Jadwal, fasilitas berwenang, pembaruan kondisi dan bukti penyelesaian |
| Assisted Transfer | Serah terima tanpa pemilik ikut | Identitas penerima, chain of custody, bukti kondisi dan penerimaan |

Paket dibentuk dari layanan yang benar-benar tersedia dan mitra terverifikasi. Jangan menampilkan carrier, lokasi, harga atau kapasitas sebagai tersedia sebelum dikonfirmasi. Ketersediaan kabin, bagasi atau cargo bukan asumsi dari pilihan “pesawat”. Untuk kapal, kebijakan operator dan pelabuhan juga harus diverifikasi.

## UX pet owner: travel passport, bukan formulir panjang

Beranda Pet Documents mempunyai dua pintu: **Urus dokumen** untuk kebutuhan tunggal dan **Rencanakan perjalanan** untuk layanan concierge. Tampilan sky blue dengan “travel passport” milik pet; ilustrasi secukupnya, informasi kesehatan dan keputusan tetap jelas.

1. **Pilih pet** dari koleksi. Tampilkan identitas, foto, umur, microchip bila tercatat, dan status data kesehatan; jangan menganggap semua data telah diverifikasi.
2. **Rute & tujuan**: asal, tujuan, transit, tanggal fleksibel/pasti, transportasi yang diinginkan, pemilik ikut/tidak, tujuan perjalanan, serta kontak penerima privat.
3. **Cek kesiapan**: checklist spesifik rute dengan status belum diisi / perlu tindakan / menunggu pemeriksaan / terverifikasi / kedaluwarsa. Jelaskan sumber aturan dan tanggal verifikasi.
4. **Pilih bantuan**: dokumen saja atau concierge, kebutuhan crate, pickup, boarding, pendampingan karantina, dan dukungan kedatangan. Fasilitas/policy tampil sebagai grid ringkas.
5. **Review oleh pendamping**: pengguna melihat estimasi awal, bukan harga final yang dibuat-buat. Ada penanggung jawab, target respons yang dikonfigurasi, dan pertanyaan yang masih terbuka.
6. **Penawaran final**: rincian jasa Slivadoc, biaya dokter/lab, biaya resmi pemerintah, carrier, mitra darat, boarding, asuransi bila tersedia, pajak, diskon dan syarat pembatalan. Semua nominal serta masa berlaku tersimpan sebagai snapshot versi penawaran.
7. **Setujui & bayar QRIS**: hanya metode aktif API. Pembayaran mengikuti tahap yang disepakati, bukan seluruh biaya tanpa konfirmasi kelayakan. QRIS memiliki status menunggu, kedaluwarsa, terkonfirmasi atau gagal; tombol “sudah bayar” tidak menandai paid secara sepihak.
8. **Journey timeline**: checklist dokumen, janji dokter, pemesanan carrier, proses otoritas/karantina, pickup, perjalanan, kedatangan dan serah terima. Tampilkan bukti serta waktu pembaruan untuk setiap tahap.
9. **Arrival pack**: dokumen hasil, bukti penerimaan pet, invoice, bukti pembayaran, instruksi perawatan dan follow-up. Review hanya tersedia setelah perjalanan selesai.

Di mobile, langkah dibagi panel pendek dengan ringkasan tetap, tombol kembali, draft tersimpan dan validasi per langkah. Detail memiliki tinggi terbatas dan scroll internal; halaman latar tidak bergerak. Di web, checklist di kiri dan ringkasan perjalanan di kanan. Loading, kesalahan, kapasitas tidak tersedia, dan revisi dokumen memiliki tampilan eksplisit.

## Aturan perjalanan dan keselamatan

Checklist bukan daftar universal yang selalu wajib. Aturan dipilih berdasarkan spesies, umur, kondisi kesehatan, asal/tujuan/transit, tanggal, cara angkut, pemilik ikut/tidak, dan carrier. Versi aturan menyimpan URL resmi, reviewer, tanggal pemeriksaan, masa berlaku dan alasan perubahan.

Peraturan Badan Karantina Indonesia Nomor 5 Tahun 2024 mengatur, antara lain, pemeriksaan persyaratan serta pelaporan melalui tempat yang ditetapkan dalam konteks barang bawaan. Konteks tersebut tidak boleh disamakan otomatis dengan semua pengiriman cargo. Implementasi setiap rute perlu pemeriksaan aturan yang tepat oleh tim operasional. [Peraturan resmi Badan Karantina Indonesia](https://jdih.karantinaindonesia.go.id/repository/barantin-jdih/common/dokumen/Perba5Tahun2024.pdf).

Garuda Cargo menyatakan pengiriman hewan memerlukan dokumen, kemasan sesuai standar dan proses karantina oleh instansi resmi. Karena itu, Slivadoc mengoordinasikan persiapan dan pihak berwenang, bukan menerbitkan persetujuan karantina sendiri. [Garuda Cargo — Live Animals](https://cargo.garuda-indonesia.com/Live-Animals).

Sebagai contoh rute yang melibatkan Amerika Serikat, APHIS menekankan persyaratan negara tujuan dan carrier perlu diverifikasi kembali setiap perjalanan. Panduan APHIS bukan aturan universal untuk perjalanan dari Indonesia. [USDA APHIS — Pet Travel Process Overview](https://www.aphis.usda.gov/pet-travel/pet-travel-process-overview).

Tidak ada janji “pasti berangkat”, “karantina selalu X hari”, ataupun harga resmi global. Dokter menilai kelayakan kesehatan; otoritas menentukan kewajiban/proses resmi; carrier menyetujui pengangkutan. Bila aturan atau kondisi pet berubah, sistem menghentikan tahap terkait, meminta review dan menyajikan opsi penjadwalan ulang/refund sesuai kontrak.

## Operasional, marketplace dan finance: satu sumber transaksi

```text
Pet owner → Journey request → Review operasional → Quote version → Persetujuan
                                                               ↓
                                                        Pembayaran QRIS
                                                               ↓
                                                Callback provider terverifikasi
                                                               ↓
                           Payment record + event idempotent + audit trail
                               ↙                  ↓                    ↘
                   Antrean operasional     Work order mitra       Rekonsiliasi finance
                               ↓                  ↓                    ↓
                         Checklist & bukti   Pelaksanaan jasa     Refund / payout / jurnal
                               ↘                  ↙
                                Serah terima pet
```

Tidak semua mitra membutuhkan akses penuh ke pet passport. Marketplace menampilkan layanan yang tersedia; setelah pesanan disetujui, dashboard mitra menerima work order hanya untuk tugasnya. Tim internal marketplace memantau kualitas mitra, penawaran dan SLA. Finance membaca payment/source ID yang sama dengan operasional—bukan membuat baris pendapatan baru dari setiap refresh dashboard.

| Dashboard | Informasi dan tindakan |
| --- | --- |
| Operasional | Antrean per tahap/rute, PIC, pet, checklist, missing documents, deadline, carrier hold/confirmed, revisi, insiden, serah terima |
| Mitra klinik/lab | Work order pemeriksaan, slot terkonfirmasi, pet yang ditugaskan, hasil dan verifikasi berkas |
| Mitra transportasi/boarding | Pickup, crate, jadwal, kapasitas, kondisi pet, bukti handover, pengecualian |
| Internal marketplace | Katalog/paket, partner eligibility, wilayah layanan, kapasitas, review kualitas, versi tarif dan policy |
| Internal finance | Gross, refund, net, uang titipan pemerintah/vendor, jasa platform, pajak, tagihan vendor, payout, selisih dan bukti rekonsiliasi |

Pembaruan UI menggunakan event setelah transaksi DB berhasil: payment.confirmed, journey.stage_changed, document.revision_requested, work_order.updated. Konsumen event harus idempotent dan dapat diputar ulang. Polling terbatas menjadi fallback ketika koneksi realtime putus; label “terakhir diperbarui” tetap terlihat. Tidak mengklaim realtime hanya karena data diubah optimistis pada satu layar.

## Status dan pengamanan transisi

Status pemenuhan dipisahkan dari status pembayaran. Refund tidak otomatis berarti dokumen dibatalkan, dan dokumen diterbitkan tidak otomatis berarti jasa sudah diserahkan.

| Objek | Siklus usulan |
| --- | --- |
| Journey | draft → submitted → assessment → quoted → accepted → preparing → authority_review → ready → in_transit → arrived → completed |
| Dokumen | missing → uploaded → under_review → revision_required → verified → submitted_to_authority → issued / rejected |
| Payment | pending → paid / failed / expired → partially_refunded / refunded |
| Work order | proposed → accepted → scheduled → in_progress → completed / cancelled |

Exception journey: on_hold, reschedule_requested, cancellation_review, cancelled. Setiap perubahan wajib memiliki actor, waktu, alasan dan versi; tahap tertentu membutuhkan bukti serta maker-checker. Tidak boleh langsung lompat dari paid ke completed.

## Model data dan API usulan

**Belum diimplementasikan sebagai layanan travel baru.** Gunakan skema tambahan, bukan mengubah arti data dokumen lama.

- `pet_journeys`: pemilik, pet, nomor journey, rute/transit, departure window, mode, kebutuhan, PIC, status dan version.
- `journey_rule_snapshots`: versi aturan, sumber resmi, reviewer, checklist dan masa berlaku.
- `journey_quotes` + `quote_lines`: versi, nominal, currency, kategori biaya, vendor beneficiary, valid-until, syarat dan persetujuan pemilik.
- `journey_documents`: jenis kebutuhan, file private, expiry, validasi pihak berwenang, history revisi; akses URL berumur terbatas.
- `journey_tasks` + `work_orders`: PIC/partner, slot, SLA, bukti, status, biaya dan alokasi payout.
- `journey_handovers`: giver/receiver, waktu/tempat, checklist kondisi, foto/bukti dan persetujuan.
- Payment memakai infrastruktur `payments` yang ada dengan reference type baru `pet_journey` dan reference ID; setiap installment memiliki ID unik.
- `journey_finance_allocations`: payment ID, quote version, jenis alokasi, liability/revenue/cost, vendor, bukti setor serta rekonsiliasi.
- Event outbox + delivery receipts + audit log untuk dispatch yang tahan retry dan tidak menggandakan payment/work order.

API usulan: create/read/update draft journey; assessment; quote versions/acceptance; checklist uploads; payments; work orders; stage history; handovers; refund requests; finance reconciliation. Semua endpoint menggunakan scope pemilik atau penugasan/role, pagination, validation, optimistic concurrency dan idempotency key pada mutasi kritis. Kontak, alamat dan dokumen tidak tersedia lewat endpoint publik.

## Harga, promo dan akuntansi

Harga “mulai dari” bukan harga final. Fee pemerintah tidak didiskon sebagai pendapatan Slivadoc; diskon hanya berlaku pada line yang ditentukan dan memiliki masa berlaku. Nilai diskon, tarif serta penerima biaya disalin ke quote snapshot, sehingga perubahan katalog tidak mengganti angka transaksi lama.

Saat uang diterima: finance menampilkan gross, refund terkonfirmasi dan net. Pengakuan pendapatan jasa, titipan pemerintah, utang vendor dan pajak mengikuti kebijakan akuntansi serta bukti pelaksanaan, tidak otomatis menganggap net cash sebagai laba. Transfer vendor mempunyai bukti, referensi, maker-checker dan larangan payout ganda. Pembatalan memperhitungkan biaya vendor yang benar-benar committed, persetujuan pengguna dan bukti refund provider.

## Audit Pet Documents saat ini dan perbaikan tahap ini

Temuan dari kode dan DB lokal saat audit:

- Pembayaran memakai `reference_type=document_request` dan terkait `pet_document_requests`.
- Settlement terkonfirmasi mengubah payment_status menjadi paid dan status permohonan menjadi verification; permohonan tampil pada endpoint/dashboard Internal Operations.
- Belum ada dispatch travel/work order marketplace dari pembayaran dokumen. Fitur tersebut termasuk rancangan berikutnya, bukan integrasi yang sudah aktif.
- Dashboard finance lama berasal dari `platform_finance_entries`; pembayaran dokumen belum menjadi rincian khusus di sana.
- DB lokal memiliki satu permohonan dokumen berlabel paid/verification, tetapi tidak ada payment dokumen terkonfirmasi. Status seed ini bukan bukti transaksi QRIS nyata.

Perubahan tahap ini menambah **laporan penerimaan pembayaran dokumen**, endpoint `/api/v1/internal/finance/document-payments`, dengan periode lunas WIB, pencarian, rincian permohonan/rute, gross, refund, net, dan referensi provider. Dashboard finance membaca laporan ini dengan refresh 30 detik saat aktif serta ekspor CSV. Status paid tanpa bukti payment ditandai untuk rekonsiliasi dan tidak dihitung sebagai penerimaan.

Permohonan baru menyimpan snapshot service fee dan government fee. Transaksi historis tanpa snapshot tetap diberi label “alokasi tidak tersedia”; tidak dihitung menggunakan tarif katalog saat ini. Laporan ini tidak membuat jurnal pendapatan otomatis, sehingga tidak menggandakan pencatatan manual yang sudah ada.

## Adopsi: keputusan produk terkait

Pet owner dapat memilih pet miliknya dari koleksi, menyusun pet passport, memasukkan foto, karakter, kesehatan dan biaya tetap (0 jika gratis). Listing masuk review sebelum tampil publik. Calon keluarga melakukan screening, dilanjutkan tinjauan, meet & greet dan serah terima. Tidak ada bidding, pemenang lelang atau pembayaran otomatis ketika mengirim screening. Modul pembayaran biaya adopsi belum diaktifkan; kontrak, bukti biaya, pembatalan dan handover perlu disepakati sebelum checkout diimplementasikan.

## Tahap pelaksanaan dan kriteria siap rilis

1. **Fondasi**: sepakati wilayah/rute pilot, layanan dan mitra nyata, aturan kesehatan, pihak berwenang, policy biaya/refund, liability, SLA dan pemilik operasional. Review compliance serta kebijakan akuntansi sebelum transaksi travel aktif.
2. **MVP document-led journey**: draft, aturan berversi, review manusia, quote transparan, QRIS, checklist dan timeline, operasi/finance satu reference ID. Gunakan rute pilot terbatas.
3. **Partner fulfillment**: work orders, slot, kapasitas, bukti kondisi, handover, event outbox dan payout maker-checker.
4. **Internasional & multi-leg**: transit, multi-currency setelah kemampuan provider/finance tersedia, mitra kedatangan, aturan import/export berversi dan kondisi incident management.

Uji sebelum rilis: ownership/privacy; rute tidak didukung; aturan kedaluwarsa; quote expired; perubahan harga katalog tidak mengubah pesanan; QRIS expired/double callback; offline/retry; refund partial/full; work order tidak double; perubahan jadwal; partner gagal; handover wajib bukti; finance gross/refund/net cocok DB; titipan tidak dihitung laba; web responsive dan Android/iOS dapat scroll; background terkunci; bahasa Indonesia/English; pembaca layar dan loading/error jelas.

Metrik operasional berasal dari DB: waktu review/issue, rasio revisi, kesiapan sebelum departure, kegagalan pickup/boarding, incident rate, refund turnaround, selisih rekonsiliasi dan kepuasan setelah selesai. Jangan mengisi metrik dengan angka ilustrasi di dashboard produksi.
