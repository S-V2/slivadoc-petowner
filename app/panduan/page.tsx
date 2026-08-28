import Link from "next/link";
import JsonLd from "../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { guidePages } from "../lib/seo-content";
import { absoluteUrl, pageMetadata } from "../lib/seo-config";

export const metadata = pageMetadata({ title: "Panduan Pet Parent & Perawatan Anabul", description: "Baca panduan Slivadoc tentang kesehatan, vaksin, nutrisi, grooming, pet hotel, dan adopsi hewan yang bertanggung jawab.", path: "/panduan", keywords: ["panduan anabul", "kesehatan kucing", "kesehatan anjing", "perawatan hewan"] });

export default function GuidesPage() {
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Panduan Pet Parent Slivadoc", url: absoluteUrl("/panduan"), hasPart: guidePages.map((item) => ({ "@type": "Article", headline: item.title, url: absoluteUrl(`/panduan/${item.slug}`) })) };
  return <PublicPage><JsonLd data={schema}/><section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Panduan" }]}/><div className="seo-hero-grid"><div><span className="seo-eyebrow">Pusat edukasi anabul</span><h1>Panduan yang membantu pet parent mengambil langkah berikutnya</h1><p>Pelajari dasar kesehatan, pencegahan, nutrisi, perawatan, penitipan, dan adopsi. Konten edukasi tidak menggantikan diagnosis atau pemeriksaan dokter hewan.</p></div><aside className="seo-hero-panel"><strong>Prinsip konten Slivadoc</strong><ul><li>Bahasa yang mudah dipahami pet parent</li><li>Membedakan edukasi dan diagnosis medis</li><li>Mengutamakan keselamatan dan rujukan profesional</li><li>Tanggal pembaruan terlihat pada setiap panduan</li></ul></aside></div></section><section className="seo-main-section"><div className="seo-card-grid">{guidePages.map((item)=><Link className="seo-card" key={item.slug} href={`/panduan/${item.slug}`}><small>{item.category} · {item.readMinutes} menit</small><h2>{item.title}</h2><p>{item.description}</p><span>Baca panduan →</span></Link>)}</div></section></PublicPage>;
}
