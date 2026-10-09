import { LocalizedCopy } from "../../components/LocalizedCopy";
import { LocalizedLink as Link } from "../../components/LocalizedCopy";
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
  return pageMetadata({ title: page?.title ?? "Halaman tidak ditemukan", description: page?.intro ?? "Kenali ekosistem Slivadoc.", path: `/for/${slug}`, noIndex: !page });
}
export default async function AudiencePage({ params }: Props) {
  const { slug } = await params;
  const page = audienceBySlug.get(slug);
  if (!page) notFound();
  return <PublicPage><JsonLd data={breadcrumbSchema([{ name: "Beranda", path: "/" }, { name: page.name, path: `/for/${slug}` }])} /><section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: page.name }]} /><div className="seo-hero-grid"><div><span className="seo-eyebrow"><LocalizedCopy>{"Slivadoc untuk "}</LocalizedCopy><LocalizedCopy>{page.name.toLowerCase()}</LocalizedCopy></span><h1><LocalizedCopy>{page.title}</LocalizedCopy></h1><p><LocalizedCopy>{page.intro}</LocalizedCopy></p><div className="seo-hero-actions"><a className="seo-primary" href={page.href}><LocalizedCopy>{page.cta}</LocalizedCopy></a><Link className="seo-secondary" href="/free"><LocalizedCopy>{"Lihat program gratis"}</LocalizedCopy></Link></div></div><aside className="seo-hero-panel"><strong><LocalizedCopy>{"Manfaat untukmu"}</LocalizedCopy></strong><ul><LocalizedCopy>{page.benefits.map((b) => <li key={b}><LocalizedCopy>{b}</LocalizedCopy></li>)}</LocalizedCopy></ul></aside></div></section><section className="seo-main-section"><h2><LocalizedCopy>{"Mulai dengan tiga langkah"}</LocalizedCopy></h2><ol className="seo-checklist"><LocalizedCopy>{page.steps.map((s) => <li key={s}><LocalizedCopy>{s}</LocalizedCopy></li>)}</LocalizedCopy></ol><p><LocalizedCopy>{"Harga produk, biaya konsultasi, layanan mitra, pengiriman, dan biaya pihak ketiga mengikuti rincian yang ditampilkan sebelum transaksi."}</LocalizedCopy></p><Link href="/regions"><LocalizedCopy>{"Jelajahi wilayah Indonesia"}</LocalizedCopy></Link></section><section className="seo-main-section"><h2><LocalizedCopy>{"Satu ekosistem, beragam kebutuhan"}</LocalizedCopy></h2><div className="seo-card-grid"><LocalizedCopy>{audiencePages.filter((p) => p.slug !== slug).map((p) => <Link className="seo-card" key={p.slug} href={`/for/${p.slug}`}><h3><LocalizedCopy>{p.name}</LocalizedCopy></h3><p><LocalizedCopy>{p.title}</LocalizedCopy></p></Link>)}</LocalizedCopy></div></section></PublicPage>;
}
