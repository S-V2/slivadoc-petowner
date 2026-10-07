import Link from "next/link";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { pageMetadata } from "../lib/seo-config";
import { provinces, regionPath, regionSource } from "../lib/seo-regions";

export const metadata = pageMetadata({ title: "Cari Petshop & Layanan Hewan di Seluruh Wilayah Indonesia", description: "Telusuri provinsi, kabupaten/kota, kecamatan, dan desa di Indonesia. Temukan layanan mitra Slivadoc sesuai data lokasi dan ketersediaan.", path: "/wilayah" });
export default function RegionsPage() {
  const counts = regionSource.counts;
  return <PublicPage><section className="seo-hero"><Breadcrumbs items={[{ label: "Beranda", href: "/" }, { label: "Wilayah Indonesia" }]} /><span className="seo-eyebrow">Dari kota sampai desa</span><h1>Temukan pet care di wilayahmu</h1><p>Pilih provinsi, lalu lanjutkan ke kabupaten/kota, kecamatan, dan desa atau kelurahan. Layanan yang ditampilkan mengikuti lokasi cabang mitra yang aktif.</p></section><section className="seo-main-section"><div className="seo-section-heading"><h2>{counts.provinces} provinsi Indonesia</h2><p>Direktori wilayah memuat {counts.regencies} kabupaten/kota, {counts.districts.toLocaleString("id-ID")} kecamatan, dan {counts.villages.toLocaleString("id-ID")} desa/kelurahan. Cakupan data wilayah berbeda dengan ketersediaan mitra.</p></div><div className="seo-card-grid">{provinces.map((r) => <Link className="seo-card" href={regionPath(r)} key={r.code}><small>Provinsi</small><h2>{r.name}</h2><span>Pilih kabupaten / kota →</span></Link>)}</div><p>Referensi wilayah: <a href={regionSource.source}>data wilayah Kemendagri 2025 melalui cahyadsn/wilayah</a>, snapshot {regionSource.sourceRevision}.</p></section></PublicPage>;
}
