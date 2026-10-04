import type { Metadata } from "next";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { pageMetadata } from "../lib/seo-config";

export const metadata: Metadata = pageMetadata({
  title: "Privasi & Data Slivadoc",
  description:
    "Ringkasan jenis data, tujuan pemrosesan, keamanan, retensi, dan pilihan PetOwner terkait data pribadi di Slivadoc.",
  path: "/privasi",
});

const sections = [
  [
    "Data yang diproses",
    "Data akun dan kontak; profil pet; riwayat booking, konsultasi, transaksi, pembayaran, pengiriman, dan bantuan; serta data perangkat dan keamanan yang diperlukan untuk melindungi akun.",
  ],
  [
    "Tujuan penggunaan",
    "Menyediakan layanan yang diminta, memproses pembayaran dan pengiriman, menjaga rekam aktivitas, menangani pengaduan, mencegah penyalahgunaan, serta memenuhi kewajiban yang berlaku.",
  ],
  [
    "Pembagian data",
    "Data dibagikan secara terbatas kepada mitra yang menjalankan layanan atau pesanan, penyedia pembayaran dan pengiriman, serta penyedia infrastruktur yang diperlukan. Setiap alur dibatasi pada kebutuhan fungsinya.",
  ],
  [
    "Keamanan & akses",
    "Akses dibatasi berdasarkan peran dan kepemilikan data. Aktivitas penting dicatat untuk investigasi dan audit. Jangan pernah membagikan OTP, kata sandi, atau PIN pembayaran.",
  ],
  [
    "Retensi",
    "Data disimpan selama akun atau transaksi membutuhkannya, selama sengketa masih berjalan, atau selama diperlukan oleh kewajiban hukum. Data yang tidak lagi diperlukan dapat dihapus atau dianonimkan.",
  ],
  [
    "Pilihan PetOwner",
    "Kamu dapat memperbarui profil, mengelola alamat dan akses keluarga, melihat aktivitas, serta meminta akses, koreksi, atau penghapusan yang tersedia melalui Pusat Bantuan.",
  ],
];

export default function PrivacyPage() {
  return (
    <PublicPage>
      <section className="seo-hero">
        <Breadcrumbs
          items={[{ label: "Beranda", href: "/" }, { label: "Privasi & Data" }]}
        />
        <div className="seo-section-heading">
          <span className="seo-eyebrow">PRIVASI & DATA</span>
          <h1>
            Data digunakan untuk menjalankan layanan, bukan untuk
            membingungkanmu.
          </h1>
          <p>
            Berlaku mulai 4 Oktober 2026. Ringkasan ini menjelaskan pemrosesan
            data utama pada ekosistem Slivadoc.
          </p>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-card-grid">
          {sections.map(([title, detail]) => (
            <article className="seo-card" key={title}>
              <h2>{title}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2>Kontak privasi</h2>
          <p>
            Kirim permintaan melalui Pusat Bantuan setelah masuk agar identitas
            akun dapat diverifikasi, atau hubungi{" "}
            <a href="mailto:support@slivadoc.com">support@slivadoc.com</a>.
          </p>
        </div>
      </section>
    </PublicPage>
  );
}
