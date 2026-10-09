import { LocalizedCopy } from "../../components/LocalizedCopy";
import type { Metadata } from "next";
import { LocalizedLink as Link } from "../../components/LocalizedCopy";
import { notFound } from "next/navigation";
import JsonLd from "../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../components/seo/PublicSite";
import { getPublicPlace, placeSchemaType } from "../../lib/public-directory";
import {
  absoluteUrl,
  breadcrumbSchema,
  pageMetadata,
} from "../../lib/seo-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPublicPlace(slug);
  if (!place)
    return pageMetadata({
      title: "Tempat tidak ditemukan",
      description:
        "Profil mitra Slivadoc tidak ditemukan atau sudah tidak aktif.",
      path: `/tempat/${slug}`,
      noIndex: true,
    });
  const title = `${place.name} ${place.branchName} — Layanan Pet di ${place.city}`;
  const description = `Lihat alamat dan ${place.services.length} layanan ${place.name} cabang ${place.branchName} di ${place.city} melalui direktori Slivadoc.`;
  return pageMetadata({
    title,
    description,
    path: `/tempat/${place.slug}`,
    keywords: [
      `${place.name} ${place.city}`,
      `pet care ${place.city}`,
      `dokter hewan ${place.city}`,
      `petshop ${place.city}`,
    ],
  });
}

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPublicPlace(slug);
  if (!place) notFound();
  const type = placeSchemaType(place);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": type,
      "@id": absoluteUrl(`/tempat/${place.slug}#business`),
      name: place.name,
      department: place.branchName,
      url: absoluteUrl(`/tempat/${place.slug}`),
      address: {
        "@type": "PostalAddress",
        streetAddress: place.address,
        addressLocality: place.city,
        addressCountry: "ID",
      },
      ...(typeof place.latitude === "number" &&
      typeof place.longitude === "number"
        ? {
            geo: {
              "@type": "GeoCoordinates",
              latitude: place.latitude,
              longitude: place.longitude,
            },
          }
        : {}),
      ...(typeof place.rating === "number" &&
      place.rating > 0 &&
      typeof place.reviewCount === "number" &&
      place.reviewCount > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: place.rating,
              reviewCount: place.reviewCount,
            },
          }
        : {}),
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `Layanan ${place.name}`,
        itemListElement: place.services.map((service) => ({
          "@type": "Offer",
          price: service.price,
          priceCurrency: "IDR",
          url: absoluteUrl(`/tempat/${place.slug}/layanan/${service.id}`),
          itemOffered: {
            "@type": "Service",
            name: service.name,
            serviceType: service.category,
          },
        })),
      },
    },
    breadcrumbSchema([
      { name: "Beranda", path: "/" },
      { name: "Direktori tempat", path: "/tempat" },
      { name: place.name, path: `/tempat/${place.slug}` },
    ]),
  ];
  return (
    <PublicPage>
      <JsonLd data={schema} />
      <section className="seo-hero">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Direktori tempat", href: "/tempat" },
            { label: place.name },
          ]}
        />
        <div className="seo-hero-grid">
          <div>
            <span className="seo-eyebrow"><LocalizedCopy>{"Mitra Slivadoc · "}</LocalizedCopy><LocalizedCopy>{place.city}</LocalizedCopy></span>
            <h1>
              <LocalizedCopy>{place.name}</LocalizedCopy><LocalizedCopy>{" — "}</LocalizedCopy><LocalizedCopy>{place.branchName}</LocalizedCopy>
            </h1>
            <p>
              <LocalizedCopy>{place.address}</LocalizedCopy><LocalizedCopy>{". Lihat layanan yang dipublikasikan dari sistem mitra dan lanjutkan pencarian atau booking melalui Slivadoc."}</LocalizedCopy></p>
            <div className="seo-hero-actions">
              <Link className="seo-primary" href={`/?view=clinics&branch=${place.branchId}`}><LocalizedCopy>{"Buka di Slivadoc"}</LocalizedCopy></Link>
              <Link className="seo-secondary" href="/tempat"><LocalizedCopy>{"Kembali ke direktori"}</LocalizedCopy></Link>
            </div>
            <LocalizedCopy>{place.latitude != null && place.longitude != null && (
              <div className="seo-hero-actions">
                <a
                  className="seo-secondary"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                ><LocalizedCopy>{"Petunjuk arah"}</LocalizedCopy></a>
              </div>
            )}</LocalizedCopy>
          </div>
          <aside className="seo-hero-panel">
            <strong><LocalizedCopy>{"Informasi lokasi"}</LocalizedCopy></strong>
            <ul>
              <li><LocalizedCopy>{place.address}</LocalizedCopy></li>
              <li><LocalizedCopy>{place.city}</LocalizedCopy></li>
              <li><LocalizedCopy>{place.services.length}</LocalizedCopy><LocalizedCopy>{" layanan aktif"}</LocalizedCopy></li>
              <LocalizedCopy>{place.rating != null && place.rating > 0 && (
                <li><LocalizedCopy>{"Rating "}</LocalizedCopy><LocalizedCopy>{place.rating}</LocalizedCopy><LocalizedCopy>{" dari "}</LocalizedCopy><LocalizedCopy>{place.reviewCount ?? 0}</LocalizedCopy><LocalizedCopy>{" ulasan"}</LocalizedCopy></li>
              )}</LocalizedCopy>
            </ul>
          </aside>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Layanan yang tersedia"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Harga dan ketersediaan mengikuti data aktif dari sistem mitra pada saat halaman dimuat."}</LocalizedCopy></p>
        </div>
        <div className="seo-card-grid">
          <LocalizedCopy catalogue>{place.services.map((service) => (
            <article className="seo-card" key={service.id}>
              <small><LocalizedCopy>{service.category}</LocalizedCopy></small>
              <h2>
                <Link href={`/tempat/${place.slug}/layanan/${service.id}`}>
                  <LocalizedCopy catalogue>{service.name}</LocalizedCopy>
                </Link>
              </h2>
              <p>
                <LocalizedCopy catalogue>{service.description ||
                  "Deskripsi layanan belum dicantumkan oleh mitra."}</LocalizedCopy>
              </p>
              <p>
                <LocalizedCopy>{service.durationMinutes > 0
                  ? `${service.durationMinutes} menit · `
                  : ""}</LocalizedCopy>
                <LocalizedCopy>{service.price > 0
                  ? new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      maximumFractionDigits: 0,
                    }).format(service.price)
                  : "Hubungi mitra"}</LocalizedCopy>
              </p>
              <Link
                className="seo-card-link"
                href={`/tempat/${place.slug}/layanan/${service.id}`}
              ><LocalizedCopy>{"Lihat detail & jadwal →"}</LocalizedCopy></Link>
            </article>
          ))}</LocalizedCopy>
        </div>
      </section>
    </PublicPage>
  );
}
