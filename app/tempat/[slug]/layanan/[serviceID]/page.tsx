import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
      path: "/tempat",
      noIndex: true,
    });
  }
  const path = `/tempat/${place.slug}/layanan/${service.id}`;
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
      <small>{title}</small>
      {values.length ? (
        <ul>
          {values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </article>
  );
}

export default async function PublicServicePage(props: PageProps) {
  const { place, service } = await loadService(props);
  if (!place || !service) notFound();
  const path = `/tempat/${place.slug}/layanan/${service.id}`;
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
      { name: "Direktori tempat", path: "/tempat" },
      { name: place.name, path: `/tempat/${place.slug}` },
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
            { label: "Tempat", href: "/tempat" },
            { label: place.name, href: `/tempat/${place.slug}` },
            { label: service.name },
          ]}
        />
        <div className="seo-product-detail-grid">
          <div className="seo-product-detail-media">
            {service.image_url ? (
              <Image
                src={service.image_url}
                alt={`Foto ${service.name}`}
                fill
                sizes="(max-width: 800px) 100vw, 44vw"
                priority
                unoptimized
              />
            ) : (
              <span aria-hidden="true">🐾</span>
            )}
          </div>
          <div className="seo-product-detail-copy">
            <span className="seo-eyebrow">
              {service.category} · {licenseLabel}
            </span>
            <h1>{service.name}</h1>
            <p>
              {service.description ||
                "Deskripsi rinci belum dicantumkan oleh mitra."}
            </p>
            <strong className="seo-product-detail-price">
              {service.price > 0 ? rupiah.format(service.price) : "Gratis"}
            </strong>
            <div className="seo-product-facts">
              <span>
                <b>{service.duration_minutes} menit</b>
                <small>Durasi layanan</small>
              </span>
              <span>
                <b>{service.capacity}</b>
                <small>Kapasitas per slot</small>
              </span>
              <span>
                <b>{service.city}</b>
                <small>Lokasi cabang</small>
              </span>
            </div>
            <div className="seo-seller-summary">
              <small>PENYEDIA LAYANAN</small>
              <b>
                {service.business_name} — {service.branch_name}
              </b>
              <span>{service.address}</span>
              {service.phone && <span>{service.phone}</span>}
            </div>
            <div className="seo-hero-actions">
              <Link
                className="seo-primary"
                href={`/?view=discover&service=${service.id}`}
              >
                Cek slot & booking
              </Link>
              <Link className="seo-secondary" href={`/tempat/${place.slug}`}>
                Kembali ke profil tempat
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2>Cakupan dan kebutuhan layanan</h2>
          <p>Rincian ditampilkan dari katalog aktif milik mitra.</p>
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
          <h2>Jadwal dan kebijakan</h2>
        </div>
        <div className="seo-card-grid">
          <article className="seo-card">
            <small>Jam operasional</small>
            {openingHours.length ? (
              <ul>
                {openingHours.map(([day, value]) => (
                  <li key={day}>
                    {day.toUpperCase()}:{" "}
                    {Array.isArray(value) ? value.join(", ") : value}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Jam operasional belum dicantumkan.</p>
            )}
          </article>
          <article className="seo-card">
            <small>Pembatalan</small>
            <p>
              {service.cancellation_policy ||
                "Kebijakan pembatalan belum dicantumkan."}
            </p>
          </article>
          <article className="seo-card">
            <small>Perubahan jadwal</small>
            <p>
              {service.reschedule_policy ||
                "Kebijakan perubahan jadwal belum dicantumkan."}
            </p>
          </article>
        </div>
      </section>
    </PublicPage>
  );
}
