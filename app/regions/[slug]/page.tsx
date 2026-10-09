import { LocalizedCopy } from "../../components/LocalizedCopy";
import { LocalizedLink as Link } from "../../components/LocalizedCopy";
import { notFound, permanentRedirect } from "next/navigation";
import JsonLd from "../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../components/seo/PublicSite";
import { ServiceCards } from "../../components/seo/CatalogCards";
import { getPublicPlaces } from "../../lib/public-directory";
import { regionCode, regionContext, regionLevel, regionPath, regionSlug } from "../../lib/seo-regions";
import { absoluteUrl, breadcrumbSchema, pageMetadata } from "../../lib/seo-config";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const context = await regionContext(regionCode(slug));
  if (!context) return pageMetadata({ title: "Wilayah tidak ditemukan", description: "Pilih wilayah dari direktori Indonesia.", path: "/regions", noIndex: true });
  const places = await getPublicPlaces(context.region.code);
  return pageMetadata({ title: `Layanan Hewan di ${context.region.name}`, description: `Telusuri layanan pet care di ${[context.region.name, ...context.ancestors.map((r) => r.name).reverse()].join(", ")}. Lihat lokasi, harga, dan layanan mitra Slivadoc yang aktif.`, path: regionPath(context.region), noIndex: places.length === 0 });
}
export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const context = await regionContext(regionCode(slug));
  if (!context) notFound();
  const { region, ancestors, children } = context;
  if (slug !== regionSlug(region)) permanentRedirect(regionPath(region));
  const places = await getPublicPlaces(region.code);
  const crumbs = [{ name: "Beranda", path: "/" }, { name: "Wilayah", path: "/regions" }, ...ancestors.map((r) => ({ name: r.name, path: regionPath(r) })), { name: region.name, path: regionPath(region) }];
  return <PublicPage><JsonLd data={[breadcrumbSchema(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: `Layanan hewan di ${region.name}`, url: absoluteUrl(regionPath(region)), about: { "@type": "AdministrativeArea", name: region.name, identifier: region.code }, mainEntity: { "@type": "ItemList", numberOfItems: places.length, itemListElement: places.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: absoluteUrl(`/places/${p.slug}`) })) } }]} /><section className="seo-hero"><Breadcrumbs items={crumbs.map((c, i) => ({ label: c.name, ...(i < crumbs.length - 1 ? { href: c.path } : {}) }))} /><span className="seo-eyebrow"><LocalizedCopy>{regionLevel(region.code)}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{region.code}</LocalizedCopy></span><h1><LocalizedCopy>{"Layanan hewan di "}</LocalizedCopy><LocalizedCopy>{region.name}</LocalizedCopy></h1><p><LocalizedCopy>{ancestors.map((r) => r.name).join(" · ") || "Indonesia"}</LocalizedCopy></p><p><LocalizedCopy>{"Temukan layanan dari cabang mitra yang terdaftar di wilayah ini. Periksa jadwal dan konfirmasikan kebutuhan hewan sebelum membuat booking."}</LocalizedCopy></p></section><section className="seo-main-section"><h2><LocalizedCopy>{"Layanan mitra di "}</LocalizedCopy><LocalizedCopy>{region.name}</LocalizedCopy></h2><ServiceCards places={places} /><LocalizedCopy>{places.length === 0 && <p><LocalizedCopy>{"Bisnis pet care di wilayah ini dapat "}</LocalizedCopy><Link href="/partners"><LocalizedCopy>{"bergabung sebagai mitra Slivadoc"}</LocalizedCopy></Link><LocalizedCopy>{"."}</LocalizedCopy></p>}</LocalizedCopy></section>{children.length > 0 && <section className="seo-main-section"><h2><LocalizedCopy>{"Pilih wilayah lebih rinci"}</LocalizedCopy></h2><div className="seo-card-grid"><LocalizedCopy>{children.map((r) => <Link className="seo-card" key={r.code} href={regionPath(r)}><small><LocalizedCopy>{regionLevel(r.code)}</LocalizedCopy></small><h3><LocalizedCopy>{r.name}</LocalizedCopy></h3><span><LocalizedCopy>{"Jelajahi wilayah →"}</LocalizedCopy></span></Link>)}</LocalizedCopy></div></section>}<section className="seo-main-section"><Link href="/shop"><LocalizedCopy>{"Belanja makanan, kandang, dan aksesoris hewan"}</LocalizedCopy></Link><p><LocalizedCopy>{"Lokasi penjual dan jangkauan pengiriman adalah informasi yang berbeda. Ketersediaan pengiriman diperiksa saat checkout."}</LocalizedCopy></p></section></PublicPage>;
}
