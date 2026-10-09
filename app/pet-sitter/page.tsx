import Link from "next/link";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import JsonLd from "../components/seo/JsonLd";
import { PetCareFinder } from "../components/PetCareFinder";
import { absoluteUrl, breadcrumbSchema, pageMetadata } from "../lib/seo-config";
import type { PetSitter } from "../../shared/pet-sitter";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: "Pet Sitter, Cat Sitter & Dog Walking di Indonesia — Slivadoc",
  description:
    "Cari pet sitter untuk kunjungan rumah, pendampingan kucing dan anjing, serta dog walking. Bandingkan profil, area layanan, tarif, dan jadwal melalui Slivadoc.",
  path: "/pet-sitter",
});
const questions = [
  [
    "Apa itu pet sitter?",
    "Pet sitter membantu rutinitas hewan saat kamu berhalangan, seperti menyiapkan makan, mengganti air, membersihkan area pet, bermain, dan memberi kabar. Lingkup tugas disepakati sesuai profil, kondisi hewan, dan jenis layanan.",
  ],
  [
    "Apa bedanya pet sitter dengan pet hotel?",
    "Kunjungan pet sitter dilakukan di rumah sesuai layanan yang ditawarkan. Pet hotel menyediakan tempat menginap di fasilitas mitra. Pertimbangkan kebiasaan pet, durasi perjalanan, pengawasan yang dibutuhkan, dan aturan fasilitas sebelum memilih.",
  ],
  [
    "Berapa biaya pet sitter harian atau mingguan?",
    "Tarif mengikuti profil sitter, paket, durasi, dan jumlah pet. Periksa rincian total dan kebijakan pembatalan sebelum melanjutkan pemesanan. Harga pada hasil pencarian tidak selalu mencakup kebutuhan tambahan.",
  ],
  [
    "Bagaimana memilih cat sitter atau dog sitter?",
    "Cocokkan pengalaman menangani spesies, area layanan, kapasitas, durasi kunjungan, dan status verifikasi yang tertera. Sampaikan perilaku pet, pola makan, kontak darurat, serta instruksi akses rumah sebelum menyepakati layanan.",
  ],
  [
    "Apakah semua kota sudah tersedia?",
    "Ketersediaan bergantung pada sitter aktif, radius layanan, dan tanggal yang kamu pilih. Gunakan pencarian lokasi di aplikasi untuk memeriksa profil yang tersedia. Halaman ini tidak menjamin ada sitter di setiap kota.",
  ],
  [
    "Bisa melamar sebagai pet sitter freelance atau part-time?",
    "Buka Slivadoc Career, pilih posisi dan jenis kerja yang tersedia, lalu isi formulir sesuai peran serta unggah CV. Tim rekrutmen meninjau lamaran; pengiriman formulir tidak otomatis mengaktifkan akun penyedia layanan.",
  ],
];
export default async function Page() {
  let sitters: PetSitter[] = [],
    failed = false;
  try {
    const api = (
      process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? "http://localhost:8080"
    ).replace(/\/$/, "");
    const r = await fetch(`${api}/api/v1/public/pet-sitters`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    sitters = Array.isArray(data.data)
      ? data.data
          .filter(
            (s: PetSitter) => !s.is_local_profile && s.id && s.display_name,
          )
          .slice(0, 6)
      : [];
  } catch {
    failed = true;
  }
  return (
    <PublicPage>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "Beranda", path: "/" },
            { name: "Pet Sitter", path: "/pet-sitter" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Pet Sitter & Dog Walking Slivadoc",
            url: absoluteUrl("/pet-sitter"),
            description:
              "Panduan memilih pet sitter, kunjungan rumah, dan dog walking melalui Slivadoc.",
            about: {
              "@type": "Service",
              name: "Pencarian dan pemesanan pet sitter",
              serviceType: "Pet sitting",
              provider: {
                "@type": "Organization",
                name: "Slivadoc",
                url: absoluteUrl("/"),
              },
            },
          },
        ]}
      />
      <section className="seo-hero">
        <Breadcrumbs
          items={[{ label: "Beranda", href: "/" }, { label: "Pet Sitter" }]}
        />
        <div className="seo-hero-grid">
          <div>
            <span className="seo-eyebrow">SLIVADOC PET SITTER</span>
            <h1>Rutinitas pet tetap terjaga, meski kamu sedang berhalangan.</h1>
            <p>
              Temukan pet sitter, cat sitter, dog sitter, dan dog walking sesuai
              kebutuhan hewanmu. Kenali profilnya, periksa area layanan, lalu
              diskusikan rencana perawatan melalui Slivadoc.
            </p>
            <div className="seo-hero-actions">
              <Link className="seo-primary" href="/?view=sitter">
                Cari pet sitter →
              </Link>
              <Link className="seo-secondary" href="/career">
                Bergabung sebagai sitter
              </Link>
            </div>
          </div>
          <aside className="seo-hero-panel">
            <strong>Care starts with a good match.</strong>
            <ul>
              <li>
                Kunjungan rumah untuk makan, minum, bermain, dan rutinitas
                harian.
              </li>
              <li>
                Pendampingan di rumah sesuai durasi yang ditawarkan sitter.
              </li>
              <li>
                Dog walking sesuai karakter, kondisi, dan kebiasaan anjing.
              </li>
              <li>
                Profil, tarif, dan ketentuan layanan dapat diperiksa sebelum
                booking.
              </li>
            </ul>
          </aside>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2>Tiga langkah sebelum menitipkan rutinitas pet</h2>
          <p>
            Persiapan yang jelas membantu kamu dan sitter memahami kebutuhan
            yang sama.
          </p>
        </div>
        <div className="seo-card-grid">
          {[
            [
              "01 · Cocokkan kebutuhan",
              "Pilih kunjungan rumah, pendampingan, atau dog walking. Periksa spesies yang ditangani, durasi, kapasitas, dan lokasi sitter.",
            ],
            [
              "02 · Siapkan informasi",
              "Tuliskan jadwal makan, kebiasaan, kondisi yang perlu diperhatikan, kontak darurat, serta aturan akses rumah. Bahas kebutuhan khusus dengan penyedia.",
            ],
            [
              "03 · Tinjau pemesanan",
              "Pastikan tanggal, paket, total biaya, instruksi, serta kebijakan pembatalan sudah sesuai. Simpan rincian dan pantau aktivitas pemesanan di akunmu.",
            ],
          ].map(([title, body]) => (
            <article className="seo-card" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="seo-main-section">
        <h2>Jelajahi profil sitter</h2>
        <p>
          Area dan jadwal mengikuti ketersediaan penyedia. Buka pencarian untuk
          melihat pilihan terbaru.
        </p>
        {sitters.length ? (
          <div className="seo-card-grid">
            {sitters.map((s) => (
              <article className="seo-card" key={s.id}>
                <small>{[s.district, s.city].filter(Boolean).join(", ")}</small>
                <h3>{s.display_name}</h3>
                <p>{s.bio.slice(0, 220)}</p>
                <Link href="/?view=sitter">Periksa profil & jadwal →</Link>
              </article>
            ))}
          </div>
        ) : (
          <p>
            {failed
              ? "Daftar profil belum dapat dimuat. Kamu tetap bisa membuka pencarian dan mencoba kembali."
              : "Lihat ketersediaan berdasarkan lokasi dan tanggal melalui pencarian Slivadoc."}
          </p>
        )}
        <Link className="seo-primary" href="/?view=sitter">
          Buka pencarian sitter
        </Link>
      </section>
      <section className="seo-main-section">
        <h2>Pertanyaan seputar pet sitting</h2>
        <div className="seo-card-grid">
          {questions.map(([q, a]) => (
            <article className="seo-card" key={q}>
              <h3>{q}</h3>
              <p>{a}</p>
            </article>
          ))}
        </div>
      </section>
      <PetCareFinder />
      <section className="seo-main-section">
        <h2>Lengkapi rencana perawatan pet</h2>
        <div className="seo-hero-actions">
          <Link className="seo-secondary" href="/services/grooming-hewan">
            Pet groomer & grooming
          </Link>
          <Link className="seo-secondary" href="/services/pet-hotel">
            Pet hotel & penitipan
          </Link>
          <Link className="seo-secondary" href="/services/klinik-hewan">
            Klinik & dokter hewan
          </Link>
          <Link className="seo-secondary" href="/career">
            Lowongan pet care
          </Link>
        </div>
      </section>
    </PublicPage>
  );
}
