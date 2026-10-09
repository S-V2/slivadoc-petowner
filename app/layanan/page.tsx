import { PetCareFinder } from "../components/PetCareFinder";
import { LocalizedCopy } from "../components/LocalizedCopy";
import { LocalizedLink as Link } from "../components/LocalizedCopy";
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
            <span className="seo-eyebrow"><LocalizedCopy>{"Ekosistem pet care"}</LocalizedCopy></span>
            <h1><LocalizedCopy>{"Satu tempat untuk kebutuhan setiap anabul"}</LocalizedCopy></h1>
            <p><LocalizedCopy>{"Dari konsultasi dokter hewan hingga petshop, grooming, pet hotel, home service, vaksinasi, dan adopsi—temukan pilihan yang relevan lalu lanjutkan aktivitasnya di Slivadoc."}</LocalizedCopy></p>
            <div className="seo-hero-actions"><Link className="seo-primary" href="/?view=discover"><LocalizedCopy>{"Cari layanan sekarang"}</LocalizedCopy></Link><Link className="seo-secondary" href="/kota"><LocalizedCopy>{"Lihat berdasarkan kota"}</LocalizedCopy></Link></div>
          </div>
          <aside className="seo-hero-panel"><strong><LocalizedCopy>{"Dirancang untuk pet parent"}</LocalizedCopy></strong><ul><li><LocalizedCopy>{"Pencarian layanan berdasarkan lokasi dan kategori"}</LocalizedCopy></li><li><LocalizedCopy>{"Informasi mitra dan layanan yang dapat dibandingkan"}</LocalizedCopy></li><li><LocalizedCopy>{"Booking, aktivitas, dan profil pet dalam satu akun"}</LocalizedCopy></li><li><LocalizedCopy>{"Panduan untuk membantu keputusan perawatan"}</LocalizedCopy></li></ul></aside>
        </div>
      </section>
      <PetCareFinder />
      <section className="seo-main-section">
        <div className="seo-section-heading"><h2><LocalizedCopy>{"Jelajahi layanan Slivadoc"}</LocalizedCopy></h2><p><LocalizedCopy>{"Pilih kebutuhan utama pet. Setiap halaman menjelaskan manfaat, persiapan, dan langkah aman sebelum menggunakan layanan."}</LocalizedCopy></p></div>
        <div className="seo-card-grid"><LocalizedCopy>{servicePages.map((item) => <Link className="seo-card" key={item.slug} href={`/layanan/${item.slug}`}><small><LocalizedCopy>{item.eyebrow}</LocalizedCopy></small><h2><LocalizedCopy>{item.name}</LocalizedCopy></h2><p><LocalizedCopy>{item.description}</LocalizedCopy></p><span><LocalizedCopy>{"Lihat layanan →"}</LocalizedCopy></span></Link>)}</LocalizedCopy></div>
      </section>
    </PublicPage>
  );
}
