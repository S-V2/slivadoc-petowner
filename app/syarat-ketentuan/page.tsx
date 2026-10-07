import { LocalizedCopy } from "../components/LocalizedCopy";
import type { Metadata } from "next";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { pageMetadata } from "../lib/seo-config";

export const metadata: Metadata = pageMetadata({
  title: "Syarat & Ketentuan Slivadoc",
  description:
    "Ketentuan penggunaan marketplace, booking, pembayaran, pengiriman, pembatalan, pengaduan, dan akun Slivadoc.",
  path: "/syarat-ketentuan",
});

const sections = [
  [
    "Peran platform dan mitra",
    "Slivadoc menyediakan sistem pencarian, booking, transaksi, pembayaran, pengiriman, dan bantuan. Produk dan layanan disediakan oleh mitra yang namanya ditampilkan pada halaman terkait.",
  ],
  [
    "Informasi katalog",
    "Mitra bertanggung jawab atas nama, deskripsi, harga, stok, asal, registrasi, sertifikasi, cakupan layanan, persyaratan pet, dan kebijakan yang mereka masukkan. Status yang belum tersedia ditampilkan apa adanya dan tidak boleh dianggap terverifikasi.",
  ],
  [
    "Booking",
    "Slot ditentukan dari jam operasional, kapasitas, staf aktif, dan booking yang sudah tersimpan. Booking belum final sebelum status konfirmasi dan, jika berbayar, status pembayaran berhasil.",
  ],
  [
    "Pesanan & pembayaran",
    "Total dihitung oleh server berdasarkan produk, jumlah, voucher, poin, biaya layanan, dan ongkir yang berlaku. Jangan membayar di luar metode yang ditampilkan pada alur resmi Slivadoc.",
  ],
  [
    "Pengiriman",
    "Pilihan layanan, estimasi, biaya, pelacakan, bukti, penyesuaian, dan kompensasi mengikuti data penyedia pengiriman dan ketentuan transaksi. Barang terlarang atau membutuhkan penanganan khusus tidak boleh dikirim sebagai barang biasa.",
  ],
  [
    "Pembatalan, retur, dan refund",
    "Ketentuan dapat berbeda menurut produk, layanan, status pemrosesan, dan mitra. Kebijakan yang tersedia ditampilkan sebelum transaksi; ajukan kendala melalui ticket agar referensi dan kronologinya tercatat.",
  ],
  [
    "Penggunaan akun",
    "Pengguna wajib menjaga keamanan perangkat, OTP, kata sandi, dan informasi pembayaran serta memberikan data yang benar. Aktivitas yang melanggar hukum, menipu, atau mengganggu layanan dapat dibatasi.",
  ],
  [
    "Pengaduan",
    "Pengaduan dapat dibuat dari Pusat Bantuan dan dikaitkan ke transaksi. Sistem menampilkan nomor ticket, target tanggapan pertama, status, dan penyelesaian yang tercatat.",
  ],
];

export default function TermsPage() {
  return (
    <PublicPage>
      <section className="seo-hero">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Syarat & Ketentuan" },
          ]}
        />
        <div className="seo-section-heading">
          <span className="seo-eyebrow"><LocalizedCopy>{"SYARAT & KETENTUAN"}</LocalizedCopy></span>
          <h1><LocalizedCopy>{"Aturan yang jelas untuk setiap langkah transaksi."}</LocalizedCopy></h1>
          <p><LocalizedCopy>{"Berlaku mulai 4 Oktober 2026. Dengan menggunakan Slivadoc, pengguna menyetujui ketentuan yang relevan dengan fitur dan transaksi yang dipilih."}</LocalizedCopy></p>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-card-grid">
          <LocalizedCopy>{sections.map(([title, detail]) => (
            <article className="seo-card" key={title}>
              <h2><LocalizedCopy>{title}</LocalizedCopy></h2>
              <p><LocalizedCopy>{detail}</LocalizedCopy></p>
            </article>
          ))}</LocalizedCopy>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Butuh penjelasan?"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Gunakan Pusat Bantuan pada akun PetOwner atau hubungi"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
            <a href="mailto:support@slivadoc.com"><LocalizedCopy>{"support@slivadoc.com"}</LocalizedCopy></a><LocalizedCopy>{"."}</LocalizedCopy></p>
        </div>
      </section>
    </PublicPage>
  );
}
