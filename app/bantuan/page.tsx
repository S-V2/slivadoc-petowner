import { LocalizedCopy } from "../components/LocalizedCopy";
import type { Metadata } from "next";
import { LocalizedLink as Link } from "../components/LocalizedCopy";
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
            <span className="seo-eyebrow"><LocalizedCopy>{"BANTUAN KONSUMEN"}</LocalizedCopy></span>
            <h1><LocalizedCopy>{"Pengaduan yang jelas, terlacak, dan tidak kehilangan konteks."}</LocalizedCopy></h1>
            <p><LocalizedCopy>{"PetOwner yang sudah masuk dapat membuat ticket, mengaitkannya ke pesanan atau booking, melihat target tanggapan pertama, serta memantau status dan penyelesaiannya."}</LocalizedCopy></p>
            <div className="seo-hero-actions">
              <Link className="seo-primary" href="/?view=support"><LocalizedCopy>{"Buka ticket bantuan"}</LocalizedCopy></Link>
              <a className="seo-secondary" href="mailto:support@slivadoc.com"><LocalizedCopy>{"Email support@slivadoc.com"}</LocalizedCopy></a>
            </div>
          </div>
          <aside className="seo-hero-panel">
            <strong><LocalizedCopy>{"Target tanggapan pertama"}</LocalizedCopy></strong>
            <h2><LocalizedCopy>{"1 hari kerja"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Nomor ticket dan target waktu tampil setelah pengaduan berhasil disimpan."}</LocalizedCopy></p>
          </aside>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Pilih topik yang sesuai"}</LocalizedCopy></h2>
        </div>
        <div className="seo-card-grid">
          <LocalizedCopy>{topics.map(([title, detail]) => (
            <article className="seo-card" key={title}>
              <small><LocalizedCopy>{"TOPIK"}</LocalizedCopy></small>
              <h2><LocalizedCopy>{title}</LocalizedCopy></h2>
              <p><LocalizedCopy>{detail}</LocalizedCopy></p>
            </article>
          ))}</LocalizedCopy>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Sebelum mengirim pengaduan"}</LocalizedCopy></h2>
        </div>
        <div className="seo-card-grid">
          <article className="seo-card">
            <h2><LocalizedCopy>{"1. Pilih referensi"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Kaitkan ticket ke aktivitas yang sesuai agar identitas transaksi diverifikasi oleh sistem."}</LocalizedCopy></p>
          </article>
          <article className="seo-card">
            <h2><LocalizedCopy>{"2. Tulis kronologi"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Cantumkan waktu, kondisi terakhir, dan hasil yang kamu harapkan tanpa memasukkan rahasia akun."}</LocalizedCopy></p>
          </article>
          <article className="seo-card">
            <h2><LocalizedCopy>{"3. Pantau status"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Riwayat dan penyelesaian tersedia pada menu Pusat Bantuan di akun PetOwner."}</LocalizedCopy></p>
          </article>
        </div>
      </section>
    </PublicPage>
  );
}
