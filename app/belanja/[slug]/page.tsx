import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProduct(slug);
  if (!product) {
    return pageMetadata({
      title: "Produk tidak ditemukan",
      description: "Produk Slivadoc tidak ditemukan atau sudah tidak aktif.",
      path: `/belanja/${slug}`,
      noIndex: true,
    });
  }
  const description = `${product.name} dari ${product.businessName}. Cek harga, stok, lokasi penjual, dan ulasan pembeli terverifikasi di Slivadoc.`;
  const image = socialImage(product.imageUrl);
  return pageMetadata({
    title: `${product.name} — ${product.businessName}`,
    description,
    path: `/belanja/${product.slug}`,
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
  if (slug !== product.slug) permanentRedirect(`/belanja/${product.slug}`);

  const productUrl = absoluteUrl(`/belanja/${product.slug}`);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description,
    sku: product.sku,
    ...(product.barcode ? { gtin: product.barcode } : {}),
    ...(product.imageUrl ? { image: [socialImage(product.imageUrl)] } : {}),
    category: product.category,
    brand: { "@type": "Brand", name: product.businessName },
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
    ...(product.reviewCount > 0
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
            { name: "Belanja", path: "/belanja" },
            { name: product.name, path: `/belanja/${product.slug}` },
          ]),
        ]}
      />
      <section className="seo-hero seo-product-detail-hero">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "Belanja", href: "/belanja" },
            { label: product.name },
          ]}
        />
        <div className="seo-product-detail-grid">
          <div className="seo-product-detail-media">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={`Foto ${product.name}`}
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
            <span className="seo-eyebrow">{product.category}</span>
            <h1>{product.name}</h1>
            <p>{product.description}</p>
            <strong className="seo-product-detail-price">
              {rupiah.format(product.price)}
            </strong>
            <div className="seo-product-facts">
              <span>
                <b>{product.available ? "Tersedia" : "Stok habis"}</b>
                <small>Status stok saat ini</small>
              </span>
              <span>
                <b>
                  {product.reviewCount > 0
                    ? `★ ${product.rating.toFixed(1)}`
                    : "Produk baru"}
                </b>
                <small>{product.reviewCount} ulasan terverifikasi</small>
              </span>
              <span>
                <b>{Math.round(product.soldCount).toLocaleString("id-ID")}</b>
                <small>produk terjual</small>
              </span>
            </div>
            <div className="seo-seller-summary">
              <small>DIJUAL OLEH PARTNER TERVERIFIKASI</small>
              <b>{product.businessName}</b>
              <span>
                {[product.branchName, product.city].filter(Boolean).join(" · ") ||
                  "Partner Slivadoc"}
              </span>
            </div>
            <div className="seo-hero-actions">
              <Link
                className="seo-primary"
                href={`/?view=shop&product=${product.id}`}
              >
                {product.available ? "Beli di Sliva Market" : "Lihat alternatif"}
              </Link>
              <Link className="seo-secondary" href="/belanja">
                Kembali ke katalog
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="seo-main-section seo-product-assurance">
        <article>
          <b>Stok terhubung</b>
          <p>Ketersediaan berasal dari inventori cabang aktif.</p>
        </article>
        <article>
          <b>Ulasan pembeli</b>
          <p>Ulasan hanya dapat dikirim setelah transaksi dibayar.</p>
        </article>
        <article>
          <b>Total transparan</b>
          <p>Voucher, poin, layanan, dan ongkir dihitung oleh server.</p>
        </article>
      </section>
    </PublicPage>
  );
}
