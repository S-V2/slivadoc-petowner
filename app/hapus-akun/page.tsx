import { LocalizedCopy, LocalizedLink } from "../components/LocalizedCopy";
import { LanguageToggle } from "../components/LanguageToggle";
import type { Metadata } from "next";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { pageMetadata } from "../lib/seo-config";
import { DeletionRequestForm } from "./DeletionRequestForm";

export const metadata: Metadata = pageMetadata({
  title: "Hapus Akun Slivadoc",
  description:
    "Cara menghapus akun Slivadoc: melalui aplikasi atau formulir di halaman ini, dengan masa tenggang 14 hari yang dapat dibatalkan.",
  path: "/hapus-akun",
});

const steps = [
  "Di aplikasi: buka Profil, lalu Pengaturan akun, pilih Hapus akun, dan ikuti konfirmasi dengan kode OTP.",
  "Tanpa aplikasi: gunakan formulir di halaman ini. Masukkan email akun Anda, verifikasi dengan kode OTP, lalu konfirmasi permintaan penghapusan.",
];

const consequences = [
  "Setelah konfirmasi, akun Anda memasuki masa tenggang 14 hari. Selama masa itu Anda dapat membatalkan kapan saja, dan akun tetap dapat digunakan.",
  "Setelah masa tenggang berakhir, data pribadi Anda — profil, alamat, profil dan foto hewan, pesan chat, laporan hewan hilang, serta konten komunitas — dihapus permanen atau dianonimkan, termasuk media yang tersimpan di penyedia penyimpanan kami.",
  "Catatan transaksi, pembayaran, dan pemesanan dipertahankan secara teranonim selama kurang lebih 5 tahun untuk kewajiban pembukuan dan perpajakan.",
  "Salinan backup terenkripsi terhapus otomatis dalam rotasi hingga 12 bulan, sehingga salinan data Anda mungkin masih ada pada backup selama periode tersebut.",
  "Pesan chat Anda ikut dihapus dari sistem kami.",
];

export default function HapusAkunPage() {
  return (
    <PublicPage>
      <section className="seo-hero">
        <Breadcrumbs
          items={[{ label: "Beranda", href: "/" }, { label: "Hapus Akun" }]}
        />
        <div className="seo-section-heading">
          <span className="seo-eyebrow"><LocalizedCopy>{"HAPUS AKUN"}</LocalizedCopy></span>
          <h1><LocalizedCopy>{"Hapus akun Slivadoc Anda"}</LocalizedCopy></h1>
          <p><LocalizedCopy>{"Anda berhak menghapus akun dan data pribadi Anda kapan saja. Halaman ini menjelaskan cara melakukannya dan apa yang terjadi setelahnya."}</LocalizedCopy></p>
          <LanguageToggle />
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Cara menghapus akun"}</LocalizedCopy></h2>
        </div>
        <ul className="seo-checklist">
          {steps.map((item) => (
            <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
          ))}
        </ul>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Apa yang terjadi setelahnya"}</LocalizedCopy></h2>
        </div>
        <ul className="seo-checklist">
          {consequences.map((item) => (
            <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
          ))}
        </ul>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Formulir permintaan"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Untuk mengajukan penghapusan atau membatalkan permintaan penghapusan tanpa aplikasi, gunakan formulir berikut."}</LocalizedCopy></p>
        </div>
        <DeletionRequestForm />
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Pertanyaan lain"}</LocalizedCopy></h2>
          <p>
            <LocalizedCopy>{"Pelajari data apa yang kami proses pada"}</LocalizedCopy>{" "}
            <LocalizedLink href="/privasi"><LocalizedCopy>{"Kebijakan Privasi"}</LocalizedCopy></LocalizedLink>{" "}
            <LocalizedCopy>{"atau hubungi privacy@slivadoc.com."}</LocalizedCopy>
          </p>
        </div>
      </section>
    </PublicPage>
  );
}
