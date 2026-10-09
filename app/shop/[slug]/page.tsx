import { LocalizedCopy } from "../../components/LocalizedCopy";
import type { Metadata } from "next";
import { validGtin } from "../../lib/product-discovery";
import { LocalizedImage as Image } from "../../components/LocalizedCopy";
import { LocalizedLink as Link } from "../../components/LocalizedCopy";
import { notFound, permanentRedirect } from "next/navigation";
import JsonLd from "../../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../../components/seo/PublicSite";
import { getPublicProduct } from "../../lib/public-marketplace";
import {
  absoluteUrl,
  breadcrumbSchema,
  pageMetadata,
} from "../../lib/seo-config";

type PageProps = { params: Promise<{ slug: string }> };

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function socialImage(imageUrl: string) {
  if (!imageUrl) return undefined;
  return /^https?:\/\//i.test(imageUrl) ? imageUrl : absoluteUrl(imageUrl);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) {
    return pageMetadata({
      title: "Produk tidak ditemukan",
      description: "Produk Slivadoc tidak ditemukan atau sudah tidak aktif.",
      path: `/shop/${slug}`,
      noIndex: true,
    });
  }
  const productSummary = `${product.name} dari ${product.businessName}. Cek harga, stok, lokasi penjual, dan informasi produk di Slivadoc.`;
  const description =
    product.description.trim().length >= 50
      ? product.description.trim()
      : [product.description.trim(), productSummary].filter(Boolean).join(" ");
  const image = socialImage(product.imageUrl);
  return pageMetadata({
    title: `${product.name} — ${product.businessName}`,
    description,
    path: `/shop/${product.slug}`,
    keywords: [
      product.name,
      product.category,
      product.businessName,
      `petshop ${product.city || "Indonesia"}`,
    ],
    ...(image ? { image: { url: image, alt: `Foto ${product.name}` } } : {}),
  });
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) notFound();
  if (slug !== product.slug) permanentRedirect(`/shop/${product.slug}`);

  const productUrl = absoluteUrl(`/shop/${product.slug}`);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    ...(product.description ? { description: product.description } : {}),
    sku: product.sku,
    ...(validGtin(product.barcode) ? { gtin: product.barcode } : {}),
    ...(product.imageUrl ? { image: [socialImage(product.imageUrl)] } : {}),
    category: product.category,
    ...(product.brandName ? { brand: {
      "@type": "Brand",
      name: product.brandName,
    } } : {}),
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "IDR",
      price: product.price,
      availability: product.available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: product.businessName },
    },
    ...(product.reviewCount > 0 && product.rating >= 1
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <PublicPage>
      <JsonLd
        data={[
          productSchema,
          breadcrumbSchema([
            { name: "Beranda", path: "/" },
            { name: "Belanja", path: "/shop" },
            { name: product.name, path: `/shop/${product.slug}` },
          ]),
        ]}
      />
      <section className="seo-hero seo-product-detail-hero">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Belanja", href: "/shop" },
            { label: product.name },
          ]}
        />
        <div className="seo-product-detail-grid">
          <div className="seo-product-detail-media">
            <LocalizedCopy catalogue>{product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={`Foto ${product.name}`}
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
            <span className="seo-eyebrow"><LocalizedCopy>{product.category}</LocalizedCopy></span>
            <h1><LocalizedCopy catalogue>{product.name}</LocalizedCopy></h1>
            <p>
              <LocalizedCopy catalogue>{product.description ||
                "Deskripsi produk belum dicantumkan oleh penjual."}</LocalizedCopy>
            </p>
            <strong className="seo-product-detail-price">
              <LocalizedCopy>{rupiah.format(product.price)}</LocalizedCopy>
            </strong>
            <div className="seo-product-facts">
              <span>
                <b><LocalizedCopy>{product.available ? "Tersedia" : "Stok habis"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"Status stok saat ini"}</LocalizedCopy></small>
              </span>
              <span>
                <b>
                  <LocalizedCopy>{product.reviewCount > 0
                    ? `★ ${product.rating.toFixed(1)}`
                    : "Produk baru"}</LocalizedCopy>
                </b>
                <small><LocalizedCopy>{product.reviewCount}</LocalizedCopy><LocalizedCopy>{" ulasan terverifikasi"}</LocalizedCopy></small>
              </span>
              <span>
                <b><LocalizedCopy>{Math.round(product.soldCount).toLocaleString("id-ID")}</LocalizedCopy></b>
                <small><LocalizedCopy>{"produk terjual"}</LocalizedCopy></small>
              </span>
            </div>
            <div className="seo-seller-summary">
              <small>
                <LocalizedCopy>{product.businessLicenseStatus === "verified"
                  ? "IZIN USAHA PENJUAL TERVERIFIKASI"
                  : product.businessLicenseStatus === "pending"
                    ? "IZIN USAHA SEDANG DITINJAU"
                    : "DIJUAL OLEH PARTNER AKTIF"}</LocalizedCopy>
              </small>
              <b><LocalizedCopy>{product.businessName}</LocalizedCopy></b>
              <span>
                <LocalizedCopy>{[product.branchName, product.city]
                  .filter(Boolean)
                  .join(" · ") || "Lokasi cabang belum dicantumkan"}</LocalizedCopy>
              </span>
            </div>
            <div className="seo-hero-actions">
              <Link
                className="seo-primary"
                href={`/?view=shop&product=${product.id}`}
              >
                <LocalizedCopy>{product.available
                  ? "Beli di Sliva Market"
                  : "Lihat alternatif"}</LocalizedCopy>
              </Link>
              <Link className="seo-secondary" href="/shop"><LocalizedCopy>{"Kembali ke katalog"}</LocalizedCopy></Link>
            </div>
          </div>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Detail produk & kepatuhan"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Informasi berikut berasal dari data yang dicantumkan penjual pada katalog Slivadoc."}</LocalizedCopy></p>
        </div>
        <div className="seo-card-grid">
          <LocalizedCopy>{[
            ["Merek", product.brandName],
            ["Produsen", product.manufacturer],
            ["Negara asal", product.originCountry],
            ["Isi bersih", product.netContent],
            [
              "Registrasi",
              [product.registrationType, product.registrationNumber]
                .filter(Boolean)
                .join(" · "),
            ],
            ["Sertifikat halal", product.halalCertificateNumber],
            ["Nomor SNI", product.sniNumber],
          ]
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => (
              <article className="seo-card" key={label}>
                <small><LocalizedCopy>{label}</LocalizedCopy></small>
                <h2><LocalizedCopy>{value}</LocalizedCopy></h2>
              </article>
            ))}</LocalizedCopy>
          <LocalizedCopy>{!product.brandName &&
            !product.manufacturer &&
            !product.originCountry &&
            !product.registrationNumber && (
              <article className="seo-card">
                <small><LocalizedCopy>{"Informasi penjual"}</LocalizedCopy></small>
                <h2><LocalizedCopy>{"Detail kepatuhan produk belum dilengkapi"}</LocalizedCopy></h2>
              </article>
            )}</LocalizedCopy>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Penggunaan, keamanan, dan retur"}</LocalizedCopy></h2>
        </div>
        <div className="seo-card-grid">
          <LocalizedCopy catalogue>{[
            ["Komposisi / bahan", product.ingredients],
            ["Cara penggunaan", product.usageInstructions],
            ["Penyimpanan", product.storageInstructions],
            ["Peringatan", product.warnings],
            ["Isi kemasan", product.packageContents],
            ["Kebijakan retur", product.returnPolicy],
            ["Kebijakan garansi", product.warrantyPolicy],
          ]
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => (
              <article className="seo-card" key={label}>
                <small><LocalizedCopy>{label}</LocalizedCopy></small>
                <p><LocalizedCopy>{value}</LocalizedCopy></p>
              </article>
            ))}</LocalizedCopy>
          <LocalizedCopy catalogue>{!product.ingredients &&
            !product.usageInstructions &&
            !product.returnPolicy && (
              <article className="seo-card">
                <small><LocalizedCopy>{"Informasi penggunaan"}</LocalizedCopy></small>
                <p><LocalizedCopy>{"Penjual belum melengkapi petunjuk penggunaan dan kebijakan retur."}</LocalizedCopy></p>
              </article>
            )}</LocalizedCopy>
        </div>
      </section>
      <section className="seo-main-section seo-product-assurance">
        <article>
          <b><LocalizedCopy>{"Stok terhubung"}</LocalizedCopy></b>
          <p><LocalizedCopy>{"Ketersediaan berasal dari inventori cabang aktif."}</LocalizedCopy></p>
        </article>
        <article>
          <b><LocalizedCopy>{"Ulasan pembeli"}</LocalizedCopy></b>
          <p><LocalizedCopy>{"Ulasan hanya dapat dikirim setelah transaksi dibayar."}</LocalizedCopy></p>
        </article>
        <article>
          <b><LocalizedCopy>{"Total transparan"}</LocalizedCopy></b>
          <p><LocalizedCopy>{"Voucher, poin, layanan, dan ongkir dihitung oleh server."}</LocalizedCopy></p>
        </article>
      </section>
    </PublicPage>
  );
}
