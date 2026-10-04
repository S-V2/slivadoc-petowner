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
          <span className="seo-eyebrow">SYARAT & KETENTUAN</span>
          <h1>Aturan yang jelas untuk setiap langkah transaksi.</h1>
          <p>
            Berlaku mulai 4 Oktober 2026. Dengan menggunakan Slivadoc, pengguna
            menyetujui ketentuan yang relevan dengan fitur dan transaksi yang
            dipilih.
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
          <h2>Butuh penjelasan?</h2>
          <p>
            Gunakan Pusat Bantuan pada akun PetOwner atau hubungi{" "}
            <a href="mailto:support@slivadoc.com">support@slivadoc.com</a>.
          </p>
        </div>
      </section>
    </PublicPage>
  );
}
