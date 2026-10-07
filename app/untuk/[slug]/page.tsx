import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../components/seo/PublicSite";
import { audienceBySlug, audiencePages } from "../../lib/seo-audiences";
import { breadcrumbSchema, pageMetadata } from "../../lib/seo-config";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return audiencePages.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const page = audienceBySlug.get(slug);
  return pageMetadata({ title: page?.title ?? "Halaman tidak ditemukan", description: page?.intro ?? "Kenali ekosistem Slivadoc.", path: `/untuk/${slug}`, noIndex: !page });
}
export default async function AudiencePage({ params }: Props) {
  const { slug } = await params;
  const page = audienceBySlug.get(slug);
  if (!page) notFound();
  return <PublicPage><JsonLd data={breadcrumbSchema([{ name: "Beranda", path: "/" }, { name: page.name, path: `/untuk/${slug}` }])} /><section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: page.name }]} /><div className="seo-hero-grid"><div><span className="seo-eyebrow">Slivadoc untuk {page.name.toLowerCase()}</span><h1>{page.title}</h1><p>{page.intro}</p><div className="seo-hero-actions"><a className="seo-primary" href={page.href}>{page.cta}</a><Link className="seo-secondary" href="/gratis">Lihat program gratis</Link></div></div><aside className="seo-hero-panel"><strong>Manfaat untukmu</strong><ul>{page.benefits.map((b) => <li key={b}>{b}</li>)}</ul></aside></div></section><section className="seo-main-section"><h2>Mulai dengan tiga langkah</h2><ol className="seo-checklist">{page.steps.map((s) => <li key={s}>{s}</li>)}</ol><p>Harga produk, biaya konsultasi, layanan mitra, pengiriman, dan biaya pihak ketiga mengikuti rincian yang ditampilkan sebelum transaksi.</p><Link href="/wilayah">Jelajahi wilayah Indonesia</Link></section><section className="seo-main-section"><h2>Satu ekosistem, beragam kebutuhan</h2><div className="seo-card-grid">{audiencePages.filter((p) => p.slug !== slug).map((p) => <Link className="seo-card" key={p.slug} href={`/untuk/${p.slug}`}><h3>{p.name}</h3><p>{p.title}</p></Link>)}</div></section></PublicPage>;
}
