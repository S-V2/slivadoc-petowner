import Link from "next/link";
import type { PublicProduct } from "../../lib/public-marketplace";
import type { PublicPlace } from "../../lib/public-directory";
import { serviceMatches } from "../../lib/seo-taxonomy";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export function ProductCards({ products }: { products: PublicProduct[] }) {
  return <div className="seo-card-grid">{products.map((p) => <Link className="seo-card" key={p.id} href={`/belanja/${p.slug}`}><small>{p.category}</small><h3>{p.name}</h3><p>{p.businessName} · {p.city}</p><strong>{rupiah.format(p.price)}</strong><span>{p.available ? "Tersedia" : "Stok habis"}</span></Link>)}</div>;
}
export function ServiceCards({ places, category }: { places: PublicPlace[]; category?: string }) {
  const services = places.flatMap((p) => p.services.filter((s) => !category || serviceMatches(category, s)).map((s) => ({ place: p, service: s })));
  return services.length ? <div className="seo-card-grid">{services.map(({ place, service }) => <Link className="seo-card" key={`${place.branchId}-${service.id}`} href={`/tempat/${place.slug}/layanan/${service.id}`}><small>{place.name} · {place.city}</small><h3>{service.name}</h3><p>{service.description}</p><strong>{rupiah.format(service.price)}</strong><span>{service.durationMinutes} menit · Lihat layanan</span></Link>)}</div> : <p>Belum ada layanan aktif yang ditampilkan untuk pilihan ini. Periksa kembali nanti atau jelajahi wilayah lain.</p>;
}
