import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createMobileOrder,
  createMobilePaymentIntent,
  getMobileProductReviews,
  getMobileProducts,
  quoteMobileOrder,
  saveMobileProductReview,
  type MobileOrderQuote,
  type MobilePaymentIntent,
  type MobileProduct,
  type MobileProductReview,
} from "../api";
import {
  MobileBatpayModal,
  MobilePaymentMethods,
} from "../components/BatpayPayment";
import { EmptyState, Pill, PrimaryButton, Screen } from "../components/ui";
import { colors, shadow } from "../theme";

type SortMode = "recommended" | "popular" | "rating" | "price";

type MarketplaceScreenProps = {
  authenticated: boolean;
  favorites: string[];
  refreshVersion: number;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  onRequireLogin: () => void;
  onToggleFavorite: (id: string) => Promise<void> | void;
};

const money = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function productEmoji(product: MobileProduct) {
  const value = `${product.category} ${product.name}`.toLowerCase();
  if (/food|makan|feed|snack/.test(value)) return "🥫";
  if (/vitamin|obat|health|kesehatan/.test(value)) return "💊";
  if (/shampoo|groom|mandi/.test(value)) return "🧴";
  if (/toy|mainan/.test(value)) return "🧸";
  if (/cat|kucing/.test(value)) return "🐈";
  if (/dog|anjing/.test(value)) return "🐕";
  return "🐾";
}

function compactNumber(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}rb`;
  return String(Math.max(0, Math.round(value)));
}

function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <View style={styles.stars} accessibilityLabel={`Rating ${value} dari 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Ionicons
          key={index}
          name={index < Math.round(value) ? "star" : "star-outline"}
          size={size}
          color={colors.yellow}
        />
      ))}
    </View>
  );
}

function ProductVisual({ product, large = false }: { product: MobileProduct; large?: boolean }) {
  if (product.image_url) {
    return (
      <Image
        alt={`Foto ${product.name}`}
        accessibilityLabel={`Foto ${product.name}`}
        source={{ uri: product.image_url }}
        resizeMode="cover"
        style={[styles.productImage, large && styles.productImageLarge]}
      />
    );
  }
  return (
    <LinearGradient
      colors={["#E2F6FF", "#F1FAFF", "#EAFBF6"]}
      style={[styles.productFallback, large && styles.productFallbackLarge]}
    >
      <View style={styles.fallbackBubble} />
      <Text style={[styles.productEmoji, large && styles.productEmojiLarge]}>
        {productEmoji(product)}
      </Text>
      <Text style={styles.fallbackLabel}>{product.category}</Text>
    </LinearGradient>
  );
}

function ProductCard({
  product,
  favorite,
  onOpen,
  onAdd,
  onFavorite,
}: {
  product: MobileProduct;
  favorite: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onFavorite: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Buka ${product.name}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}
    >
      <View style={styles.productVisualWrap}>
        <ProductVisual product={product} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
          hitSlop={8}
          onPress={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={17}
            color={favorite ? colors.red : colors.text}
          />
        </Pressable>
        {!product.available ? (
          <View style={styles.soldOutBadge}>
            <Text style={styles.soldOutText}>Stok habis</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.productCardBody}>
        <Text numberOfLines={2} style={styles.productName}>
          {product.name}
        </Text>
        <Text numberOfLines={1} style={styles.storeName}>
          <Ionicons name="storefront-outline" size={10} /> {product.business_name}
        </Text>
        <Text style={styles.productPrice}>{money.format(product.price)}</Text>
        <View style={styles.productMeta}>
          <Ionicons name="star" size={10} color={colors.yellow} />
          <Text style={styles.productMetaText}>
            {product.review_count ? product.rating.toFixed(1) : "Baru"}
          </Text>
          <View style={styles.metaDivider} />
          <Text style={styles.productMetaText}>{compactNumber(product.sold_count)} terjual</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!product.available}
          onPress={(event) => {
            event.stopPropagation();
            onAdd();
          }}
          style={({ pressed }) => [
            styles.addButton,
            !product.available && styles.disabledButton,
            pressed && product.available && styles.pressed,
          ]}
        >
          <Ionicons name="add" size={15} color={colors.white} />
          <Text style={styles.addButtonText}>Keranjang</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export function MarketplaceScreen({
  authenticated,
  favorites,
  refreshVersion,
  onAction,
  onOpenNotifications,
  onRequireLogin,
  onToggleFavorite,
}: MarketplaceScreenProps) {
  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [store, setStore] = useState("Semua toko");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [selected, setSelected] = useState<MobileProduct>();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [reviews, setReviews] = useState<MobileProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [voucher, setVoucher] = useState("");
  const [points, setPoints] = useState("");
  const [quote, setQuote] = useState<MobileOrderQuote>();
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMobileProducts();
      setProducts(result.data);
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Produk belum dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, [onAction]);

  useEffect(() => {
    queueMicrotask(() => void loadProducts());
  }, [loadProducts, refreshVersion]);

  const categories = useMemo(
    () => ["Semua", ...new Set(products.map((item) => item.category).filter(Boolean))],
    [products],
  );
  const stores = useMemo(
    () => [
      { id: "Semua toko", name: "Semua toko", city: "" },
      ...Array.from(
        new Map(
          products.map((item) => [
            item.business_id,
            { id: item.business_id, name: item.business_name, city: item.city },
          ]),
        ).values(),
      ),
    ],
    [products],
  );
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = products.filter(
      (item) =>
        (category === "Semua" || item.category === category) &&
        (store === "Semua toko" || item.business_id === store) &&
        (!needle ||
          `${item.name} ${item.category} ${item.business_name}`
            .toLowerCase()
            .includes(needle)),
    );
    return [...result].sort((left, right) => {
      if (sort === "popular") return right.sold_count - left.sold_count;
      if (sort === "rating") return right.rating - left.rating;
      if (sort === "price") return left.price - right.price;
      return Number(right.available) - Number(left.available) || right.review_count - left.review_count;
    });
  }, [category, products, query, sort, store]);
  const cartItems = useMemo(
    () =>
      Object.entries(cart).flatMap(([id, quantity]) => {
        const product = products.find((item) => item.id === id);
        return product && quantity > 0 ? [{ product, quantity }] : [];
      }),
    [cart, products],
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const localSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const setQuantity = useCallback((product: MobileProduct, quantity: number) => {
    const safeQuantity = Math.max(0, Math.min(Math.floor(product.stock), quantity));
    setCart((current) => {
      if (!safeQuantity) {
        const next = { ...current };
        delete next[product.id];
        return next;
      }
      return { ...current, [product.id]: safeQuantity };
    });
    setQuote(undefined);
  }, []);

  const addToCart = useCallback(
    (product: MobileProduct) => {
      if (!product.available) return;
      setQuantity(product, (cart[product.id] ?? 0) + 1);
      onAction(`${product.name} masuk keranjang`);
    },
    [cart, onAction, setQuantity],
  );

  const loadReviews = useCallback(async (product: MobileProduct) => {
    setReviewsLoading(true);
    try {
      const result = await getMobileProductReviews(product.id);
      setReviews(result.data);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const openProduct = (product: MobileProduct) => {
    setSelected(product);
    setReviewComment("");
    setReviewRating(5);
    void loadReviews(product);
  };

  const orderInput = useMemo(
    () => ({
      items: cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
      voucher_code: voucher.trim(),
      redeem_points: Math.max(0, Number.parseInt(points || "0", 10) || 0),
    }),
    [cartItems, points, voucher],
  );

  const refreshQuote = async () => {
    if (!cartItems.length) return;
    if (!authenticated) {
      onRequireLogin();
      return;
    }
    setQuoteBusy(true);
    try {
      setQuote(await quoteMobileOrder(orderInput));
    } catch (cause) {
      setQuote(undefined);
      onAction(cause instanceof Error ? cause.message : "Ringkasan belum dapat dihitung");
    } finally {
      setQuoteBusy(false);
    }
  };

  const checkout = async () => {
    if (!authenticated) {
      onRequireLogin();
      return;
    }
    if (!cartItems.length) return;
    setCheckoutBusy(true);
    try {
      const order = await createMobileOrder(orderInput);
      const intent = await createMobilePaymentIntent(
        "shop_order",
        order.id,
        paymentMethod,
      );
      setPayment(intent);
      setCartOpen(false);
      onAction(`Pesanan ${order.order_number} siap dibayar`);
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Checkout belum dapat diproses");
    } finally {
      setCheckoutBusy(false);
    }
  };

  const submitReview = async () => {
    if (!selected) return;
    if (!authenticated) {
      onRequireLogin();
      return;
    }
    if (reviewComment.trim().length < 10) {
      onAction("Ceritakan pengalamanmu minimal 10 karakter");
      return;
    }
    setReviewBusy(true);
    try {
      const result = await saveMobileProductReview(selected.id, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      onAction(result.message);
      setReviewComment("");
      await Promise.all([loadReviews(selected), loadProducts()]);
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Ulasan belum dapat disimpan");
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <>
      <Screen contentStyle={styles.screenContent}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>SLIVA MARKET</Text>
            <Text style={styles.headerTitle}>Belanja kebutuhan pet</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka notifikasi"
            onPress={onOpenNotifications}
            style={styles.headerButton}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <View style={styles.notificationDot} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Buka keranjang, ${cartCount} produk`}
            onPress={() => setCartOpen(true)}
            style={styles.headerButton}
          >
            <Ionicons name="bag-handle-outline" size={20} color={colors.text} />
            {cartCount ? (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{Math.min(cartCount, 99)}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.sky600} />
          <TextInput
            accessibilityLabel="Cari produk atau toko"
            placeholder="Cari makanan, vitamin, atau toko"
            placeholderTextColor="#94A7B7"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable hitSlop={8} onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <LinearGradient colors={["#139FE8", "#58C7F7"]} style={styles.hero}>
          <View style={styles.heroCopy}>
            <Pill tone="mint">BELANJA AMAN</Pill>
            <Text style={styles.heroTitle}>Satu keranjang,{"\n"}banyak toko pet.</Text>
            <Text style={styles.heroNote}>
              Produk petshop dan klinik terhubung langsung dengan stok asli.
            </Text>
          </View>
          <View style={styles.heroArt}>
            <View style={styles.heroOrb} />
            <Text style={styles.heroEmoji}>🛍️</Text>
            <View style={styles.heroPaw}>
              <Text>🐾</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>TOKO TERHUBUNG</Text>
            <Text style={styles.sectionTitle}>Belanja dari petshop favorit</Text>
          </View>
          <Text style={styles.sectionCount}>{Math.max(0, stores.length - 1)} toko</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storeRow}
        >
          {stores.map((item, index) => {
            const active = store === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setStore(item.id)}
                style={[styles.storeChip, active && styles.storeChipActive]}
              >
                <View style={[styles.storeIcon, active && styles.storeIconActive]}>
                  <Text style={styles.storeEmoji}>{index ? "🏪" : "✨"}</Text>
                </View>
                <View style={styles.storeChipCopy}>
                  <Text numberOfLines={1} style={[styles.storeChipName, active && styles.storeChipNameActive]}>
                    {item.name}
                  </Text>
                  <Text numberOfLines={1} style={[styles.storeChipCity, active && styles.storeChipCityActive]}>
                    {index ? item.city || "Pet partner" : "Lihat semuanya"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((item) => {
            const active = item === category;
            return (
              <Pressable
                key={item}
                onPress={() => setCategory(item)}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.catalogHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>PILIHAN BUAT PET-MU</Text>
            <Text style={styles.sectionTitle}>{visibleProducts.length} produk ditemukan</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {(
            [
              ["recommended", "Rekomendasi"],
              ["popular", "Terlaris"],
              ["rating", "Rating"],
              ["price", "Harga termurah"],
            ] as Array<[SortMode, string]>
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setSort(id)}
              style={[styles.sortChip, sort === id && styles.sortChipActive]}
            >
              <Text style={[styles.sortText, sort === id && styles.sortTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.sky600} />
            <Text style={styles.loadingText}>Mengambil stok terbaru…</Text>
          </View>
        ) : visibleProducts.length ? (
          <View style={styles.productGrid}>
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                favorite={favorites.includes(product.id)}
                onOpen={() => openProduct(product)}
                onAdd={() => addToCart(product)}
                onFavorite={() => {
                  if (!authenticated) return onRequireLogin();
                  void onToggleFavorite(product.id);
                }}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="🔎"
            title="Produk belum ditemukan"
            note="Coba kata kunci, kategori, atau toko lain."
            action="Reset pencarian"
            onAction={() => {
              setQuery("");
              setCategory("Semua");
              setStore("Semua toko");
            }}
          />
        )}
      </Screen>

      <ProductDetailSheet
        product={selected}
        reviews={reviews}
        reviewsLoading={reviewsLoading}
        rating={reviewRating}
        comment={reviewComment}
        reviewBusy={reviewBusy}
        onRating={setReviewRating}
        onComment={setReviewComment}
        onClose={() => setSelected(undefined)}
        onAdd={() => selected && addToCart(selected)}
        onBuy={() => {
          if (!selected) return;
          addToCart(selected);
          setSelected(undefined);
          setCartOpen(true);
        }}
        onSubmitReview={() => void submitReview()}
      />

      <CartSheet
        visible={cartOpen}
        items={cartItems}
        subtotal={localSubtotal}
        quote={quote}
        quoteBusy={quoteBusy}
        checkoutBusy={checkoutBusy}
        voucher={voucher}
        points={points}
        paymentMethod={paymentMethod}
        onPaymentMethod={setPaymentMethod}
        onVoucher={setVoucher}
        onPoints={setPoints}
        onClose={() => setCartOpen(false)}
        onQuantity={setQuantity}
        onQuote={() => void refreshQuote()}
        onCheckout={() => void checkout()}
      />

      <MobileBatpayModal
        payment={payment}
        onClose={() => setPayment(undefined)}
        onPaid={() => {
          setCart({});
          setQuote(undefined);
          void loadProducts();
          onAction("Pembayaran berhasil, pesanan sedang disiapkan toko");
        }}
      />
    </>
  );
}

function SheetFrame({
  visible,
  title,
  eyebrow,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <SafeAreaView edges={["top", "left", "right"]} style={styles.sheetSafeArea}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetEyebrow}>{eyebrow}</Text>
                <Text numberOfLines={2} style={styles.sheetTitle}>{title}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup"
                onPress={onClose}
                style={styles.sheetClose}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            {children}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ProductDetailSheet({
  product,
  reviews,
  reviewsLoading,
  rating,
  comment,
  reviewBusy,
  onRating,
  onComment,
  onClose,
  onAdd,
  onBuy,
  onSubmitReview,
}: {
  product?: MobileProduct;
  reviews: MobileProductReview[];
  reviewsLoading: boolean;
  rating: number;
  comment: string;
  reviewBusy: boolean;
  onRating: (value: number) => void;
  onComment: (value: string) => void;
  onClose: () => void;
  onAdd: () => void;
  onBuy: () => void;
  onSubmitReview: () => void;
}) {
  if (!product) return null;
  return (
    <SheetFrame visible title={product.name} eyebrow="DETAIL PRODUK" onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.detailContent}
      >
        <ProductVisual product={product} large />
        <View style={styles.detailStoreRow}>
          <View style={styles.detailStoreIcon}><Text>🏪</Text></View>
          <View style={styles.detailStoreCopy}>
            <Text style={styles.detailStoreName}>{product.business_name}</Text>
            <Text style={styles.detailStoreMeta}>{product.branch_name} · {product.city || "Indonesia"}</Text>
          </View>
          <Pill tone="mint">Terverifikasi</Pill>
        </View>
        <Text style={styles.detailPrice}>{money.format(product.price)}</Text>
        <View style={styles.detailMetaRow}>
          <Stars value={product.rating} />
          <Text style={styles.detailMetaText}>
            {product.review_count ? `${product.rating.toFixed(1)} (${product.review_count} ulasan)` : "Belum ada ulasan"}
          </Text>
          <View style={styles.metaDivider} />
          <Text style={styles.detailMetaText}>{compactNumber(product.sold_count)} terjual</Text>
          <View style={styles.metaDivider} />
          <Text style={styles.detailMetaText}>Stok {Math.floor(product.stock)}</Text>
        </View>
        <Text style={styles.detailSectionTitle}>Tentang produk</Text>
        <Text style={styles.detailDescription}>
          {product.description || "Produk pilihan dari partner Slivadoc untuk kebutuhan harian pet-mu."}
        </Text>

        <View style={styles.reviewHeader}>
          <View>
            <Text style={styles.detailSectionTitle}>Ulasan & komentar</Text>
            <Text style={styles.reviewHint}>Hanya pembeli terverifikasi yang dapat menulis ulasan.</Text>
          </View>
          <Text style={styles.reviewCount}>{reviews.length}</Text>
        </View>
        {reviewsLoading ? <ActivityIndicator style={styles.reviewLoader} color={colors.sky600} /> : null}
        {!reviewsLoading && !reviews.length ? (
          <View style={styles.emptyReviews}>
            <Text style={styles.emptyReviewsEmoji}>💬</Text>
            <View style={styles.emptyReviewsCopy}>
              <Text style={styles.emptyReviewsTitle}>Jadi reviewer pertama</Text>
              <Text style={styles.emptyReviewsNote}>Ulasan jujur membantu pet parent lain memilih.</Text>
            </View>
          </View>
        ) : null}
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewerAvatar}>
              <Text style={styles.reviewerAvatarText}>{review.reviewer_name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.reviewBody}>
              <View style={styles.reviewerLine}>
                <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                {review.verified_purchase ? <Pill tone="mint">Pembelian valid</Pill> : null}
              </View>
              <Stars value={review.rating} size={11} />
              <Text style={styles.reviewComment}>{review.comment}</Text>
              <Text style={styles.reviewDate}>
                {new Date(review.updated_at || review.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.reviewComposer}>
          <Text style={styles.composerTitle}>Bagaimana produknya?</Text>
          <View style={styles.ratingPicker}>
            {Array.from({ length: 5 }, (_, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1} bintang`}
                onPress={() => onRating(index + 1)}
                style={styles.ratingButton}
              >
                <Ionicons
                  name={index < rating ? "star" : "star-outline"}
                  size={24}
                  color={colors.yellow}
                />
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel="Komentar produk"
            placeholder="Ceritakan kualitas, kemasan, dan pengalaman pet-mu…"
            placeholderTextColor="#94A7B7"
            multiline
            maxLength={1000}
            value={comment}
            onChangeText={onComment}
            style={styles.reviewInput}
          />
          <PrimaryButton
            compact
            disabled={reviewBusy}
            label={reviewBusy ? "Menyimpan…" : "Kirim ulasan"}
            icon="chatbubble-ellipses-outline"
            onPress={onSubmitReview}
          />
        </View>
      </ScrollView>
      <View style={styles.detailActions}>
        <Pressable
          disabled={!product.available}
          onPress={onAdd}
          style={[styles.secondaryAction, !product.available && styles.disabledButton]}
        >
          <Ionicons name="bag-add-outline" size={18} color={colors.sky600} />
          <Text style={styles.secondaryActionText}>+ Keranjang</Text>
        </Pressable>
        <Pressable
          disabled={!product.available}
          onPress={onBuy}
          style={[styles.primaryAction, !product.available && styles.disabledButton]}
        >
          <Text style={styles.primaryActionText}>{product.available ? "Beli sekarang" : "Stok habis"}</Text>
        </Pressable>
      </View>
    </SheetFrame>
  );
}

function CartSheet({
  visible,
  items,
  subtotal,
  quote,
  quoteBusy,
  checkoutBusy,
  voucher,
  points,
  paymentMethod,
  onPaymentMethod,
  onVoucher,
  onPoints,
  onClose,
  onQuantity,
  onQuote,
  onCheckout,
}: {
  visible: boolean;
  items: Array<{ product: MobileProduct; quantity: number }>;
  subtotal: number;
  quote?: MobileOrderQuote;
  quoteBusy: boolean;
  checkoutBusy: boolean;
  voucher: string;
  points: string;
  paymentMethod: string;
  onPaymentMethod: (value: string) => void;
  onVoucher: (value: string) => void;
  onPoints: (value: string) => void;
  onClose: () => void;
  onQuantity: (product: MobileProduct, quantity: number) => void;
  onQuote: () => void;
  onCheckout: () => void;
}) {
  return (
    <SheetFrame visible={visible} title={`Keranjang (${items.length})`} eyebrow="CHECKOUT AMAN" onClose={onClose}>
      {!items.length ? (
        <EmptyState
          icon="🛍️"
          title="Keranjang masih kosong"
          note="Tambahkan produk favorit pet-mu dulu, ya."
          action="Mulai belanja"
          onAction={onClose}
        />
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.cartContent}>
          <View style={styles.cartNotice}>
            <Ionicons name="shield-checkmark" size={18} color="#178671" />
            <Text style={styles.cartNoticeText}>Harga dan stok dikonfirmasi ulang oleh Slivadoc saat checkout.</Text>
          </View>
          {items.map(({ product, quantity }) => (
            <View key={product.id} style={styles.cartItem}>
              <View style={styles.cartThumb}><Text style={styles.cartEmoji}>{productEmoji(product)}</Text></View>
              <View style={styles.cartItemCopy}>
                <Text numberOfLines={2} style={styles.cartItemName}>{product.name}</Text>
                <Text numberOfLines={1} style={styles.cartItemStore}>{product.business_name}</Text>
                <Text style={styles.cartItemPrice}>{money.format(product.price)}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable accessibilityLabel="Kurangi jumlah" onPress={() => onQuantity(product, quantity - 1)} style={styles.stepperButton}>
                  <Ionicons name={quantity === 1 ? "trash-outline" : "remove"} size={14} color={quantity === 1 ? colors.red : colors.text} />
                </Pressable>
                <Text style={styles.quantity}>{quantity}</Text>
                <Pressable accessibilityLabel="Tambah jumlah" onPress={() => onQuantity(product, quantity + 1)} style={styles.stepperButton}>
                  <Ionicons name="add" size={14} color={colors.text} />
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.promoCard}>
            <Text style={styles.inputLabel}>Voucher Slivadoc</Text>
            <View style={styles.promoRow}>
              <TextInput
                autoCapitalize="characters"
                placeholder="Contoh: PETHEMAT"
                placeholderTextColor="#94A7B7"
                value={voucher}
                onChangeText={onVoucher}
                style={styles.promoInput}
              />
              <Pressable disabled={quoteBusy} onPress={onQuote} style={styles.applyButton}>
                <Text style={styles.applyText}>{quoteBusy ? "…" : "Pakai"}</Text>
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Tukar Sliva Points</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#94A7B7"
              value={points}
              onChangeText={onPoints}
              style={styles.pointsInput}
            />
            {quote?.voucher_error ? <Text style={styles.quoteError}>{quote.voucher_error}</Text> : null}
          </View>

          <MobilePaymentMethods value={paymentMethod} onChange={onPaymentMethod} disabled={checkoutBusy} />

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Subtotal</Text><Text style={styles.summaryValue}>{money.format(quote?.subtotal ?? subtotal)}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Biaya platform</Text><Text style={styles.summaryValue}>{money.format(quote?.platform_fee ?? 0)}</Text></View>
            {quote?.voucher_discount ? <View style={styles.summaryRow}><Text style={styles.discountLabel}>Diskon voucher</Text><Text style={styles.discountValue}>−{money.format(quote.voucher_discount)}</Text></View> : null}
            {quote?.points_discount ? <View style={styles.summaryRow}><Text style={styles.discountLabel}>Sliva Points</Text><Text style={styles.discountValue}>−{money.format(quote.points_discount)}</Text></View> : null}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}><Text style={styles.totalLabel}>Total pembayaran</Text><Text style={styles.totalValue}>{money.format(quote?.total_amount ?? subtotal)}</Text></View>
          </View>
          <PrimaryButton
            disabled={checkoutBusy}
            label={checkoutBusy ? "Menyiapkan pembayaran…" : "Bayar pesanan"}
            icon="lock-closed-outline"
            onPress={onCheckout}
          />
        </ScrollView>
      )}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 18 },
  header: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7 },
  headerCopy: { flex: 1 },
  kicker: { color: colors.sky600, fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 1.1 },
  headerTitle: { marginTop: 1, color: colors.navy, fontSize: 18, lineHeight: 23, fontWeight: "900", letterSpacing: -0.35 },
  headerButton: { position: "relative", width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  notificationDot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.white, backgroundColor: colors.red },
  cartBadge: { position: "absolute", right: -4, top: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.red },
  cartBadgeText: { color: colors.white, fontSize: 9, fontWeight: "900" },
  searchBox: { height: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: "#CCE9F8", backgroundColor: colors.white, ...shadow },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 13 },
  hero: { position: "relative", minHeight: 174, overflow: "hidden", flexDirection: "row", marginTop: 12, padding: 18, borderRadius: 22 },
  heroCopy: { zIndex: 2, width: "68%" },
  heroTitle: { marginTop: 12, color: colors.white, fontSize: 24, lineHeight: 27, fontWeight: "900", letterSpacing: -0.65 },
  heroNote: { maxWidth: 230, marginTop: 9, color: "rgba(255,255,255,.86)", fontSize: 11, lineHeight: 16 },
  heroArt: { position: "absolute", right: 0, top: 0, bottom: 0, width: "42%", alignItems: "center", justifyContent: "center" },
  heroOrb: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,.14)" },
  heroEmoji: { fontSize: 61, transform: [{ rotate: "-7deg" }] },
  heroPaw: { position: "absolute", right: 17, top: 18, width: 37, height: 37, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.88)" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 20 },
  sectionEyebrow: { color: colors.muted, fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 1 },
  sectionTitle: { marginTop: 2, color: colors.navy, fontSize: 16, lineHeight: 21, fontWeight: "900", letterSpacing: -0.2 },
  sectionCount: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, color: colors.sky600, backgroundColor: colors.sky50, fontSize: 10, fontWeight: "800" },
  storeRow: { gap: 8, paddingTop: 10, paddingRight: 16 },
  storeChip: { width: 168, minHeight: 62, flexDirection: "row", alignItems: "center", gap: 9, padding: 9, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  storeChipActive: { borderColor: colors.sky500, backgroundColor: colors.sky50 },
  storeIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.peach50 },
  storeIconActive: { backgroundColor: colors.white },
  storeEmoji: { fontSize: 20 },
  storeChipCopy: { minWidth: 0, flex: 1 },
  storeChipName: { color: colors.navy, fontSize: 11, fontWeight: "900" },
  storeChipNameActive: { color: colors.sky600 },
  storeChipCity: { marginTop: 3, color: colors.muted, fontSize: 9 },
  storeChipCityActive: { color: colors.sky600 },
  categoryRow: { gap: 7, paddingVertical: 12, paddingRight: 16 },
  categoryChip: { minHeight: 32, justifyContent: "center", paddingHorizontal: 13, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  categoryChipActive: { borderColor: colors.sky500, backgroundColor: colors.sky500 },
  categoryText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  categoryTextActive: { color: colors.white },
  catalogHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 4 },
  sortRow: { gap: 6, paddingVertical: 10, paddingRight: 16 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, backgroundColor: "#EEF5F9" },
  sortChipActive: { backgroundColor: colors.navy },
  sortText: { color: colors.muted, fontSize: 9, fontWeight: "800" },
  sortTextActive: { color: colors.white },
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: colors.muted, fontSize: 11 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10 },
  productCard: { width: "48.7%", overflow: "hidden", borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow },
  pressed: { opacity: 0.75, transform: [{ scale: 0.988 }] },
  productVisualWrap: { position: "relative", height: 128 },
  productImage: { width: "100%", height: "100%" },
  productImageLarge: { height: 230, borderRadius: 18 },
  productFallback: { width: "100%", height: "100%", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  productFallbackLarge: { height: 230, borderRadius: 18 },
  fallbackBubble: { position: "absolute", right: -24, top: -33, width: 105, height: 105, borderRadius: 55, backgroundColor: "rgba(255,255,255,.55)" },
  productEmoji: { fontSize: 43 },
  productEmojiLarge: { fontSize: 72 },
  fallbackLabel: { position: "absolute", left: 9, bottom: 8, maxWidth: "82%", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, color: colors.sky600, backgroundColor: "rgba(255,255,255,.88)", fontSize: 8, fontWeight: "900" },
  favoriteButton: { position: "absolute", right: 8, top: 8, width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.94)" },
  soldOutBadge: { position: "absolute", left: 8, top: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: "rgba(21,59,91,.82)" },
  soldOutText: { color: colors.white, fontSize: 8, fontWeight: "900" },
  productCardBody: { padding: 10 },
  productName: { minHeight: 34, color: colors.navy, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  storeName: { marginTop: 5, color: colors.muted, fontSize: 9 },
  productPrice: { marginTop: 7, color: colors.sky600, fontSize: 13, lineHeight: 17, fontWeight: "900" },
  productMeta: { minHeight: 16, flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  productMetaText: { color: colors.muted, fontSize: 8 },
  metaDivider: { width: 1, height: 10, marginHorizontal: 2, backgroundColor: colors.line },
  addButton: { height: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 8, borderRadius: 10, backgroundColor: colors.sky500 },
  addButtonText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  disabledButton: { opacity: 0.42 },
  stars: { flexDirection: "row", alignItems: "center", gap: 1 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(13,35,54,.45)" },
  sheetSafeArea: { maxHeight: "88%" },
  sheet: { overflow: "hidden", maxHeight: "100%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white, ...shadow },
  sheetHandle: { alignSelf: "center", width: 42, height: 5, marginTop: 8, borderRadius: 3, backgroundColor: "#DCE7ED" },
  sheetHeader: { minHeight: 70, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  sheetHeaderCopy: { minWidth: 0, flex: 1 },
  sheetEyebrow: { color: colors.sky600, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  sheetTitle: { marginTop: 2, color: colors.navy, fontSize: 17, lineHeight: 22, fontWeight: "900" },
  sheetClose: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  detailContent: { padding: 16, paddingBottom: 20 },
  detailStoreRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  detailStoreIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.peach50 },
  detailStoreCopy: { minWidth: 0, flex: 1 },
  detailStoreName: { color: colors.navy, fontSize: 12, fontWeight: "900" },
  detailStoreMeta: { marginTop: 3, color: colors.muted, fontSize: 9 },
  detailPrice: { marginTop: 14, color: colors.sky600, fontSize: 22, lineHeight: 28, fontWeight: "900" },
  detailMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5, marginTop: 6 },
  detailMetaText: { color: colors.muted, fontSize: 9 },
  detailSectionTitle: { marginTop: 18, color: colors.navy, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  detailDescription: { marginTop: 6, color: colors.text, fontSize: 11, lineHeight: 17 },
  reviewHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  reviewHint: { marginTop: 3, color: colors.muted, fontSize: 9, lineHeight: 13 },
  reviewCount: { minWidth: 28, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9, color: colors.sky600, backgroundColor: colors.sky50, fontSize: 10, fontWeight: "900", textAlign: "center" },
  reviewLoader: { marginVertical: 18 },
  emptyReviews: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: colors.canvas },
  emptyReviewsEmoji: { fontSize: 24 },
  emptyReviewsCopy: { minWidth: 0, flex: 1 },
  emptyReviewsTitle: { color: colors.navy, fontSize: 11, fontWeight: "900" },
  emptyReviewsNote: { marginTop: 3, color: colors.muted, fontSize: 9, lineHeight: 13 },
  reviewCard: { flexDirection: "row", gap: 9, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  reviewerAvatar: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.violet50 },
  reviewerAvatarText: { color: colors.violet, fontSize: 13, fontWeight: "900" },
  reviewBody: { minWidth: 0, flex: 1 },
  reviewerLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  reviewerName: { color: colors.navy, fontSize: 10, fontWeight: "900" },
  reviewComment: { marginTop: 6, color: colors.text, fontSize: 10, lineHeight: 15 },
  reviewDate: { marginTop: 5, color: colors.muted, fontSize: 8 },
  reviewComposer: { gap: 9, marginTop: 14, padding: 13, borderRadius: 16, borderWidth: 1, borderColor: "#CDEAF8", backgroundColor: colors.sky50 },
  composerTitle: { color: colors.navy, fontSize: 12, fontWeight: "900" },
  ratingPicker: { flexDirection: "row", gap: 3 },
  ratingButton: { padding: 2 },
  reviewInput: { minHeight: 82, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.text, backgroundColor: colors.white, fontSize: 11, lineHeight: 16, textAlignVertical: "top" },
  detailActions: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  secondaryAction: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 13, borderRadius: 13, borderWidth: 1, borderColor: colors.sky500 },
  secondaryActionText: { color: colors.sky600, fontSize: 11, fontWeight: "900" },
  primaryAction: { minHeight: 44, flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.sky500 },
  primaryActionText: { color: colors.white, fontSize: 12, fontWeight: "900" },
  cartContent: { gap: 10, padding: 16, paddingBottom: 26 },
  cartNotice: { flexDirection: "row", alignItems: "center", gap: 8, padding: 11, borderRadius: 13, backgroundColor: colors.mint50 },
  cartNoticeText: { minWidth: 0, flex: 1, color: "#267C6C", fontSize: 9, lineHeight: 13 },
  cartItem: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 9, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  cartThumb: { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 },
  cartEmoji: { fontSize: 27 },
  cartItemCopy: { minWidth: 0, flex: 1 },
  cartItemName: { color: colors.navy, fontSize: 11, lineHeight: 15, fontWeight: "900" },
  cartItemStore: { marginTop: 2, color: colors.muted, fontSize: 8 },
  cartItemPrice: { marginTop: 5, color: colors.sky600, fontSize: 10, fontWeight: "900" },
  stepper: { height: 32, flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  stepperButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  quantity: { minWidth: 22, color: colors.navy, fontSize: 10, fontWeight: "900", textAlign: "center" },
  promoCard: { gap: 7, marginTop: 2, padding: 12, borderRadius: 15, backgroundColor: colors.canvas },
  inputLabel: { color: colors.text, fontSize: 9, fontWeight: "800" },
  promoRow: { flexDirection: "row", gap: 7 },
  promoInput: { minWidth: 0, height: 40, flex: 1, paddingHorizontal: 11, borderRadius: 11, borderWidth: 1, borderColor: colors.line, color: colors.text, backgroundColor: colors.white, fontSize: 10 },
  pointsInput: { height: 40, paddingHorizontal: 11, borderRadius: 11, borderWidth: 1, borderColor: colors.line, color: colors.text, backgroundColor: colors.white, fontSize: 10 },
  applyButton: { height: 40, justifyContent: "center", paddingHorizontal: 14, borderRadius: 11, backgroundColor: colors.navy },
  applyText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  quoteError: { color: colors.red, fontSize: 9, lineHeight: 13 },
  summaryCard: { gap: 8, marginTop: 2, padding: 13, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  summaryLabel: { color: colors.muted, fontSize: 10 },
  summaryValue: { color: colors.text, fontSize: 10, fontWeight: "700" },
  discountLabel: { color: "#198671", fontSize: 10 },
  discountValue: { color: "#198671", fontSize: 10, fontWeight: "800" },
  summaryDivider: { height: 1, backgroundColor: colors.line },
  totalLabel: { color: colors.navy, fontSize: 11, fontWeight: "900" },
  totalValue: { color: colors.sky600, fontSize: 15, fontWeight: "900" },
});
