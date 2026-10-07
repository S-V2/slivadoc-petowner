import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "../../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../../components/seo/PublicSite";
import { ProductCards } from "../../../components/seo/CatalogCards";
import { getPublicProducts } from "../../../lib/public-marketplace";
import { categoryBySlug, productCategories, productsInCategory } from "../../../lib/seo-taxonomy";
import { absoluteUrl, breadcrumbSchema, pageMetadata } from "../../../lib/seo-config";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = categoryBySlug.get(slug);
  if (!category) return pageMetadata({ title: "Kategori tidak ditemukan", description: "Jelajahi produk pet Slivadoc.", path: "/belanja", noIndex: true });
  const products = productsInCategory(await getPublicProducts(), slug);
  return pageMetadata({ title: `${category.name} di Marketplace Slivadoc`, description: category.description, path: `/belanja/kategori/${slug}`, noIndex: products.length === 0 });
}
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = categoryBySlug.get(slug);
  if (!category) notFound();
  const products = productsInCategory(await getPublicProducts(), slug);
  return <PublicPage><JsonLd data={[breadcrumbSchema([{ name: "Beranda", path: "/" }, { name: "Belanja", path: "/belanja" }, { name: category.name, path: `/belanja/kategori/${slug}` }]), { "@context": "https://schema.org", "@type": "ItemList", name: category.name, numberOfItems: products.length, itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: absoluteUrl(`/belanja/${p.slug}`) })) }]} /><section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Belanja", href: "/belanja" }, { label: category.name }]} /><span className="seo-eyebrow">Sliva Market</span><h1>{category.name}</h1><p>{category.description}</p></section><section className="seo-main-section"><h2>Produk dari mitra Slivadoc</h2>{products.length ? <ProductCards products={products} /> : <p>Belum ada produk aktif di kategori ini. <Link href="/belanja">Lihat katalog lainnya</Link>.</p>}</section><section className="seo-main-section"><h2>Kategori lainnya</h2><div className="seo-tag-list">{productCategories.filter((c) => c.slug !== slug).map((c) => <Link key={c.slug} href={`/belanja/kategori/${c.slug}`}>{c.name}</Link>)}</div></section></PublicPage>;
}
