import { LocalizedCopy } from "../LocalizedCopy";
import { LocalizedLink as Link } from "../LocalizedCopy";
import type { PublicProduct } from "../../lib/public-marketplace";
import type { PublicPlace } from "../../lib/public-directory";
import { serviceMatches } from "../../lib/seo-taxonomy";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export function ProductCards({ products }: { products: PublicProduct[] }) {
  return <div className="seo-card-grid"><LocalizedCopy>{products.map((p) => <Link className="seo-card" key={p.id} href={`/belanja/${p.slug}`}><small><LocalizedCopy>{p.category}</LocalizedCopy></small><h3><LocalizedCopy>{p.name}</LocalizedCopy></h3><p><LocalizedCopy>{p.businessName}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{p.city}</LocalizedCopy></p><strong><LocalizedCopy>{rupiah.format(p.price)}</LocalizedCopy></strong><span><LocalizedCopy>{p.available ? "Tersedia" : "Stok habis"}</LocalizedCopy></span></Link>)}</LocalizedCopy></div>;
}
export function ServiceCards({ places, category }: { places: PublicPlace[]; category?: string }) {
  const services = places.flatMap((p) => p.services.filter((s) => !category || serviceMatches(category, s)).map((s) => ({ place: p, service: s })));
  return services.length ? <div className="seo-card-grid"><LocalizedCopy>{services.map(({ place, service }) => <Link className="seo-card" key={`${place.branchId}-${service.id}`} href={`/tempat/${place.slug}/layanan/${service.id}`}><small><LocalizedCopy>{place.name}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{place.city}</LocalizedCopy></small><h3><LocalizedCopy>{service.name}</LocalizedCopy></h3><p><LocalizedCopy>{service.description}</LocalizedCopy></p><strong><LocalizedCopy>{rupiah.format(service.price)}</LocalizedCopy></strong><span><LocalizedCopy>{service.durationMinutes}</LocalizedCopy><LocalizedCopy>{" menit · Lihat layanan"}</LocalizedCopy></span></Link>)}</LocalizedCopy></div> : <p><LocalizedCopy>{"Belum ada layanan aktif yang ditampilkan untuk pilihan ini. Periksa kembali nanti atau jelajahi wilayah lain."}</LocalizedCopy></p>;
}
