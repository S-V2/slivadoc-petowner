import { LocalizedCopy } from "../../../../components/LocalizedCopy";
import type { Metadata } from "next";
import { LocalizedImage as Image } from "../../../../components/LocalizedCopy";
import { LocalizedLink as Link } from "../../../../components/LocalizedCopy";
import { notFound } from "next/navigation";
import JsonLd from "../../../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../../../components/seo/PublicSite";
import {
  getPublicPlace,
  getPublicServiceDetail,
} from "../../../../lib/public-directory";
import {
  absoluteUrl,
  breadcrumbSchema,
  pageMetadata,
} from "../../../../lib/seo-config";

type PageProps = {
  params: Promise<{ slug: string; serviceID: string }>;
};

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

async function loadService({ params }: PageProps) {
  const { slug, serviceID } = await params;
  const place = await getPublicPlace(slug);
  if (!place || !place.services.some((service) => service.id === serviceID)) {
    return { place: null, service: null };
  }
  const service = await getPublicServiceDetail(serviceID, place.branchId);
  return { place, service };
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { place, service } = await loadService(props);
  if (!place || !service) {
    return pageMetadata({
      title: "Layanan tidak ditemukan",
      description: "Layanan tidak ditemukan atau sudah tidak aktif.",
      path: "/places",
      noIndex: true,
    });
  }
  const path = `/places/${place.slug}/services/${service.id}`;
  return pageMetadata({
    title: `${service.name} di ${place.name} ${place.branchName}`,
    description:
      service.description ||
      `Lihat durasi, harga, persiapan, kebijakan, dan jadwal ${service.name} di ${place.city}.`,
    path,
    keywords: [
      service.name,
      service.category,
      `${service.category} ${place.city}`,
      `${place.name} ${place.branchName}`,
    ],
    ...(service.image_url
      ? { image: { url: service.image_url, alt: `Foto ${service.name}` } }
      : {}),
  });
}

function DetailList({
  title,
  values,
  empty,
}: {
  title: string;
  values: string[];
  empty: string;
}) {
  return (
    <article className="seo-card">
      <small><LocalizedCopy>{title}</LocalizedCopy></small>
      <LocalizedCopy>{values.length ? (
        <ul>
          <LocalizedCopy>{values.map((value) => (
            <li key={value}><LocalizedCopy>{value}</LocalizedCopy></li>
          ))}</LocalizedCopy>
        </ul>
      ) : (
        <p><LocalizedCopy>{empty}</LocalizedCopy></p>
      )}</LocalizedCopy>
    </article>
  );
}

export default async function PublicServicePage(props: PageProps) {
  const { place, service } = await loadService(props);
  if (!place || !service) notFound();
  const path = `/places/${place.slug}/services/${service.id}`;
  const licenseLabel =
    service.business_license_status === "verified"
      ? "Izin usaha terverifikasi"
      : service.business_license_status === "pending"
        ? "Izin usaha sedang ditinjau"
        : "Status izin belum tersedia";
  const openingHours = Object.entries(service.opening_hours ?? {});
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${absoluteUrl(path)}#service`,
      name: service.name,
      description: service.description || undefined,
      serviceType: service.category,
      provider: {
        "@type": "LocalBusiness",
        name: service.business_name,
        department: service.branch_name,
        address: {
          "@type": "PostalAddress",
          streetAddress: service.address,
          addressLocality: service.city,
          addressCountry: "ID",
        },
      },
      offers: {
        "@type": "Offer",
        url: absoluteUrl(path),
        priceCurrency: "IDR",
        price: service.price,
        availability: "https://schema.org/InStock",
      },
      areaServed: service.city,
    },
    breadcrumbSchema([
      { name: "Beranda", path: "/" },
      { name: "Direktori tempat", path: "/places" },
      { name: place.name, path: `/places/${place.slug}` },
      { name: service.name, path },
    ]),
  ];

  return (
    <PublicPage>
      <JsonLd data={schema} />
      <section className="seo-hero seo-product-detail-hero">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Tempat", href: "/places" },
            { label: place.name, href: `/places/${place.slug}` },
            { label: service.name },
          ]}
        />
        <div className="seo-product-detail-grid">
          <div className="seo-product-detail-media">
            <LocalizedCopy catalogue>{service.image_url ? (
              <Image
                src={service.image_url}
                alt={`Foto ${service.name}`}
                fill
                sizes="(max-width: 800px) 100vw, 44vw"
                priority
                unoptimized
              />
            ) : (
              <span aria-hidden="true"><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
            )}</LocalizedCopy>
          </div>
          <div className="seo-product-detail-copy">
            <span className="seo-eyebrow">
              <LocalizedCopy>{service.category}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{licenseLabel}</LocalizedCopy>
            </span>
            <h1><LocalizedCopy catalogue>{service.name}</LocalizedCopy></h1>
            <p>
              <LocalizedCopy catalogue>{service.description ||
                "Deskripsi rinci belum dicantumkan oleh mitra."}</LocalizedCopy>
            </p>
            <strong className="seo-product-detail-price">
              <LocalizedCopy>{service.price > 0 ? rupiah.format(service.price) : "Gratis"}</LocalizedCopy>
            </strong>
            <div className="seo-product-facts">
              <span>
                <b><LocalizedCopy>{service.duration_minutes}</LocalizedCopy><LocalizedCopy>{" menit"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"Durasi layanan"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{service.capacity}</LocalizedCopy></b>
                <small><LocalizedCopy>{"Kapasitas per slot"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{service.city}</LocalizedCopy></b>
                <small><LocalizedCopy>{"Lokasi cabang"}</LocalizedCopy></small>
              </span>
            </div>
            <div className="seo-seller-summary">
              <small><LocalizedCopy>{"PENYEDIA LAYANAN"}</LocalizedCopy></small>
              <b>
                <LocalizedCopy>{service.business_name}</LocalizedCopy><LocalizedCopy>{" — "}</LocalizedCopy><LocalizedCopy>{service.branch_name}</LocalizedCopy>
              </b>
              <span><LocalizedCopy>{service.address}</LocalizedCopy></span>
              <LocalizedCopy>{service.phone && <span><LocalizedCopy>{service.phone}</LocalizedCopy></span>}</LocalizedCopy>
            </div>
            <div className="seo-hero-actions">
              <Link
                className="seo-primary"
                href={`/?view=discover&service=${service.id}`}
              ><LocalizedCopy>{"Cek slot & booking"}</LocalizedCopy></Link>
              <Link className="seo-secondary" href={`/places/${place.slug}`}><LocalizedCopy>{"Kembali ke profil tempat"}</LocalizedCopy></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Cakupan dan kebutuhan layanan"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Rincian ditampilkan dari katalog aktif milik mitra."}</LocalizedCopy></p>
        </div>
        <div className="seo-card-grid">
          <DetailList
            title="Termasuk"
            values={service.inclusions ?? []}
            empty="Cakupan belum dicantumkan."
          />
          <DetailList
            title="Tidak termasuk"
            values={service.exclusions ?? []}
            empty="Pengecualian belum dicantumkan."
          />
          <DetailList
            title="Persiapan"
            values={service.preparation ?? []}
            empty="Tidak ada persiapan khusus yang dicantumkan."
          />
          <DetailList
            title="Perawatan setelah layanan"
            values={service.aftercare ?? []}
            empty="Instruksi lanjutan belum dicantumkan."
          />
          <DetailList
            title="Jenis pet yang didukung"
            values={service.supported_species ?? []}
            empty="Jenis pet belum dicantumkan."
          />
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Jadwal dan kebijakan"}</LocalizedCopy></h2>
        </div>
        <div className="seo-card-grid">
          <article className="seo-card">
            <small><LocalizedCopy>{"Jam operasional"}</LocalizedCopy></small>
            <LocalizedCopy>{openingHours.length ? (
              <ul>
                <LocalizedCopy>{openingHours.map(([day, value]) => (
                  <li key={day}>
                    <LocalizedCopy>{day.toUpperCase()}</LocalizedCopy><LocalizedCopy>{":"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{Array.isArray(value) ? value.join(", ") : value}</LocalizedCopy>
                  </li>
                ))}</LocalizedCopy>
              </ul>
            ) : (
              <p><LocalizedCopy>{"Jam operasional belum dicantumkan."}</LocalizedCopy></p>
            )}</LocalizedCopy>
          </article>
          <article className="seo-card">
            <small><LocalizedCopy>{"Pembatalan"}</LocalizedCopy></small>
            <p>
              <LocalizedCopy catalogue>{service.cancellation_policy ||
                "Kebijakan pembatalan belum dicantumkan."}</LocalizedCopy>
            </p>
          </article>
          <article className="seo-card">
            <small><LocalizedCopy>{"Perubahan jadwal"}</LocalizedCopy></small>
            <p>
              <LocalizedCopy>{service.reschedule_policy ||
                "Kebijakan perubahan jadwal belum dicantumkan."}</LocalizedCopy>
            </p>
          </article>
        </div>
      </section>
    </PublicPage>
  );
}
