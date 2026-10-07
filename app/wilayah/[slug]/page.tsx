import Link from "next/link";
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
  if (!context) return pageMetadata({ title: "Wilayah tidak ditemukan", description: "Pilih wilayah dari direktori Indonesia.", path: "/wilayah", noIndex: true });
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
  const crumbs = [{ name: "Beranda", path: "/" }, { name: "Wilayah", path: "/wilayah" }, ...ancestors.map((r) => ({ name: r.name, path: regionPath(r) })), { name: region.name, path: regionPath(region) }];
  return <PublicPage><JsonLd data={[breadcrumbSchema(crumbs), { "@context": "https://schema.org", "@type": "CollectionPage", name: `Layanan hewan di ${region.name}`, url: absoluteUrl(regionPath(region)), about: { "@type": "AdministrativeArea", name: region.name, identifier: region.code }, mainEntity: { "@type": "ItemList", numberOfItems: places.length, itemListElement: places.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: absoluteUrl(`/tempat/${p.slug}`) })) } }]} /><section className="seo-hero"><Breadcrumbs items={crumbs.map((c, i) => ({ label: c.name, ...(i < crumbs.length - 1 ? { href: c.path } : {}) }))} /><span className="seo-eyebrow">{regionLevel(region.code)} · {region.code}</span><h1>Layanan hewan di {region.name}</h1><p>{ancestors.map((r) => r.name).join(" · ") || "Indonesia"}</p><p>Temukan layanan dari cabang mitra yang terdaftar di wilayah ini. Periksa jadwal dan konfirmasikan kebutuhan hewan sebelum membuat booking.</p></section><section className="seo-main-section"><h2>Layanan mitra di {region.name}</h2><ServiceCards places={places} />{places.length === 0 && <p>Bisnis pet care di wilayah ini dapat <Link href="/mitra">bergabung sebagai mitra Slivadoc</Link>.</p>}</section>{children.length > 0 && <section className="seo-main-section"><h2>Pilih wilayah lebih rinci</h2><div className="seo-card-grid">{children.map((r) => <Link className="seo-card" key={r.code} href={regionPath(r)}><small>{regionLevel(r.code)}</small><h3>{r.name}</h3><span>Jelajahi wilayah →</span></Link>)}</div></section>}<section className="seo-main-section"><Link href="/belanja">Belanja makanan, kandang, dan aksesoris hewan</Link><p>Lokasi penjual dan jangkauan pengiriman adalah informasi yang berbeda. Ketersediaan pengiriman diperiksa saat checkout.</p></section></PublicPage>;
}
