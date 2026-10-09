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
  path: "/delete-account",
});

const steps = [
  "Di aplikasi: buka Profil, lalu Pengaturan akun, pilih Hapus akun, dan ikuti konfirmasi dengan kode OTP.",
  "Tanpa aplikasi: gunakan formulir di halaman ini. Masukkan email akun Anda, verifikasi dengan kode OTP, lalu konfirmasi permintaan penghapusan.",
];

const consequences = [
  "Setelah konfirmasi, akun Anda memasuki masa tenggang 14 hari. Selama masa itu Anda dapat membatalkan kapan saja, dan akun tetap dapat digunakan.",
  "Setelah masa tenggang berakhir, data pribadi Anda (profil, alamat, profil dan foto hewan, pesan chat, laporan hewan hilang, serta konten komunitas) dihapus permanen atau dianonimkan, termasuk media yang tersimpan di penyedia penyimpanan kami.",
  "Catatan transaksi, pembayaran, dan pemesanan dipertahankan secara teranonim selama kurang lebih 5 tahun untuk kewajiban pembukuan dan perpajakan.",
  "Salinan backup terenkripsi terhapus otomatis dalam rotasi hingga 12 bulan, sehingga salinan data Anda mungkin masih ada pada backup selama periode tersebut.",
  "Pesan chat Anda ikut dihapus dari sistem kami.",
];

export default function HapusAkunPage() {
  return (
    <PublicPage>
      <div className="legal-doc">
        <Breadcrumbs
          items={[{ label: "Beranda", href: "/" }, { label: "Hapus Akun" }]}
        />
        <header className="legal-head">
          <h1><LocalizedCopy>{"Hapus akun Slivadoc Anda"}</LocalizedCopy></h1>
          <div className="legal-meta">
            <LanguageToggle />
          </div>
          <p className="legal-lead">
            <LocalizedCopy>{"Anda berhak menghapus akun dan data pribadi Anda kapan saja. Halaman ini menjelaskan cara melakukannya dan apa yang terjadi setelahnya."}</LocalizedCopy>
          </p>
        </header>

        <section className="legal-section">
          <h2><LocalizedCopy>{"Cara menghapus akun"}</LocalizedCopy></h2>
          <ul className="legal-list">
            {steps.map((item) => (
              <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
            ))}
          </ul>
        </section>

        <section className="legal-section">
          <h2><LocalizedCopy>{"Apa yang terjadi setelahnya"}</LocalizedCopy></h2>
          <ul className="legal-list">
            {consequences.map((item) => (
              <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>
            ))}
          </ul>
        </section>

        <section className="legal-section">
          <h2><LocalizedCopy>{"Formulir permintaan"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Untuk mengajukan penghapusan atau membatalkan permintaan penghapusan tanpa aplikasi, gunakan formulir berikut."}</LocalizedCopy></p>
          <DeletionRequestForm />
        </section>

        <section className="legal-section">
          <h2><LocalizedCopy>{"Pertanyaan lain"}</LocalizedCopy></h2>
          <p>
            <LocalizedCopy>{"Pelajari data apa yang kami proses pada"}</LocalizedCopy>
            <LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedLink href="/privacy"><LocalizedCopy>{"Kebijakan Privasi"}</LocalizedCopy></LocalizedLink>
            <LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedCopy>{"atau hubungi privacy@slivadoc.com."}</LocalizedCopy>
          </p>
        </section>
      </div>
    </PublicPage>
  );
}
