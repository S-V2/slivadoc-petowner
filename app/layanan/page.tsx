import Link from "next/link";
import JsonLd from "../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { servicePages } from "../lib/seo-content";
import { absoluteUrl, pageMetadata } from "../lib/seo-config";

export const metadata = pageMetadata({
  title: "Layanan Pet Care, Dokter Hewan, Petshop & Grooming",
  description: "Jelajahi layanan Slivadoc untuk kesehatan, kebutuhan, perawatan, penitipan, konsultasi, dan adopsi hewan dalam satu ekosistem.",
  path: "/layanan",
  keywords: ["layanan hewan", "pet care", "dokter hewan", "petshop", "pet clinic", "grooming"],
});

export default function ServicesPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Layanan pet care Slivadoc",
    itemListElement: servicePages.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(`/layanan/${item.slug}`),
    })),
  };

  return (
    <PublicPage>
      <JsonLd data={itemList} />
      <section className="seo-hero">
        <Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Layanan" }]} />
        <div className="seo-hero-grid">
          <div>
            <span className="seo-eyebrow">Ekosistem pet care</span>
            <h1>Satu tempat untuk kebutuhan setiap anabul</h1>
            <p>Dari konsultasi dokter hewan hingga petshop, grooming, pet hotel, home service, vaksinasi, dan adopsi—temukan pilihan yang relevan lalu lanjutkan aktivitasnya di Slivadoc.</p>
            <div className="seo-hero-actions"><Link className="seo-primary" href="/?view=discover">Cari layanan sekarang</Link><Link className="seo-secondary" href="/kota">Lihat berdasarkan kota</Link></div>
          </div>
          <aside className="seo-hero-panel"><strong>Dirancang untuk pet parent</strong><ul><li>Pencarian layanan berdasarkan lokasi dan kategori</li><li>Informasi mitra dan layanan yang dapat dibandingkan</li><li>Booking, aktivitas, dan profil pet dalam satu akun</li><li>Panduan untuk membantu keputusan perawatan</li></ul></aside>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading"><h2>Jelajahi layanan Slivadoc</h2><p>Pilih kebutuhan utama pet. Setiap halaman menjelaskan manfaat, persiapan, dan langkah aman sebelum menggunakan layanan.</p></div>
        <div className="seo-card-grid">{servicePages.map((item) => <Link className="seo-card" key={item.slug} href={`/layanan/${item.slug}`}><small>{item.eyebrow}</small><h2>{item.name}</h2><p>{item.description}</p><span>Lihat layanan →</span></Link>)}</div>
      </section>
    </PublicPage>
  );
}
