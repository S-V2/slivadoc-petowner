"use client";

import Image from "next/image";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Icon, type IconName } from "../Icon";
import {
  createMarketplaceChat,
  getMarketplaceChatMessages,
  getMarketplaceStore,
  getProductReviews,
  saveProductReview,
  sendMarketplaceChatMessage,
  type MarketplaceChatMessage,
  type MarketplaceStoreProfile,
  type MarketplaceStoreResponse,
  type ProductReview,
} from "../../lib/platform-api";
import { formatRupiah, type Product, type Service } from "../../lib/petowner-domain";

type SortMode =
  | "recommended"
  | "popular"
  | "bestseller"
  | "rating"
  | "newest"
  | "price"
  | "price_desc";
type StoreSection = "products" | "services" | "categories" | "reviews" | "about";
type ReviewFilter = "all" | 5 | 4 | 3 | 2 | 1;
export type MarketplaceChatShortcut = "products" | "services" | "pet_hotel" | "orders";

const marketplaceChatShortcuts: ReadonlyArray<{
  id: MarketplaceChatShortcut;
  label: string;
  icon: IconName;
}> = [
  { id: "products", label: "Produk", icon: "cart" },
  { id: "services", label: "Layanan", icon: "heart" },
  { id: "pet_hotel", label: "Pet Hotel", icon: "home" },
  { id: "orders", label: "Pesanan", icon: "bag" },
];

const marketplaceChatEmojis = ["😊", "😍", "🙏", "👍", "🐾", "🐶", "🐱", "❤️"];

type ShopMarketplaceProps = {
  addToCart: (id: string, quantity?: number) => Promise<boolean>;
  buyNow: (id: string, quantity?: number) => void;
  setCartOpen: (value: boolean) => void;
  cartCount: number;
  notify: (message: string) => void;
  productCatalog: Product[];
  serviceCatalog: Service[];
  petName: string;
  favorites: string[];
  authenticated: boolean;
  onRequireLogin: () => void;
  toggleFavorite: (id: string) => void;
  onOpenService: (service: Service) => void;
};

const categoryIcons: Record<string, IconName> = {
  Semua: "sparkle",
  Makanan: "bag",
  Kesehatan: "heart",
  Vitamin: "heart",
  Mainan: "paw",
  Aksesori: "paw",
};

function compactNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}jt`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}rb`;
  return Math.max(0, Math.round(value)).toLocaleString("id-ID");
}

function earnedPoints(price: number) {
  return Math.max(0, Math.floor(price / 1_000));
}

function MarketplaceStars({
  value,
  size = 13,
}: {
  value: number;
  size?: number;
}) {
  return (
    <span
      className="market-stars"
      aria-label={`Rating ${value.toFixed(1)} dari 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Icon
          key={index}
          name="star"
          size={size}
          data-active={index < Math.round(value)}
        />
      ))}
    </span>
  );
}

function StoreAvatar({
  name,
  logoUrl,
  online = false,
  large = false,
}: {
  name: string;
  logoUrl?: string;
  online?: boolean;
  large?: boolean;
}) {
  return (
    <span className={`market-store-avatar ${large ? "is-large" : ""}`}>
      {logoUrl ? (
        <Image src={logoUrl} alt={`Logo ${name}`} fill sizes={large ? "84px" : "34px"} unoptimized />
      ) : (
        <b>{name.trim().slice(0, 1).toUpperCase() || "S"}</b>
      )}
      <i className={online ? "is-online" : ""} aria-hidden="true" />
    </span>
  );
}

function storePresenceLabel(online: boolean, lastSeen?: string) {
  if (online) return "Online sekarang";
  if (!lastSeen) return "Terakhir online belum tersedia";
  const value = new Date(lastSeen);
  if (Number.isNaN(value.getTime())) return "Terakhir online belum tersedia";
  return `Terakhir online ${value.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function ProductPicture({
  product,
  detail = false,
}: {
  product: Product;
  detail?: boolean;
}) {
  const images = Array.from(new Set([...(product.imageUrls ?? []), product.imageUrl].filter((value): value is string => Boolean(value))));
  const [activeImage, setActiveImage] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  useEffect(() => {
    if (!detail || images.length < 2) return;
    const timer = window.setInterval(
      () => setActiveImage((current) => (current + 1) % images.length),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [detail, images.length, product.id]);
  const imageUrl = images[activeImage] ?? product.imageUrl;
  return (
    <>
    <div className={detail ? "market-product-gallery" : "market-card-picture"}>
      {imageUrl ? (
        <>
          <button type="button" className={detail ? "market-detail-picture" : "market-card-image-button"} onClick={() => detail && setViewerOpen(true)} aria-label={detail ? `Perbesar foto ${product.name}` : undefined}>
            <Image
              src={imageUrl}
              alt={`Foto ${product.name}`}
              fill
              sizes={detail ? "(max-width: 860px) 100vw, 45vw" : "(max-width: 580px) 50vw, 22vw"}
              unoptimized
            />
            {detail && images.length > 1 && <span className="market-gallery-count"><Icon name="camera" size={13} /> {activeImage + 1}/{images.length}</span>}
          </button>
          {detail && images.length > 1 && <div className="market-gallery-thumbs" aria-label="Pilih foto produk">
            {images.map((url, index) => <button type="button" className={index === activeImage ? "active" : ""} key={url} onClick={() => setActiveImage(index)} aria-label={`Foto ${index + 1}`}><Image src={url} alt="" fill sizes="64px" unoptimized /></button>)}
          </div>}
        </>
      ) : (
        <div
          className="market-product-fallback"
          aria-label={`Ilustrasi ${product.name}`}
        >
          <i />
          <span>{product.emoji}</span>
          <small>{product.category}</small>
        </div>
      )}
    </div>
    {viewerOpen && imageUrl && <div className="market-image-viewer" role="dialog" aria-modal="true" aria-label={`Galeri ${product.name}`} onMouseDown={() => setViewerOpen(false)}>
      <button type="button" className="market-image-viewer-close" onClick={() => setViewerOpen(false)} aria-label="Tutup galeri"><Icon name="close" size={22} /></button>
      <div className="market-image-viewer-stage" onMouseDown={(event) => event.stopPropagation()}><Image src={imageUrl} alt={`Foto ${activeImage + 1} ${product.name}`} fill sizes="100vw" unoptimized /></div>
      {images.length > 1 && <div className="market-image-viewer-nav"><button type="button" onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)} aria-label="Foto sebelumnya">‹</button><span>{activeImage + 1} / {images.length}</span><button type="button" onClick={() => setActiveImage((activeImage + 1) % images.length)} aria-label="Foto berikutnya">›</button></div>}
    </div>}
    </>
  );
}

function ProductCard({
  product,
  favorite,
  onOpen,
  onStore,
  onFavorite,
}: {
  product: Product;
  favorite: boolean;
  onOpen: () => void;
  onStore: () => void;
  onFavorite: () => void;
}) {
  const badge = !product.available
    ? "Stok habis"
    : product.soldCount >= 25
      ? "Terlaris"
      : product.reviewCount === 0
        ? "Produk baru"
        : "Pilihan pet parent";

  return (
    <article
      className="market-product-card"
      role="link"
      tabIndex={0}
      aria-label={`Lihat detail ${product.name}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="market-card-media">
        <ProductPicture product={product} />
        <span
          className={`market-card-badge ${!product.available ? "is-empty" : ""}`}
        >
          {badge}
        </span>
        <button
          className={`market-favorite ${favorite ? "is-favorite" : ""}`}
          type="button"
          aria-label={
            favorite
              ? `Hapus ${product.name} dari favorit`
              : `Simpan ${product.name}`
          }
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
        >
          <Icon name="heart" size={17} />
        </button>
      </div>

      <div className="market-card-content">
        <span className="market-card-category">{product.category}</span>
        <h3>{product.name}</h3>
        <p className="market-card-description">
          {product.description ||
            "Kebutuhan pet pilihan dari partner Slivadoc."}
        </p>
        <button
          type="button"
          className="market-card-seller"
          onClick={(event) => {
            event.stopPropagation();
            onStore();
          }}
        >
          <StoreAvatar
            name={product.businessName}
            logoUrl={product.storeLogoUrl}
            online={product.storeIsOnline}
          />
          <span>
            <b>{product.businessName}</b>
            <small>{storePresenceLabel(Boolean(product.storeIsOnline), product.storeLastSeenAt)}</small>
          </span>
        </button>
        <strong className="market-card-price">
          {formatRupiah(product.price)}
        </strong>
        <div className="market-card-social-proof">
          <span>
            <Icon name="star" size={12} />
            {product.reviewCount ? product.rating.toFixed(1) : "Baru"}
            {product.reviewCount
              ? ` (${compactNumber(product.reviewCount)})`
              : ""}
          </span>
          <i />
          <span>{compactNumber(product.soldCount)} terjual</span>
        </div>
        <div className="market-card-fulfillment">
          <span>
            <Icon name="map" size={12} /> {product.city}
          </span>
          <span>
            {product.available
              ? `Stok ${compactNumber(product.stock)}`
              : "Tidak tersedia"}
          </span>
        </div>
        <div className="market-card-reward">
          <Icon name="sparkle" size={12} />
          Dapatkan {earnedPoints(product.price).toLocaleString("id-ID")} Sliva
          Point
        </div>
        <footer>
          <button
            type="button"
            className="market-detail-link"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            Detail <Icon name="arrow" size={14} />
          </button>
        </footer>
      </div>
    </article>
  );
}

function ProductReviews({
  product,
  reviews,
  loading,
  error,
  average,
  authenticated,
  onRequireLogin,
  onSubmit,
  submitting,
}: {
  product: Product;
  reviews: ProductReview[];
  loading: boolean;
  error: string;
  average: number;
  authenticated: boolean;
  onRequireLogin: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  submitting: boolean;
}) {
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [validation, setValidation] = useState("");
  const [reviewLimit, setReviewLimit] = useState(5);

  const distribution = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((score) => ({
        score,
        count: reviews.filter((review) => review.rating === score).length,
      })),
    [reviews],
  );
  const filteredReviews =
    filter === "all"
      ? reviews
      : reviews.filter((review) => review.rating === filter);
  const visibleReviews = filteredReviews.slice(0, reviewLimit);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!authenticated) {
      onRequireLogin();
      return;
    }
    if (comment.trim().length < 10) {
      setValidation("Tulis pengalaman minimal 10 karakter.");
      return;
    }
    setValidation("");
    try {
      await onSubmit(rating, comment.trim());
      setComment("");
    } catch (cause) {
      setValidation(
        cause instanceof Error ? cause.message : "Ulasan belum dapat disimpan.",
      );
    }
  }

  return (
    <section className="market-reviews" aria-labelledby="market-review-title">
      <header className="market-section-heading">
        <div>
          <span>SUARA PET PARENT</span>
          <h2 id="market-review-title">Ulasan & komentar</h2>
          <p>Semua komentar berasal dari pembelian yang sudah dibayar.</p>
        </div>
        <span className="market-review-count">{reviews.length} ulasan</span>
      </header>

      <div className="market-review-overview">
        <div className="market-review-score">
          <strong>{reviews.length ? average.toFixed(1) : "–"}</strong>
          <span>dari 5</span>
          <MarketplaceStars value={average} size={15} />
          <small>
            {product.reviewCount.toLocaleString("id-ID")} rating terkumpul
          </small>
        </div>
        <div className="market-rating-bars" aria-label="Distribusi rating">
          {distribution.map(({ score, count }) => (
            <div key={score}>
              <span>
                {score} <Icon name="star" size={11} />
              </span>
              <i>
                <b
                  style={{
                    width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`,
                  }}
                />
              </i>
              <small>{count}</small>
            </div>
          ))}
        </div>
      </div>

      <div
        className="market-review-filters"
        role="tablist"
        aria-label="Filter ulasan"
      >
        {(["all", 5, 4, 3, 2, 1] as ReviewFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            className={filter === value ? "active" : ""}
            onClick={() => {
              setFilter(value);
              setReviewLimit(5);
            }}
          >
            {value === "all" ? "Semua" : `${value} bintang`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="market-review-state">
          <i />
          <span>Memuat ulasan terbaru…</span>
        </div>
      ) : error ? (
        <div className="market-review-state is-error">
          <Icon name="chat" size={22} />
          <span>{error}</span>
        </div>
      ) : filteredReviews.length ? (
        <div className="market-review-list">
          {visibleReviews.map((review) => (
            <article key={review.id} className="market-review-card">
              <span className="market-review-avatar">
                {review.reviewer_name.slice(0, 1).toUpperCase() || "P"}
              </span>
              <div>
                <header>
                  <div>
                    <b>{review.reviewer_name}</b>
                    <span>
                      <Icon name="shield" size={11} /> Pembelian terverifikasi
                    </span>
                  </div>
                  <time dateTime={review.updated_at || review.created_at}>
                    {new Date(
                      review.updated_at || review.created_at,
                    ).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </header>
                <MarketplaceStars value={review.rating} size={12} />
                <p>{review.comment}</p>
              </div>
            </article>
          ))}
          {visibleReviews.length < filteredReviews.length && (
            <button
              className="market-review-more"
              type="button"
              onClick={() => setReviewLimit((current) => current + 5)}
            >
              Lihat{" "}
              {Math.min(5, filteredReviews.length - visibleReviews.length)}{" "}
              ulasan berikutnya
              <Icon name="chevron" size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="market-review-empty">
          <span>
            <Icon name="chat" size={24} />
          </span>
          <div>
            <b>
              {filter === "all"
                ? "Belum ada komentar"
                : `Belum ada rating ${filter} bintang`}
            </b>
            <p>Bagikan pengalamanmu setelah pesanan dibayar.</p>
          </div>
        </div>
      )}

      <form className="market-review-composer" onSubmit={submit}>
        <div>
          <span className="market-composer-icon">
            <Icon name="chat" size={20} />
          </span>
          <div>
            <b>Tulis ulasanmu</b>
            <p>Ulasan dapat dikirim oleh pembeli terverifikasi.</p>
          </div>
        </div>
        <fieldset>
          <legend>Rating produk</legend>
          <div>
            {Array.from({ length: 5 }, (_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`${index + 1} bintang`}
                onClick={() => setRating(index + 1)}
              >
                <Icon name="star" size={22} data-active={index < rating} />
              </button>
            ))}
            <span>{rating}/5</span>
          </div>
        </fieldset>
        <label>
          <span>Komentar</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="Ceritakan kualitas produk, kemasan, dan reaksi pet-mu…"
          />
          <small>{comment.length}/1000 karakter</small>
        </label>
        {validation && <p className="market-form-error">{validation}</p>}
        <button type="submit" disabled={submitting}>
          <Icon name={authenticated ? "chat" : "user"} size={16} />
          {submitting
            ? "Mempublikasikan…"
            : authenticated
              ? "Publikasikan ulasan"
              : "Masuk untuk memberi ulasan"}
        </button>
      </form>
    </section>
  );
}

function ProductDetail({
  product,
  favorite,
  reviews,
  reviewsLoading,
  reviewError,
  reviewAverage,
  reviewSubmitting,
  authenticated,
  onRequireLogin,
  onBack,
  onOpenStore,
  onChat,
  onFavorite,
  onAdd,
  onBuy,
  onSubmitReview,
}: {
  product: Product;
  favorite: boolean;
  reviews: ProductReview[];
  reviewsLoading: boolean;
  reviewError: string;
  reviewAverage: number;
  reviewSubmitting: boolean;
  authenticated: boolean;
  onRequireLogin: () => void;
  onBack: () => void;
  onOpenStore: () => void;
  onChat: () => void;
  onFavorite: () => void;
  onAdd: (quantity: number) => Promise<boolean>;
  onBuy: (quantity: number) => void;
  onSubmitReview: (rating: number, comment: string) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  async function addProduct() {
    if (adding || !product.available) return;
    setAdding(true);
    try {
      await onAdd(quantity);
    } finally {
      setAdding(false);
    }
  }
  const licenseLabel =
    product.licenseStatus === "verified"
      ? "Izin usaha terverifikasi"
      : product.licenseStatus === "pending"
        ? "Izin sedang ditinjau"
        : product.licenseStatus === "rejected"
          ? "Izin perlu diperbarui"
          : "Status izin belum tersedia";
  const complianceFacts = [
    ["Merek", product.brand],
    ["Produsen", product.manufacturer],
    ["Negara asal", product.originCountry],
    ["Isi bersih", product.netContent],
    ["Jenis registrasi", product.registrationType],
    ["Nomor registrasi", product.registrationNumber],
    ["Sertifikat halal", product.halalCertificateNumber],
    ["Nomor SNI", product.sniNumber],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const usageFacts = [
    ["Komposisi / bahan", product.ingredients],
    ["Cara penggunaan", product.usageInstructions],
    ["Penyimpanan", product.storageInstructions],
    ["Peringatan", product.warnings],
    ["Isi kemasan", product.packageContents],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <div className="market-product-detail">
      <nav className="market-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}>
          <Icon name="arrow" size={15} /> Marketplace
        </button>
        <Icon name="chevron" size={13} />
        <span>{product.category}</span>
        <Icon name="chevron" size={13} />
        <strong>{product.name}</strong>
      </nav>

      <section className="market-detail-hero">
        <div className="market-detail-gallery">
          <ProductPicture product={product} detail />
          <div className="market-detail-assurance">
            <span>
              <Icon name="shield" size={17} />
              <b>Belanja terlindungi</b>
              <small>Pembayaran aman</small>
            </span>
            <span>
              <Icon name="check" size={17} />
              <b>Stok langsung</b>
              <small>Dari sistem partner</small>
            </span>
            <span>
              <Icon name="map" size={17} />
              <b>Pengiriman jelas</b>
              <small>Asal toko tertera</small>
            </span>
          </div>
        </div>

        <div className="market-detail-main">
          <div className="market-detail-labels">
            <span>{product.category}</span>
            {product.available ? (
              <em>Siap dikirim</em>
            ) : (
              <em className="is-empty">Stok habis</em>
            )}
          </div>
          <div className="market-detail-title-row">
            <h1>{product.name}</h1>
            <button
              className={favorite ? "is-favorite" : ""}
              type="button"
              aria-label={favorite ? "Hapus dari favorit" : "Simpan ke favorit"}
              onClick={onFavorite}
            >
              <Icon name="heart" size={20} />
            </button>
          </div>
          <div className="market-detail-rating">
            <MarketplaceStars value={product.rating} />
            <b>
              {product.reviewCount ? product.rating.toFixed(1) : "Produk baru"}
            </b>
            <span>{product.reviewCount.toLocaleString("id-ID")} ulasan</span>
            <i />
            <span>{compactNumber(product.soldCount)} terjual</span>
          </div>
          <strong className="market-detail-price">
            {formatRupiah(product.price)}
          </strong>
          <p className="market-detail-points">
            <Icon name="sparkle" size={15} />
            Transaksi ini menghasilkan{" "}
            <b>
              {earnedPoints(product.price).toLocaleString("id-ID")} Sliva Point
            </b>
          </p>

          <div className="market-seller-card">
            <button type="button" className="market-seller-profile" onClick={onOpenStore}>
              <StoreAvatar
                name={product.businessName}
                logoUrl={product.storeLogoUrl}
                online={product.storeIsOnline}
                large
              />
              <span>
                <small>DIJUAL OLEH</small>
                <b>{product.businessName}</b>
                <p>
                  <Icon name="map" size={12} /> {product.branchName} ·{" "}
                  {product.city}
                </p>
                <p className={product.storeIsOnline ? "is-online" : ""}>
                  {storePresenceLabel(Boolean(product.storeIsOnline), product.storeLastSeenAt)}
                </p>
              </span>
            </button>
            <em>
              <Icon name="shield" size={12} /> {licenseLabel}
            </em>
            <div className="market-seller-actions">
              <button type="button" onClick={onChat}>
                <Icon name="chat" size={15} /> Chat toko
              </button>
              <button type="button" onClick={onOpenStore}>
                Kunjungi toko <Icon name="arrow" size={14} />
              </button>
            </div>
          </div>

          <div className="market-detail-copy">
            <h2>Tentang produk</h2>
            <p>
              {product.description ||
                "Deskripsi produk belum dicantumkan oleh penjual."}
            </p>
          </div>

          <dl className="market-product-facts">
            <div>
              <dt>Stok</dt>
              <dd>
                {product.available
                  ? `${product.stock.toLocaleString("id-ID")} tersedia`
                  : "Habis"}
              </dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{product.sku}</dd>
            </div>
            <div>
              <dt>Kategori</dt>
              <dd>{product.category}</dd>
            </div>
            {product.barcode && (
              <div>
                <dt>Barcode</dt>
                <dd>{product.barcode}</dd>
              </div>
            )}
          </dl>

          <section className="market-product-disclosures">
            <div>
              <h2>Identitas & kepatuhan produk</h2>
              {complianceFacts.length ? (
                <dl>
                  {complianceFacts.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>
                  Penjual belum melengkapi identitas atau nomor kepatuhan
                  produk.
                </p>
              )}
            </div>
            <div>
              <h2>Penggunaan yang aman</h2>
              {usageFacts.length ? (
                <dl>
                  {usageFacts.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>Petunjuk penggunaan belum dicantumkan oleh penjual.</p>
              )}
            </div>
            <div>
              <h2>Retur & garansi</h2>
              <p>
                {product.returnPolicy ||
                  "Kebijakan retur belum dicantumkan oleh penjual."}
              </p>
              {product.warrantyPolicy && <p>{product.warrantyPolicy}</p>}
            </div>
          </section>

          <div className="market-purchase-box">
            <label>
              <span>Jumlah</span>
              <div className="market-quantity">
                <button
                  type="button"
                  aria-label="Kurangi jumlah"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                >
                  −
                </button>
                <strong>{quantity}</strong>
                <button
                  type="button"
                  aria-label="Tambah jumlah"
                  disabled={quantity >= product.stock}
                  onClick={() =>
                    setQuantity((value) => Math.min(product.stock, value + 1))
                  }
                >
                  +
                </button>
              </div>
            </label>
            <p>
              <span>Subtotal</span>
              <b>{formatRupiah(product.price * quantity)}</b>
            </p>
            <div>
              <button
                type="button"
                disabled={!product.available || adding}
                aria-busy={adding}
                onClick={() => void addProduct()}
              >
                {adding ? (
                  <span className="market-add-spinner" aria-hidden="true" />
                ) : (
                  <Icon name="cart" size={17} />
                )}
                {adding ? "Menambahkan…" : "+ Keranjang"}
              </button>
              <button
                type="button"
                disabled={!product.available}
                onClick={() => onBuy(quantity)}
              >
                Beli sekarang
              </button>
            </div>
          </div>
        </div>
      </section>

      <ProductReviews
        key={product.id}
        product={product}
        reviews={reviews}
        loading={reviewsLoading}
        error={reviewError}
        average={reviewAverage}
        authenticated={authenticated}
        onRequireLogin={onRequireLogin}
        onSubmit={onSubmitReview}
        submitting={reviewSubmitting}
      />
    </div>
  );
}

export function MarketplaceChatPanel({
  threadId,
  store,
  product,
  onClose,
  onShortcut,
  notify,
}: {
  threadId: string;
  businessId: string;
  store: Pick<MarketplaceStoreProfile, "name" | "logo_url" | "is_online" | "last_seen_at">;
  product?: Product;
  onClose: () => void;
  onShortcut: (shortcut: MarketplaceChatShortcut) => void;
  notify: (message: string) => void;
}) {
  const [messages, setMessages] = useState<MarketplaceChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [composerTray, setComposerTray] = useState<"attachments" | "emoji">();
  const messageList = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const stickToLatest = useRef(true);
  const hasDraft = Boolean(draft.trim());

  const loadMessages = useCallback(async () => {
    try {
      const result = await getMarketplaceChatMessages(threadId);
      setMessages(result.data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pesan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void loadMessages(), 0);
    const interval = window.setInterval(() => void loadMessages(), 4_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [loadMessages]);

  useEffect(() => {
    if (!stickToLatest.current) return;
    const frame = window.requestAnimationFrame(() => {
      const list = messageList.current;
      if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await sendMarketplaceChatMessage(threadId, {
        body,
        product_id: product?.id,
      });
      setMessages((current) => [...current, message]);
      setDraft("");
      setComposerTray(undefined);
      stickToLatest.current = true;
      setError("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Pesan belum dapat dikirim.";
      setError(message);
      notify(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="market-chat-layer" role="dialog" aria-modal="true" aria-label={`Chat dengan ${store.name}`}>
      <button type="button" className="market-chat-scrim" aria-label="Tutup chat" onClick={onClose} />
      <section className="market-chat-panel">
        <header>
          <StoreAvatar
            name={store.name}
            logoUrl={store.logo_url}
            online={store.is_online}
          />
          <div>
            <b>{store.name}</b>
            <span className={store.is_online ? "is-online" : ""}>
              {storePresenceLabel(store.is_online, store.last_seen_at)}
            </span>
          </div>
          <button type="button" aria-label="Tutup chat" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </header>
        {product && (
          <div className="market-chat-context">
            <ProductPicture product={product} />
            <div>
              <small>TANYAKAN PRODUK INI</small>
              <b>{product.name}</b>
              <span>{formatRupiah(product.price)}</span>
            </div>
          </div>
        )}
        <div className="market-chat-notice">
          <Icon name="shield" size={14} /> Kanal ini hanya untuk pesan teks dengan toko. Jangan bagikan OTP atau kata sandi.
        </div>
        <div
          ref={messageList}
          className="market-chat-messages"
          aria-live="polite"
          onScroll={(event) => {
            const list = event.currentTarget;
            stickToLatest.current =
              list.scrollHeight - list.scrollTop - list.clientHeight < 72;
          }}
        >
          {loading ? (
            <p className="market-chat-state">Memuat percakapan…</p>
          ) : messages.length ? (
            messages.map((message) => (
              <article key={message.id} className={message.sender_type === "buyer" ? "is-mine" : ""}>
                <small>{message.sender_type === "buyer" ? "Kamu" : message.sender_name}</small>
                <p>{message.body}</p>
                <time dateTime={message.created_at}>
                  {new Date(message.created_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </article>
            ))
          ) : (
            <div className="market-chat-empty">
              <span>👋</span>
              <b>Mulai obrolan dengan toko</b>
              <p>Tanyakan stok, ukuran, kandungan, atau detail produk lainnya.</p>
            </div>
          )}
        </div>
        {error && <p className="market-chat-error">{error}</p>}
        {composerTray === "attachments" && (
          <div className="market-chat-shortcuts" role="group" aria-label="Pilihan chat toko">
            {marketplaceChatShortcuts.map((shortcut) => (
              <button
                type="button"
                key={shortcut.id}
                onClick={() => onShortcut(shortcut.id)}
              >
                <span><Icon name={shortcut.icon} size={19} /></span>
                <small>{shortcut.label}</small>
              </button>
            ))}
          </div>
        )}
        {composerTray === "emoji" && (
          <div className="market-chat-emojis" role="group" aria-label="Pilih emoji">
            {marketplaceChatEmojis.map((emoji) => (
              <button
                type="button"
                key={emoji}
                aria-label={`Gunakan emoji ${emoji}`}
                onClick={() => {
                  setDraft((current) => `${current}${emoji}`);
                  setComposerTray(undefined);
                  window.requestAnimationFrame(() => input.current?.focus());
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit}>
          <button
            type="button"
            className={`market-chat-tool ${composerTray === "attachments" ? "is-active" : ""}`}
            aria-label="Buka pilihan chat"
            aria-expanded={composerTray === "attachments"}
            onClick={() =>
              setComposerTray((current) =>
                current === "attachments" ? undefined : "attachments",
              )
            }
          >
            <Icon name="plus" size={20} />
          </button>
          <textarea
            ref={input}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (event.target.value.trim()) setComposerTray(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            maxLength={2000}
            rows={1}
            placeholder="Tulis pesan ke toko…"
            aria-label="Pesan untuk toko"
          />
          {hasDraft ? (
            <button
              type="submit"
              className="market-chat-action is-send"
              disabled={sending}
              aria-label={sending ? "Mengirim pesan" : "Kirim pesan"}
            >
              <Icon name="send" size={19} />
            </button>
          ) : (
            <button
              type="button"
              className={`market-chat-action is-emoji ${composerTray === "emoji" ? "is-active" : ""}`}
              aria-label="Buka pilihan emoji"
              aria-expanded={composerTray === "emoji"}
              onClick={() =>
                setComposerTray((current) =>
                  current === "emoji" ? undefined : "emoji",
                )
              }
            >
              <span aria-hidden="true">😊</span>
            </button>
          )}
        </form>
      </section>
    </div>
  );
}

function MarketplaceStorefront({
  response,
  products,
  services,
  initialSection,
  loading,
  error,
  favorites,
  onBack,
  onOpenProduct,
  onOpenService,
  onChat,
  onFavorite,
}: {
  response?: MarketplaceStoreResponse;
  products: Product[];
  services: Service[];
  initialSection: StoreSection;
  loading: boolean;
  error: string;
  favorites: string[];
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
  onOpenService: (service: Service) => void;
  onChat: () => void;
  onFavorite: (product: Product) => void;
}) {
  const [section, setSection] = useState<StoreSection>(initialSection);
  const [sort, setSort] = useState<SortMode>("popular");
  const [category, setCategory] = useState("Semua");
  const fallback = products[0];
  const fallbackService = services[0];
  const store = response?.store ?? {
    id: fallback?.businessId ?? fallbackService?.businessId ?? "",
    name: fallback?.businessName ?? fallbackService?.businessName ?? "Toko Slivadoc",
    logo_url: fallback?.storeLogoUrl ?? "",
    banner_url: "",
    about: "Katalog toko partner Slivadoc.",
    city: fallback?.city ?? fallbackService?.city ?? "Indonesia",
    joined_at: "",
    is_online: Boolean(fallback?.storeIsOnline),
    last_seen_at: fallback?.storeLastSeenAt ?? "",
    product_count: products.length,
    category_count: new Set(products.map((item) => item.category)).size,
    rating: products.reduce((total, item) => total + item.rating, 0) / Math.max(1, products.length),
    review_count: products.reduce((total, item) => total + item.reviewCount, 0),
    sold_count: products.reduce((total, item) => total + item.soldCount, 0),
  };
  const categories = response?.categories ?? Array.from(new Set(products.map((item) => item.category))).map((name) => ({
    name,
    product_count: products.filter((product) => product.category === name).length,
  }));
  const visible = useMemo(() => {
    const filtered = products.filter((product) => category === "Semua" || product.category === category);
    return [...filtered].sort((left, right) => {
      if (sort === "newest") return Date.parse(right.createdAt || "") - Date.parse(left.createdAt || "");
      if (sort === "price") return left.price - right.price;
      if (sort === "price_desc") return right.price - left.price;
      if (sort === "rating") return right.rating - left.rating || right.reviewCount - left.reviewCount;
      if (sort === "bestseller") return right.soldCount - left.soldCount;
      return (
        right.soldCount + right.reviewCount * 2 + right.rating * 5 -
        (left.soldCount + left.reviewCount * 2 + left.rating * 5)
      );
    });
  }, [category, products, sort]);

  if (loading && !fallback && !fallbackService) {
    return <div className="market-store-loading"><i /><span>Menyiapkan etalase toko…</span></div>;
  }
  if (error && !fallback && !fallbackService) {
    return <div className="market-empty-state"><span>!</span><h3>Etalase belum dapat dibuka</h3><p>{error}</p><button type="button" onClick={onBack}>Kembali</button></div>;
  }

  return (
    <div className="market-store-page">
      <nav className="market-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}><Icon name="arrow" size={15} /> Marketplace</button>
        <Icon name="chevron" size={13} />
        <strong>{store.name}</strong>
      </nav>
      <section className="market-store-hero">
        <div className="market-store-banner" style={store.banner_url ? { backgroundImage: `url(${store.banner_url})` } : undefined} />
        <div className="market-store-identity">
          <StoreAvatar
            name={store.name}
            logoUrl={store.logo_url}
            online={store.is_online}
            large
          />
          <div>
            <span className="market-store-verified"><Icon name="shield" size={12} /> Partner terverifikasi</span>
            <h1>{store.name}</h1>
            <p><Icon name="map" size={13} /> {store.city || "Indonesia"}</p>
            <p className={store.is_online ? "is-online" : ""}>{storePresenceLabel(store.is_online, store.last_seen_at)}</p>
          </div>
          <button type="button" onClick={onChat}><Icon name="chat" size={17} /> Chat toko</button>
        </div>
        <div className="market-store-stats">
          <span><b>{store.product_count}</b><small>Produk</small></span>
          <span><b>{services.length}</b><small>Layanan</small></span>
          <span><b>{store.rating ? store.rating.toFixed(1) : "Baru"}</b><small>Rating</small></span>
          <span><b>{compactNumber(store.sold_count)}</b><small>Terjual</small></span>
        </div>
      </section>

      <div className="market-store-navigation" role="tablist" aria-label="Bagian toko">
        {([
          ["products", "Produk"],
          ["services", "Layanan"],
          ["categories", "Kategori"],
          ["reviews", `Ulasan (${store.review_count})`],
          ["about", "Tentang toko"],
        ] as Array<[StoreSection, string]>).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={section === id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>

      {section === "products" && (
        <section className="market-store-products">
          <header>
            <div><span>ETALASE TOKO</span><h2>Temukan kebutuhan pet-mu</h2></div>
            <p>{visible.length} produk</p>
          </header>
          <div className="market-store-sort" role="tablist" aria-label="Urutan produk toko">
            {([
              ["popular", "Populer"],
              ["newest", "Terbaru"],
              ["bestseller", "Terlaris"],
              ["price", "Harga termurah"],
              ["price_desc", "Harga termahal"],
            ] as Array<[SortMode, string]>).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={sort === id} className={sort === id ? "active" : ""} onClick={() => setSort(id)}>{label}</button>
            ))}
          </div>
          <div className="market-store-category-filter">
            {["Semua", ...categories.map((item) => item.name)].map((name) => (
              <button key={name} type="button" className={category === name ? "active" : ""} onClick={() => setCategory(name)}>{name}</button>
            ))}
          </div>
          <div className="market-product-grid">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onOpen={() => onOpenProduct(product)} onStore={() => undefined} onFavorite={() => onFavorite(product)} />
            ))}
          </div>
        </section>
      )}

      {section === "services" && (
        <section className="market-store-services">
          <header>
            <div><span>LAYANAN PARTNER</span><h2>Pilih layanan dari {store.name}</h2></div>
            <p>{services.length} layanan</p>
          </header>
          {services.length ? (
            <div className="market-store-service-grid">
              {services.map((service) => (
                <button key={service.id} type="button" className="market-store-service-card" onClick={() => onOpenService(service)}>
                  <span className="market-store-service-media">
                    {service.imageUrl ? <Image src={service.imageUrl} alt={`Foto ${service.name}`} fill sizes="120px" unoptimized /> : <Icon name="paw" size={28} />}
                  </span>
                  <span className="market-store-service-copy">
                    <small>{service.type}</small>
                    <b>{service.name}</b>
                    <em>{service.durationMinutes ? `${service.durationMinutes} menit · ` : ""}{service.priceValue === undefined ? service.price : formatRupiah(service.priceValue)}</em>
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
              ))}
            </div>
          ) : <div className="market-review-empty"><span><Icon name="paw" size={24} /></span><div><b>Belum ada layanan aktif</b><p>Partner ini belum menerbitkan layanan untuk dibooking.</p></div></div>}
        </section>
      )}

      {section === "categories" && (
        <section className="market-store-info-grid">
          {categories.map((item) => (
            <button key={item.name} type="button" onClick={() => { setCategory(item.name); setSection("products"); }}>
              <span><Icon name={categoryIcons[item.name] || "bag"} size={24} /></span>
              <b>{item.name}</b><small>{item.product_count} produk</small>
            </button>
          ))}
        </section>
      )}

      {section === "reviews" && (
        <section className="market-store-review-list">
          <header><div><span>REPUTASI TOKO</span><h2>Ulasan dari pet parent</h2></div><b>{store.rating ? store.rating.toFixed(1) : "–"} / 5</b></header>
          {response?.reviews.length ? response.reviews.map((review) => (
            <article key={review.id}>
              <span>{review.reviewer_name.slice(0, 1).toUpperCase()}</span>
              <div><b>{review.reviewer_name}</b><MarketplaceStars value={review.rating} /><p>{review.comment}</p><small>{review.product_name} · {new Date(review.updated_at).toLocaleDateString("id-ID")}</small></div>
            </article>
          )) : <div className="market-review-empty"><span><Icon name="chat" size={24} /></span><div><b>Belum ada ulasan toko</b><p>Ulasan produk yang terverifikasi akan tampil di sini.</p></div></div>}
        </section>
      )}

      {section === "about" && (
        <section className="market-store-about">
          <div><span>🏪</span><div><small>TENTANG TOKO</small><h2>{store.name}</h2><p>{store.about}</p></div></div>
          <dl>
            <div><dt>Bergabung</dt><dd>{store.joined_at ? new Date(store.joined_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "Partner Slivadoc"}</dd></div>
            <div><dt>Lokasi</dt><dd>{store.city || "Indonesia"}</dd></div>
            <div><dt>Status</dt><dd>{store.is_online ? "Online" : "Offline"}</dd></div>
          </dl>
        </section>
      )}
    </div>
  );
}

export default function ShopMarketplace({
  addToCart,
  buyNow,
  setCartOpen,
  cartCount,
  notify,
  productCatalog,
  serviceCatalog,
  petName,
  favorites,
  authenticated,
  onRequireLogin,
  toggleFavorite,
  onOpenService,
}: ShopMarketplaceProps) {
  const [category, setCategory] = useState("Semua");
  const [store, setStore] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [selected, setSelected] = useState<Product>();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedStoreSection, setSelectedStoreSection] = useState<StoreSection>("products");
  const [storeResponse, setStoreResponse] = useState<MarketplaceStoreResponse>();
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState("");
  const [chat, setChat] = useState<{
    threadId: string;
    businessId: string;
    store: Pick<MarketplaceStoreProfile, "name" | "logo_url" | "is_online" | "last_seen_at">;
    product?: Product;
  }>();
  const [chatOpening, setChatOpening] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewAverage, setReviewAverage] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const reviewRequest = useRef(0);
  const deferredQuery = useDeferredValue(query);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>([["Semua", productCatalog.length]]);
    productCatalog.forEach((product) =>
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1),
    );
    return counts;
  }, [productCatalog]);
  const categories = useMemo(
    () =>
      ["Semua", ...categoryCounts.keys()].filter(
        (item, index, values) => values.indexOf(item) === index,
      ),
    [categoryCounts],
  );
  const stores = useMemo(
    () =>
      Array.from(
        new Map(
          productCatalog.map((item) => [
            item.businessId,
            { id: item.businessId, name: item.businessName },
          ]),
        ).values(),
      ),
    [productCatalog],
  );
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase("id");
    return productCatalog
      .filter(
        (product) =>
          (category === "Semua" || product.category === category) &&
          (!store || product.businessId === store) &&
          (!needle ||
            `${product.name} ${product.brand} ${product.businessName} ${product.category} ${product.description} ${product.city}`
              .toLocaleLowerCase("id")
              .includes(needle)),
      )
      .sort((left, right) => {
        if (sort === "rating")
          return (
            right.rating - left.rating || right.reviewCount - left.reviewCount
          );
        if (sort === "price") return left.price - right.price;
        if (sort === "price_desc") return right.price - left.price;
        if (sort === "newest")
          return Date.parse(right.createdAt || "") - Date.parse(left.createdAt || "");
        if (sort === "popular") return right.soldCount - left.soldCount;
        return (
          Number(right.available) - Number(left.available) ||
          right.soldCount - left.soldCount ||
          right.rating - left.rating
        );
      });
  }, [category, deferredQuery, productCatalog, sort, store]);

  const loadReviews = useCallback(async (product: Product) => {
    const requestId = reviewRequest.current + 1;
    reviewRequest.current = requestId;
    setReviews([]);
    setReviewAverage(product.rating);
    setReviewsLoading(true);
    setReviewError("");
    try {
      const result = await getProductReviews(product.id);
      if (requestId !== reviewRequest.current) return;
      setReviews(result.data);
      setReviewAverage(result.rating || product.rating);
    } catch (cause) {
      if (requestId !== reviewRequest.current) return;
      setReviews([]);
      setReviewAverage(product.rating);
      setReviewError(
        cause instanceof Error ? cause.message : "Ulasan belum dapat dimuat.",
      );
    } finally {
      if (requestId === reviewRequest.current) setReviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    const syncProductFromUrl = () => {
      const url = new URL(window.location.href);
      const productId = url.searchParams.get("product");
      const storeId = url.searchParams.get("store") || "";
      const storeSection = url.searchParams.get("store_section");
      const match = productCatalog.find((product) => product.id === productId);
      setSelected((current) => (current?.id === match?.id ? current : match));
      setSelectedStoreId(match ? "" : storeId);
      setSelectedStoreSection(storeSection === "services" ? "services" : "products");
      if (match) void loadReviews(match);
    };
    syncProductFromUrl();
    window.addEventListener("popstate", syncProductFromUrl);
    return () => window.removeEventListener("popstate", syncProductFromUrl);
  }, [loadReviews, productCatalog]);

  useEffect(() => {
    if (!selectedStoreId) return;
    let active = true;
    const initial = window.setTimeout(() => {
      setStoreLoading(true);
      setStoreError("");
      getMarketplaceStore(selectedStoreId)
        .then((result) => {
          if (active) setStoreResponse(result);
        })
        .catch((cause) => {
          if (active)
            setStoreError(cause instanceof Error ? cause.message : "Toko belum dapat dimuat.");
        })
        .finally(() => {
          if (active) setStoreLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(initial);
    };
  }, [selectedStoreId]);

  function setProductUrl(product?: Product) {
    const url = new URL(window.location.href);
    if (product) {
      url.searchParams.set("product", product.id);
      url.searchParams.delete("store");
      url.searchParams.delete("store_section");
    }
    else url.searchParams.delete("product");
    window.history.pushState(
      { view: "shop", product: product?.id },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  function openProduct(product: Product) {
    setSelected(product);
    setSelectedStoreId("");
    void loadReviews(product);
    setProductUrl(product);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeProduct() {
    reviewRequest.current += 1;
    setSelected(undefined);
    setProductUrl();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openStore(businessId: string, initialSection: StoreSection = "products") {
    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    url.searchParams.set("store", businessId);
    if (initialSection === "services") url.searchParams.set("store_section", "services");
    else url.searchParams.delete("store_section");
    setSelected(undefined);
    setStoreResponse(undefined);
    setSelectedStoreId(businessId);
    setSelectedStoreSection(initialSection);
    window.history.pushState({ view: "shop", store: businessId }, "", `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeStore() {
    const url = new URL(window.location.href);
    url.searchParams.delete("store");
    url.searchParams.delete("store_section");
    setSelectedStoreId("");
    setStoreResponse(undefined);
    window.history.pushState({ view: "shop" }, "", `${url.pathname}${url.search}${url.hash}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function openChat(product?: Product) {
    const storeProduct = product ?? productCatalog.find((item) => item.businessId === selectedStoreId);
    const businessId = storeProduct?.businessId || selectedStoreId;
    if (!authenticated) {
      onRequireLogin();
      return;
    }
    if (!businessId || chatOpening) return;
    setChatOpening(true);
    try {
      const thread = await createMarketplaceChat({ business_id: businessId, product_id: product?.id });
      const profile =
        storeResponse?.store.id === businessId ? storeResponse.store : undefined;
      setChat({
        threadId: thread.id,
        businessId,
        product,
        store: {
          name: profile?.name || storeProduct?.businessName || "Toko Slivadoc",
          logo_url: profile?.logo_url || storeProduct?.storeLogoUrl || "",
          is_online: profile?.is_online ?? Boolean(storeProduct?.storeIsOnline),
          last_seen_at: profile?.last_seen_at || storeProduct?.storeLastSeenAt || "",
        },
      });
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Chat toko belum dapat dibuka.");
    } finally {
      setChatOpening(false);
    }
  }

  function openChatShortcut(shortcut: MarketplaceChatShortcut) {
    const businessId = chat?.businessId || selectedStoreId;
    setChat(undefined);
    if (businessId && (shortcut === "products" || shortcut === "services")) {
      openStore(businessId, shortcut === "services" ? "services" : "products");
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    url.searchParams.delete("store");
    url.searchParams.delete("store_section");
    url.searchParams.delete("activity");
    if (shortcut === "pet_hotel") {
      url.searchParams.set("view", "discover");
      url.searchParams.set("service_type", "Pet Hotel");
      url.searchParams.delete("activity_type");
      window.localStorage.setItem("slivadoc.active_view", "discover");
    } else {
      url.searchParams.set("view", "bookings");
      url.searchParams.set("activity_type", "order");
      url.searchParams.delete("service_type");
      window.localStorage.setItem("slivadoc.active_view", "bookings");
    }
    window.history.pushState(
      { view: url.searchParams.get("view") },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async function submitReview(rating: number, comment: string) {
    if (!selected) return;
    setReviewSubmitting(true);
    try {
      const result = await saveProductReview(selected.id, { rating, comment });
      notify(result.message);
      const refreshed = await getProductReviews(selected.id);
      setReviews(refreshed.data);
      setReviewAverage(refreshed.rating || rating);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Ulasan belum dapat disimpan";
      notify(message);
      throw cause;
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (selected) {
    return (
      <>
        <ProductDetail
          key={selected.id}
          product={selected}
          favorite={favorites.includes(selected.id)}
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          reviewError={reviewError}
          reviewAverage={reviewAverage || selected.rating}
          reviewSubmitting={reviewSubmitting}
          authenticated={authenticated}
          onRequireLogin={onRequireLogin}
          onBack={closeProduct}
          onOpenStore={() => openStore(selected.businessId)}
          onChat={() => void openChat(selected)}
          onFavorite={() => toggleFavorite(selected.id)}
          onAdd={(quantity) => addToCart(selected.id, quantity)}
          onBuy={(quantity) => buyNow(selected.id, quantity)}
          onSubmitReview={submitReview}
        />
        {chat && <MarketplaceChatPanel {...chat} onClose={() => setChat(undefined)} onShortcut={openChatShortcut} notify={notify} />}
      </>
    );
  }

  if (selectedStoreId) {
    const storeProducts = productCatalog.filter((product) => product.businessId === selectedStoreId);
    return (
      <>
        <MarketplaceStorefront
          key={`${selectedStoreId}-${selectedStoreSection}`}
          response={storeResponse}
          products={storeProducts}
          services={serviceCatalog.filter((service) => service.businessId === selectedStoreId)}
          initialSection={selectedStoreSection}
          loading={storeLoading}
          error={storeError}
          favorites={favorites}
          onBack={closeStore}
          onOpenProduct={openProduct}
          onOpenService={onOpenService}
          onChat={() => void openChat()}
          onFavorite={(product) => toggleFavorite(product.id)}
        />
        {chat && <MarketplaceChatPanel {...chat} onClose={() => setChat(undefined)} onShortcut={openChatShortcut} notify={notify} />}
      </>
    );
  }

  const sellerCount = new Set(
    productCatalog.map((product) => product.businessId),
  ).size;

  return (
    <div className="shop-native market-home">
      <header className="market-mobile-header">
        <div>
          <span>SLIVA MARKET</span>
          <h1>Kebutuhan pet, lengkap.</h1>
        </div>
        <button
          type="button"
          aria-label="Buka keranjang"
          onClick={() => setCartOpen(true)}
        >
          <Icon name="cart" size={20} />
          {cartCount > 0 && <b>{cartCount > 99 ? "99+" : cartCount}</b>}
        </button>
      </header>

      <section className="market-hero">
        <div className="market-hero-copy">
          <span>
            <Icon name="shield" size={13} /> MARKETPLACE PET TERINTEGRASI
          </span>
          <h1>Belanja lebih tenang untuk sahabat terbaikmu.</h1>
          <p>
            Bandingkan produk, cek stok asli, baca ulasan pembeli, lalu checkout
            dari banyak petshop dalam satu keranjang.
          </p>
          <div className="market-hero-trust">
            <span>
              <b>{productCatalog.length}</b> produk aktif
            </span>
            <span>
              <b>{sellerCount}</b> partner
            </span>
            <span>
              <b>100%</b> stok live
            </span>
          </div>
        </div>
        <div className="market-hero-art" aria-hidden="true">
          <i />
          <span>🛍️</span>
          <b>🐾</b>
        </div>
      </section>

      <div className="market-sticky-tools">
        <label className="market-search">
          <Icon name="search" size={19} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari makanan, vitamin, mainan, atau toko…"
            aria-label="Cari produk atau toko"
          />
          {query && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setQuery("")}
            >
              <Icon name="close" size={15} />
            </button>
          )}
        </label>
        <button
          className="market-cart-button"
          type="button"
          aria-label="Keranjang"
          onClick={() => setCartOpen(true)}
        >
          <Icon name="cart" size={18} />
          <span>Keranjang</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </button>
      </div>

      <section className="market-category-section">
        <header className="market-section-heading">
          <div>
            <span>BELANJA SESUAI KEBUTUHAN</span>
            <h2>Kategori populer</h2>
          </div>
        </header>
        <div
          className="market-category-rail"
          role="tablist"
          aria-label="Kategori produk"
        >
          {categories.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={category === item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              key={item}
            >
              <span>
                <Icon name={categoryIcons[item] || "bag"} size={20} />
              </span>
              <b>{item}</b>
              <small>{categoryCounts.get(item) ?? 0} produk</small>
            </button>
          ))}
        </div>
      </section>

      <section className="market-catalog-section">
        <header className="market-catalog-heading">
          <div>
            <span>PILIHAN UNTUK {petName.toUpperCase()}</span>
            <h2>Produk terbaik dari partner Slivadoc</h2>
            <p>{filtered.length} produk sesuai pilihanmu</p>
          </div>
          <div className="market-catalog-filters">
            <label>
              <span>Toko</span>
              <select
                value={store}
                onChange={(event) => setStore(event.target.value)}
              >
                <option value="">Semua produk</option>
                {stores.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Urutkan</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
              >
                <option value="recommended">Rekomendasi</option>
                <option value="popular">Terlaris</option>
                <option value="rating">Rating tertinggi</option>
                <option value="price">Harga termurah</option>
              </select>
            </label>
          </div>
        </header>

        {filtered.length ? (
          <div className="market-product-grid">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                favorite={favorites.includes(product.id)}
                onOpen={() => openProduct(product)}
                onStore={() => openStore(product.businessId)}
                onFavorite={() => toggleFavorite(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="market-empty-state">
            <span>
              <Icon name="search" size={28} />
            </span>
            <h3>Produk belum ditemukan</h3>
            <p>Coba ganti kata kunci, kategori, atau pilihan toko.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("Semua");
                setStore("");
              }}
            >
              Reset filter
            </button>
          </div>
        )}
      </section>

      <section className="market-confidence-strip">
        <article>
          <span>
            <Icon name="shield" size={19} />
          </span>
          <div>
            <b>Status partner transparan</b>
            <p>
              Produk hanya dari bisnis aktif; status izin ditampilkan apa
              adanya.
            </p>
          </div>
        </article>
        <article>
          <span>
            <Icon name="check" size={19} />
          </span>
          <div>
            <b>Data stok langsung</b>
            <p>Ketersediaan mengikuti cabang.</p>
          </div>
        </article>
        <article>
          <span>
            <Icon name="chat" size={19} />
          </span>
          <div>
            <b>Ulasan pembeli asli</b>
            <p>Hanya transaksi berbayar.</p>
          </div>
        </article>
      </section>
      {chat && <MarketplaceChatPanel {...chat} onClose={() => setChat(undefined)} onShortcut={openChatShortcut} notify={notify} />}
    </div>
  );
}
