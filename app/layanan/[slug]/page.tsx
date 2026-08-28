import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../components/seo/PublicSite";
import { serviceBySlug, servicePages } from "../../lib/seo-content";
import { SEO, absoluteUrl, breadcrumbSchema, pageMetadata } from "../../lib/seo-config";

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
      <section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Layanan", href: "/layanan" }, { label: service.name }]} /><div className="seo-hero-grid"><div><span className="seo-eyebrow">{service.eyebrow}</span><h1>{service.title}</h1><p>{service.intro}</p><div className="seo-hero-actions"><Link className="seo-primary" href="/?view=discover">Temukan {service.name}</Link><Link className="seo-secondary" href="/kota">Cari berdasarkan kota</Link></div></div><aside className="seo-hero-panel"><strong>Yang Slivadoc bantu</strong><ul>{service.benefits.map((item) => <li key={item}>{item}</li>)}</ul></aside></div></section>
      <section className="seo-main-section"><div className="seo-info-grid"><article className="seo-info-box"><h2>Sebelum memilih layanan</h2><p>Gunakan checklist ini untuk menyiapkan kebutuhan pet dan membuat keputusan yang lebih terarah.</p><ul className="seo-checklist">{service.checklist.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="seo-info-box"><h2>Pencarian yang relevan</h2><p>Slivadoc menghubungkan kategori, lokasi, profil pet, dan data mitra agar hasil yang ditemukan lebih sesuai dengan kebutuhan.</p><div className="seo-tag-list">{service.keywords.map((item) => <span key={item}>{item}</span>)}</div></article></div></section>
      <section className="seo-main-section"><div className="seo-section-heading"><h2>Pertanyaan tentang {service.name.toLowerCase()}</h2><p>Jawaban ringkas untuk membantu pet parent memahami batasan dan persiapan layanan.</p></div><div className="seo-faq">{service.faq.map((item) => <details key={item.question}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div></section>
      {related.length > 0 && <section className="seo-related"><div className="seo-main-section"><div className="seo-section-heading"><h2>Layanan terkait</h2></div><div className="seo-card-grid">{related.map((item) => item && <Link className="seo-card" key={item.slug} href={`/layanan/${item.slug}`}><small>{item.eyebrow}</small><h3>{item.name}</h3><p>{item.description}</p><span>Pelajari →</span></Link>)}</div></div></section>}
    </PublicPage>
  );
}
