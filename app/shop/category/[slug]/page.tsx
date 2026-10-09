import { LocalizedCopy } from "../../../components/LocalizedCopy";
import { LocalizedLink as Link } from "../../../components/LocalizedCopy";
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
  if (!category) return pageMetadata({ title: "Kategori tidak ditemukan", description: "Jelajahi produk pet Slivadoc.", path: "/shop", noIndex: true });
  const products = productsInCategory(await getPublicProducts(), slug);
  return pageMetadata({ title: `${category.name} di Marketplace Slivadoc`, description: category.description, path: `/shop/category/${slug}`, noIndex: products.length === 0 });
}
export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = categoryBySlug.get(slug);
  if (!category) notFound();
  const products = productsInCategory(await getPublicProducts(), slug);
  return <PublicPage><JsonLd data={[breadcrumbSchema([{ name: "Beranda", path: "/" }, { name: "Belanja", path: "/shop" }, { name: category.name, path: `/shop/category/${slug}` }]), { "@context": "https://schema.org", "@type": "ItemList", name: category.name, numberOfItems: products.length, itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: absoluteUrl(`/shop/${p.slug}`) })) }]} /><section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Belanja", href: "/shop" }, { label: category.name }]} /><span className="seo-eyebrow"><LocalizedCopy>{"Sliva Market"}</LocalizedCopy></span><h1><LocalizedCopy>{category.name}</LocalizedCopy></h1><p><LocalizedCopy>{category.description}</LocalizedCopy></p></section><section className="seo-main-section"><h2><LocalizedCopy>{"Produk dari mitra Slivadoc"}</LocalizedCopy></h2><LocalizedCopy>{products.length ? <ProductCards products={products} /> : <p><LocalizedCopy>{"Belum ada produk aktif di kategori ini. "}</LocalizedCopy><Link href="/shop"><LocalizedCopy>{"Lihat katalog lainnya"}</LocalizedCopy></Link><LocalizedCopy>{"."}</LocalizedCopy></p>}</LocalizedCopy></section><section className="seo-main-section"><h2><LocalizedCopy>{"Kategori lainnya"}</LocalizedCopy></h2><div className="seo-tag-list"><LocalizedCopy>{productCategories.filter((c) => c.slug !== slug).map((c) => <Link key={c.slug} href={`/shop/category/${c.slug}`}><LocalizedCopy>{c.name}</LocalizedCopy></Link>)}</LocalizedCopy></div></section></PublicPage>;
}
