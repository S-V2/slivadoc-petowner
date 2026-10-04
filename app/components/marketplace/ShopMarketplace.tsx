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
  getProductReviews,
  saveProductReview,
  type ProductReview,
} from "../../lib/platform-api";
import { formatRupiah, type Product } from "../../data/mock";

type SortMode = "recommended" | "popular" | "rating" | "price";
type ReviewFilter = "all" | 5 | 4 | 3 | 2 | 1;

type ShopMarketplaceProps = {
  addToCart: (id: string, quantity?: number) => void;
  setCartOpen: (value: boolean) => void;
  cartCount: number;
  notify: (message: string) => void;
  productCatalog: Product[];
  petName: string;
  favorites: string[];
  authenticated: boolean;
  onRequireLogin: () => void;
  toggleFavorite: (id: string) => void;
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

function MarketplaceStars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="market-stars" aria-label={`Rating ${value.toFixed(1)} dari 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Icon key={index} name="star" size={size} data-active={index < Math.round(value)} />
      ))}
    </span>
  );
}

function ProductPicture({ product, detail = false }: { product: Product; detail?: boolean }) {
  return (
    <div className={detail ? "market-detail-picture" : "market-card-picture"}>
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={`Foto ${product.name}`}
          fill
          sizes={detail ? "(max-width: 860px) 100vw, 45vw" : "(max-width: 580px) 50vw, 22vw"}
          unoptimized
        />
      ) : (
        <div className="market-product-fallback" aria-label={`Ilustrasi ${product.name}`}>
          <i />
          <span>{product.emoji}</span>
          <small>{product.category}</small>
        </div>
      )}
    </div>
  );
}

function ProductCard({
  product,
  favorite,
  onOpen,
  onFavorite,
  onAdd,
}: {
  product: Product;
  favorite: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onAdd: () => void;
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
        <span className={`market-card-badge ${!product.available ? "is-empty" : ""}`}>
          {badge}
        </span>
        <button
          className={`market-favorite ${favorite ? "is-favorite" : ""}`}
          type="button"
          aria-label={favorite ? `Hapus ${product.name} dari favorit` : `Simpan ${product.name}`}
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
          {product.description || "Kebutuhan pet pilihan dari partner Slivadoc."}
        </p>
        <p className="market-card-seller">
          <Icon name="shield" size={13} />
          <span>{product.brand}</span>
        </p>
        <strong className="market-card-price">{formatRupiah(product.price)}</strong>
        <div className="market-card-social-proof">
          <span>
            <Icon name="star" size={12} />
            {product.reviewCount ? product.rating.toFixed(1) : "Baru"}
            {product.reviewCount ? ` (${compactNumber(product.reviewCount)})` : ""}
          </span>
          <i />
          <span>{compactNumber(product.soldCount)} terjual</span>
        </div>
        <div className="market-card-fulfillment">
          <span><Icon name="map" size={12} /> {product.city}</span>
          <span>{product.available ? `Stok ${compactNumber(product.stock)}` : "Tidak tersedia"}</span>
        </div>
        <div className="market-card-reward">
          <Icon name="sparkle" size={12} />
          Dapatkan {earnedPoints(product.price).toLocaleString("id-ID")} Sliva Point
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
          <button
            type="button"
            className="market-add-button"
            disabled={!product.available}
            aria-label={`Tambah ${product.name} ke keranjang`}
            onClick={(event) => {
              event.stopPropagation();
              onAdd();
            }}
          >
            <Icon name="cart" size={15} />
            Tambah
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
    filter === "all" ? reviews : reviews.filter((review) => review.rating === filter);
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
          <small>{product.reviewCount.toLocaleString("id-ID")} rating terkumpul</small>
        </div>
        <div className="market-rating-bars" aria-label="Distribusi rating">
          {distribution.map(({ score, count }) => (
            <div key={score}>
              <span>{score} <Icon name="star" size={11} /></span>
              <i><b style={{ width: `${reviews.length ? (count / reviews.length) * 100 : 0}%` }} /></i>
              <small>{count}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="market-review-filters" role="tablist" aria-label="Filter ulasan">
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
        <div className="market-review-state"><i /><span>Memuat ulasan terbaru…</span></div>
      ) : error ? (
        <div className="market-review-state is-error"><Icon name="chat" size={22} /><span>{error}</span></div>
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
                    <span><Icon name="shield" size={11} /> Pembelian terverifikasi</span>
                  </div>
                  <time dateTime={review.updated_at || review.created_at}>
                    {new Date(review.updated_at || review.created_at).toLocaleDateString("id-ID", {
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
              Lihat {Math.min(5, filteredReviews.length - visibleReviews.length)} ulasan berikutnya
              <Icon name="chevron" size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className="market-review-empty">
          <span><Icon name="chat" size={24} /></span>
          <div>
            <b>{filter === "all" ? "Belum ada komentar" : `Belum ada rating ${filter} bintang`}</b>
            <p>Bagikan pengalamanmu setelah pesanan dibayar.</p>
          </div>
        </div>
      )}

      <form className="market-review-composer" onSubmit={submit}>
        <div>
          <span className="market-composer-icon"><Icon name="chat" size={20} /></span>
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
          {submitting ? "Mempublikasikan…" : authenticated ? "Publikasikan ulasan" : "Masuk untuk memberi ulasan"}
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
  onFavorite: () => void;
  onAdd: (quantity: number) => void;
  onBuy: (quantity: number) => void;
  onSubmitReview: (rating: number, comment: string) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="market-product-detail">
      <nav className="market-breadcrumb" aria-label="Breadcrumb">
        <button type="button" onClick={onBack}><Icon name="arrow" size={15} /> Marketplace</button>
        <Icon name="chevron" size={13} />
        <span>{product.category}</span>
        <Icon name="chevron" size={13} />
        <strong>{product.name}</strong>
      </nav>

      <section className="market-detail-hero">
        <div className="market-detail-gallery">
          <ProductPicture product={product} detail />
          <div className="market-detail-assurance">
            <span><Icon name="shield" size={17} /><b>Belanja terlindungi</b><small>Pembayaran aman</small></span>
            <span><Icon name="check" size={17} /><b>Stok langsung</b><small>Dari sistem partner</small></span>
            <span><Icon name="map" size={17} /><b>Pengiriman jelas</b><small>Asal toko tertera</small></span>
          </div>
        </div>

        <div className="market-detail-main">
          <div className="market-detail-labels">
            <span>{product.category}</span>
            {product.available ? <em>Siap dikirim</em> : <em className="is-empty">Stok habis</em>}
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
            <b>{product.reviewCount ? product.rating.toFixed(1) : "Produk baru"}</b>
            <span>{product.reviewCount.toLocaleString("id-ID")} ulasan</span>
            <i />
            <span>{compactNumber(product.soldCount)} terjual</span>
          </div>
          <strong className="market-detail-price">{formatRupiah(product.price)}</strong>
          <p className="market-detail-points">
            <Icon name="sparkle" size={15} />
            Transaksi ini menghasilkan <b>{earnedPoints(product.price).toLocaleString("id-ID")} Sliva Point</b>
          </p>

          <div className="market-seller-card">
            <span><Icon name="bag" size={21} /></span>
            <div>
              <small>DIJUAL OLEH</small>
              <b>{product.brand}</b>
              <p><Icon name="map" size={12} /> {product.branchName} · {product.city}</p>
            </div>
            <em><Icon name="shield" size={12} /> Terverifikasi</em>
          </div>

          <div className="market-detail-copy">
            <h2>Tentang produk</h2>
            <p>{product.description || "Produk pilihan partner Slivadoc untuk mendukung kebutuhan harian dan kenyamanan pet-mu."}</p>
          </div>

          <dl className="market-product-facts">
            <div><dt>Stok</dt><dd>{product.available ? `${product.stock.toLocaleString("id-ID")} tersedia` : "Habis"}</dd></div>
            <div><dt>SKU</dt><dd>{product.sku}</dd></div>
            <div><dt>Kategori</dt><dd>{product.category}</dd></div>
            {product.barcode && <div><dt>Barcode</dt><dd>{product.barcode}</dd></div>}
          </dl>

          <div className="market-purchase-box">
            <label>
              <span>Jumlah</span>
              <div className="market-quantity">
                <button type="button" aria-label="Kurangi jumlah" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <strong>{quantity}</strong>
                <button type="button" aria-label="Tambah jumlah" disabled={quantity >= product.stock} onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))}>+</button>
              </div>
            </label>
            <p><span>Subtotal</span><b>{formatRupiah(product.price * quantity)}</b></p>
            <div>
              <button type="button" disabled={!product.available} onClick={() => onAdd(quantity)}>
                <Icon name="cart" size={17} /> + Keranjang
              </button>
              <button type="button" disabled={!product.available} onClick={() => onBuy(quantity)}>
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

export default function ShopMarketplace({
  addToCart,
  setCartOpen,
  cartCount,
  notify,
  productCatalog,
  petName,
  favorites,
  authenticated,
  onRequireLogin,
  toggleFavorite,
}: ShopMarketplaceProps) {
  const [category, setCategory] = useState("Semua");
  const [store, setStore] = useState("Semua toko");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [selected, setSelected] = useState<Product>();
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
    () => ["Semua", ...categoryCounts.keys()].filter((item, index, values) => values.indexOf(item) === index),
    [categoryCounts],
  );
  const stores = useMemo(
    () => ["Semua toko", ...Array.from(new Set(productCatalog.map((item) => item.brand).filter(Boolean)))],
    [productCatalog],
  );
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase("id");
    return productCatalog
      .filter(
        (product) =>
          (category === "Semua" || product.category === category) &&
          (store === "Semua toko" || product.brand === store) &&
          (!needle ||
            `${product.name} ${product.brand} ${product.category} ${product.description} ${product.city}`
              .toLocaleLowerCase("id")
              .includes(needle)),
      )
      .sort((left, right) => {
        if (sort === "rating") return right.rating - left.rating || right.reviewCount - left.reviewCount;
        if (sort === "price") return left.price - right.price;
        if (sort === "popular") return right.soldCount - left.soldCount;
        return Number(right.available) - Number(left.available) || right.soldCount - left.soldCount || right.rating - left.rating;
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
      const productId = new URL(window.location.href).searchParams.get("product");
      const match = productCatalog.find((product) => product.id === productId);
      setSelected((current) => (current?.id === match?.id ? current : match));
      if (match) void loadReviews(match);
    };
    syncProductFromUrl();
    window.addEventListener("popstate", syncProductFromUrl);
    return () => window.removeEventListener("popstate", syncProductFromUrl);
  }, [loadReviews, productCatalog]);

  function setProductUrl(product?: Product) {
    const url = new URL(window.location.href);
    if (product) url.searchParams.set("product", product.id);
    else url.searchParams.delete("product");
    window.history.pushState(
      { view: "shop", product: product?.id },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  function openProduct(product: Product) {
    setSelected(product);
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
      const message = cause instanceof Error ? cause.message : "Ulasan belum dapat disimpan";
      notify(message);
      throw cause;
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (selected) {
    return (
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
        onFavorite={() => toggleFavorite(selected.id)}
        onAdd={(quantity) => addToCart(selected.id, quantity)}
        onBuy={(quantity) => {
          addToCart(selected.id, quantity);
          setCartOpen(true);
        }}
        onSubmitReview={submitReview}
      />
    );
  }

  const sellerCount = new Set(productCatalog.map((product) => product.businessId)).size;

  return (
    <div className="shop-native market-home">
      <header className="market-mobile-header">
        <div><span>SLIVA MARKET</span><h1>Kebutuhan pet, lengkap.</h1></div>
        <button type="button" aria-label="Buka keranjang" onClick={() => setCartOpen(true)}>
          <Icon name="cart" size={20} />
          {cartCount > 0 && <b>{cartCount > 99 ? "99+" : cartCount}</b>}
        </button>
      </header>

      <section className="market-hero">
        <div className="market-hero-copy">
          <span><Icon name="shield" size={13} /> MARKETPLACE PARTNER TERVERIFIKASI</span>
          <h1>Belanja lebih tenang untuk sahabat terbaikmu.</h1>
          <p>Bandingkan produk, cek stok asli, baca ulasan pembeli, lalu checkout dari banyak petshop dalam satu keranjang.</p>
          <div className="market-hero-trust">
            <span><b>{productCatalog.length}</b> produk aktif</span>
            <span><b>{sellerCount}</b> partner</span>
            <span><b>100%</b> stok live</span>
          </div>
        </div>
        <div className="market-hero-art" aria-hidden="true">
          <i /><span>🛍️</span><b>🐾</b>
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
          {query && <button type="button" aria-label="Hapus pencarian" onClick={() => setQuery("")}><Icon name="close" size={15} /></button>}
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
          <div><span>BELANJA SESUAI KEBUTUHAN</span><h2>Kategori populer</h2></div>
        </header>
        <div className="market-category-rail" role="tablist" aria-label="Kategori produk">
          {categories.map((item) => (
            <button
              type="button"
              role="tab"
              aria-selected={category === item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              key={item}
            >
              <span><Icon name={categoryIcons[item] || "bag"} size={20} /></span>
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
            <label><span>Toko</span><select value={store} onChange={(event) => setStore(event.target.value)}>{stores.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Urutkan</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="recommended">Rekomendasi</option><option value="popular">Terlaris</option><option value="rating">Rating tertinggi</option><option value="price">Harga termurah</option></select></label>
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
                onFavorite={() => toggleFavorite(product.id)}
                onAdd={() => addToCart(product.id)}
              />
            ))}
          </div>
        ) : (
          <div className="market-empty-state">
            <span><Icon name="search" size={28} /></span>
            <h3>Produk belum ditemukan</h3>
            <p>Coba ganti kata kunci, kategori, atau pilihan toko.</p>
            <button type="button" onClick={() => { setQuery(""); setCategory("Semua"); setStore("Semua toko"); }}>Reset filter</button>
          </div>
        )}
      </section>

      <section className="market-confidence-strip">
        <article><span><Icon name="shield" size={19} /></span><div><b>Partner terverifikasi</b><p>Produk hanya dari bisnis aktif.</p></div></article>
        <article><span><Icon name="check" size={19} /></span><div><b>Data stok langsung</b><p>Ketersediaan mengikuti cabang.</p></div></article>
        <article><span><Icon name="chat" size={19} /></span><div><b>Ulasan pembeli asli</b><p>Hanya transaksi berbayar.</p></div></article>
      </section>
    </div>
  );
}
