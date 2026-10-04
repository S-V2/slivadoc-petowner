import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { pageMetadata } from "../lib/seo-config";

export const metadata: Metadata = pageMetadata({
  title: "Pusat Bantuan Slivadoc",
  description:
    "Panduan pengaduan untuk booking, pembayaran, pesanan, pengiriman, produk, layanan, akun, dan privasi di Slivadoc.",
  path: "/bantuan",
});

const topics = [
  [
    "Booking layanan",
    "Sertakan nama layanan, cabang, jadwal, dan kondisi terakhir yang tampil pada aktivitas.",
  ],
  [
    "Pesanan & pengiriman",
    "Pilih pesanan terkait agar tim menerima nomor pesanan dan konteks pengiriman yang tepat.",
  ],
  [
    "Pembayaran",
    "Jangan mengirim PIN, OTP, kata sandi, atau data kartu. Tim hanya memerlukan nomor transaksi dari aplikasi.",
  ],
  [
    "Produk atau layanan",
    "Jelaskan perbedaan informasi, kondisi barang, atau hasil layanan beserta waktu kejadian.",
  ],
  [
    "Privasi & akun",
    "Gunakan kategori privasi atau akun untuk permintaan akses, koreksi, atau penghapusan data yang tersedia.",
  ],
];

export default function HelpPage() {
  return (
    <PublicPage>
      <section className="seo-hero">
        <Breadcrumbs
          items={[{ label: "Beranda", href: "/" }, { label: "Pusat Bantuan" }]}
        />
        <div className="seo-hero-grid">
          <div>
            <span className="seo-eyebrow">BANTUAN KONSUMEN</span>
            <h1>
              Pengaduan yang jelas, terlacak, dan tidak kehilangan konteks.
            </h1>
            <p>
              PetOwner yang sudah masuk dapat membuat ticket, mengaitkannya ke
              pesanan atau booking, melihat target tanggapan pertama, serta
              memantau status dan penyelesaiannya.
            </p>
            <div className="seo-hero-actions">
              <Link className="seo-primary" href="/?view=support">
                Buka ticket bantuan
              </Link>
              <a className="seo-secondary" href="mailto:support@slivadoc.com">
                Email support@slivadoc.com
              </a>
            </div>
          </div>
          <aside className="seo-hero-panel">
            <strong>Target tanggapan pertama</strong>
            <h2>1 hari kerja</h2>
            <p>
              Nomor ticket dan target waktu tampil setelah pengaduan berhasil
              disimpan.
            </p>
          </aside>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2>Pilih topik yang sesuai</h2>
        </div>
        <div className="seo-card-grid">
          {topics.map(([title, detail]) => (
            <article className="seo-card" key={title}>
              <small>TOPIK</small>
              <h2>{title}</h2>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2>Sebelum mengirim pengaduan</h2>
        </div>
        <div className="seo-card-grid">
          <article className="seo-card">
            <h2>1. Pilih referensi</h2>
            <p>
              Kaitkan ticket ke aktivitas yang sesuai agar identitas transaksi
              diverifikasi oleh sistem.
            </p>
          </article>
          <article className="seo-card">
            <h2>2. Tulis kronologi</h2>
            <p>
              Cantumkan waktu, kondisi terakhir, dan hasil yang kamu harapkan
              tanpa memasukkan rahasia akun.
            </p>
          </article>
          <article className="seo-card">
            <h2>3. Pantau status</h2>
            <p>
              Riwayat dan penyelesaian tersedia pada menu Pusat Bantuan di akun
              PetOwner.
            </p>
          </article>
        </div>
      </section>
    </PublicPage>
  );
}
