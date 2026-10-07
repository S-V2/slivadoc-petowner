"use client";
import { petOwnerIntlLocale } from "../../lib/petowner-locale";
import { LocalizedCopy, LocalizedButton, LocalizedTextarea, LocalizedInput } from "../LocalizedCopy";
import { SlivaSelect } from "../SlivaSelect";
import { DiscountBadge } from "../DiscountBadge";

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
  ApiError,
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
  return Math.max(0, Math.round(value)).toLocaleString(petOwnerIntlLocale());
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
      <LocalizedCopy>{Array.from({ length: 5 }, (_, index) => (
        <Icon
          key={index}
          name="star"
          size={size}
          data-active={index < Math.round(value)}
        />
      ))}</LocalizedCopy>
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
      <LocalizedCopy>{logoUrl ? (
        <Image src={logoUrl} alt={`Logo ${name}`} fill sizes={large ? "84px" : "34px"} unoptimized />
      ) : (
        <b><LocalizedCopy>{name.trim().slice(0, 1).toUpperCase() || "S"}</LocalizedCopy></b>
      )}</LocalizedCopy>
      <i className={online ? "is-online" : ""} aria-hidden="true" />
    </span>
  );
}

function storePresenceLabel(online: boolean, lastSeen?: string) {
  if (online) return "Online sekarang";
  if (!lastSeen) return "Terakhir online belum tersedia";
  const value = new Date(lastSeen);
  if (Number.isNaN(value.getTime())) return "Terakhir online belum tersedia";
  return `Terakhir online ${value.toLocaleString(petOwnerIntlLocale(), {
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
      <LocalizedCopy catalogue>{imageUrl ? (
        <>
          <LocalizedButton type="button" className={detail ? "market-detail-picture" : "market-card-image-button"} onClick={() => detail && setViewerOpen(true)} aria-label={detail ? `Perbesar foto ${product.name}` : undefined}>
            <Image
              src={imageUrl}
              alt={`Foto ${product.name}`}
              fill
              sizes={detail ? "(max-width: 860px) 100vw, 45vw" : "(max-width: 580px) 50vw, 22vw"}
              unoptimized
            />
            <LocalizedCopy>{detail && images.length > 1 && <span className="market-gallery-count"><Icon name="camera" size={13} /> <LocalizedCopy>{activeImage + 1}</LocalizedCopy><LocalizedCopy>{"/"}</LocalizedCopy><LocalizedCopy>{images.length}</LocalizedCopy></span>}</LocalizedCopy>
          </LocalizedButton>
          {detail && images.length > 1 && <div className="market-gallery-thumbs" aria-label="Pilih foto produk">
            <LocalizedCopy>{images.map((url, index) => <LocalizedButton type="button" className={index === activeImage ? "active" : ""} key={url} onClick={() => setActiveImage(index)} aria-label={`Foto ${index + 1}`}><Image src={url} alt="" fill sizes="64px" unoptimized /></LocalizedButton>)}</LocalizedCopy>
          </div>}
        </>
      ) : (
        <div
          className="market-product-fallback"
          aria-label={`Ilustrasi ${product.name}`}
        >
          <i />
          <span><LocalizedCopy>{product.emoji}</LocalizedCopy></span>
          <small><LocalizedCopy>{product.category}</LocalizedCopy></small>
        </div>
      )}</LocalizedCopy>
    </div>
    {viewerOpen && imageUrl && <div className="market-image-viewer" role="dialog" aria-modal="true" aria-label={`Galeri ${product.name}`} onMouseDown={() => setViewerOpen(false)}>
      <LocalizedButton type="button" className="market-image-viewer-close" onClick={() => setViewerOpen(false)} aria-label="Tutup galeri"><Icon name="close" size={22} /></LocalizedButton>
      <div className="market-image-viewer-stage" onMouseDown={(event) => event.stopPropagation()}><Image src={imageUrl} alt={`Foto ${activeImage + 1} ${product.name}`} fill sizes="100vw" unoptimized /></div>
      <LocalizedCopy>{images.length > 1 && <div className="market-image-viewer-nav"><LocalizedButton type="button" onClick={() => setActiveImage((activeImage - 1 + images.length) % images.length)} aria-label="Foto sebelumnya"><LocalizedCopy>{"‹"}</LocalizedCopy></LocalizedButton><span><LocalizedCopy>{activeImage + 1}</LocalizedCopy><LocalizedCopy>{" / "}</LocalizedCopy><LocalizedCopy>{images.length}</LocalizedCopy></span><LocalizedButton type="button" onClick={() => setActiveImage((activeImage + 1) % images.length)} aria-label="Foto berikutnya"><LocalizedCopy>{"›"}</LocalizedCopy></LocalizedButton></div>}</LocalizedCopy>
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
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;
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
          <LocalizedCopy>{badge}</LocalizedCopy>
        </span>
        <LocalizedCopy>{discountPercent > 0 ? (
          <DiscountBadge percent={discountPercent} />
        ) : null}</LocalizedCopy>
        <LocalizedButton
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
        </LocalizedButton>
      </div>

      <div className="market-card-content">
        <span className="market-card-category"><LocalizedCopy>{product.category}</LocalizedCopy></span>
        <h3><LocalizedCopy catalogue>{product.name}</LocalizedCopy></h3>
        <p className="market-card-description">
          <LocalizedCopy catalogue>{product.description ||
            "Kebutuhan pet pilihan dari partner Slivadoc."}</LocalizedCopy>
        </p>
        <LocalizedButton
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
            <b><LocalizedCopy>{product.businessName}</LocalizedCopy></b>
            <small><LocalizedCopy>{storePresenceLabel(Boolean(product.storeIsOnline), product.storeLastSeenAt)}</LocalizedCopy></small>
          </span>
        </LocalizedButton>
        <div className="market-card-price-wrap">
          <LocalizedCopy>{discountPercent > 0 ? (
            <span><s><LocalizedCopy>{formatRupiah(product.originalPrice!)}</LocalizedCopy></s><em><LocalizedCopy>{"Hemat "}</LocalizedCopy><LocalizedCopy>{discountPercent}</LocalizedCopy><LocalizedCopy>{"%"}</LocalizedCopy></em></span>
          ) : null}</LocalizedCopy>
          <strong className="market-card-price"><LocalizedCopy>{formatRupiah(product.price)}</LocalizedCopy></strong>
        </div>
        <div className="market-card-social-proof">
          <span>
            <Icon name="star" size={12} />
            <LocalizedCopy>{product.reviewCount ? product.rating.toFixed(1) : "Baru"}</LocalizedCopy>
            <LocalizedCopy>{product.reviewCount
              ? ` (${compactNumber(product.reviewCount)})`
              : ""}</LocalizedCopy>
          </span>
          <i />
          <span><LocalizedCopy>{compactNumber(product.soldCount)}</LocalizedCopy><LocalizedCopy>{" terjual"}</LocalizedCopy></span>
        </div>
        <div className="market-card-fulfillment">
          <span>
            <Icon name="map" size={12} /> <LocalizedCopy>{product.city}</LocalizedCopy>
          </span>
          <span>
            <LocalizedCopy>{product.available
              ? `Stok ${compactNumber(product.stock)}`
              : "Tidak tersedia"}</LocalizedCopy>
          </span>
        </div>
        <div className="market-card-reward">
          <Icon name="sparkle" size={12} /><LocalizedCopy>{"Dapatkan "}</LocalizedCopy><LocalizedCopy>{earnedPoints(product.price).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" Sliva Point"}</LocalizedCopy></div>
        <footer>
          <LocalizedButton
            type="button"
            className="market-detail-link"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          ><LocalizedCopy>{"Detail "}</LocalizedCopy><Icon name="arrow" size={14} />
          </LocalizedButton>
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
          <span><LocalizedCopy>{"SUARA PET PARENT"}</LocalizedCopy></span>
          <h2 id="market-review-title"><LocalizedCopy>{"Ulasan & komentar"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Semua komentar berasal dari pembelian yang sudah dibayar."}</LocalizedCopy></p>
        </div>
        <span className="market-review-count"><LocalizedCopy>{reviews.length}</LocalizedCopy><LocalizedCopy>{" ulasan"}</LocalizedCopy></span>
      </header>

      <div className="market-review-overview">
        <div className="market-review-score">
          <strong><LocalizedCopy>{reviews.length ? average.toFixed(1) : "–"}</LocalizedCopy></strong>
          <span><LocalizedCopy>{"dari 5"}</LocalizedCopy></span>
          <MarketplaceStars value={average} size={15} />
          <small>
            <LocalizedCopy>{product.reviewCount.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" rating terkumpul"}</LocalizedCopy></small>
        </div>
        <div className="market-rating-bars" aria-label="Distribusi rating">
          <LocalizedCopy>{distribution.map(({ score, count }) => (
            <div key={score}>
              <span>
                <LocalizedCopy>{score}</LocalizedCopy> <Icon name="star" size={11} />
              </span>
              <i>
                <b
                  style={{
                    width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`,
                  }}
                />
              </i>
              <small><LocalizedCopy>{count}</LocalizedCopy></small>
            </div>
          ))}</LocalizedCopy>
        </div>
      </div>

      <div
        className="market-review-filters"
        role="tablist"
        aria-label="Filter ulasan"
      >
        <LocalizedCopy>{(["all", 5, 4, 3, 2, 1] as ReviewFilter[]).map((value) => (
          <LocalizedButton
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
            <LocalizedCopy>{value === "all" ? "Semua" : `${value} bintang`}</LocalizedCopy>
          </LocalizedButton>
        ))}</LocalizedCopy>
      </div>

      <LocalizedCopy>{loading ? (
        <div className="market-review-state">
          <i />
          <span><LocalizedCopy>{"Memuat ulasan terbaru…"}</LocalizedCopy></span>
        </div>
      ) : error ? (
        <div className="market-review-state is-error">
          <Icon name="chat" size={22} />
          <span><LocalizedCopy>{error}</LocalizedCopy></span>
        </div>
      ) : filteredReviews.length ? (
        <div className="market-review-list">
          <LocalizedCopy>{visibleReviews.map((review) => (
            <article key={review.id} className="market-review-card">
              <span className="market-review-avatar">
                <LocalizedCopy>{review.reviewer_name.slice(0, 1).toUpperCase() || "P"}</LocalizedCopy>
              </span>
              <div>
                <header>
                  <div>
                    <b><LocalizedCopy preserve>{review.reviewer_name}</LocalizedCopy></b>
                    <span>
                      <Icon name="shield" size={11} /><LocalizedCopy>{" Pembelian terverifikasi"}</LocalizedCopy></span>
                  </div>
                  <time dateTime={review.updated_at || review.created_at}>
                    <LocalizedCopy>{new Date(
                      review.updated_at || review.created_at,
                    ).toLocaleDateString(petOwnerIntlLocale(), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}</LocalizedCopy>
                  </time>
                </header>
                <MarketplaceStars value={review.rating} size={12} />
                <p><LocalizedCopy>{review.comment}</LocalizedCopy></p>
              </div>
            </article>
          ))}</LocalizedCopy>
          <LocalizedCopy>{visibleReviews.length < filteredReviews.length && (
            <LocalizedButton
              className="market-review-more"
              type="button"
              onClick={() => setReviewLimit((current) => current + 5)}
            ><LocalizedCopy>{"Lihat"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedCopy>{Math.min(5, filteredReviews.length - visibleReviews.length)}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"ulasan berikutnya"}</LocalizedCopy><Icon name="chevron" size={14} />
            </LocalizedButton>
          )}</LocalizedCopy>
        </div>
      ) : (
        <div className="market-review-empty">
          <span>
            <Icon name="chat" size={24} />
          </span>
          <div>
            <b>
              <LocalizedCopy>{filter === "all"
                ? "Belum ada komentar"
                : `Belum ada rating ${filter} bintang`}</LocalizedCopy>
            </b>
            <p><LocalizedCopy>{"Bagikan pengalamanmu setelah pesanan dibayar."}</LocalizedCopy></p>
          </div>
        </div>
      )}</LocalizedCopy>

      <form className="market-review-composer" onSubmit={submit}>
        <div>
          <span className="market-composer-icon">
            <Icon name="chat" size={20} />
          </span>
          <div>
            <b><LocalizedCopy>{"Tulis ulasanmu"}</LocalizedCopy></b>
            <p><LocalizedCopy>{"Ulasan dapat dikirim oleh pembeli terverifikasi."}</LocalizedCopy></p>
          </div>
        </div>
        <fieldset>
          <legend><LocalizedCopy>{"Rating produk"}</LocalizedCopy></legend>
          <div>
            <LocalizedCopy>{Array.from({ length: 5 }, (_, index) => (
              <LocalizedButton
                key={index}
                type="button"
                aria-label={`${index + 1} bintang`}
                onClick={() => setRating(index + 1)}
              >
                <Icon name="star" size={22} data-active={index < rating} />
              </LocalizedButton>
            ))}</LocalizedCopy>
            <span><LocalizedCopy>{rating}</LocalizedCopy><LocalizedCopy>{"/5"}</LocalizedCopy></span>
          </div>
        </fieldset>
        <label>
          <span><LocalizedCopy>{"Komentar"}</LocalizedCopy></span>
          <LocalizedTextarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={1000}
            placeholder="Ceritakan kualitas produk, kemasan, dan reaksi pet-mu…"
          />
          <small><LocalizedCopy>{comment.length}</LocalizedCopy><LocalizedCopy>{"/1000 karakter"}</LocalizedCopy></small>
        </label>
        <LocalizedCopy>{validation && <p className="market-form-error"><LocalizedCopy>{validation}</LocalizedCopy></p>}</LocalizedCopy>
        <LocalizedButton type="submit" disabled={submitting}>
          <Icon name={authenticated ? "chat" : "user"} size={16} />
          <LocalizedCopy>{submitting
            ? "Mempublikasikan…"
            : authenticated
              ? "Publikasikan ulasan"
              : "Masuk untuk memberi ulasan"}</LocalizedCopy>
        </LocalizedButton>
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
  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : 0;
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
        <LocalizedButton type="button" onClick={onBack}>
          <Icon name="arrow" size={15} /><LocalizedCopy>{" Marketplace"}</LocalizedCopy></LocalizedButton>
        <Icon name="chevron" size={13} />
        <span><LocalizedCopy>{product.category}</LocalizedCopy></span>
        <Icon name="chevron" size={13} />
        <strong><LocalizedCopy catalogue>{product.name}</LocalizedCopy></strong>
      </nav>

      <section className="market-detail-hero">
        <div className="market-detail-gallery">
          <ProductPicture product={product} detail />
          <DiscountBadge percent={discountPercent} />
          <div className="market-detail-assurance">
            <span>
              <Icon name="shield" size={17} />
              <b><LocalizedCopy>{"Belanja terlindungi"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Pembayaran aman"}</LocalizedCopy></small>
            </span>
            <span>
              <Icon name="check" size={17} />
              <b><LocalizedCopy>{"Stok langsung"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Dari sistem partner"}</LocalizedCopy></small>
            </span>
            <span>
              <Icon name="map" size={17} />
              <b><LocalizedCopy>{"Pengiriman jelas"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Asal toko tertera"}</LocalizedCopy></small>
            </span>
          </div>
        </div>

        <div className="market-detail-main">
          <div className="market-detail-labels">
            <span><LocalizedCopy>{product.category}</LocalizedCopy></span>
            <LocalizedCopy>{product.available ? (
              <em><LocalizedCopy>{"Siap dikirim"}</LocalizedCopy></em>
            ) : (
              <em className="is-empty"><LocalizedCopy>{"Stok habis"}</LocalizedCopy></em>
            )}</LocalizedCopy>
          </div>
          <div className="market-detail-title-row">
            <h1><LocalizedCopy catalogue>{product.name}</LocalizedCopy></h1>
            <LocalizedButton
              className={favorite ? "is-favorite" : ""}
              type="button"
              aria-label={favorite ? "Hapus dari favorit" : "Simpan ke favorit"}
              onClick={onFavorite}
            >
              <Icon name="heart" size={20} />
            </LocalizedButton>
          </div>
          <div className="market-detail-rating">
            <MarketplaceStars value={product.rating} />
            <b>
              <LocalizedCopy>{product.reviewCount ? product.rating.toFixed(1) : "Produk baru"}</LocalizedCopy>
            </b>
            <span><LocalizedCopy>{product.reviewCount.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" ulasan"}</LocalizedCopy></span>
            <i />
            <span><LocalizedCopy>{compactNumber(product.soldCount)}</LocalizedCopy><LocalizedCopy>{" terjual"}</LocalizedCopy></span>
          </div>
          <div className="market-detail-price-block">
            <LocalizedCopy>{discountPercent > 0 ? (
              <span><s><LocalizedCopy>{formatRupiah(product.originalPrice!)}</LocalizedCopy></s></span>
            ) : null}</LocalizedCopy>
            <strong className="market-detail-price"><LocalizedCopy>{formatRupiah(product.price)}</LocalizedCopy></strong>
            <LocalizedCopy>{discountPercent > 0 ? <small><LocalizedCopy>{"Kamu hemat "}</LocalizedCopy><LocalizedCopy>{formatRupiah(product.originalPrice! - product.price)}</LocalizedCopy></small> : null}</LocalizedCopy>
          </div>
          <p className="market-detail-points">
            <Icon name="sparkle" size={15} /><LocalizedCopy>{"Transaksi ini menghasilkan"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
            <b>
              <LocalizedCopy>{earnedPoints(product.price).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" Sliva Point"}</LocalizedCopy></b>
          </p>

          <div className="market-seller-card">
            <LocalizedButton type="button" className="market-seller-profile" onClick={onOpenStore}>
              <StoreAvatar
                name={product.businessName}
                logoUrl={product.storeLogoUrl}
                online={product.storeIsOnline}
                large
              />
              <span>
                <small><LocalizedCopy>{"DIJUAL OLEH"}</LocalizedCopy></small>
                <b><LocalizedCopy>{product.businessName}</LocalizedCopy></b>
                <p>
                  <Icon name="map" size={12} /> <LocalizedCopy>{product.branchName}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy>{product.city}</LocalizedCopy>
                </p>
                <p className={product.storeIsOnline ? "is-online" : ""}>
                  <LocalizedCopy>{storePresenceLabel(Boolean(product.storeIsOnline), product.storeLastSeenAt)}</LocalizedCopy>
                </p>
              </span>
            </LocalizedButton>
            <em>
              <Icon name="shield" size={12} /> <LocalizedCopy>{licenseLabel}</LocalizedCopy>
            </em>
            <div className="market-seller-actions">
              <LocalizedButton type="button" onClick={onChat}>
                <Icon name="chat" size={15} /><LocalizedCopy>{" Chat toko"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton type="button" onClick={onOpenStore}><LocalizedCopy>{"Kunjungi toko "}</LocalizedCopy><Icon name="arrow" size={14} />
              </LocalizedButton>
            </div>
          </div>

          <div className="market-detail-copy">
            <h2><LocalizedCopy>{"Tentang produk"}</LocalizedCopy></h2>
            <p>
              <LocalizedCopy catalogue>{product.description ||
                "Deskripsi produk belum dicantumkan oleh penjual."}</LocalizedCopy>
            </p>
          </div>

          <dl className="market-product-facts">
            <div>
              <dt><LocalizedCopy>{"Stok"}</LocalizedCopy></dt>
              <dd>
                <LocalizedCopy>{product.available
                  ? `${product.stock.toLocaleString(petOwnerIntlLocale())} tersedia`
                  : "Habis"}</LocalizedCopy>
              </dd>
            </div>
            <div>
              <dt><LocalizedCopy>{"SKU"}</LocalizedCopy></dt>
              <dd><LocalizedCopy>{product.sku}</LocalizedCopy></dd>
            </div>
            <div>
              <dt><LocalizedCopy>{"Kategori"}</LocalizedCopy></dt>
              <dd><LocalizedCopy>{product.category}</LocalizedCopy></dd>
            </div>
            <LocalizedCopy>{product.barcode && (
              <div>
                <dt><LocalizedCopy>{"Barcode"}</LocalizedCopy></dt>
                <dd><LocalizedCopy>{product.barcode}</LocalizedCopy></dd>
              </div>
            )}</LocalizedCopy>
          </dl>

          <section className="market-product-disclosures">
            <div>
              <h2><LocalizedCopy>{"Identitas & kepatuhan produk"}</LocalizedCopy></h2>
              <LocalizedCopy>{complianceFacts.length ? (
                <dl>
                  <LocalizedCopy>{complianceFacts.map(([label, value]) => (
                    <div key={label}>
                      <dt><LocalizedCopy>{label}</LocalizedCopy></dt>
                      <dd><LocalizedCopy>{value}</LocalizedCopy></dd>
                    </div>
                  ))}</LocalizedCopy>
                </dl>
              ) : (
                <p><LocalizedCopy>{"Penjual belum melengkapi identitas atau nomor kepatuhan produk."}</LocalizedCopy></p>
              )}</LocalizedCopy>
            </div>
            <div>
              <h2><LocalizedCopy>{"Penggunaan yang aman"}</LocalizedCopy></h2>
              <LocalizedCopy>{usageFacts.length ? (
                <dl>
                  <LocalizedCopy>{usageFacts.map(([label, value]) => (
                    <div key={label}>
                      <dt><LocalizedCopy>{label}</LocalizedCopy></dt>
                      <dd><LocalizedCopy>{value}</LocalizedCopy></dd>
                    </div>
                  ))}</LocalizedCopy>
                </dl>
              ) : (
                <p><LocalizedCopy>{"Petunjuk penggunaan belum dicantumkan oleh penjual."}</LocalizedCopy></p>
              )}</LocalizedCopy>
            </div>
            <div>
              <h2><LocalizedCopy>{"Retur & garansi"}</LocalizedCopy></h2>
              <p>
                <LocalizedCopy>{product.returnPolicy ||
                  "Kebijakan retur belum dicantumkan oleh penjual."}</LocalizedCopy>
              </p>
              <LocalizedCopy>{product.warrantyPolicy && <p><LocalizedCopy>{product.warrantyPolicy}</LocalizedCopy></p>}</LocalizedCopy>
            </div>
          </section>

          <div className="market-purchase-box">
            <label>
              <span><LocalizedCopy>{"Jumlah"}</LocalizedCopy></span>
              <div className="market-quantity">
                <LocalizedButton
                  type="button"
                  aria-label="Kurangi jumlah"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                ><LocalizedCopy>{"−"}</LocalizedCopy></LocalizedButton>
                <strong><LocalizedCopy>{quantity}</LocalizedCopy></strong>
                <LocalizedButton
                  type="button"
                  aria-label="Tambah jumlah"
                  disabled={quantity >= product.stock}
                  onClick={() =>
                    setQuantity((value) => Math.min(product.stock, value + 1))
                  }
                ><LocalizedCopy>{"+"}</LocalizedCopy></LocalizedButton>
              </div>
            </label>
            <p>
              <span><LocalizedCopy>{"Subtotal"}</LocalizedCopy></span>
              <b><LocalizedCopy>{formatRupiah(product.price * quantity)}</LocalizedCopy></b>
            </p>
            <div>
              <LocalizedButton
                type="button"
                disabled={!product.available || adding}
                aria-busy={adding}
                onClick={() => void addProduct()}
              >
                <LocalizedCopy>{adding ? (
                  <span className="market-add-spinner" aria-hidden="true" />
                ) : (
                  <Icon name="cart" size={17} />
                )}</LocalizedCopy>
                <LocalizedCopy>{adding ? "Menambahkan…" : "+ Keranjang"}</LocalizedCopy>
              </LocalizedButton>
              <LocalizedButton
                type="button"
                disabled={!product.available}
                onClick={() => onBuy(quantity)}
              ><LocalizedCopy>{"Beli sekarang"}</LocalizedCopy></LocalizedButton>
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
      <LocalizedButton type="button" className="market-chat-scrim" aria-label="Tutup chat" onClick={onClose} />
      <section className="market-chat-panel">
        <header>
          <StoreAvatar
            name={store.name}
            logoUrl={store.logo_url}
            online={store.is_online}
          />
          <div>
            <b><LocalizedCopy>{store.name}</LocalizedCopy></b>
            <span className={store.is_online ? "is-online" : ""}>
              <LocalizedCopy>{storePresenceLabel(store.is_online, store.last_seen_at)}</LocalizedCopy>
            </span>
          </div>
          <LocalizedButton type="button" aria-label="Tutup chat" onClick={onClose}>
            <Icon name="close" size={18} />
          </LocalizedButton>
        </header>
        <LocalizedCopy catalogue>{product && (
          <div className="market-chat-context">
            <ProductPicture product={product} />
            <div>
              <small><LocalizedCopy>{"TANYAKAN PRODUK INI"}</LocalizedCopy></small>
              <b><LocalizedCopy catalogue>{product.name}</LocalizedCopy></b>
              <span><LocalizedCopy>{formatRupiah(product.price)}</LocalizedCopy></span>
            </div>
          </div>
        )}</LocalizedCopy>
        <div className="market-chat-notice">
          <Icon name="shield" size={14} /><LocalizedCopy>{" Kanal ini hanya untuk pesan teks dengan toko. Jangan bagikan OTP atau kata sandi."}</LocalizedCopy></div>
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
          <LocalizedCopy>{loading ? (
            <p className="market-chat-state"><LocalizedCopy>{"Memuat percakapan…"}</LocalizedCopy></p>
          ) : messages.length ? (
            messages.map((message) => (
              <article key={message.id} className={message.sender_type === "buyer" ? "is-mine" : ""}>
                <small><LocalizedCopy>{message.sender_type === "buyer" ? "Kamu" : message.sender_name}</LocalizedCopy></small>
                <p><LocalizedCopy>{message.body}</LocalizedCopy></p>
                <time dateTime={message.created_at}>
                  <LocalizedCopy>{new Date(message.created_at).toLocaleTimeString(petOwnerIntlLocale(), {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</LocalizedCopy>
                </time>
              </article>
            ))
          ) : (
            <div className="market-chat-empty">
              <span><LocalizedCopy>{"👋"}</LocalizedCopy></span>
              <b><LocalizedCopy>{"Mulai obrolan dengan toko"}</LocalizedCopy></b>
              <p><LocalizedCopy>{"Tanyakan stok, ukuran, kandungan, atau detail produk lainnya."}</LocalizedCopy></p>
            </div>
          )}</LocalizedCopy>
        </div>
        <LocalizedCopy>{error && <p className="market-chat-error"><LocalizedCopy>{error}</LocalizedCopy></p>}</LocalizedCopy>
        <LocalizedCopy>{composerTray === "attachments" && (
          <div className="market-chat-shortcuts" role="group" aria-label="Pilihan chat toko">
            <LocalizedCopy>{marketplaceChatShortcuts.map((shortcut) => (
              <LocalizedButton
                type="button"
                key={shortcut.id}
                onClick={() => onShortcut(shortcut.id)}
              >
                <span><Icon name={shortcut.icon} size={19} /></span>
                <small><LocalizedCopy>{shortcut.label}</LocalizedCopy></small>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{composerTray === "emoji" && (
          <div className="market-chat-emojis" role="group" aria-label="Pilih emoji">
            <LocalizedCopy>{marketplaceChatEmojis.map((emoji) => (
              <LocalizedButton
                type="button"
                key={emoji}
                aria-label={`Gunakan emoji ${emoji}`}
                onClick={() => {
                  setDraft((current) => `${current}${emoji}`);
                  setComposerTray(undefined);
                  window.requestAnimationFrame(() => input.current?.focus());
                }}
              >
                <LocalizedCopy>{emoji}</LocalizedCopy>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
        )}</LocalizedCopy>
        <form onSubmit={submit}>
          <LocalizedButton
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
          </LocalizedButton>
          <LocalizedTextarea
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
          <LocalizedCopy>{hasDraft ? (
            <LocalizedButton
              type="submit"
              className="market-chat-action is-send"
              disabled={sending}
              aria-label={sending ? "Mengirim pesan" : "Kirim pesan"}
            >
              <Icon name="send" size={19} />
            </LocalizedButton>
          ) : (
            <LocalizedButton
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
              <span aria-hidden="true"><LocalizedCopy>{"😊"}</LocalizedCopy></span>
            </LocalizedButton>
          )}</LocalizedCopy>
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
    return <div className="market-store-loading"><i /><span><LocalizedCopy>{"Menyiapkan etalase toko…"}</LocalizedCopy></span></div>;
  }
  if (error && !fallback && !fallbackService) {
    return <div className="market-empty-state"><span><LocalizedCopy>{"!"}</LocalizedCopy></span><h3><LocalizedCopy>{"Etalase belum dapat dibuka"}</LocalizedCopy></h3><p><LocalizedCopy>{error}</LocalizedCopy></p><LocalizedButton type="button" onClick={onBack}><LocalizedCopy>{"Kembali"}</LocalizedCopy></LocalizedButton></div>;
  }

  return (
    <div className="market-store-page">
      <nav className="market-breadcrumb" aria-label="Breadcrumb">
        <LocalizedButton type="button" onClick={onBack}><Icon name="arrow" size={15} /><LocalizedCopy>{" Marketplace"}</LocalizedCopy></LocalizedButton>
        <Icon name="chevron" size={13} />
        <strong><LocalizedCopy>{store.name}</LocalizedCopy></strong>
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
            <span className="market-store-verified"><Icon name="shield" size={12} /><LocalizedCopy>{" Partner terverifikasi"}</LocalizedCopy></span>
            <h1><LocalizedCopy>{store.name}</LocalizedCopy></h1>
            <p><Icon name="map" size={13} /> <LocalizedCopy>{store.city || "Indonesia"}</LocalizedCopy></p>
            <p className={store.is_online ? "is-online" : ""}><LocalizedCopy>{storePresenceLabel(store.is_online, store.last_seen_at)}</LocalizedCopy></p>
          </div>
          <LocalizedButton type="button" onClick={onChat}><Icon name="chat" size={17} /><LocalizedCopy>{" Chat toko"}</LocalizedCopy></LocalizedButton>
        </div>
        <div className="market-store-stats">
          <span><b><LocalizedCopy>{store.product_count}</LocalizedCopy></b><small><LocalizedCopy>{"Produk"}</LocalizedCopy></small></span>
          <span><b><LocalizedCopy>{services.length}</LocalizedCopy></b><small><LocalizedCopy>{"Layanan"}</LocalizedCopy></small></span>
          <span><b><LocalizedCopy>{store.rating ? store.rating.toFixed(1) : "Baru"}</LocalizedCopy></b><small><LocalizedCopy>{"Rating"}</LocalizedCopy></small></span>
          <span><b><LocalizedCopy>{compactNumber(store.sold_count)}</LocalizedCopy></b><small><LocalizedCopy>{"Terjual"}</LocalizedCopy></small></span>
        </div>
      </section>

      <div className="market-store-navigation" role="tablist" aria-label="Bagian toko">
        <LocalizedCopy>{([
          ["products", "Produk"],
          ["services", "Layanan"],
          ["categories", "Kategori"],
          ["reviews", `Ulasan (${store.review_count})`],
          ["about", "Tentang toko"],
        ] as Array<[StoreSection, string]>).map(([id, label]) => (
          <LocalizedButton key={id} type="button" role="tab" aria-selected={section === id} className={section === id ? "active" : ""} onClick={() => setSection(id)}><LocalizedCopy>{label}</LocalizedCopy></LocalizedButton>
        ))}</LocalizedCopy>
      </div>

      <LocalizedCopy>{section === "products" && (
        <section className="market-store-products">
          <header>
            <div><span><LocalizedCopy>{"ETALASE TOKO"}</LocalizedCopy></span><h2><LocalizedCopy>{"Temukan kebutuhan pet-mu"}</LocalizedCopy></h2></div>
            <p><LocalizedCopy>{visible.length}</LocalizedCopy><LocalizedCopy>{" produk"}</LocalizedCopy></p>
          </header>
          <div className="market-store-sort" role="tablist" aria-label="Urutan produk toko">
            <LocalizedCopy>{([
              ["popular", "Populer"],
              ["newest", "Terbaru"],
              ["bestseller", "Terlaris"],
              ["price", "Harga termurah"],
              ["price_desc", "Harga termahal"],
            ] as Array<[SortMode, string]>).map(([id, label]) => (
              <LocalizedButton key={id} type="button" role="tab" aria-selected={sort === id} className={sort === id ? "active" : ""} onClick={() => setSort(id)}><LocalizedCopy>{label}</LocalizedCopy></LocalizedButton>
            ))}</LocalizedCopy>
          </div>
          <div className="market-store-category-filter">
            <LocalizedCopy>{["Semua", ...categories.map((item) => item.name)].map((name) => (
              <LocalizedButton key={name} type="button" className={category === name ? "active" : ""} onClick={() => setCategory(name)}><LocalizedCopy>{name}</LocalizedCopy></LocalizedButton>
            ))}</LocalizedCopy>
          </div>
          <div className="market-product-grid">
            <LocalizedCopy>{visible.map((product) => (
              <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onOpen={() => onOpenProduct(product)} onStore={() => undefined} onFavorite={() => onFavorite(product)} />
            ))}</LocalizedCopy>
          </div>
        </section>
      )}</LocalizedCopy>

      <LocalizedCopy catalogue>{section === "services" && (
        <section className="market-store-services">
          <header>
            <div><span><LocalizedCopy>{"LAYANAN PARTNER"}</LocalizedCopy></span><h2><LocalizedCopy>{"Pilih layanan dari "}</LocalizedCopy><LocalizedCopy>{store.name}</LocalizedCopy></h2></div>
            <p><LocalizedCopy>{services.length}</LocalizedCopy><LocalizedCopy>{" layanan"}</LocalizedCopy></p>
          </header>
          <LocalizedCopy catalogue>{services.length ? (
            <div className="market-store-service-grid">
              <LocalizedCopy catalogue>{services.map((service) => (
                <LocalizedButton key={service.id} type="button" className="market-store-service-card" onClick={() => onOpenService(service)}>
                  <span className="market-store-service-media">
                    <LocalizedCopy catalogue>{service.imageUrl ? <Image src={service.imageUrl} alt={`Foto ${service.name}`} fill sizes="120px" unoptimized /> : <Icon name="paw" size={28} />}</LocalizedCopy>
                  </span>
                  <span className="market-store-service-copy">
                    <small><LocalizedCopy>{service.type}</LocalizedCopy></small>
                    <b><LocalizedCopy catalogue>{service.name}</LocalizedCopy></b>
                    <em><LocalizedCopy>{service.durationMinutes ? `${service.durationMinutes} menit · ` : ""}<LocalizedCopy></LocalizedCopy>{service.priceValue === undefined ? service.price : formatRupiah(service.priceValue)}</LocalizedCopy></em>
                  </span>
                  <Icon name="chevron" size={16} />
                </LocalizedButton>
              ))}</LocalizedCopy>
            </div>
          ) : <div className="market-review-empty"><span><Icon name="paw" size={24} /></span><div><b><LocalizedCopy>{"Belum ada layanan aktif"}</LocalizedCopy></b><p><LocalizedCopy>{"Partner ini belum menerbitkan layanan untuk dibooking."}</LocalizedCopy></p></div></div>}</LocalizedCopy>
        </section>
      )}</LocalizedCopy>

      <LocalizedCopy>{section === "categories" && (
        <section className="market-store-info-grid">
          <LocalizedCopy>{categories.map((item) => (
            <LocalizedButton key={item.name} type="button" onClick={() => { setCategory(item.name); setSection("products"); }}>
              <span><Icon name={categoryIcons[item.name] || "bag"} size={24} /></span>
              <b><LocalizedCopy>{item.name}</LocalizedCopy></b><small><LocalizedCopy>{item.product_count}</LocalizedCopy><LocalizedCopy>{" produk"}</LocalizedCopy></small>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </section>
      )}</LocalizedCopy>

      <LocalizedCopy>{section === "reviews" && (
        <section className="market-store-review-list">
          <header><div><span><LocalizedCopy>{"REPUTASI TOKO"}</LocalizedCopy></span><h2><LocalizedCopy>{"Ulasan dari pet parent"}</LocalizedCopy></h2></div><b><LocalizedCopy>{store.rating ? store.rating.toFixed(1) : "–"}</LocalizedCopy><LocalizedCopy>{" / 5"}</LocalizedCopy></b></header>
          <LocalizedCopy>{response?.reviews.length ? response.reviews.map((review) => (
            <article key={review.id}>
              <span><LocalizedCopy>{review.reviewer_name.slice(0, 1).toUpperCase()}</LocalizedCopy></span>
              <div><b><LocalizedCopy preserve>{review.reviewer_name}</LocalizedCopy></b><MarketplaceStars value={review.rating} /><p><LocalizedCopy>{review.comment}</LocalizedCopy></p><small><LocalizedCopy>{review.product_name}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{new Date(review.updated_at).toLocaleDateString(petOwnerIntlLocale())}</LocalizedCopy></small></div>
            </article>
          )) : <div className="market-review-empty"><span><Icon name="chat" size={24} /></span><div><b><LocalizedCopy>{"Belum ada ulasan toko"}</LocalizedCopy></b><p><LocalizedCopy>{"Ulasan produk yang terverifikasi akan tampil di sini."}</LocalizedCopy></p></div></div>}</LocalizedCopy>
        </section>
      )}</LocalizedCopy>

      <LocalizedCopy>{section === "about" && (
        <section className="market-store-about">
          <div><span><LocalizedCopy>{"🏪"}</LocalizedCopy></span><div><small><LocalizedCopy>{"TENTANG TOKO"}</LocalizedCopy></small><h2><LocalizedCopy>{store.name}</LocalizedCopy></h2><p><LocalizedCopy>{store.about}</LocalizedCopy></p></div></div>
          <dl>
            <div><dt><LocalizedCopy>{"Bergabung"}</LocalizedCopy></dt><dd><LocalizedCopy>{store.joined_at ? new Date(store.joined_at).toLocaleDateString(petOwnerIntlLocale(), { month: "long", year: "numeric" }) : "Partner Slivadoc"}</LocalizedCopy></dd></div>
            <div><dt><LocalizedCopy>{"Lokasi"}</LocalizedCopy></dt><dd><LocalizedCopy>{store.city || "Indonesia"}</LocalizedCopy></dd></div>
            <div><dt><LocalizedCopy>{"Status"}</LocalizedCopy></dt><dd><LocalizedCopy>{store.is_online ? "Online" : "Offline"}</LocalizedCopy></dd></div>
          </dl>
        </section>
      )}</LocalizedCopy>
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
        cause instanceof ApiError && cause.code === "review_hidden"
          ? "Ulasanmu disembunyikan moderator dan tidak bisa diubah. Hubungi dukungan jika ada keberatan."
          : cause instanceof Error
            ? cause.message
            : "Ulasan belum dapat disimpan";
      notify(message);
      throw new Error(message);
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
          <span><LocalizedCopy>{"SLIVA MARKET"}</LocalizedCopy></span>
          <h1><LocalizedCopy>{"Kebutuhan pet, lengkap."}</LocalizedCopy></h1>
        </div>
        <LocalizedButton
          type="button"
          aria-label="Buka keranjang"
          onClick={() => setCartOpen(true)}
        >
          <Icon name="cart" size={20} />
          <LocalizedCopy>{cartCount > 0 && <b><LocalizedCopy>{cartCount > 99 ? "99+" : cartCount}</LocalizedCopy></b>}</LocalizedCopy>
        </LocalizedButton>
      </header>

      <section className="market-hero">
        <div className="market-hero-copy">
          <span>
            <Icon name="shield" size={13} /><LocalizedCopy>{" MARKETPLACE PET TERINTEGRASI"}</LocalizedCopy></span>
          <h1><LocalizedCopy>{"Belanja lebih tenang untuk sahabat terbaikmu."}</LocalizedCopy></h1>
          <p><LocalizedCopy>{"Bandingkan produk, cek stok asli, baca ulasan pembeli, lalu checkout dari banyak petshop dalam satu keranjang."}</LocalizedCopy></p>
          <div className="market-hero-trust">
            <span>
              <b><LocalizedCopy>{productCatalog.length}</LocalizedCopy></b><LocalizedCopy>{" produk aktif"}</LocalizedCopy></span>
            <span>
              <b><LocalizedCopy>{sellerCount}</LocalizedCopy></b><LocalizedCopy>{" partner"}</LocalizedCopy></span>
            <span>
              <b><LocalizedCopy>{"100%"}</LocalizedCopy></b><LocalizedCopy>{" stok live"}</LocalizedCopy></span>
          </div>
        </div>
        <div className="market-hero-art" aria-hidden="true">
          <i />
          <span><LocalizedCopy>{"🛍️"}</LocalizedCopy></span>
          <b><LocalizedCopy>{"🐾"}</LocalizedCopy></b>
        </div>
      </section>

      <div className="market-sticky-tools">
        <label className="market-search">
          <Icon name="search" size={19} />
          <LocalizedInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari makanan, vitamin, mainan, atau toko…"
            aria-label="Cari produk atau toko"
          />
          <LocalizedCopy>{query && (
            <LocalizedButton
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setQuery("")}
            >
              <Icon name="close" size={15} />
            </LocalizedButton>
          )}</LocalizedCopy>
        </label>
        <LocalizedButton
          className="market-cart-button"
          type="button"
          aria-label="Keranjang"
          onClick={() => setCartOpen(true)}
        >
          <Icon name="cart" size={18} />
          <span><LocalizedCopy>{"Keranjang"}</LocalizedCopy></span>
          <LocalizedCopy>{cartCount > 0 && <b><LocalizedCopy>{cartCount}</LocalizedCopy></b>}</LocalizedCopy>
        </LocalizedButton>
      </div>

      <section className="market-category-section">
        <header className="market-section-heading">
          <div>
            <span><LocalizedCopy>{"BELANJA SESUAI KEBUTUHAN"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{"Kategori populer"}</LocalizedCopy></h2>
          </div>
        </header>
        <div
          className="market-category-rail"
          role="tablist"
          aria-label="Kategori produk"
        >
          <LocalizedCopy>{categories.map((item) => (
            <LocalizedButton
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
              <b><LocalizedCopy>{item}</LocalizedCopy></b>
              <small><LocalizedCopy>{categoryCounts.get(item) ?? 0}</LocalizedCopy><LocalizedCopy>{" produk"}</LocalizedCopy></small>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
      </section>

      <section className="market-catalog-section">
        <header className="market-catalog-heading">
          <div>
            <span><LocalizedCopy>{"PILIHAN UNTUK "}</LocalizedCopy><LocalizedCopy>{petName.toUpperCase()}</LocalizedCopy></span>
            <h2><LocalizedCopy>{"Produk terbaik dari partner Slivadoc"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{filtered.length}</LocalizedCopy><LocalizedCopy>{" produk sesuai pilihanmu"}</LocalizedCopy></p>
          </div>
          <div className="market-catalog-filters">
            <label>
              <span><LocalizedCopy>{"Toko"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Toko"
                value={store}
                onChange={(event) => setStore(event.target.value)}
              >
                <option value="">Semua produk</option>
                {stores.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Urutkan"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Urutkan"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortMode)}
              >
                <option value="recommended">Rekomendasi</option>
                <option value="popular">Terlaris</option>
                <option value="rating">Rating tertinggi</option>
                <option value="price">Harga termurah</option>
              </SlivaSelect>
            </label>
          </div>
        </header>

        <LocalizedCopy>{filtered.length ? (
          <div className="market-product-grid">
            <LocalizedCopy>{filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                favorite={favorites.includes(product.id)}
                onOpen={() => openProduct(product)}
                onStore={() => openStore(product.businessId)}
                onFavorite={() => toggleFavorite(product.id)}
              />
            ))}</LocalizedCopy>
          </div>
        ) : (
          <div className="market-empty-state">
            <span>
              <Icon name="search" size={28} />
            </span>
            <h3><LocalizedCopy>{"Produk belum ditemukan"}</LocalizedCopy></h3>
            <p><LocalizedCopy>{"Coba ganti kata kunci, kategori, atau pilihan toko."}</LocalizedCopy></p>
            <LocalizedButton
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("Semua");
                setStore("");
              }}
            ><LocalizedCopy>{"Reset filter"}</LocalizedCopy></LocalizedButton>
          </div>
        )}</LocalizedCopy>
      </section>

      <section className="market-confidence-strip">
        <article>
          <span>
            <Icon name="shield" size={19} />
          </span>
          <div>
            <b><LocalizedCopy>{"Status partner transparan"}</LocalizedCopy></b>
            <p><LocalizedCopy>{"Produk hanya dari bisnis aktif; status izin ditampilkan apa adanya."}</LocalizedCopy></p>
          </div>
        </article>
        <article>
          <span>
            <Icon name="check" size={19} />
          </span>
          <div>
            <b><LocalizedCopy>{"Data stok langsung"}</LocalizedCopy></b>
            <p><LocalizedCopy>{"Ketersediaan mengikuti cabang."}</LocalizedCopy></p>
          </div>
        </article>
        <article>
          <span>
            <Icon name="chat" size={19} />
          </span>
          <div>
            <b><LocalizedCopy>{"Ulasan pembeli asli"}</LocalizedCopy></b>
            <p><LocalizedCopy>{"Hanya transaksi berbayar."}</LocalizedCopy></p>
          </div>
        </article>
      </section>
      <LocalizedCopy>{chat && <MarketplaceChatPanel {...chat} onClose={() => setChat(undefined)} onShortcut={openChatShortcut} notify={notify} />}</LocalizedCopy>
    </div>
  );
}
