import { LocalizedCopy } from "../components/LocalizedCopy";
import { LocalizedImage as Image } from "../components/LocalizedCopy";
import { LocalizedLink as Link } from "../components/LocalizedCopy";
import JsonLd from "../components/seo/JsonLd";
import { Breadcrumbs, PublicPage } from "../components/seo/PublicSite";
import { getPublicProducts } from "../lib/public-marketplace";
import { absoluteUrl, pageMetadata } from "../lib/seo-config";
import { productCategories } from "../lib/seo-taxonomy";

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
            <span className="seo-eyebrow"><LocalizedCopy>{"Sliva Market"}</LocalizedCopy></span>
            <h1><LocalizedCopy>{"Kebutuhan pet dari partner yang terhubung langsung"}</LocalizedCopy></h1>
            <p><LocalizedCopy>{"Bandingkan produk, harga, stok cabang, reputasi penjual, dan ulasan pembeli sebelum melanjutkan checkout yang aman di Slivadoc."}</LocalizedCopy></p>
            <div className="seo-hero-actions">
              <Link className="seo-primary" href="/?view=shop"><LocalizedCopy>{"Buka marketplace"}</LocalizedCopy></Link>
              <Link className="seo-secondary" href="/tempat"><LocalizedCopy>{"Lihat direktori mitra"}</LocalizedCopy></Link>
            </div>
          </div>
          <aside className="seo-hero-panel">
            <strong><LocalizedCopy>{"Belanja dengan informasi yang jelas"}</LocalizedCopy></strong>
            <ul>
              <li><LocalizedCopy>{"Produk hanya dari bisnis aktif"}</LocalizedCopy></li>
              <li><LocalizedCopy>{"Stok mengikuti inventori cabang"}</LocalizedCopy></li>
              <li><LocalizedCopy>{"Ulasan berasal dari transaksi terbayar"}</LocalizedCopy></li>
              <li><LocalizedCopy>{"Ongkir dan total dihitung server saat checkout"}</LocalizedCopy></li>
            </ul>
          </aside>
        </div>
      </section>
      <section className="seo-main-section">
        <h2><LocalizedCopy>{"Belanja berdasarkan kebutuhan"}</LocalizedCopy></h2>
        <div className="seo-tag-list"><LocalizedCopy>{productCategories.map((c) => <Link key={c.slug} href={`/belanja/kategori/${c.slug}`}><LocalizedCopy>{c.name}</LocalizedCopy></Link>)}</LocalizedCopy></div>
        <div className="seo-section-heading">
          <h2><LocalizedCopy>{"Produk yang tersedia"}</LocalizedCopy></h2>
          <p>
            <LocalizedCopy>{products.length}</LocalizedCopy><LocalizedCopy>{" produk aktif. Harga dan stok diperbarui dari sistem operasional partner Slivadoc."}</LocalizedCopy></p>
        </div>
        <LocalizedCopy catalogue>{products.length > 0 ? (
          <div className="seo-product-grid">
            <LocalizedCopy catalogue>{products.map((product) => (
              <Link
                className="seo-product-card"
                href={`/belanja/${product.slug}`}
                key={product.id}
              >
                <div className="seo-product-media">
                  <LocalizedCopy catalogue>{product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={`Foto ${product.name}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <span aria-hidden="true"><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
                  )}</LocalizedCopy>
                  <small className={product.available ? "" : "is-empty"}>
                    <LocalizedCopy>{product.available ? "Stok tersedia" : "Stok habis"}</LocalizedCopy>
                  </small>
                </div>
                <div className="seo-product-copy">
                  <span><LocalizedCopy>{product.category}</LocalizedCopy></span>
                  <h2><LocalizedCopy catalogue>{product.name}</LocalizedCopy></h2>
                  <p><LocalizedCopy>{product.businessName}</LocalizedCopy></p>
                  <strong><LocalizedCopy>{rupiah.format(product.price)}</LocalizedCopy></strong>
                  <small>
                    <LocalizedCopy>{product.reviewCount > 0
                      ? `★ ${product.rating.toFixed(1)} · ${product.reviewCount} ulasan`
                      : "Produk baru"}</LocalizedCopy>
                    <LocalizedCopy>{product.city ? ` · ${product.city}` : ""}</LocalizedCopy>
                  </small>
                </div>
              </Link>
            ))}</LocalizedCopy>
          </div>
        ) : (
          <div className="seo-empty">
            <h2><LocalizedCopy>{"Katalog sedang disinkronkan"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Buka Sliva Market untuk melihat produk aktif dan stok terkini."}</LocalizedCopy></p>
            <div className="seo-hero-actions seo-actions-centered">
              <Link className="seo-primary" href="/?view=shop"><LocalizedCopy>{"Buka Sliva Market"}</LocalizedCopy></Link>
            </div>
          </div>
        )}</LocalizedCopy>
      </section>
    </PublicPage>
  );
}
