import { LocalizedCopy, LocalizedLink } from "../components/LocalizedCopy";
import { LanguageToggle } from "../components/LanguageToggle";
import type { Metadata } from "next";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { pageMetadata } from "../lib/seo-config";

export const metadata: Metadata = pageMetadata({
  title: "Kebijakan Privasi Slivadoc",
  description:
    "Kebijakan privasi lengkap Slivadoc: data yang dikumpulkan, tujuan, pihak ketiga yang menerima data, retensi, hak Anda, dan penghapusan akun.",
  path: "/privasi",
});

const dataCategories: Array<[string, string]> = [
  [
    "Akun dan kontak",
    "Alamat email, nama lengkap, nomor telepon, dan kata sandi yang disimpan dalam bentuk ter-hash (Argon2id).",
  ],
  [
    "Profil hewan",
    "Nama, spesies, tanggal lahir, berat badan, foto, nomor microchip, alergi, dan catatan kesehatan hewan.",
  ],
  [
    "Alamat pengiriman",
    "Nama penerima, nomor telepon, alamat lengkap, kode pos, dan koordinat untuk keperluan pengiriman.",
  ],
  [
    "Transaksi dan pembayaran",
    "Riwayat pemesanan, konsultasi, pesanan, pembayaran, dan pengiriman beserta nominal dan statusnya. Kami tidak menyimpan nomor kartu, nomor rekening, atau PIN pembayaran Anda; pembayaran QRIS diproses oleh penyedia pembayaran.",
  ],
  [
    "Konten dan komunikasi",
    "Pesan chat, postingan dan komentar komunitas, laporan hewan hilang (termasuk lokasi terakhir yang Anda cantumkan), ulasan, dan tiket bantuan.",
  ],
  [
    "Perangkat dan keamanan",
    "Alamat IP, user agent, catatan sesi login, kode OTP, dan log aktivitas penting untuk keamanan dan audit.",
  ],
  [
    "Izin perangkat",
    "Dengan izin Anda, aplikasi Android meminta akses lokasi (kasar dan/atau presisi) untuk fitur sekitar dan pencarian lokasi, serta kamera untuk mengunggah foto. Izin dapat dikelola dari pengaturan perangkat.",
  ],
];

const purposes = [
  "Menyediakan layanan: autentikasi, profil hewan, pemesanan, konsultasi, pembayaran, pengiriman, komunitas, dan dukungan pengguna.",
  "Keamanan dan pencegahan penyalahgunaan: perlindungan akun, deteksi aktivitas mencurigakan, dan audit aktivitas penting.",
  "Komunikasi layanan: kode OTP, konfirmasi transaksi, pembaruan status pesanan, dan informasi layanan terkait.",
  "Asisten AI (SlivaCare): pesan chat dan data profil hewan yang Anda kirimkan ke asisten diproses untuk menghasilkan jawaban; pengenal akun dikirim dalam bentuk tersandi (hash), bukan identitas langsung.",
  "Kepatuhan hukum: memenuhi kewajiban pembukuan, perpajakan, serta permintaan yang sah dari aparat berwenang.",
];

const thirdParties: Array<[string, string]> = [
  [
    "Resend",
    "Email transaksional seperti kode OTP. Data yang diterima: alamat email Anda.",
  ],
  [
    "Cloudinary",
    "Penyimpanan media. Data yang diterima: foto dan dokumen yang Anda unggah.",
  ],
  [
    "OpenAI",
    "Pemrosesan asisten AI SlivaCare. Data yang diterima: isi pesan chat dan profil hewan yang Anda kirimkan ke asisten.",
  ],
  [
    "Photon (OpenStreetMap)",
    "Pencarian lokasi (geocoding). Data yang diterima: koordinat yang Anda masukkan.",
  ],
  [
    "Yokke",
    "Pemrosesan pembayaran QRIS. Data yang diterima: nominal dan referensi transaksi. Data kartu atau rekening tidak diteruskan kepada kami.",
  ],
  [
    "Lion Parcel",
    "Pengiriman barang. Data yang diterima: nama, nomor telepon, alamat, email, dan koordinat pengirim serta penerima.",
  ],
  [
    "Penyedia infrastruktur cloud",
    "Hosting aplikasi, basis data, dan penyimpanan pada pusat data regional di luar negeri.",
  ],
];

const rights = [
  "Mendapatkan akses dan salinan data pribadi Anda.",
  "Memperbaiki atau memperbarui data yang tidak akurat.",
  "Menghapus data pribadi Anda melalui fitur Hapus Akun.",
  "Menarik persetujuan pemrosesan data.",
  "Membatasi pemrosesan dan mengajukan keberatan atas keputusan yang diambil secara otomatis.",
  "Mengajukan pengaduan kepada lembaga pengawas pelindungan data pribadi.",
];

const retention = [
  "Akun dan data profil: disimpan selama akun aktif, lalu dihapus atau dianonimkan setelah Anda menggunakan Hapus Akun.",
  "Transaksi, pembayaran, dan pemesanan: dipertahankan dalam bentuk teranonim selama kurang lebih 5 tahun untuk kewajiban pembukuan dan perpajakan.",
  "Log teknis dan keamanan: sekitar 90 hari. Kode OTP: dihapus 7 hari setelah kedaluwarsa. Sesi login: dihapus 30 hari setelah kedaluwarsa.",
  "Backup: salinan backup terenkripsi dihapus otomatis dalam rotasi hingga 12 bulan, sehingga data yang telah Anda hapus dapat bertahan pada salinan tersebut hingga rotasi selesai.",
];

const security = [
  "Kata sandi disimpan dalam bentuk ter-hash (Argon2id) dan akses data dibatasi berdasarkan peran.",
  "Komunikasi dilindungi enkripsi saat transit, dan aktivitas penting dicatat untuk audit serta investigasi.",
  "Tidak ada sistem yang sepenuhnya aman. Segera hubungi kami jika mencurigai penyalahgunaan akun, dan jangan pernah membagikan kode OTP atau kata sandi Anda.",
];

export default function PrivacyPage() {
  return (
    <PublicPage>
      <section className="seo-hero">
        <Breadcrumbs
          items={[{ label: "Beranda", href: "/" }, { label: "Privasi & Data" }]}
        />
        <div className="seo-section-heading">
          <span className="seo-eyebrow"><LocalizedCopy>{"PRIVASI & DATA"}</LocalizedCopy></span>
          <h1><LocalizedCopy>{"Kebijakan Privasi Slivadoc"}</LocalizedCopy></h1>
          <p><LocalizedCopy>{"Berlaku mulai 8 Oktober 2026. Halaman ini menjelaskan data yang kami kumpulkan, cara kami menggunakannya, pihak yang menerimanya, masa simpannya, serta hak Anda — termasuk pada aplikasi Android Slivadoc Pet Owner."}</LocalizedCopy></p>
          <LanguageToggle />
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Pengendali data dan kontak"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Pengendali data pribadi Anda adalah PT Sliva Technology Indonesia. Pertanyaan, permintaan data, atau keluhan privasi dapat dikirim ke privacy@slivadoc.com atau melalui Pusat Bantuan setelah Anda masuk ke akun."}</LocalizedCopy></p>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Data yang kami kumpulkan"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Kami hanya mengumpulkan data yang diperlukan untuk menjalankan layanan Slivadoc."}</LocalizedCopy></p>
        </div>
        <div className="seo-card-grid">
          {dataCategories.map(([title, detail]) => (
            <article className="seo-card" key={title}>
              <h2><LocalizedCopy>{title}</LocalizedCopy></h2>
              <p><LocalizedCopy>{detail}</LocalizedCopy></p>
            </article>
          ))}
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Cara kami menggunakan data"}</LocalizedCopy></h2>
        </div>
        <ul className="seo-checklist">
          {purposes.map((item) => (
            <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
          ))}
        </ul>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Pihak yang menerima data"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Data dibagikan hanya sejauh yang diperlukan untuk menjalankan layanan berikut."}</LocalizedCopy></p>
        </div>
        <div className="seo-card-grid">
          {thirdParties.map(([name, detail]) => (
            <article className="seo-card" key={name}>
              <h2><LocalizedCopy>{name}</LocalizedCopy></h2>
              <p><LocalizedCopy>{detail}</LocalizedCopy></p>
            </article>
          ))}
        </div>
        <div className="seo-section-heading">
          <p><LocalizedCopy>{"Fitur penerjemahan otomatis berjalan pada infrastruktur kami sendiri dan tidak mengirim data Anda ke pihak ketiga. Kami tidak menjual data pribadi Anda."}</LocalizedCopy></p>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Data yang bersifat publik"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Laporan hewan hilang dan konten komunitas (postingan, komentar, grup) dapat dilihat publik tanpa masuk ke akun, termasuk nama hewan, jenis, lokasi terakhir, dan koordinat yang Anda cantumkan. Nomor kontak hanya tampil jika Anda mencantumkannya sendiri pada laporan. Jangan membagikan data pribadi sensitif di area publik."}</LocalizedCopy></p>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Dasar hukum pemrosesan"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Kami memproses data berdasarkan persetujuan Anda saat mendaftar, pelaksanaan layanan yang Anda minta, kewajiban hukum (termasuk pembukuan dan perpajakan), serta kepentingan sah kami dalam menjaga keamanan layanan, sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi."}</LocalizedCopy></p>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Hak Anda sebagai pemilik data"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Anda dapat menggunakan hak berikut melalui privacy@slivadoc.com, Pusat Bantuan, atau menu pengaturan akun."}</LocalizedCopy></p>
        </div>
        <ul className="seo-checklist">
          {rights.map((item) => (
            <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
          ))}
        </ul>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Masa simpan data"}</LocalizedCopy></h2>
        </div>
        <ul className="seo-checklist">
          {retention.map((item) => (
            <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
          ))}
        </ul>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Penghapusan akun"}</LocalizedCopy></h2>
          <p>
            <LocalizedCopy>{"Anda dapat menghapus akun melalui menu pengaturan akun di aplikasi, atau melalui"}</LocalizedCopy>{" "}
            <LocalizedLink href="/hapus-akun"><LocalizedCopy>{"halaman Hapus Akun"}</LocalizedCopy></LocalizedLink>{" "}
            <LocalizedCopy>{"jika Anda sudah tidak menggunakan aplikasi. Setelah konfirmasi dengan kode OTP, tersedia masa tenggang 14 hari untuk membatalkan. Setelah masa tenggang berakhir, data pribadi Anda dihapus permanen atau dianonimkan; catatan transaksi dipertahankan secara teranonim sesuai kewajiban hukum; dan salinan backup terenkripsi terhapus dalam rotasi hingga 12 bulan."}</LocalizedCopy>
          </p>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Keamanan data"}</LocalizedCopy></h2>
        </div>
        <ul className="seo-checklist">
          {security.map((item) => (
            <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
          ))}
        </ul>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Anak di bawah 13 tahun"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Layanan Slivadoc tidak ditujukan untuk anak di bawah 13 tahun dan kami tidak dengan sengaja mengumpulkan data pribadi mereka. Jika Anda mengetahui seorang anak memberikan data pribadi kepada kami, hubungi privacy@slivadoc.com agar data tersebut kami hapus."}</LocalizedCopy></p>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Perubahan kebijakan"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Perubahan material akan diberitahukan melalui aplikasi atau email, dan tanggal berlaku tercantum di bagian atas halaman ini."}</LocalizedCopy></p>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Kontak privasi"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Kirim permintaan akses, koreksi, atau penghapusan data ke"}</LocalizedCopy>
            <LocalizedCopy>{" "}</LocalizedCopy>
            <a href="mailto:privacy@slivadoc.com"><LocalizedCopy>{"privacy@slivadoc.com"}</LocalizedCopy></a>
            <LocalizedCopy>{" atau melalui"}</LocalizedCopy>
            <LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedLink href="/bantuan"><LocalizedCopy>{"Pusat Bantuan"}</LocalizedCopy></LocalizedLink>
            <LocalizedCopy>{" setelah masuk agar identitas akun dapat diverifikasi."}</LocalizedCopy>
          </p>
        </div>
      </section>
    </PublicPage>
  );
}
