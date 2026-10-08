import { LocalizedCopy } from "../../components/LocalizedCopy";
import type { Metadata } from "next";
import { LocalizedLink as Link } from "../../components/LocalizedCopy";
import { notFound } from "next/navigation";
import JsonLd from "../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../components/seo/PublicSite";
import { serviceBySlug, servicePages } from "../../lib/seo-content";
import { SEO, absoluteUrl, breadcrumbSchema, pageMetadata } from "../../lib/seo-config";
import { getPublicPlaces } from "../../lib/public-directory";
import { ServiceCards } from "../../components/seo/CatalogCards";

export function generateStaticParams() {
  return servicePages.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = serviceBySlug.get(slug);
  if (!service) return pageMetadata({ title: "Layanan tidak ditemukan", description: "Layanan Slivadoc tidak ditemukan.", path: `/layanan/${slug}`, noIndex: true });
  return pageMetadata({ title: service.title, description: service.description, path: `/layanan/${service.slug}`, keywords: service.keywords });
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = serviceBySlug.get(slug);
  if (!service) notFound();
  const places = await getPublicPlaces();
  const related = service.related.map((item) => serviceBySlug.get(item)).filter(Boolean);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: service.name,
      description: service.description,
      url: absoluteUrl(`/layanan/${service.slug}`),
      areaServed: { "@type": "Country", name: "Indonesia" },
      provider: { "@type": "Organization", "@id": absoluteUrl("/#organization"), name: SEO.brand },
      availableChannel: { "@type": "ServiceChannel", serviceUrl: absoluteUrl("/?view=discover") },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: service.faq.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
    },
    breadcrumbSchema([{ name: "Beranda", path: "/" }, { name: "Layanan", path: "/layanan" }, { name: service.name, path: `/layanan/${service.slug}` }]),
  ];

  return (
    <PublicPage>
      <JsonLd data={schema} />
      <section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Layanan", href: "/layanan" }, { label: service.name }]} /><div className="seo-hero-grid"><div><span className="seo-eyebrow"><LocalizedCopy>{service.eyebrow}</LocalizedCopy></span><h1><LocalizedCopy catalogue>{service.title}</LocalizedCopy></h1><p><LocalizedCopy>{service.intro}</LocalizedCopy></p><div className="seo-hero-actions"><Link className="seo-primary" href="/?view=discover"><LocalizedCopy>{"Temukan "}</LocalizedCopy><LocalizedCopy catalogue>{service.name}</LocalizedCopy></Link><Link className="seo-secondary" href="/kota"><LocalizedCopy>{"Cari berdasarkan kota"}</LocalizedCopy></Link></div></div><aside className="seo-hero-panel"><strong><LocalizedCopy>{"Yang Slivadoc bantu"}</LocalizedCopy></strong><ul><LocalizedCopy catalogue>{service.benefits.map((item) => <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>)}</LocalizedCopy></ul></aside></div></section>
      <section className="seo-main-section" aria-label="Layanan mitra"><h2><LocalizedCopy>{"Pilihan "}</LocalizedCopy><LocalizedCopy catalogue>{service.name.toLowerCase()}</LocalizedCopy><LocalizedCopy>{" dari mitra"}</LocalizedCopy></h2><ServiceCards places={places} category={slug} /></section>
      <section className="seo-main-section"><div className="seo-info-grid"><article className="seo-info-box"><h2><LocalizedCopy>{"Sebelum memilih layanan"}</LocalizedCopy></h2><p><LocalizedCopy>{"Gunakan checklist ini untuk menyiapkan kebutuhan pet dan membuat keputusan yang lebih terarah."}</LocalizedCopy></p><ul className="seo-checklist"><LocalizedCopy>{service.checklist.map((item) => <li key={item}><LocalizedCopy>{item}</LocalizedCopy></li>)}</LocalizedCopy></ul></article><article className="seo-info-box"><h2><LocalizedCopy>{"Pencarian yang relevan"}</LocalizedCopy></h2><p><LocalizedCopy>{"Slivadoc menghubungkan kategori, lokasi, profil pet, dan data mitra agar hasil yang ditemukan lebih sesuai dengan kebutuhan."}</LocalizedCopy></p><div className="seo-tag-list"><LocalizedCopy>{service.keywords.map((item) => <span key={item}><LocalizedCopy>{item}</LocalizedCopy></span>)}</LocalizedCopy></div></article></div></section>
      <section className="seo-main-section"><div className="seo-section-heading"><h2><LocalizedCopy>{"Pertanyaan tentang "}</LocalizedCopy><LocalizedCopy catalogue>{service.name.toLowerCase()}</LocalizedCopy></h2><p><LocalizedCopy>{"Jawaban ringkas untuk membantu pet parent memahami batasan dan persiapan layanan."}</LocalizedCopy></p></div><div className="seo-faq"><LocalizedCopy>{service.faq.map((item) => <details key={item.question}><summary><LocalizedCopy>{item.question}</LocalizedCopy></summary><p><LocalizedCopy>{item.answer}</LocalizedCopy></p></details>)}</LocalizedCopy></div></section>
      {related.length > 0 && <section className="seo-related"><div className="seo-main-section"><div className="seo-section-heading"><h2><LocalizedCopy>{"Layanan terkait"}</LocalizedCopy></h2></div><div className="seo-card-grid"><LocalizedCopy>{related.map((item) => item && <Link className="seo-card" key={item.slug} href={`/layanan/${item.slug}`}><small><LocalizedCopy>{item.eyebrow}</LocalizedCopy></small><h3><LocalizedCopy>{item.name}</LocalizedCopy></h3><p><LocalizedCopy>{item.description}</LocalizedCopy></p><span><LocalizedCopy>{"Pelajari →"}</LocalizedCopy></span></Link>)}</LocalizedCopy></div></div></section>}
    </PublicPage>
  );
}
