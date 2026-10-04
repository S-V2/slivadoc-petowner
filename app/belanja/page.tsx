import Image from "next/image";
import Link from "next/link";
import JsonLd from "../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { getPublicProducts } from "../lib/public-marketplace";
import { absoluteUrl, pageMetadata } from "../lib/seo-config";

export const metadata = pageMetadata({
  title: "Belanja Kebutuhan Hewan dari Petshop Terverifikasi",
  description:
    "Temukan makanan, vitamin, mainan, dan kebutuhan hewan dengan stok langsung, penjual terverifikasi, serta ulasan pembeli di Slivadoc.",
  path: "/belanja",
  keywords: [
    "petshop online Indonesia",
    "makanan hewan",
    "vitamin hewan",
    "kebutuhan anabul",
    "marketplace pet",
  ],
});

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default async function MarketplacePage() {
  const products = await getPublicProducts();
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Produk pet dari partner Slivadoc",
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: product.name,
      url: absoluteUrl(`/belanja/${product.slug}`),
    })),
  };

  return (
    <PublicPage>
      <JsonLd data={schema} />
      <section className="seo-hero seo-shop-hero">
        <Breadcrumbs
          items={[{ label: "Beranda", href: "/" }, { label: "Belanja" }]}
        />
        <div className="seo-hero-grid">
          <div>
            <span className="seo-eyebrow">Sliva Market</span>
            <h1>Kebutuhan pet dari partner yang terhubung langsung</h1>
            <p>
              Bandingkan produk, harga, stok cabang, reputasi penjual, dan
              ulasan pembeli sebelum melanjutkan checkout yang aman di Slivadoc.
            </p>
            <div className="seo-hero-actions">
              <Link className="seo-primary" href="/?view=shop">
                Buka marketplace
              </Link>
              <Link className="seo-secondary" href="/tempat">
                Lihat direktori mitra
              </Link>
            </div>
          </div>
          <aside className="seo-hero-panel">
            <strong>Belanja dengan informasi yang jelas</strong>
            <ul>
              <li>Produk hanya dari bisnis aktif</li>
              <li>Stok mengikuti inventori cabang</li>
              <li>Ulasan berasal dari transaksi terbayar</li>
              <li>Ongkir dan total dihitung server saat checkout</li>
            </ul>
          </aside>
        </div>
      </section>
      <section className="seo-main-section">
        <div className="seo-section-heading">
          <h2>Produk yang tersedia</h2>
          <p>
            {products.length} produk aktif. Harga dan stok diperbarui dari sistem
            operasional partner Slivadoc.
          </p>
        </div>
        {products.length > 0 ? (
          <div className="seo-product-grid">
            {products.map((product) => (
              <Link
                className="seo-product-card"
                href={`/belanja/${product.slug}`}
                key={product.id}
              >
                <div className="seo-product-media">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={`Foto ${product.name}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <span aria-hidden="true">🐾</span>
                  )}
                  <small className={product.available ? "" : "is-empty"}>
                    {product.available ? "Stok tersedia" : "Stok habis"}
                  </small>
                </div>
                <div className="seo-product-copy">
                  <span>{product.category}</span>
                  <h2>{product.name}</h2>
                  <p>{product.businessName}</p>
                  <strong>{rupiah.format(product.price)}</strong>
                  <small>
                    {product.reviewCount > 0
                      ? `★ ${product.rating.toFixed(1)} · ${product.reviewCount} ulasan`
                      : "Produk baru"}
                    {product.city ? ` · ${product.city}` : ""}
                  </small>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="seo-empty">
            <h2>Katalog sedang disinkronkan</h2>
            <p>
              Buka Sliva Market untuk melihat produk aktif dan stok terkini.
            </p>
            <div className="seo-hero-actions seo-actions-centered">
              <Link className="seo-primary" href="/?view=shop">
                Buka Sliva Market
              </Link>
            </div>
          </div>
        )}
      </section>
    </PublicPage>
  );
}
