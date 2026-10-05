import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createMobileOrder,
  createMobileMarketplaceChat,
  createMobilePaymentIntent,
  getMobileDistricts,
  getMobileProductReviews,
  getMobileProducts,
  getMobileMarketplaceChatMessages,
  getMobileMarketplaceStore,
  getMobileProvinces,
  getMobileRegencies,
  getMobileVillages,
  quoteMobileOrder,
  saveMobileProductReview,
  sendMobileMarketplaceChatMessage,
  type MobileMarketplaceChatMessage,
  type MobileMarketplaceStoreResponse,
  type MobileOrderQuote,
  type MobileOrderInput,
  type MobilePaymentIntent,
  type MobileProduct,
  type MobileProductReview,
  type MobileRegionOption,
} from "../api";
import {
  MobileQrisModal,
  MobilePaymentMethods,
} from "../components/QrisPayment";
import { RegionSelectSheet } from "../components/RegionSelectSheet";
import {
  EmptyState,
  PetRequiredNotice,
  Pill,
  PrimaryButton,
  Screen,
} from "../components/ui";
import type { Service } from "../data";
import {
  LocalizedText as Text,
  LocalizedTextInput as TextInput,
  useI18n,
} from "../i18n";
import {
  buildMarketplaceShippingPayload,
  createEmptyShippingAddress,
  createEmptyShippingDestination,
  createShippingAutoQuoteKey,
  isShippingDestinationComplete,
  isShippingQuoteRequestCurrent,
  resetShippingDestination,
  type ShippingAddressForm,
  type ShippingDestinationSelection,
  type ShippingRegionLevel,
} from "../shipping";
import { colors, shadow } from "../theme";

type SortMode =
  | "recommended"
  | "popular"
  | "bestseller"
  | "rating"
  | "newest"
  | "price"
  | "price_desc";
type StoreSection = "products" | "services" | "categories" | "reviews" | "about";
type MarketplaceChatShortcut = "products" | "services" | "pet_hotel" | "orders";

const MARKETPLACE_CHAT_SHORTCUTS: ReadonlyArray<{
  id: MarketplaceChatShortcut;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { id: "products", label: "Produk", icon: "bag-handle-outline" },
  { id: "services", label: "Layanan", icon: "heart-outline" },
  { id: "pet_hotel", label: "Pet Hotel", icon: "bed-outline" },
  { id: "orders", label: "Pesanan", icon: "receipt-outline" },
];

const MARKETPLACE_CHAT_EMOJIS = ["😊", "😍", "🙏", "👍", "🐾", "🐶", "🐱", "❤️"];

const REGION_LEVELS: readonly ShippingRegionLevel[] = [
  "province",
  "regency",
  "district",
  "village",
];

const REGION_PICKER_COPY: Record<
  ShippingRegionLevel,
  { label: string; placeholder: string; searchPlaceholder: string }
> = {
  province: {
    label: "Provinsi",
    placeholder: "Pilih provinsi",
    searchPlaceholder: "Cari provinsi",
  },
  regency: {
    label: "Kabupaten / Kota",
    placeholder: "Pilih kabupaten atau kota",
    searchPlaceholder: "Cari kabupaten atau kota",
  },
  district: {
    label: "Kecamatan",
    placeholder: "Pilih kecamatan",
    searchPlaceholder: "Cari kecamatan",
  },
  village: {
    label: "Kelurahan / Desa",
    placeholder: "Pilih kelurahan atau desa",
    searchPlaceholder: "Cari kelurahan atau desa",
  },
};

function isAbortError(cause: unknown) {
  return (
    cause instanceof Error &&
    (cause.name === "AbortError" || /aborted|aborterror/i.test(cause.message))
  );
}

type MarketplaceScreenProps = {
  authenticated: boolean;
  hasPet: boolean;
  partners: Service[];
  favorites: string[];
  refreshVersion: number;
  onAction: (message: string) => void;
  onOpenNotifications: () => void;
  onRequireLogin: () => void;
  onRequirePet: () => void;
  onToggleFavorite: (id: string) => Promise<void> | void;
  onOpenService: (service: Service) => void;
  onExploreServices: (category?: string) => void;
  onOpenOrders: () => void;
  onIntentHandled: (token: number) => void;
  intent?: {
    token: number;
    productId?: string;
    businessId?: string;
    items?: Array<{ product_id: string; quantity: number }>;
  };
};

function productIcon(product: MobileProduct): keyof typeof Ionicons.glyphMap {
  const value = `${product.category} ${product.name}`.toLowerCase();
  if (/food|makan|feed|snack/.test(value)) return "nutrition-outline";
  if (/vitamin|obat|health|kesehatan/.test(value)) return "medical-outline";
  if (/shampoo|groom|mandi/.test(value)) return "water-outline";
  if (/toy|mainan/.test(value)) return "game-controller-outline";
  if (/cat|kucing|dog|anjing/.test(value)) return "paw-outline";
  return "cube-outline";
}

function serviceGradient(tone: Service["tone"]): [string, string] {
  if (tone === "mint") return ["#DDFBF3", "#F4FFFC"];
  if (tone === "violet") return ["#ECE7FF", "#F8F6FF"];
  if (tone === "peach") return ["#FFF0E5", "#FFF9F4"];
  return ["#DDF3FF", "#F3FBFF"];
}

function serviceIcon(service: Pick<Service, "category" | "name">): keyof typeof Ionicons.glyphMap {
  const value = `${service.category} ${service.name}`.toLowerCase();
  if (/home|rumah/.test(value)) return "home-outline";
  if (/hotel|boarding|penitipan/.test(value)) return "bed-outline";
  if (/groom|mandi/.test(value)) return "cut-outline";
  return "medical-outline";
}

function compactNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1000)
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}rb`;
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

function StoreAvatar({
  name,
  logo,
  online,
  large = false,
}: {
  name: string;
  logo?: string;
  online?: boolean;
  large?: boolean;
}) {
  return (
    <View style={[styles.storeAvatar, large && styles.storeAvatarLarge]}>
      {logo ? (
        <Image
          source={{ uri: logo }}
          style={styles.storeAvatarImage}
          accessibilityLabel={`Logo toko ${name}`}
          alt={`Logo toko ${name}`}
        />
      ) : (
        <Text style={[styles.storeAvatarInitial, large && styles.storeAvatarInitialLarge]}>
          {name.trim().slice(0, 1).toUpperCase() || "S"}
        </Text>
      )}
      <View style={[styles.storePresenceDot, online && styles.storePresenceDotOnline]} />
    </View>
  );
}

function storePresenceLabel(
  online: boolean,
  lastSeen: string | undefined,
  formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string,
) {
  if (online) return "Online sekarang";
  if (!lastSeen) return "Terakhir online belum tersedia";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Terakhir online belum tersedia";
  return `Terakhir online ${formatDate(date, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function ProductVisual({
  product,
  large = false,
}: {
  product: MobileProduct;
  large?: boolean;
}) {
  const { width } = useWindowDimensions();
  const [previewIndex, setPreviewIndex] = useState<number>();
  const [activeImage, setActiveImage] = useState(0);
  const galleryRef = useRef<ScrollView>(null);
  const images = Array.from(new Set([...(product.image_urls ?? []), product.image_url].filter(Boolean)));
  const galleryWidth = Math.max(260, width - 48);
  useEffect(() => {
    if (!large || images.length < 2) return;
    const timer = setInterval(() => {
      setActiveImage((current) => {
        const next = (current + 1) % images.length;
        galleryRef.current?.scrollTo({ x: next * galleryWidth, animated: true });
        return next;
      });
    }, 1_000);
    return () => clearInterval(timer);
  }, [galleryWidth, images.length, large, product.id]);
  if (images.length) {
    if (large) {
      return <>
        <View>
          <ScrollView ref={galleryRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.productGallery} onMomentumScrollEnd={(event) => setActiveImage(Math.round(event.nativeEvent.contentOffset.x / galleryWidth))}>
            {images.map((uri, index) => (
              <Pressable key={uri} onPress={() => setPreviewIndex(index)} style={{ width: galleryWidth }} accessibilityRole="imagebutton" accessibilityLabel={`Perbesar foto ${index + 1} ${product.name}`}>
                <Image alt={`Foto ${index + 1} ${product.name}`} accessibilityLabel={`Foto ${index + 1} ${product.name}`} source={{ uri }} resizeMode="cover" style={styles.productImageLarge} />
              </Pressable>
            ))}
          </ScrollView>
          {images.length > 1 ? <View style={styles.productGalleryBadge}><Ionicons name="images-outline" size={13} color={colors.white} /><Text style={styles.productGalleryBadgeText}>{activeImage + 1}/{images.length} · otomatis</Text></View> : null}
        </View>
        <Modal visible={previewIndex !== undefined} animationType="fade" statusBarTranslucent transparent onRequestClose={() => setPreviewIndex(undefined)}>
          <SafeAreaView style={styles.productViewer}>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => setPreviewIndex(undefined)} style={styles.productViewerClose} accessibilityLabel="Tutup galeri"><Ionicons name="close" size={24} color={colors.white} /></Pressable>
            <Image alt={`Foto ${product.name}`} accessibilityLabel={`Foto ${product.name}`} source={{ uri: images[previewIndex ?? 0] }} resizeMode="contain" style={styles.productViewerImage} />
            {images.length > 1 ? <View style={styles.productViewerControls}><Pressable onPress={() => setPreviewIndex((value) => ((value ?? 0) - 1 + images.length) % images.length)}><Ionicons name="chevron-back" size={24} color={colors.white} /></Pressable><Text style={styles.productViewerCount}>{(previewIndex ?? 0) + 1} / {images.length}</Text><Pressable onPress={() => setPreviewIndex((value) => ((value ?? 0) + 1) % images.length)}><Ionicons name="chevron-forward" size={24} color={colors.white} /></Pressable></View> : null}
          </SafeAreaView>
        </Modal>
      </>;
    }
    return (
      <Image
        alt={`Foto ${product.name}`}
        accessibilityLabel={`Foto ${product.name}`}
        source={{ uri: images[0] }}
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
      <Ionicons
        name={productIcon(product)}
        size={large ? 66 : 40}
        color={colors.sky600}
      />
      <Text style={styles.fallbackLabel}>{product.category}</Text>
    </LinearGradient>
  );
}

function ProductCard({
  product,
  favorite,
  onOpen,
  onStore,
  onFavorite,
}: {
  product: MobileProduct;
  favorite: boolean;
  onOpen: () => void;
  onStore: () => void;
  onFavorite: () => void;
}) {
  const { formatCurrency, formatDate, formatNumber } = useI18n();
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
          accessibilityLabel={
            favorite ? "Hapus dari favorit" : "Tambah ke favorit"
          }
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
        <Text numberOfLines={1} style={styles.productCategory}>
          {product.category}
        </Text>
        <Text numberOfLines={2} style={styles.productName}>
          {product.name}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buka toko ${product.business_name}`}
          onPress={(event) => {
            event.stopPropagation();
            onStore();
          }}
          style={styles.productStoreBadge}
        >
          <StoreAvatar name={product.business_name} logo={product.store_logo_url} online={product.store_is_online} />
          <View style={styles.productStoreCopy}>
            <Text numberOfLines={1} style={styles.storeName}>{product.business_name}</Text>
            <Text numberOfLines={1} style={styles.storePresenceText}>
              {storePresenceLabel(product.store_is_online, product.store_last_seen_at, formatDate)}
            </Text>
          </View>
        </Pressable>
        <View style={styles.productCommerceRow}>
          <View style={styles.productCommerceCopy}>
            <Text style={styles.productPrice}>
              {formatCurrency(product.price)}
            </Text>
            <View style={styles.productMeta}>
              <Ionicons name="star" size={10} color={colors.yellow} />
              <Text style={styles.productMetaText}>
                {product.review_count ? product.rating.toFixed(1) : "Baru"}
              </Text>
              <View style={styles.metaDivider} />
              <Text style={styles.productMetaText}>
                {compactNumber(product.sold_count)} terjual
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.productFulfillment}>
          <View style={styles.productFulfillmentItem}>
            <Ionicons name="location-outline" size={10} color={colors.muted} />
            <Text numberOfLines={1} style={styles.productFulfillmentText}>
              {product.city || "Indonesia"}
            </Text>
          </View>
          <Text style={styles.productStockText}>
            {product.available ? `Stok ${compactNumber(product.stock)}` : "Habis"}
          </Text>
        </View>
        <View style={styles.productReward}>
          <Ionicons name="sparkles-outline" size={11} color="#087B68" />
          <Text numberOfLines={1} style={styles.productRewardText}>
            +{formatNumber(Math.max(0, Math.floor(product.price / 1000)))} Sliva Point
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function MarketplaceScreen({
  authenticated,
  hasPet,
  partners,
  favorites,
  refreshVersion,
  onAction,
  onOpenNotifications,
  onRequireLogin,
  onRequirePet,
  onToggleFavorite,
  onOpenService,
  onExploreServices,
  onOpenOrders,
  onIntentHandled,
  intent,
}: MarketplaceScreenProps) {
  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [store, setStore] = useState("");
  const [sort, setSort] = useState<SortMode>("recommended");
  const [selected, setSelected] = useState<MobileProduct>();
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [storeInitialSection, setStoreInitialSection] = useState<StoreSection>("products");
  const [storeResponse, setStoreResponse] =
    useState<MobileMarketplaceStoreResponse>();
  const storeRequest = useRef(0);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState("");
  const [chat, setChat] = useState<{
    threadId: string;
    businessId: string;
    storeName: string;
    storeLogo: string;
    storeOnline: boolean;
    storeLastSeen: string;
    product?: MobileProduct;
  }>();
  const [chatOpening, setChatOpening] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [directBuyCart, setDirectBuyCart] = useState<Record<string, number> | null>(
    null,
  );
  const directCheckoutRef = useRef(false);
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
  const [quotedKey, setQuotedKey] = useState("");
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddressForm>(
    createEmptyShippingAddress,
  );
  const [shippingDestination, setShippingDestination] =
    useState<ShippingDestinationSelection>(createEmptyShippingDestination);
  const [shippingSelections, setShippingSelections] = useState<
    Record<string, string>
  >({});
  const [regionOptions, setRegionOptions] = useState<
    Record<ShippingRegionLevel, MobileRegionOption[]>
  >({ province: [], regency: [], district: [], village: [] });
  const [regionPicker, setRegionPicker] = useState<ShippingRegionLevel>();
  const [regionLoading, setRegionLoading] = useState<ShippingRegionLevel>();
  const [regionErrors, setRegionErrors] = useState<
    Partial<Record<ShippingRegionLevel, string>>
  >({});
  const handledIntent = useRef(0);
  const quoteSequence = useRef(0);
  const quoteController = useRef<AbortController | undefined>(undefined);
  const shippingSelectionsRef = useRef<Record<string, string>>({});
  const regionRequestSequence = useRef<Record<ShippingRegionLevel, number>>({
    province: 0,
    regency: 0,
    district: 0,
    village: 0,
  });

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMobileProducts();
      setProducts(result.data);
    } catch (cause) {
      onAction(
        cause instanceof Error ? cause.message : "Produk belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [onAction]);

  useEffect(() => {
    queueMicrotask(() => void loadProducts());
  }, [loadProducts, refreshVersion]);

  const loadRegionOptions = useCallback(
    async (level: ShippingRegionLevel, parentID = "") => {
      const sequence = regionRequestSequence.current[level] + 1;
      regionRequestSequence.current[level] = sequence;
      setRegionLoading(level);
      setRegionErrors((current) => ({ ...current, [level]: undefined }));

      try {
        let result: { data: MobileRegionOption[] };
        switch (level) {
          case "province":
            result = await getMobileProvinces();
            break;
          case "regency":
            result = await getMobileRegencies(parentID);
            break;
          case "district":
            result = await getMobileDistricts(parentID);
            break;
          case "village":
            result = await getMobileVillages(parentID);
            break;
        }
        if (regionRequestSequence.current[level] !== sequence) return;
        setRegionOptions((current) => ({ ...current, [level]: result.data }));
      } catch (cause) {
        if (regionRequestSequence.current[level] !== sequence) return;
        setRegionOptions((current) => ({ ...current, [level]: [] }));
        setRegionErrors((current) => ({
          ...current,
          [level]:
            cause instanceof Error
              ? cause.message
              : "Daftar wilayah belum dapat dimuat",
        }));
      } finally {
        if (regionRequestSequence.current[level] === sequence) {
          setRegionLoading((current) =>
            current === level ? undefined : current,
          );
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (cartOpen) void loadRegionOptions("province");
  }, [cartOpen, loadRegionOptions]);

  const updateShippingSelections = useCallback(
    (next: Record<string, string>) => {
      shippingSelectionsRef.current = next;
      setShippingSelections(next);
    },
    [],
  );

  const invalidateQuote = useCallback(
    (clearSelections = true) => {
      quoteSequence.current += 1;
      quoteController.current?.abort();
      quoteController.current = undefined;
      setQuote(undefined);
      setQuotedKey("");
      setQuoteBusy(false);
      setQuoteError("");
      if (clearSelections) updateShippingSelections({});
    },
    [updateShippingSelections],
  );

  const openRegionPicker = useCallback(
    (level: ShippingRegionLevel) => {
      setRegionPicker(level);
      const parentID =
        level === "regency"
          ? shippingDestination.province?.code
          : level === "district"
            ? shippingDestination.regency?.code
            : level === "village"
              ? shippingDestination.district?.code
              : "";
      if (!regionOptions[level].length && (level === "province" || parentID)) {
        void loadRegionOptions(level, parentID);
      }
    },
    [loadRegionOptions, regionOptions, shippingDestination],
  );

  const selectRegion = useCallback(
    (level: ShippingRegionLevel, option: MobileRegionOption) => {
      setShippingDestination((current) =>
        resetShippingDestination(current, level, {
          code: option.code || option.id,
          name: option.name,
        }),
      );
      invalidateQuote();

      const levelIndex = REGION_LEVELS.indexOf(level);
      const clearedLevels = REGION_LEVELS.slice(levelIndex + 1);
      if (clearedLevels.length) {
        clearedLevels.forEach((child) => {
          regionRequestSequence.current[child] += 1;
        });
        setRegionOptions((current) => {
          const next = { ...current };
          clearedLevels.forEach((child) => {
            next[child] = [];
          });
          return next;
        });
        setRegionErrors((current) => {
          const next = { ...current };
          clearedLevels.forEach((child) => {
            next[child] = undefined;
          });
          return next;
        });
      }

      const nextLevel = REGION_LEVELS[levelIndex + 1];
      if (nextLevel) {
        void loadRegionOptions(nextLevel, option.id || option.code);
      }
    },
    [invalidateQuote, loadRegionOptions],
  );

  const partnerById = useMemo(() => {
    const index = new Map<string, Service>();
    partners.forEach((partner) => {
      if (partner.businessId) index.set(partner.businessId, partner);
      if (partner.branchId) index.set(partner.branchId, partner);
    });
    return index;
  }, [partners]);
  const catalogProducts = useMemo(
    () =>
      products.map((product) => {
        const partner =
          partnerById.get(product.business_id) ||
          (product.branch_id ? partnerById.get(product.branch_id) : undefined);
        if (!partner) return product;

        const missingPartnerName =
          product.business_name === "Pet Partner Slivadoc";
        return {
          ...product,
          business_id: partner.businessId || product.business_id,
          business_name:
            missingPartnerName && partner.businessName
              ? partner.businessName
              : product.business_name,
          branch_name:
            missingPartnerName && partner.branchName
              ? partner.branchName
              : product.branch_name,
          city:
            product.city === "Online" && partner.city
              ? partner.city
              : product.city,
        };
      }),
    [partnerById, products],
  );

  const categories = useMemo(
    () => [
      "Semua",
      ...new Set(catalogProducts.map((item) => item.category).filter(Boolean)),
    ],
    [catalogProducts],
  );
  const stores = useMemo(
    () =>
      Array.from(
        new Map(
          catalogProducts.map((item) => [
            item.business_id,
            {
              id: item.business_id,
              name: item.business_name,
              city: item.city,
              logo: item.store_logo_url,
              online: item.store_is_online,
            },
          ]),
        ).values(),
      ),
    [catalogProducts],
  );
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = catalogProducts.filter(
      (item) =>
        (category === "Semua" || item.category === category) &&
        (!store || item.business_id === store) &&
        (!needle ||
          `${item.name} ${item.category} ${item.business_name}`
            .toLowerCase()
            .includes(needle)),
    );
    return [...result].sort((left, right) => {
      if (sort === "popular") return right.sold_count - left.sold_count;
      if (sort === "rating") return right.rating - left.rating;
      if (sort === "price") return left.price - right.price;
      if (sort === "price_desc") return right.price - left.price;
      if (sort === "newest")
        return Date.parse(right.created_at || "") - Date.parse(left.created_at || "");
      return (
        Number(right.available) - Number(left.available) ||
        right.review_count - left.review_count
      );
    });
  }, [catalogProducts, category, query, sort, store]);
  const productsById = useMemo(
    () => new Map(catalogProducts.map((product) => [product.id, product])),
    [catalogProducts],
  );
  const checkoutCart = directBuyCart ?? cart;
  const cartItems = useMemo(
    () =>
      Object.entries(checkoutCart).flatMap(([id, quantity]) => {
        const product = productsById.get(id);
        return product && quantity > 0 ? [{ product, quantity }] : [];
      }),
    [checkoutCart, productsById],
  );
  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const localSubtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );

  const setQuantity = useCallback(
    (product: MobileProduct, quantity: number) => {
      const safeQuantity = Math.max(
        0,
        Math.min(Math.floor(product.stock), quantity),
      );
      const update = (current: Record<string, number>) => {
        if (!safeQuantity) {
          const next = { ...current };
          delete next[product.id];
          return next;
        }
        return { ...current, [product.id]: safeQuantity };
      };
      if (directBuyCart) {
        setDirectBuyCart((current) => update(current ?? {}));
      } else {
        setCart(update);
      }
      invalidateQuote();
    },
    [directBuyCart, invalidateQuote],
  );

  const addToCart = useCallback(
    (product: MobileProduct) => {
      if (!product.available) return;
      if (!hasPet) {
        onRequirePet();
        return;
      }
      setQuantity(product, (cart[product.id] ?? 0) + 1);
      onAction(`${product.name} masuk keranjang`);
    },
    [cart, hasPet, onAction, onRequirePet, setQuantity],
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

  const openStore = useCallback(
    async (businessId: string, initialSection: StoreSection = "products") => {
      const requestId = ++storeRequest.current;
      setSelected(undefined);
      setStoreResponse(undefined);
      setStoreInitialSection(initialSection);
      setSelectedStoreId(businessId);
      setStoreLoading(true);
      setStoreError("");
      try {
        const result = await getMobileMarketplaceStore(businessId);
        if (requestId === storeRequest.current) setStoreResponse(result);
      } catch (cause) {
        if (requestId === storeRequest.current)
          setStoreError(
            cause instanceof Error ? cause.message : "Etalase toko belum dapat dimuat",
          );
      } finally {
        if (requestId === storeRequest.current) setStoreLoading(false);
      }
    },
    [],
  );

  const openChat = useCallback(
    async (product?: MobileProduct) => {
      if (!authenticated) {
        onRequireLogin();
        return;
      }
      if (!hasPet) {
        onRequirePet();
        return;
      }
      const storeProduct =
        product ?? catalogProducts.find((item) => item.business_id === selectedStoreId);
      const businessId = product?.business_id || selectedStoreId;
      if (!businessId || chatOpening) return;
      setChatOpening(true);
      try {
        const thread = await createMobileMarketplaceChat({
          business_id: businessId,
          product_id: product?.id,
        });
        const profile =
          storeResponse?.store.id === businessId ? storeResponse.store : undefined;
        setChat({
          threadId: thread.id,
          businessId,
          product,
          storeName:
            profile?.name || storeProduct?.business_name || "Toko Slivadoc",
          storeLogo:
            profile?.logo_url || storeProduct?.store_logo_url || "",
          storeOnline:
            profile?.is_online ?? Boolean(storeProduct?.store_is_online),
          storeLastSeen:
            profile?.last_seen_at || storeProduct?.store_last_seen_at || "",
        });
      } catch (cause) {
        onAction(cause instanceof Error ? cause.message : "Chat toko belum dapat dibuka");
      } finally {
        setChatOpening(false);
      }
    },
    [
      authenticated,
      catalogProducts,
      chatOpening,
      hasPet,
      onAction,
      onRequireLogin,
      onRequirePet,
      selectedStoreId,
      storeResponse,
    ],
  );

  useEffect(() => {
    if (!intent || loading || handledIntent.current === intent.token) return;
    queueMicrotask(() => {
      handledIntent.current = intent.token;
      onIntentHandled(intent.token);
      if (intent.productId) {
        const product = productsById.get(intent.productId);
        if (!product) {
          onAction("Produk pada pesanan lama sudah tidak tersedia");
          return;
        }
        setSelected(product);
        setReviewComment("");
        setReviewRating(5);
        void loadReviews(product);
        return;
      }
      if (intent.businessId) {
        void openStore(intent.businessId, "services");
        return;
      }
      if (intent.items?.length) {
        const restored = intent.items.reduce<Record<string, number>>(
          (result, item) => {
            const product = productsById.get(item.product_id);
            if (product?.available) {
              result[product.id] = Math.max(
                1,
                Math.min(Math.floor(product.stock), item.quantity),
              );
            }
            return result;
          },
          {},
        );
        if (!Object.keys(restored).length) {
          onAction("Produk pada pesanan lama sedang tidak tersedia");
          return;
        }
        setCart(restored);
        invalidateQuote();
        setCartOpen(true);
      }
    });
  }, [
    intent,
    loadReviews,
    loading,
    onAction,
    onIntentHandled,
    productsById,
    invalidateQuote,
    openStore,
  ]);

  const quoteItems = useMemo(
    () =>
      cartItems.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      })),
    [cartItems],
  );
  const shippingAddressComplete = isShippingDestinationComplete(
    shippingAddress,
    shippingDestination,
  );
  const autoQuoteKey = shippingAddressComplete
    ? `${createShippingAutoQuoteKey(quoteItems, shippingAddress, shippingDestination)}:voucher=${voucher.trim().toUpperCase()}:points=${Math.max(0, Number.parseInt(points || "0", 10) || 0)}`
    : "";
  const autoQuoteKeyRef = useRef(autoQuoteKey);
  autoQuoteKeyRef.current = autoQuoteKey;

  const buildOrderInput = useCallback(
    (selections: Record<string, string>): MobileOrderInput => ({
      items: quoteItems,
      voucher_code: voucher.trim(),
      redeem_points: Math.max(0, Number.parseInt(points || "0", 10) || 0),
      shipping: buildMarketplaceShippingPayload(
        shippingAddress,
        shippingDestination,
        selections,
      ),
    }),
    [points, quoteItems, shippingAddress, shippingDestination, voucher],
  );

  const refreshQuote = useCallback(
    async (
      selectionOverride?: Record<string, string>,
      surfaceError = false,
    ) => {
      if (!cartItems.length) return;
      if (!authenticated) {
        if (surfaceError) onRequireLogin();
        return;
      }
      if (!hasPet) {
        if (surfaceError) onRequirePet();
        return;
      }
      if (!shippingAddressComplete) {
        if (surfaceError) {
          onAction("Lengkapi seluruh alamat tujuan pengiriman terlebih dahulu");
        }
        return;
      }

      const sequence = quoteSequence.current + 1;
      quoteSequence.current = sequence;
      const requestKey = autoQuoteKey;
      quoteController.current?.abort();
      const controller = new AbortController();
      quoteController.current = controller;
      const requestedSelections =
        selectionOverride ?? shippingSelectionsRef.current;
      setQuoteBusy(true);
      setQuotedKey("");
      setQuoteError("");
      try {
        let orderInput = buildOrderInput(requestedSelections);
        let nextQuote = await quoteMobileOrder(orderInput, controller.signal);
        if (
          !isShippingQuoteRequestCurrent(
            sequence,
            quoteSequence.current,
            requestKey,
            autoQuoteKeyRef.current,
          )
        )
          return;

        const automaticSelections = Object.fromEntries(
          nextQuote.shipping_quotes
            .filter((shipment) => shipment.rates[0])
            .map((shipment) => {
              const requested = requestedSelections[shipment.branch_id];
              const available = shipment.rates.some(
                (rate) => rate.service_code === requested,
              );
              const cheapest = shipment.rates.reduce((best, rate) =>
                rate.fee < best.fee ? rate : best,
              );
              return [
                shipment.branch_id,
                available && requested ? requested : cheapest.service_code,
              ];
            }),
        );

        if (
          Object.keys(automaticSelections).length !==
          nextQuote.shipping_quotes.length
        ) {
          throw new Error(
            "Salah satu origin pengiriman belum memiliki layanan yang tersedia",
          );
        }

        if (
          Object.keys(automaticSelections).length &&
          nextQuote.shipping_quotes.some(
            (shipment) =>
              automaticSelections[shipment.branch_id] !==
              requestedSelections[shipment.branch_id],
          )
        ) {
          orderInput = buildOrderInput(automaticSelections);
          nextQuote = await quoteMobileOrder(orderInput, controller.signal);
        }
        if (
          !isShippingQuoteRequestCurrent(
            sequence,
            quoteSequence.current,
            requestKey,
            autoQuoteKeyRef.current,
          )
        )
          return;

        updateShippingSelections(automaticSelections);
        setQuote(nextQuote);
        setQuotedKey(requestKey);
      } catch (cause) {
        if (isAbortError(cause) || quoteSequence.current !== sequence) return;
        const message =
          cause instanceof Error
            ? cause.message
            : "Ringkasan belum dapat dihitung";
        setQuote(undefined);
        setQuotedKey("");
        setQuoteError(message);
        if (surfaceError) onAction(message);
      } finally {
        if (quoteSequence.current === sequence) {
          setQuoteBusy(false);
          if (quoteController.current === controller) {
            quoteController.current = undefined;
          }
        }
      }
    },
    [
      authenticated,
      autoQuoteKey,
      buildOrderInput,
      cartItems.length,
      hasPet,
      onAction,
      onRequireLogin,
      onRequirePet,
      shippingAddressComplete,
      updateShippingSelections,
    ],
  );

  useEffect(() => {
    if (
      !cartOpen ||
      !authenticated ||
      !hasPet ||
      !cartItems.length ||
      !autoQuoteKey
    ) {
      quoteController.current?.abort();
      return;
    }

    const timer = setTimeout(() => {
      void refreshQuote(undefined, false);
    }, 600);
    return () => {
      clearTimeout(timer);
      quoteController.current?.abort();
    };
  }, [
    authenticated,
    autoQuoteKey,
    cartItems.length,
    cartOpen,
    hasPet,
    refreshQuote,
  ]);

  const checkoutReady = Boolean(
    quote &&
    quotedKey === autoQuoteKey &&
    shippingAddressComplete &&
    !quoteBusy &&
    quote.shipping_quotes.length > 0 &&
    quote.shipping_quotes.every(
      (shipment) =>
        shipment.selected_service &&
        shipment.selected_service === shippingSelections[shipment.branch_id],
    ),
  );

  const checkout = async () => {
    if (!authenticated) {
      onRequireLogin();
      return;
    }
    if (!hasPet) {
      onRequirePet();
      return;
    }
    if (!cartItems.length) return;
    if (!checkoutReady) {
      onAction("Lengkapi tujuan dan tunggu ongkir selesai dihitung");
      return;
    }
    setCheckoutBusy(true);
    try {
      const orderInput = buildOrderInput(shippingSelectionsRef.current);
      const order = await createMobileOrder(orderInput);
      const intent = await createMobilePaymentIntent(
        "shop_order",
        order.id,
        paymentMethod,
      );
      setPayment(intent);
      setCartOpen(false);
      directCheckoutRef.current = Boolean(directBuyCart);
      if (directBuyCart) setDirectBuyCart(null);
      onAction(`Pesanan ${order.order_number} siap dibayar`);
    } catch (cause) {
      onAction(
        cause instanceof Error
          ? cause.message
          : "Checkout belum dapat diproses",
      );
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
    if (!hasPet) {
      onRequirePet();
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
      onAction(
        cause instanceof Error ? cause.message : "Ulasan belum dapat disimpan",
      );
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
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.text}
            />
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
                <Text style={styles.cartBadgeText}>
                  {Math.min(cartCount, 99)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {!hasPet ? <PetRequiredNotice onAddPet={onRequirePet} /> : null}

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.sky600} />
          <TextInput
            accessibilityLabel="Cari produk atau toko"
            placeholder="Cari makanan, vitamin, atau toko"
            placeholderTextColor={colors.muted}
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

        <LinearGradient colors={[colors.sky600, "#0A6F9C"]} style={styles.hero}>
          <View style={styles.heroCopy}>
            <Pill tone="mint">BELANJA AMAN</Pill>
            <Text style={styles.heroTitle}>
              Satu keranjang,{"\n"}banyak toko pet.
            </Text>
            <Text style={styles.heroNote}>
              Produk petshop dan klinik terhubung langsung dengan stok asli.
            </Text>
          </View>
          <View style={styles.heroArt}>
            <View style={styles.heroOrb} />
            <Ionicons
              name="bag-handle"
              size={58}
              color={colors.white}
              style={styles.heroEmoji}
            />
            <View style={styles.heroPaw}>
              <Ionicons name="paw" size={19} color={colors.sky600} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>TOKO TERHUBUNG</Text>
            <Text style={styles.sectionTitle}>
              Belanja dari petshop favorit
            </Text>
          </View>
          <Text style={styles.sectionCount}>
            {stores.length} toko
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storeRow}
        >
          {stores.map((item) => {
            const active = store === item.id;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.name}${item.city ? `, ${item.city}` : ""}`}
                key={item.id}
                onPress={() =>
                  setStore((current) => (current === item.id ? "" : item.id))
                }
                style={[styles.storeChip, active && styles.storeChipActive]}
              >
                <StoreAvatar
                  name={item.name}
                  logo={item.logo}
                  online={item.online}
                />
                <View style={styles.storeChipCopy}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.storeChipName,
                      active && styles.storeChipNameActive,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.storeChipCity,
                      active && styles.storeChipCityActive,
                    ]}
                  >
                    {item.city || "Toko resmi"}
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
                style={[
                  styles.categoryChip,
                  active && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    active && styles.categoryTextActive,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.catalogHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>PILIHAN BUAT PET-MU</Text>
            <Text style={styles.sectionTitle}>
              {visibleProducts.length} produk ditemukan
            </Text>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sortRow}
        >
          {(
            [
              ["recommended", "Rekomendasi"],
              ["popular", "Terlaris"],
              ["newest", "Terbaru"],
              ["rating", "Rating"],
              ["price", "Harga termurah"],
              ["price_desc", "Harga termahal"],
            ] as Array<[SortMode, string]>
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setSort(id)}
              style={[styles.sortChip, sort === id && styles.sortChipActive]}
            >
              <Text
                style={[styles.sortText, sort === id && styles.sortTextActive]}
              >
                {label}
              </Text>
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
                onStore={() => void openStore(product.business_id)}
                onFavorite={() => {
                  if (!authenticated) return onRequireLogin();
                  void onToggleFavorite(product.id);
                }}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="search-outline"
            title="Produk belum ditemukan"
            note="Coba kata kunci, kategori, atau toko lain."
            action="Reset pencarian"
            onAction={() => {
              setQuery("");
              setCategory("Semua");
              setStore("");
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
        onStore={() => selected && void openStore(selected.business_id)}
        onChat={() => selected && void openChat(selected)}
        onAdd={() => selected && addToCart(selected)}
        onBuy={() => {
          if (!selected) return;
          if (!hasPet) {
            onRequirePet();
            return;
          }
          setDirectBuyCart({ [selected.id]: 1 });
          invalidateQuote();
          setSelected(undefined);
          setCartOpen(true);
        }}
        onSubmitReview={() => void submitReview()}
      />

      <StorefrontSheet
        key={selectedStoreId || "storefront"}
        visible={Boolean(selectedStoreId)}
        response={storeResponse}
        products={catalogProducts.filter(
          (product) => product.business_id === selectedStoreId,
        )}
        services={partners.filter((service) => service.businessId === selectedStoreId)}
        initialSection={storeInitialSection}
        loading={storeLoading}
        error={storeError}
        favorites={favorites}
        onClose={() => {
          storeRequest.current += 1;
          setSelectedStoreId("");
          setStoreResponse(undefined);
        }}
        onOpenProduct={(product) => {
          storeRequest.current += 1;
          setSelectedStoreId("");
          setStoreResponse(undefined);
          openProduct(product);
        }}
        onOpenService={(service) => {
          storeRequest.current += 1;
          setSelectedStoreId("");
          setStoreResponse(undefined);
          onOpenService(service);
        }}
        onChat={() => void openChat()}
        onFavorite={(product) => {
          if (!authenticated) return onRequireLogin();
          void onToggleFavorite(product.id);
        }}
      />

      {chat ? (
        <MarketplaceChatSheet
          {...chat}
          onShortcut={(shortcut) => {
            const businessId = chat.businessId;
            setChat(undefined);
            if (shortcut === "products" || shortcut === "services") {
              void openStore(
                businessId,
                shortcut === "services" ? "services" : "products",
              );
            } else if (shortcut === "pet_hotel") {
              onExploreServices("Pet Hotel");
            } else {
              onOpenOrders();
            }
          }}
          onAction={onAction}
          onClose={() => setChat(undefined)}
        />
      ) : null}

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
        shippingAddress={shippingAddress}
        shippingDestination={shippingDestination}
        shippingAddressComplete={shippingAddressComplete}
        shippingSelections={shippingSelections}
        quoteError={quoteError}
        regionPickerOpen={regionPicker !== undefined}
        regionPicker={
          <RegionSelectSheet
            embedded
            key={regionPicker ?? "closed"}
            visible={regionPicker !== undefined}
            title={REGION_PICKER_COPY[regionPicker ?? "province"].placeholder}
            placeholder={
              REGION_PICKER_COPY[regionPicker ?? "province"].searchPlaceholder
            }
            options={regionOptions[regionPicker ?? "province"]}
            loading={regionLoading === regionPicker}
            error={regionErrors[regionPicker ?? "province"]}
            value={shippingDestination[regionPicker ?? "province"]?.code}
            onSelect={(option) =>
              selectRegion(regionPicker ?? "province", option)
            }
            onRetry={() => {
              const level = regionPicker ?? "province";
              const parentID =
                level === "regency"
                  ? shippingDestination.province?.code
                  : level === "district"
                    ? shippingDestination.regency?.code
                    : level === "village"
                      ? shippingDestination.district?.code
                      : "";
              void loadRegionOptions(level, parentID);
            }}
            onClose={() => setRegionPicker(undefined)}
          />
        }
        checkoutReady={checkoutReady}
        onPaymentMethod={setPaymentMethod}
        onVoucher={(value) => {
          setVoucher(value);
          invalidateQuote(false);
        }}
        onPoints={(value) => {
          setPoints(value);
          invalidateQuote(false);
        }}
        onShippingAddress={(field, value) => {
          setShippingAddress((current) => ({ ...current, [field]: value }));
          invalidateQuote(false);
        }}
        onOpenRegion={openRegionPicker}
        onShippingService={(branchID, serviceCode) => {
          const next = {
            ...shippingSelectionsRef.current,
            [branchID]: serviceCode,
          };
          invalidateQuote(false);
          updateShippingSelections(next);
          void refreshQuote(next, false);
        }}
        onClose={() => {
          if (regionPicker !== undefined) {
            setRegionPicker(undefined);
            return;
          }
          setRegionPicker(undefined);
          invalidateQuote(false);
          setCartOpen(false);
          setDirectBuyCart(null);
        }}
        onQuantity={setQuantity}
        onQuote={() => void refreshQuote(undefined, true)}
        onCheckout={() => void checkout()}
      />

      <MobileQrisModal
        payment={payment}
        onClose={() => setPayment(undefined)}
        onPaid={() => {
          if (!directCheckoutRef.current) setCart({});
          directCheckoutRef.current = false;
          setDirectBuyCart(null);
          invalidateQuote();
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
  fill = false,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  eyebrow: string;
  fill?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <SafeAreaView
          edges={["top", "left", "right"]}
          style={[styles.sheetSafeArea, fill && styles.sheetSafeAreaFill]}
        >
          <View style={[styles.sheet, fill && styles.sheetFill]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetEyebrow}>{eyebrow}</Text>
                <Text numberOfLines={2} style={styles.sheetTitle}>
                  {title}
                </Text>
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
  onStore,
  onChat,
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
  onStore: () => void;
  onChat: () => void;
  onAdd: () => void;
  onBuy: () => void;
  onSubmitReview: () => void;
}) {
  const { formatCurrency, formatDate, formatNumber } = useI18n();
  if (!product) return null;
  const reviewAverage = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) /
      reviews.length
    : product.rating;
  const reviewDistribution = [5, 4, 3, 2, 1].map((score) => ({
    score,
    count: reviews.filter((review) => review.rating === score).length,
  }));
  return (
    <SheetFrame
      visible
      title={product.name}
      eyebrow="DETAIL PRODUK"
      onClose={onClose}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.detailContent}
      >
        <ProductVisual product={product} large />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buka toko ${product.business_name}`}
          onPress={onStore}
          style={styles.detailStoreRow}
        >
          <StoreAvatar
            name={product.business_name}
            logo={product.store_logo_url}
            online={product.store_is_online}
          />
          <View style={styles.detailStoreCopy}>
            <Text style={styles.detailStoreName}>{product.business_name}</Text>
            <Text style={styles.detailStoreMeta}>
              {product.branch_name} · {product.city || "Indonesia"}
            </Text>
            <Text style={[styles.detailStorePresence, product.store_is_online && styles.detailStorePresenceOnline]}>
              {storePresenceLabel(product.store_is_online, product.store_last_seen_at, formatDate)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>
        <View style={styles.detailStoreActions}>
          <Pressable onPress={onChat} style={styles.detailStoreActionPrimary}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.white} />
            <Text style={styles.detailStoreActionPrimaryText}>Chat toko</Text>
          </Pressable>
          <Pressable onPress={onStore} style={styles.detailStoreActionSecondary}>
            <Ionicons name="storefront-outline" size={16} color={colors.sky600} />
            <Text style={styles.detailStoreActionSecondaryText}>Kunjungi toko</Text>
          </Pressable>
        </View>
        <Text style={styles.detailPrice}>{formatCurrency(product.price)}</Text>
        <View style={styles.detailMetaRow}>
          <Stars value={product.rating} />
          <Text style={styles.detailMetaText}>
            {product.review_count
              ? `${product.rating.toFixed(1)} (${product.review_count} ulasan)`
              : "Belum ada ulasan"}
          </Text>
          <View style={styles.metaDivider} />
          <Text style={styles.detailMetaText}>
            {compactNumber(product.sold_count)} terjual
          </Text>
          <View style={styles.metaDivider} />
          <Text style={styles.detailMetaText}>
            Stok {Math.floor(product.stock)}
          </Text>
        </View>
        <Text style={styles.detailSectionTitle}>Tentang produk</Text>
        <Text style={styles.detailDescription}>
          {product.description ||
            "Produk pilihan dari partner Slivadoc untuk kebutuhan harian pet-mu."}
        </Text>

        <View style={styles.detailFacts}>
          <View style={styles.detailFact}>
            <Text style={styles.detailFactLabel}>SKU</Text>
            <Text numberOfLines={1} style={styles.detailFactValue}>
              {product.sku || "-"}
            </Text>
          </View>
          <View style={styles.detailFact}>
            <Text style={styles.detailFactLabel}>Kategori</Text>
            <Text numberOfLines={1} style={styles.detailFactValue}>
              {product.category}
            </Text>
          </View>
          <View style={styles.detailFact}>
            <Text style={styles.detailFactLabel}>Dikirim dari</Text>
            <Text numberOfLines={1} style={styles.detailFactValue}>
              {product.city || "Indonesia"}
            </Text>
          </View>
          <View style={styles.detailFact}>
            <Text style={styles.detailFactLabel}>Sliva Point</Text>
            <Text numberOfLines={1} style={styles.detailFactValue}>
              +{formatNumber(Math.max(0, Math.floor(product.price / 1000)))} poin
            </Text>
          </View>
        </View>

        <View style={styles.reviewHeader}>
          <View>
            <Text style={styles.detailSectionTitle}>Ulasan & komentar</Text>
            <Text style={styles.reviewHint}>
              Hanya pembeli terverifikasi yang dapat menulis ulasan.
            </Text>
          </View>
          <Text style={styles.reviewCount}>{reviews.length}</Text>
        </View>
        <View style={styles.reviewSummary}>
          <View style={styles.reviewSummaryScore}>
            <Text style={styles.reviewSummaryValue}>
              {reviews.length ? reviewAverage.toFixed(1) : "–"}
            </Text>
            <Text style={styles.reviewSummaryLabel}>dari 5</Text>
            <Stars value={reviewAverage} size={10} />
          </View>
          <View style={styles.reviewDistribution}>
            {reviewDistribution.map(({ score, count }) => (
              <View key={score} style={styles.reviewDistributionRow}>
                <Text style={styles.reviewDistributionScore}>{score}★</Text>
                <View style={styles.reviewDistributionTrack}>
                  <View
                    style={[
                      styles.reviewDistributionFill,
                      {
                        width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.reviewDistributionCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
        {reviewsLoading ? (
          <ActivityIndicator
            style={styles.reviewLoader}
            color={colors.sky600}
          />
        ) : null}
        {!reviewsLoading && !reviews.length ? (
          <View style={styles.emptyReviews}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={23}
              color={colors.sky600}
            />
            <View style={styles.emptyReviewsCopy}>
              <Text style={styles.emptyReviewsTitle}>
                Jadi reviewer pertama
              </Text>
              <Text style={styles.emptyReviewsNote}>
                Ulasan jujur membantu pet parent lain memilih.
              </Text>
            </View>
          </View>
        ) : null}
        {reviews.map((review) => (
          <View key={review.id} style={styles.reviewCard}>
            <View style={styles.reviewerAvatar}>
              <Text style={styles.reviewerAvatarText}>
                {review.reviewer_name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View style={styles.reviewBody}>
              <View style={styles.reviewerLine}>
                <Text style={styles.reviewerName}>{review.reviewer_name}</Text>
                {review.verified_purchase ? (
                  <Pill tone="mint">Pembelian valid</Pill>
                ) : null}
              </View>
              <Stars value={review.rating} size={11} />
              <Text style={styles.reviewComment}>{review.comment}</Text>
              <Text style={styles.reviewDate}>
                {formatDate(review.updated_at || review.created_at, {
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
            placeholderTextColor={colors.muted}
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
          style={[
            styles.secondaryAction,
            !product.available && styles.disabledButton,
          ]}
        >
          <Ionicons name="bag-add-outline" size={18} color={colors.sky600} />
          <Text style={styles.secondaryActionText}>+ Keranjang</Text>
        </Pressable>
        <Pressable
          disabled={!product.available}
          onPress={onBuy}
          style={[
            styles.primaryAction,
            !product.available && styles.disabledButton,
          ]}
        >
          <Text style={styles.primaryActionText}>
            {product.available ? "Beli sekarang" : "Stok habis"}
          </Text>
        </Pressable>
      </View>
    </SheetFrame>
  );
}

function StorefrontSheet({
  visible,
  response,
  products,
  services,
  initialSection,
  loading,
  error,
  favorites,
  onClose,
  onOpenProduct,
  onOpenService,
  onChat,
  onFavorite,
}: {
  visible: boolean;
  response?: MobileMarketplaceStoreResponse;
  products: MobileProduct[];
  services: Service[];
  initialSection: StoreSection;
  loading: boolean;
  error: string;
  favorites: string[];
  onClose: () => void;
  onOpenProduct: (product: MobileProduct) => void;
  onOpenService: (service: Service) => void;
  onChat: () => void;
  onFavorite: (product: MobileProduct) => void;
}) {
  const { formatDate } = useI18n();
  const { height: windowHeight } = useWindowDimensions();
  const [section, setSection] = useState<StoreSection>(initialSection);
  const [sort, setSort] = useState<SortMode>("popular");
  const [category, setCategory] = useState("Semua");
  const fallback = products[0];
  const fallbackService = services[0];
  const store = response?.store ?? {
    id: fallback?.business_id ?? fallbackService?.businessId ?? "",
    name: fallback?.business_name ?? fallbackService?.businessName ?? "Toko Slivadoc",
    logo_url: fallback?.store_logo_url ?? "",
    banner_url: "",
    about: "Katalog partner marketplace Slivadoc.",
    city: fallback?.city ?? fallbackService?.city ?? "Indonesia",
    joined_at: "",
    is_online: Boolean(fallback?.store_is_online),
    last_seen_at: fallback?.store_last_seen_at ?? "",
    product_count: products.length,
    category_count: new Set(products.map((item) => item.category)).size,
    rating:
      products.reduce((total, item) => total + item.rating, 0) /
      Math.max(1, products.length),
    review_count: products.reduce(
      (total, item) => total + item.review_count,
      0,
    ),
    sold_count: products.reduce((total, item) => total + item.sold_count, 0),
  };
  const categories =
    response?.categories ??
    Array.from(new Set(products.map((item) => item.category))).map((name) => ({
      name,
      product_count: products.filter((product) => product.category === name)
        .length,
    }));
  const visibleProducts = useMemo(() => {
    const filtered = products.filter(
      (product) => category === "Semua" || product.category === category,
    );
    return [...filtered].sort((left, right) => {
      if (sort === "newest")
        return (
          Date.parse(right.created_at || "") - Date.parse(left.created_at || "")
        );
      if (sort === "price") return left.price - right.price;
      if (sort === "price_desc") return right.price - left.price;
      if (sort === "rating")
        return (
          right.rating - left.rating || right.review_count - left.review_count
        );
      if (sort === "bestseller") return right.sold_count - left.sold_count;
      return (
        right.sold_count + right.review_count * 2 + right.rating * 5 -
        (left.sold_count + left.review_count * 2 + left.rating * 5)
      );
    });
  }, [category, products, sort]);

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.storefrontBackdrop} onPress={onClose}>
        <Pressable
          accessibilityRole="none"
          onPress={(event) => event.stopPropagation()}
          style={[
            styles.storefrontSheet,
            { height: Math.min(860, windowHeight * 0.92) },
          ]}
        >
          <SafeAreaView
            edges={["bottom", "left", "right"]}
            style={styles.storefrontSafeArea}
          >
            <View style={styles.storefrontHandle} />
        <View style={styles.storefrontHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke marketplace"
            onPress={onClose}
            style={styles.storefrontBack}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.storefrontHeaderCopy}>
            <Text style={styles.storefrontHeaderEyebrow}>SLIVA MARKET</Text>
            <Text numberOfLines={1} style={styles.storefrontHeaderTitle}>
              {store.name}
            </Text>
          </View>
          <Pressable onPress={onChat} style={styles.storefrontHeaderChat}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={19}
              color={colors.sky600}
            />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.storefrontContent}
        >
          <LinearGradient
            colors={[colors.sky600, "#6ECDF0", "#BDEFE3"]}
            style={styles.storefrontHero}
          >
            <View style={styles.storefrontHeroGlow} />
            <StoreAvatar
              name={store.name}
              logo={store.logo_url}
              online={store.is_online}
              large
            />
            <View style={styles.storefrontIdentity}>
              <View style={styles.storefrontVerified}>
                <Ionicons name="shield-checkmark" size={12} color="#087B68" />
                <Text style={styles.storefrontVerifiedText}>
                  PARTNER TERVERIFIKASI
                </Text>
              </View>
              <Text style={styles.storefrontName}>{store.name}</Text>
              <Text style={styles.storefrontMeta}>
                {store.city || "Indonesia"} ·{" "}
                {storePresenceLabel(store.is_online, store.last_seen_at, formatDate)}
              </Text>
            </View>
            <Pressable onPress={onChat} style={styles.storefrontChatButton}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={16}
                color={colors.white}
              />
              <Text style={styles.storefrontChatButtonText}>Chat toko</Text>
            </Pressable>
          </LinearGradient>

          <View style={styles.storefrontStats}>
            {[
              [String(store.product_count), "Produk"],
              [String(services.length), "Layanan"],
              [store.rating ? store.rating.toFixed(1) : "Baru", "Rating"],
              [compactNumber(store.sold_count), "Terjual"],
            ].map(([value, label]) => (
              <View key={label} style={styles.storefrontStat}>
                <Text style={styles.storefrontStatValue}>{value}</Text>
                <Text style={styles.storefrontStatLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.storefrontTabs}>
            {(
              [
                ["products", "Produk"],
                ["services", "Layanan"],
                ["categories", "Kategori"],
                ["reviews", `Ulasan (${store.review_count})`],
                ["about", "Tentang"],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: section === id }}
                onPress={() => setSection(id)}
                style={[
                  styles.storefrontTab,
                  section === id && styles.storefrontTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.storefrontTabText,
                    section === id && styles.storefrontTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {loading && !fallback && !fallbackService ? (
            <View style={styles.storefrontState}>
              <ActivityIndicator color={colors.sky600} />
              <Text style={styles.loadingText}>Menyiapkan etalase toko…</Text>
            </View>
          ) : error && !fallback && !fallbackService ? (
            <EmptyState
              icon="alert-circle-outline"
              title="Etalase belum dapat dibuka"
              note={error}
              action="Kembali"
              onAction={onClose}
            />
          ) : null}

          {section === "products" ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storefrontSortRow}
              >
                {(
                  [
                    ["popular", "Populer"],
                    ["newest", "Terbaru"],
                    ["bestseller", "Terlaris"],
                    ["price", "Termurah"],
                    ["price_desc", "Termahal"],
                  ] as Array<[SortMode, string]>
                ).map(([id, label]) => (
                  <Pressable
                    key={id}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: sort === id }}
                    onPress={() => setSort(id)}
                    style={[
                      styles.sortChip,
                      sort === id && styles.sortChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sortText,
                        sort === id && styles.sortTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRow}
              >
                {["Semua", ...categories.map((item) => item.name)].map(
                  (item) => (
                    <Pressable
                      key={item}
                      onPress={() => setCategory(item)}
                      style={[
                        styles.categoryChip,
                        category === item && styles.categoryChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          category === item && styles.categoryTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  ),
                )}
              </ScrollView>
              <View style={styles.productGrid}>
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    favorite={favorites.includes(product.id)}
                    onOpen={() => onOpenProduct(product)}
                    onStore={() => undefined}
                    onFavorite={() => onFavorite(product)}
                  />
                ))}
              </View>
            </>
          ) : null}

          {section === "services" ? (
            <View style={styles.storefrontServiceList}>
              <View style={styles.storefrontServiceHeading}>
                <View>
                  <Text style={styles.sectionEyebrow}>LAYANAN PARTNER</Text>
                  <Text style={styles.sectionTitle}>Pilih layanan dari toko ini</Text>
                </View>
                <Text style={styles.sectionCount}>{services.length} layanan</Text>
              </View>
              {services.length ? services.map((service) => (
                <Pressable
                  key={service.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Lihat detail ${service.name}`}
                  onPress={() => onOpenService(service)}
                  style={({ pressed }) => [styles.storefrontServiceCard, pressed && styles.pressed]}
                >
                  <LinearGradient colors={serviceGradient(service.tone)} style={styles.storefrontServiceVisual}>
                    {service.imageUrl ? <Image source={{ uri: service.imageUrl }} alt={`Foto ${service.name}`} style={styles.storefrontServiceImage} /> : <Ionicons name={serviceIcon(service)} size={27} color={colors.sky600} />}
                  </LinearGradient>
                  <View style={styles.storefrontServiceCopy}>
                    <Text style={styles.productCategory}>{service.category}</Text>
                    <Text numberOfLines={2} style={styles.storefrontServiceName}>{service.name}</Text>
                    <Text numberOfLines={1} style={styles.storefrontServiceMeta}>{service.durationMinutes ? `${service.durationMinutes} menit · ` : ""}{service.price}</Text>
                  </View>
                  <View style={styles.storefrontServiceArrow}><Ionicons name="chevron-forward" size={16} color={colors.sky600} /></View>
                </Pressable>
              )) : (
                <EmptyState icon="medical-outline" title="Belum ada layanan" note="Partner ini belum menerbitkan layanan aktif." action="Lihat produk" onAction={() => setSection("products")} />
              )}
            </View>
          ) : null}

          {section === "categories" ? (
            <View style={styles.storefrontCategoryGrid}>
              {categories.map((item) => (
                <Pressable
                  key={item.name}
                  onPress={() => {
                    setCategory(item.name);
                    setSection("products");
                  }}
                  style={styles.storefrontCategoryCard}
                >
                  <View style={styles.storefrontCategoryIcon}>
                    <Ionicons name="grid-outline" size={24} color={colors.sky600} />
                  </View>
                  <Text style={styles.storefrontCategoryName}>{item.name}</Text>
                  <Text style={styles.storefrontCategoryCount}>
                    {item.product_count} produk
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {section === "reviews" ? (
            <View style={styles.storefrontReviewList}>
              {response?.reviews.length ? (
                response.reviews.map((review) => (
                  <View key={review.id} style={styles.storefrontReviewCard}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerAvatarText}>
                        {review.reviewer_name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.reviewBody}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer_name}
                      </Text>
                      <Stars value={review.rating} size={11} />
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                      <Text style={styles.reviewDate}>{review.product_name}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  icon="chatbubble-ellipses-outline"
                  title="Belum ada ulasan toko"
                  note="Ulasan pembelian terverifikasi akan tampil di sini."
                  action="Lihat produk"
                  onAction={() => setSection("products")}
                />
              )}
            </View>
          ) : null}

          {section === "about" ? (
            <View style={styles.storefrontAbout}>
              <View style={styles.storefrontAboutIcon}>
                <Ionicons name="storefront" size={28} color={colors.sky600} />
              </View>
              <Text style={styles.storefrontAboutTitle}>Tentang {store.name}</Text>
              <Text style={styles.storefrontAboutCopy}>{store.about}</Text>
              <View style={styles.storefrontAboutFact}>
                <Text style={styles.storefrontAboutLabel}>Lokasi</Text>
                <Text style={styles.storefrontAboutValue}>
                  {store.city || "Indonesia"}
                </Text>
              </View>
              <View style={styles.storefrontAboutFact}>
                <Text style={styles.storefrontAboutLabel}>Status</Text>
                <Text style={styles.storefrontAboutValue}>
                  {store.is_online ? "Online sekarang" : "Sedang offline"}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MarketplaceChatSheet({
  threadId,
  storeName,
  storeLogo,
  storeOnline,
  storeLastSeen,
  product,
  onShortcut,
  onAction,
  onClose,
}: {
  threadId: string;
  businessId: string;
  storeName: string;
  storeLogo: string;
  storeOnline: boolean;
  storeLastSeen: string;
  product?: MobileProduct;
  onShortcut: (shortcut: MarketplaceChatShortcut) => void;
  onAction: (message: string) => void;
  onClose: () => void;
}) {
  const { formatDate } = useI18n();
  const [messages, setMessages] = useState<MobileMarketplaceChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composerTray, setComposerTray] = useState<"attachments" | "emoji">();
  const messageList = useRef<ScrollView>(null);
  const stickToLatest = useRef(true);
  const hasDraft = Boolean(draft.trim());

  const loadMessages = useCallback(async () => {
    try {
      const result = await getMobileMarketplaceChatMessages(threadId);
      setMessages(result.data);
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Pesan belum dapat dimuat");
    } finally {
      setLoading(false);
    }
  }, [onAction, threadId]);

  useEffect(() => {
    const initial = setTimeout(() => void loadMessages(), 0);
    const interval = setInterval(() => void loadMessages(), 4_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [loadMessages]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await sendMobileMarketplaceChatMessage(threadId, {
        body,
        product_id: product?.id,
      });
      setMessages((current) => [...current, message]);
      setDraft("");
      setComposerTray(undefined);
      stickToLatest.current = true;
    } catch (cause) {
      onAction(cause instanceof Error ? cause.message : "Pesan belum dapat dikirim");
    } finally {
      setSending(false);
    }
  };

  return (
    <SheetFrame visible fill title={storeName} eyebrow="CHAT TOKO · TEKS SAJA" onClose={onClose}>
      <View style={styles.chatStorePresence}>
        <StoreAvatar name={storeName} logo={storeLogo} online={storeOnline} />
        <Text style={[styles.chatStorePresenceText, storeOnline && styles.chatStorePresenceOnline]}>
          {storePresenceLabel(storeOnline, storeLastSeen, formatDate)}
        </Text>
      </View>
      {product ? (
        <View style={styles.chatProductContext}>
          <View style={styles.chatProductThumb}>
            <Ionicons name={productIcon(product)} size={24} color={colors.sky600} />
          </View>
          <View style={styles.chatProductCopy}>
            <Text style={styles.chatProductLabel}>TANYAKAN PRODUK INI</Text>
            <Text numberOfLines={1} style={styles.chatProductName}>
              {product.name}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={styles.chatSafety}>
        <Ionicons name="shield-checkmark-outline" size={15} color={colors.sky600} />
        <Text style={styles.chatSafetyText}>
          Pesan teks saja. Jangan bagikan OTP atau kata sandi.
        </Text>
      </View>
      <ScrollView
        ref={messageList}
        style={styles.chatMessageScroller}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatMessages}
        scrollEventThrottle={16}
        onContentSizeChange={() => {
          if (stickToLatest.current)
            messageList.current?.scrollToEnd({ animated: true });
        }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          stickToLatest.current =
            contentSize.height - contentOffset.y - layoutMeasurement.height < 72;
        }}
      >
        {loading ? <ActivityIndicator color={colors.sky600} /> : null}
        {!loading && !messages.length ? (
          <View style={styles.chatEmpty}>
            <View style={styles.chatEmptyIcon}>
              <Ionicons name="hand-left-outline" size={25} color={colors.sky600} />
            </View>
            <Text style={styles.chatEmptyTitle}>Mulai obrolan dengan toko</Text>
            <Text style={styles.chatEmptyNote}>
              Tanyakan stok, ukuran, kandungan, atau detail produk.
            </Text>
          </View>
        ) : null}
        {messages.map((message) => {
          const mine = message.sender_type === "buyer";
          return (
            <View
              key={message.id}
              style={[styles.chatBubble, mine && styles.chatBubbleMine]}
            >
              <Text style={[styles.chatSender, mine && styles.chatTextMine]}>
                {mine ? "Kamu" : message.sender_name}
              </Text>
              <Text style={[styles.chatBody, mine && styles.chatTextMine]}>
                {message.body}
              </Text>
              <Text style={[styles.chatTime, mine && styles.chatTextMine]}>
                {formatDate(message.created_at, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        })}
      </ScrollView>
      {composerTray === "attachments" ? (
        <View style={styles.chatShortcutGrid}>
          {MARKETPLACE_CHAT_SHORTCUTS.map((shortcut, index) => (
            <Pressable
              key={shortcut.id}
              accessibilityRole="button"
              accessibilityLabel={shortcut.label}
              onPress={() => onShortcut(shortcut.id)}
              style={styles.chatShortcut}
            >
              <View
                style={[
                  styles.chatShortcutIcon,
                  index === 1 && styles.chatShortcutIconMint,
                  index === 2 && styles.chatShortcutIconViolet,
                  index === 3 && styles.chatShortcutIconYellow,
                ]}
              >
                <Ionicons name={shortcut.icon} size={19} color={colors.sky600} />
              </View>
              <Text style={styles.chatShortcutLabel}>{shortcut.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {composerTray === "emoji" ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chatEmojiRow}
        >
          {MARKETPLACE_CHAT_EMOJIS.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityRole="button"
              accessibilityLabel={`Gunakan emoji ${emoji}`}
              onPress={() => {
                setDraft((current) => `${current}${emoji}`);
                setComposerTray(undefined);
              }}
              style={styles.chatEmojiChoice}
            >
              <Text style={styles.chatEmojiChoiceText}>{emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.chatComposer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Buka pilihan chat"
          accessibilityState={{ expanded: composerTray === "attachments" }}
          onPress={() =>
            setComposerTray((current) =>
              current === "attachments" ? undefined : "attachments",
            )
          }
          style={[
            styles.chatComposerButton,
            composerTray === "attachments" && styles.chatComposerButtonActive,
          ]}
        >
          <Ionicons name="add" size={23} color={colors.sky600} />
        </Pressable>
        <TextInput
          accessibilityLabel="Pesan untuk toko"
          multiline={false}
          maxLength={2000}
          placeholder="Tulis pesan ke toko…"
          placeholderTextColor={colors.muted}
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            if (value.trim()) setComposerTray(undefined);
          }}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (hasDraft) void send();
          }}
          style={styles.chatInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasDraft ? "Kirim pesan" : "Buka pilihan emoji"}
          accessibilityState={hasDraft ? { disabled: sending } : { expanded: composerTray === "emoji" }}
          disabled={hasDraft && sending}
          onPress={() => {
            if (hasDraft) void send();
            else
              setComposerTray((current) =>
                current === "emoji" ? undefined : "emoji",
              );
          }}
          style={[
            styles.chatComposerButton,
            hasDraft && styles.chatSend,
            !hasDraft && composerTray === "emoji" && styles.chatComposerButtonActive,
            hasDraft && sending && styles.disabledButton,
          ]}
        >
          {hasDraft ? (
            <Ionicons name="send" size={18} color={colors.white} />
          ) : (
            <Text style={styles.chatComposerEmoji}>😊</Text>
          )}
        </Pressable>
      </View>
    </SheetFrame>
  );
}

function ShippingRegionField({
  level,
  value,
  disabled,
  onPress,
}: {
  level: ShippingRegionLevel;
  value?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const copy = REGION_PICKER_COPY[level];
  const { t } = useI18n();
  return (
    <View style={styles.regionFieldWrap}>
      <Text style={styles.regionFieldLabel}>{copy.label} *</Text>
      <Pressable
        accessibilityLabel={`${t(copy.placeholder)}${value ? `, ${value}` : ""}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.regionField,
          disabled && styles.regionFieldDisabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Ionicons
          name={value ? "location" : "location-outline"}
          size={16}
          color={value ? colors.sky600 : colors.muted}
        />
        <Text
          numberOfLines={1}
          style={[
            styles.regionFieldValue,
            !value && styles.regionFieldPlaceholder,
          ]}
        >
          {value || copy.placeholder}
        </Text>
        <Ionicons name="chevron-down" size={15} color={colors.muted} />
      </Pressable>
    </View>
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
  shippingAddress,
  shippingDestination,
  shippingAddressComplete,
  shippingSelections,
  quoteError,
  regionPickerOpen,
  regionPicker,
  checkoutReady,
  onPaymentMethod,
  onVoucher,
  onPoints,
  onShippingAddress,
  onOpenRegion,
  onShippingService,
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
  shippingAddress: ShippingAddressForm;
  shippingDestination: ShippingDestinationSelection;
  shippingAddressComplete: boolean;
  shippingSelections: Record<string, string>;
  quoteError: string;
  regionPickerOpen: boolean;
  regionPicker?: ReactNode;
  checkoutReady: boolean;
  onPaymentMethod: (value: string) => void;
  onVoucher: (value: string) => void;
  onPoints: (value: string) => void;
  onShippingAddress: (field: keyof ShippingAddressForm, value: string) => void;
  onOpenRegion: (level: ShippingRegionLevel) => void;
  onShippingService: (branchID: string, serviceCode: string) => void;
  onClose: () => void;
  onQuantity: (product: MobileProduct, quantity: number) => void;
  onQuote: () => void;
  onCheckout: () => void;
}) {
  const { formatCurrency } = useI18n();
  return (
    <SheetFrame
      visible={visible}
      title={`Keranjang (${items.length})`}
      eyebrow="CHECKOUT AMAN"
      onClose={onClose}
    >
      {!items.length ? (
        <EmptyState
          icon="bag-handle-outline"
          title="Keranjang masih kosong"
          note="Tambahkan produk favorit pet-mu dulu, ya."
          action="Mulai belanja"
          onAction={onClose}
        />
      ) : (
        <ScrollView
          accessibilityElementsHidden={regionPickerOpen}
          importantForAccessibility={
            regionPickerOpen ? "no-hide-descendants" : "auto"
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cartContent}
        >
          <View style={styles.cartNotice}>
            <Ionicons name="shield-checkmark" size={18} color={colors.mint} />
            <Text style={styles.cartNoticeText}>
              Harga dan stok dikonfirmasi ulang oleh Slivadoc saat checkout.
            </Text>
          </View>
          {items.map(({ product, quantity }) => (
            <View key={product.id} style={styles.cartItem}>
              <View style={styles.cartThumb}>
                <Ionicons
                  name={productIcon(product)}
                  size={27}
                  color={colors.sky600}
                />
              </View>
              <View style={styles.cartItemCopy}>
                <Text numberOfLines={2} style={styles.cartItemName}>
                  {product.name}
                </Text>
                <Text numberOfLines={1} style={styles.cartItemStore}>
                  {product.business_name}
                </Text>
                <Text style={styles.cartItemPrice}>
                  {formatCurrency(product.price)}
                </Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityLabel="Kurangi jumlah"
                  onPress={() => onQuantity(product, quantity - 1)}
                  style={styles.stepperButton}
                >
                  <Ionicons
                    name={quantity === 1 ? "trash-outline" : "remove"}
                    size={14}
                    color={quantity === 1 ? colors.red : colors.text}
                  />
                </Pressable>
                <Text style={styles.quantity}>{quantity}</Text>
                <Pressable
                  accessibilityLabel="Tambah jumlah"
                  onPress={() => onQuantity(product, quantity + 1)}
                  style={styles.stepperButton}
                >
                  <Ionicons name="add" size={14} color={colors.text} />
                </Pressable>
              </View>
            </View>
          ))}

          <View style={styles.shippingCard}>
            <View style={styles.shippingHeading}>
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.sky600}
              />
              <View style={styles.shippingHeadingCopy}>
                <Text style={styles.shippingTitle}>Alamat pengiriman</Text>
                <Text style={styles.shippingNote}>
                  Origin otomatis mengikuti cabang petshop atau petclinic
                  pengirim. Lengkapi tujuan untuk menghitung ongkir.
                </Text>
              </View>
            </View>
            <TextInput
              placeholder="Nama penerima"
              placeholderTextColor={colors.muted}
              value={shippingAddress.name}
              onChangeText={(value) => onShippingAddress("name", value)}
              style={styles.addressInput}
            />
            <TextInput
              keyboardType="phone-pad"
              placeholder="Nomor telepon penerima"
              placeholderTextColor={colors.muted}
              value={shippingAddress.phone}
              onChangeText={(value) => onShippingAddress("phone", value)}
              style={styles.addressInput}
            />
            <TextInput
              multiline
              placeholder="Nama jalan, nomor rumah, RT/RW, dan patokan"
              placeholderTextColor={colors.muted}
              value={shippingAddress.address}
              onChangeText={(value) => onShippingAddress("address", value)}
              style={[styles.addressInput, styles.addressMultiline]}
            />
            <View style={styles.destinationHeading}>
              <Text style={styles.destinationTitle}>Tujuan pengiriman</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>WAJIB</Text>
              </View>
            </View>
            <ShippingRegionField
              level="province"
              value={shippingDestination.province?.name}
              onPress={() => onOpenRegion("province")}
            />
            <ShippingRegionField
              level="regency"
              value={shippingDestination.regency?.name}
              disabled={!shippingDestination.province}
              onPress={() => onOpenRegion("regency")}
            />
            <ShippingRegionField
              level="district"
              value={shippingDestination.district?.name}
              disabled={!shippingDestination.regency}
              onPress={() => onOpenRegion("district")}
            />
            <ShippingRegionField
              level="village"
              value={shippingDestination.village?.name}
              disabled={!shippingDestination.district}
              onPress={() => onOpenRegion("village")}
            />
            <View style={styles.postalFieldWrap}>
              <Text style={styles.regionFieldLabel}>Kode pos *</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={5}
                placeholder="5 digit kode pos"
                placeholderTextColor={colors.muted}
                value={shippingAddress.post_code}
                onChangeText={(value) =>
                  onShippingAddress(
                    "post_code",
                    value.replace(/\D/g, "").slice(0, 5),
                  )
                }
                style={styles.addressInput}
              />
            </View>

            {quoteBusy ? (
              <View
                accessibilityLiveRegion="polite"
                style={styles.shippingAutoStatus}
              >
                <ActivityIndicator color={colors.sky600} size="small" />
                <View style={styles.shippingAutoCopy}>
                  <Text style={styles.shippingAutoTitle}>
                    Menghitung ongkir otomatis…
                  </Text>
                  <Text style={styles.shippingAutoNote}>
                    Rute dihitung dari setiap origin pengirim.
                  </Text>
                </View>
              </View>
            ) : quoteError ? (
              <View
                accessibilityLiveRegion="polite"
                style={[styles.shippingAutoStatus, styles.shippingErrorStatus]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={colors.red}
                />
                <View style={styles.shippingAutoCopy}>
                  <Text style={styles.shippingErrorTitle}>
                    Ongkir belum dapat dihitung
                  </Text>
                  <Text style={styles.shippingAutoNote}>{quoteError}</Text>
                </View>
                <Pressable
                  accessibilityLabel="Coba hitung ulang ongkir"
                  accessibilityRole="button"
                  onPress={onQuote}
                  style={styles.shippingRetryButton}
                >
                  <Ionicons name="refresh" size={15} color={colors.sky600} />
                </Pressable>
              </View>
            ) : !shippingAddressComplete ? (
              <View style={styles.shippingAutoStatus}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={colors.sky600}
                />
                <Text style={styles.shippingAutoNote}>
                  Isi data penerima, alamat, seluruh wilayah tujuan, dan kode
                  pos. Ongkir akan dihitung otomatis.
                </Text>
              </View>
            ) : quote ? (
              <View
                style={[styles.shippingAutoStatus, styles.shippingReadyStatus]}
              >
                <Ionicons name="checkmark-circle" size={19} color="#14836E" />
                <Text style={styles.shippingReadyText}>
                  Ongkir terbaru sudah dihitung otomatis.
                </Text>
              </View>
            ) : null}

            {quote?.shipping_quotes.map((shipment) => (
              <View key={shipment.branch_id} style={styles.shippingOrigin}>
                <View style={styles.shippingOriginHeading}>
                  <View style={styles.shippingOriginIcon}>
                    <Ionicons
                      name="storefront-outline"
                      size={15}
                      color={colors.sky600}
                    />
                  </View>
                  <View style={styles.shippingOriginCopy}>
                    <Text style={styles.shippingOriginLabel}>
                      DIKIRIM OTOMATIS DARI
                    </Text>
                    <Text style={styles.shippingOriginName}>
                      {shipment.branch_name} · {shipment.origin}
                    </Text>
                  </View>
                </View>
                <View style={styles.shippingRates}>
                  {shipment.rates.map((rate) => {
                    const selected =
                      shippingSelections[shipment.branch_id] ===
                      rate.service_code;
                    return (
                      <Pressable
                        key={rate.service_code}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        onPress={() =>
                          onShippingService(
                            shipment.branch_id,
                            rate.service_code,
                          )
                        }
                        style={[
                          styles.shippingRate,
                          selected && styles.shippingRateSelected,
                        ]}
                      >
                        <Text style={styles.shippingRateName}>
                          {rate.service_code}
                        </Text>
                        <Text style={styles.shippingRatePrice}>
                          {formatCurrency(rate.fee)}
                        </Text>
                        <Text style={styles.shippingRateSla}>
                          {rate.estimated_sla || "SLA mengikuti rute"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.promoCard}>
            <Text style={styles.inputLabel}>Voucher Slivadoc</Text>
            <View style={styles.promoRow}>
              <TextInput
                autoCapitalize="characters"
                placeholder="Contoh: PETHEMAT"
                placeholderTextColor={colors.muted}
                value={voucher}
                onChangeText={onVoucher}
                style={styles.promoInput}
              />
              <Pressable
                disabled={quoteBusy}
                onPress={onQuote}
                style={styles.applyButton}
              >
                <Text style={styles.applyText}>
                  {quoteBusy ? "…" : "Pakai"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Tukar Sliva Points</Text>
            <TextInput
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={colors.muted}
              value={points}
              onChangeText={onPoints}
              style={styles.pointsInput}
            />
            {quote?.voucher_error ? (
              <Text style={styles.quoteError}>{quote.voucher_error}</Text>
            ) : null}
          </View>

          <MobilePaymentMethods
            value={paymentMethod}
            onChange={onPaymentMethod}
            disabled={checkoutBusy}
          />

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(quote?.subtotal ?? subtotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Biaya platform</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(quote?.platform_fee ?? 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Ongkir Lion Parcel</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(quote?.shipping_fee ?? 0)}
              </Text>
            </View>
            {quote?.voucher_discount ? (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Diskon voucher</Text>
                <Text style={styles.discountValue}>
                  −{formatCurrency(quote.voucher_discount)}
                </Text>
              </View>
            ) : null}
            {quote?.points_discount ? (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Sliva Points</Text>
                <Text style={styles.discountValue}>
                  −{formatCurrency(quote.points_discount)}
                </Text>
              </View>
            ) : null}
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total pembayaran</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(quote?.total_amount ?? subtotal)}
              </Text>
            </View>
          </View>
          <PrimaryButton
            disabled={checkoutBusy || !checkoutReady}
            label={
              checkoutBusy
                ? "Menyiapkan pembayaran…"
                : quoteBusy
                  ? "Menghitung ongkir…"
                  : !shippingAddressComplete
                    ? "Lengkapi alamat tujuan"
                    : !checkoutReady
                      ? "Ongkir belum siap"
                      : "Bayar pesanan"
            }
            icon="lock-closed-outline"
            onPress={onCheckout}
          />
        </ScrollView>
      )}
      {regionPicker}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 18 },
  header: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
  },
  headerCopy: { flex: 1 },
  kicker: {
    color: colors.sky600,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: 1.1,
  },
  headerTitle: {
    marginTop: 1,
    color: colors.navy,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "700",
    letterSpacing: -0.35,
  },
  headerButton: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  notificationDot: {
    position: "absolute",
    right: 8,
    top: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: colors.red,
  },
  cartBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
  },
  cartBadgeText: { color: colors.white, fontSize: 9, fontWeight: "600" },
  searchBox: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CCE9F8",
    backgroundColor: colors.white,
    ...shadow,
  },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 13 },
  hero: {
    position: "relative",
    minHeight: 174,
    overflow: "hidden",
    flexDirection: "row",
    marginTop: 12,
    padding: 18,
    borderRadius: 22,
  },
  heroCopy: { zIndex: 2, width: "68%" },
  heroTitle: {
    marginTop: 12,
    color: colors.white,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.65,
  },
  heroNote: {
    maxWidth: 230,
    marginTop: 9,
    color: "rgba(255,255,255,.86)",
    fontSize: 11,
    lineHeight: 16,
  },
  heroArt: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "42%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroOrb: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,.14)",
  },
  heroEmoji: { fontSize: 61, transform: [{ rotate: "-7deg" }] },
  heroPaw: {
    position: "absolute",
    right: 17,
    top: 18,
    width: 37,
    height: 37,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.88)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 20,
  },
  sectionEyebrow: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "600",
    letterSpacing: 1,
  },
  sectionTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionCount: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    color: colors.sky600,
    backgroundColor: colors.sky50,
    fontSize: 10,
    fontWeight: "600",
  },
  storeRow: { gap: 8, paddingTop: 10, paddingRight: 16 },
  storeChip: {
    width: 168,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  storeChipActive: {
    borderColor: colors.sky500,
    backgroundColor: colors.sky50,
  },
  storeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.peach50,
  },
  storeIconActive: { backgroundColor: colors.white },
  storeEmoji: { fontSize: 20 },
  storeChipCopy: { minWidth: 0, flex: 1 },
  storeChipName: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  storeChipNameActive: { color: colors.navy },
  storeChipCity: { marginTop: 3, color: colors.muted, fontSize: 9 },
  storeChipCityActive: { color: colors.text, fontWeight: "700" },
  categoryRow: { gap: 7, paddingVertical: 12, paddingRight: 16 },
  categoryChip: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  categoryChipActive: {
    borderColor: colors.sky600,
    backgroundColor: colors.sky600,
  },
  categoryText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  categoryTextActive: { color: colors.white },
  catalogHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sortRow: { gap: 6, paddingVertical: 10, paddingRight: 16 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "#EEF5F9",
  },
  sortChipActive: { backgroundColor: colors.navy },
  sortText: { color: colors.muted, fontSize: 9, fontWeight: "600" },
  sortTextActive: { color: colors.white },
  loadingState: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: colors.muted, fontSize: 11 },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  productCard: { width: "48.5%", overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  productVisualWrap: { position: "relative", height: 122 },
  productImage: { width: "100%", height: "100%" },
  productImageLarge: { height: 230, borderRadius: 18 },
  productGallery: { borderRadius: 18 },
  productGalleryBadge: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(8,33,49,.68)" },
  productGalleryBadgeText: { color: colors.white, fontSize: 9, fontWeight: "700" },
  productViewer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(3,17,26,.96)" },
  productViewerImage: { width: "100%", height: "78%" },
  productViewerClose: { position: "absolute", zIndex: 2, top: 24, right: 24, width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.24)", borderRadius: 17, backgroundColor: "rgba(7,35,57,.72)" },
  productViewerControls: { position: "absolute", bottom: 24, flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,.12)" },
  productViewerCount: { minWidth: 46, color: colors.white, fontSize: 12, fontWeight: "700", textAlign: "center" },
  productFallback: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  productFallbackLarge: { height: 230, borderRadius: 18 },
  fallbackBubble: {
    position: "absolute",
    right: -24,
    top: -33,
    width: 105,
    height: 105,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,.55)",
  },
  productEmoji: { fontSize: 43 },
  productEmojiLarge: { fontSize: 72 },
  fallbackLabel: {
    position: "absolute",
    left: 9,
    bottom: 8,
    maxWidth: "82%",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    color: colors.sky600,
    backgroundColor: "rgba(255,255,255,.88)",
    fontSize: 8,
    fontWeight: "600",
  },
  favoriteButton: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(216,241,255,.9)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.96)",
    ...shadow,
  },
  soldOutBadge: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: "rgba(21,59,91,.82)",
  },
  soldOutText: { color: colors.white, fontSize: 8, fontWeight: "600" },
  productCardBody: { padding: 11 },
  productCategory: {
    marginBottom: 3,
    color: colors.sky600,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  productName: {
    minHeight: 36,
    color: colors.navy,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  productStoreBadge: {
    minWidth: 0,
    minHeight: 27,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: colors.sky50,
  },
  productStoreCopy: { minWidth: 0, flex: 1 },
  storeName: {
    minWidth: 0,
    flex: 1,
    color: colors.navy,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "600",
  },
  storePresenceText: { color: colors.muted, fontSize: 7, lineHeight: 10 },
  storeAvatar: {
    position: "relative",
    width: 28,
    height: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: "#DFF5FF",
  },
  storeAvatarLarge: { width: 66, height: 66, borderRadius: 21 },
  storeAvatarImage: { width: "100%", height: "100%" },
  storeAvatarInitial: { color: colors.sky600, fontSize: 11, fontWeight: "700" },
  storeAvatarInitialLarge: { fontSize: 24 },
  storePresenceDot: {
    position: "absolute",
    right: 1,
    bottom: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.white,
    backgroundColor: "#A6BAC5",
  },
  storePresenceDotOnline: { backgroundColor: "#36C99A" },
  productCommerceRow: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    marginTop: 9,
  },
  productCommerceCopy: { minWidth: 0, flex: 1 },
  productPrice: {
    color: colors.sky600,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  productMeta: {
    minHeight: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  productMetaText: { color: colors.muted, fontSize: 8 },
  metaDivider: {
    width: 1,
    height: 10,
    marginHorizontal: 2,
    backgroundColor: colors.line,
  },
  productFulfillment: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
    marginTop: 8,
  },
  productFulfillmentItem: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  productFulfillmentText: {
    minWidth: 0,
    flex: 1,
    color: colors.muted,
    fontSize: 8,
  },
  productStockText: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: "600",
  },
  productReward: {
    minHeight: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
    paddingHorizontal: 7,
    borderRadius: 9,
    backgroundColor: "#EDFBF7",
  },
  productRewardText: {
    minWidth: 0,
    flex: 1,
    color: "#087B68",
    fontSize: 8,
    fontWeight: "700",
  },
  disabledButton: { opacity: 0.42 },
  stars: { flexDirection: "row", alignItems: "center", gap: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13,35,54,.45)",
  },
  sheetSafeArea: { width: "100%", maxHeight: "88%" },
  sheetSafeAreaFill: { height: "88%" },
  sheet: {
    overflow: "hidden",
    maxHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    ...shadow,
  },
  sheetFill: { flex: 1 },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 8,
    borderRadius: 3,
    backgroundColor: "#DCE7ED",
  },
  sheetHeader: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetHeaderCopy: { minWidth: 0, flex: 1 },
  sheetEyebrow: {
    color: colors.sky600,
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1,
  },
  sheetTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "700",
  },
  sheetClose: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },
  detailContent: { padding: 16, paddingBottom: 20 },
  detailStoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  detailStoreIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.peach50,
  },
  detailStoreCopy: { minWidth: 0, flex: 1 },
  detailStoreName: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  detailStoreMeta: { marginTop: 3, color: colors.muted, fontSize: 9 },
  detailStorePresence: { marginTop: 2, color: colors.muted, fontSize: 8 },
  detailStorePresenceOnline: { color: "#13856D" },
  detailStoreActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  detailStoreActionPrimary: {
    minHeight: 38,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.sky600,
  },
  detailStoreActionPrimaryText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
  },
  detailStoreActionSecondary: {
    minHeight: 38,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sky500,
  },
  detailStoreActionSecondaryText: {
    color: colors.sky600,
    fontSize: 10,
    fontWeight: "700",
  },
  detailPrice: {
    marginTop: 14,
    color: colors.sky600,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
  },
  detailMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  detailMetaText: { color: colors.muted, fontSize: 9 },
  detailSectionTitle: {
    marginTop: 18,
    color: colors.navy,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  detailDescription: {
    marginTop: 6,
    color: colors.text,
    fontSize: 11,
    lineHeight: 17,
  },
  detailFacts: {
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: colors.line,
    gap: 1,
  },
  detailFact: {
    width: "49.8%",
    minWidth: 0,
    gap: 3,
    padding: 10,
    backgroundColor: colors.white,
  },
  detailFactLabel: { color: colors.muted, fontSize: 8 },
  detailFactValue: { color: colors.navy, fontSize: 10, fontWeight: "700" },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewHint: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
  },
  reviewCount: {
    minWidth: 28,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 9,
    color: colors.sky600,
    backgroundColor: colors.sky50,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  reviewSummary: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 15,
    backgroundColor: colors.sky50,
  },
  reviewSummaryScore: {
    width: 82,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  reviewSummaryValue: {
    color: colors.navy,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "700",
  },
  reviewSummaryLabel: { marginBottom: 3, color: colors.muted, fontSize: 8 },
  reviewDistribution: { minWidth: 0, flex: 1, gap: 4 },
  reviewDistributionRow: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reviewDistributionScore: {
    width: 18,
    color: colors.navy,
    fontSize: 8,
    fontWeight: "600",
  },
  reviewDistributionTrack: {
    minWidth: 0,
    height: 5,
    flex: 1,
    overflow: "hidden",
    borderRadius: 3,
    backgroundColor: "#DFEAF0",
  },
  reviewDistributionFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.yellow,
  },
  reviewDistributionCount: {
    width: 17,
    color: colors.muted,
    fontSize: 8,
    textAlign: "right",
  },
  reviewLoader: { marginVertical: 18 },
  emptyReviews: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  emptyReviewsEmoji: { fontSize: 24 },
  emptyReviewsCopy: { minWidth: 0, flex: 1 },
  emptyReviewsTitle: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  emptyReviewsNote: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
  },
  reviewCard: {
    flexDirection: "row",
    gap: 9,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  reviewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.violet50,
  },
  reviewerAvatarText: { color: colors.violet, fontSize: 13, fontWeight: "700" },
  reviewBody: { minWidth: 0, flex: 1 },
  reviewerLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  reviewerName: { color: colors.navy, fontSize: 10, fontWeight: "600" },
  reviewComment: {
    marginTop: 6,
    color: colors.text,
    fontSize: 10,
    lineHeight: 15,
  },
  reviewDate: { marginTop: 5, color: colors.muted, fontSize: 8 },
  reviewComposer: {
    gap: 9,
    marginTop: 14,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CDEAF8",
    backgroundColor: colors.sky50,
  },
  composerTitle: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  ratingPicker: { flexDirection: "row", gap: 3 },
  ratingButton: { padding: 2 },
  reviewInput: {
    minHeight: 82,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 11,
    lineHeight: 16,
    textAlignVertical: "top",
  },
  detailActions: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  secondaryAction: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.sky500,
  },
  secondaryActionText: {
    color: colors.sky600,
    fontSize: 11,
    fontWeight: "700",
  },
  primaryAction: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.sky600,
  },
  primaryActionText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  storefrontBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,32,55,.46)",
  },
  storefrontSheet: {
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.canvas,
    ...shadow,
  },
  storefrontSafeArea: { flex: 1, backgroundColor: colors.canvas },
  storefrontHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 999,
    backgroundColor: "#D7E6EE",
  },
  storefrontHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.white,
  },
  storefrontBack: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.canvas,
  },
  storefrontHeaderCopy: { minWidth: 0, flex: 1 },
  storefrontHeaderEyebrow: {
    color: colors.sky600,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
  storefrontHeaderTitle: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
  },
  storefrontHeaderChat: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: colors.sky50,
  },
  storefrontContent: { gap: 12, padding: 14, paddingBottom: 36 },
  storefrontHero: {
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 16,
    borderRadius: 22,
  },
  storefrontHeroGlow: {
    position: "absolute",
    right: -30,
    top: -45,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,.25)",
  },
  storefrontIdentity: { minWidth: 0, flex: 1 },
  storefrontVerified: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,.82)",
  },
  storefrontVerifiedText: {
    color: "#087B68",
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  storefrontName: {
    marginTop: 6,
    color: colors.white,
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "700",
  },
  storefrontMeta: {
    marginTop: 3,
    color: "rgba(255,255,255,.9)",
    fontSize: 8,
    lineHeight: 12,
  },
  storefrontChatButton: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: colors.navy,
  },
  storefrontChatButtonText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "700",
  },
  storefrontStats: {
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  storefrontStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 11,
    borderRightWidth: 1,
    borderRightColor: colors.sky100,
  },
  storefrontStatValue: { color: colors.navy, fontSize: 13, fontWeight: "700" },
  storefrontStatLabel: { color: colors.muted, fontSize: 8 },
  storefrontTabs: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
    padding: 5,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  storefrontTab: {
    minWidth: 0,
    minHeight: 42,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderRadius: 10,
  },
  storefrontTabActive: { backgroundColor: colors.sky50 },
  storefrontTabText: { color: colors.muted, fontSize: 10, lineHeight: 14, fontWeight: "700", textAlign: "center" },
  storefrontTabTextActive: { color: colors.sky600 },
  storefrontState: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: 9 },
  storefrontSortRow: { gap: 7 },
  storefrontServiceList: { gap: 9 },
  storefrontServiceHeading: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  storefrontServiceCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 18,
    backgroundColor: colors.white,
  },
  storefrontServiceVisual: {
    width: 74,
    height: 74,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  storefrontServiceImage: { width: "100%", height: "100%" },
  storefrontServiceCopy: { minWidth: 0, flex: 1 },
  storefrontServiceName: { marginTop: 3, color: colors.navy, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  storefrontServiceMeta: { marginTop: 6, color: colors.sky600, fontSize: 10, fontWeight: "700" },
  storefrontServiceArrow: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.sky50 },
  storefrontCategoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  storefrontCategoryCard: {
    width: "48.5%",
    alignItems: "center",
    gap: 5,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 17,
    backgroundColor: colors.white,
  },
  storefrontCategoryIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.sky50,
  },
  storefrontCategoryName: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  storefrontCategoryCount: { color: colors.muted, fontSize: 8 },
  storefrontReviewList: { gap: 9 },
  storefrontReviewCard: {
    flexDirection: "row",
    gap: 9,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  storefrontAbout: {
    alignItems: "center",
    gap: 8,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 19,
    backgroundColor: colors.white,
  },
  storefrontAboutIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: colors.sky50,
  },
  storefrontAboutTitle: { color: colors.navy, fontSize: 15, fontWeight: "700" },
  storefrontAboutCopy: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
  storefrontAboutFact: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    padding: 10,
    borderRadius: 11,
    backgroundColor: colors.canvas,
  },
  storefrontAboutLabel: { color: colors.muted, fontSize: 9 },
  storefrontAboutValue: { color: colors.navy, fontSize: 9, fontWeight: "700" },
  chatStorePresence: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  chatStorePresenceText: { color: colors.muted, fontSize: 9 },
  chatStorePresenceOnline: { color: "#13856D", fontWeight: "700" },
  chatProductContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 14,
    marginTop: 10,
    padding: 9,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 13,
    backgroundColor: colors.sky50,
  },
  chatProductThumb: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  chatProductCopy: { minWidth: 0, flex: 1 },
  chatProductLabel: {
    color: colors.sky600,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  chatProductName: { marginTop: 3, color: colors.navy, fontSize: 10, fontWeight: "700" },
  chatSafety: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 14,
    marginTop: 8,
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.sky50,
  },
  chatSafetyText: { minWidth: 0, flex: 1, color: colors.muted, fontSize: 8 },
  chatMessageScroller: { minHeight: 0, flex: 1 },
  chatMessages: { flexGrow: 1, gap: 8, padding: 14 },
  chatEmpty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, padding: 28 },
  chatEmptyIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.sky50,
  },
  chatEmptyTitle: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  chatEmptyNote: { color: colors.muted, fontSize: 9, lineHeight: 13, textAlign: "center" },
  chatBubble: {
    maxWidth: "82%",
    alignSelf: "flex-start",
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 15,
    borderTopLeftRadius: 5,
    backgroundColor: colors.canvas,
  },
  chatBubbleMine: {
    alignSelf: "flex-end",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 5,
    backgroundColor: colors.sky600,
  },
  chatSender: { color: colors.muted, fontSize: 7, fontWeight: "700" },
  chatBody: { color: colors.text, fontSize: 10, lineHeight: 15 },
  chatTime: { alignSelf: "flex-end", color: colors.muted, fontSize: 7 },
  chatTextMine: { color: colors.white },
  chatComposer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  chatInput: {
    height: 44,
    flex: 1,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    color: colors.text,
    backgroundColor: colors.canvas,
    fontSize: 14,
    textAlignVertical: "center",
  },
  chatComposerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: colors.sky50,
  },
  chatComposerButtonActive: {
    borderWidth: 1,
    borderColor: colors.sky300,
    backgroundColor: colors.sky100,
  },
  chatComposerEmoji: { fontSize: 20 },
  chatSend: {
    backgroundColor: colors.sky600,
  },
  chatShortcutGrid: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  chatShortcut: { minWidth: 0, flex: 1, alignItems: "center", gap: 5 },
  chatShortcutIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.sky50,
  },
  chatShortcutIconMint: { backgroundColor: colors.mint50 },
  chatShortcutIconViolet: { backgroundColor: colors.violet50 },
  chatShortcutIconYellow: { backgroundColor: colors.yellow50 },
  chatShortcutLabel: { color: colors.text, fontSize: 9, fontWeight: "700" },
  chatEmojiRow: {
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  chatEmojiChoice: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.canvas,
  },
  chatEmojiChoiceText: { fontSize: 19 },
  cartContent: { gap: 10, padding: 16, paddingBottom: 26 },
  cartNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: 13,
    backgroundColor: colors.mint50,
  },
  cartNoticeText: {
    minWidth: 0,
    flex: 1,
    color: "#267C6C",
    fontSize: 9,
    lineHeight: 13,
  },
  cartItem: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  cartThumb: {
    width: 58,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky50,
  },
  cartEmoji: { fontSize: 27 },
  cartItemCopy: { minWidth: 0, flex: 1 },
  cartItemName: {
    color: colors.navy,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  cartItemStore: { marginTop: 2, color: colors.muted, fontSize: 8 },
  cartItemPrice: {
    marginTop: 5,
    color: colors.sky600,
    fontSize: 10,
    fontWeight: "600",
  },
  stepper: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  stepperButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  quantity: {
    minWidth: 22,
    color: colors.navy,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  promoCard: {
    gap: 7,
    marginTop: 2,
    padding: 12,
    borderRadius: 15,
    backgroundColor: colors.canvas,
  },
  shippingCard: {
    gap: 8,
    marginTop: 2,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CCE9F8",
    backgroundColor: colors.sky50,
  },
  shippingHeading: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  shippingHeadingCopy: { flex: 1 },
  shippingTitle: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  shippingNote: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 9,
    lineHeight: 13,
  },
  addressInput: {
    minHeight: 40,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 10,
  },
  addressMultiline: { minHeight: 64, textAlignVertical: "top" },
  destinationHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
  },
  destinationTitle: { color: colors.navy, fontSize: 10, fontWeight: "700" },
  requiredBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#E7F6FD",
  },
  requiredBadgeText: {
    color: colors.sky600,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  regionFieldWrap: { gap: 5 },
  regionFieldLabel: { color: colors.text, fontSize: 12, fontWeight: "600" },
  regionField: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  regionFieldDisabled: { opacity: 0.52, backgroundColor: colors.canvas },
  regionFieldValue: {
    minWidth: 0,
    flex: 1,
    color: colors.navy,
    fontSize: 10,
    fontWeight: "600",
  },
  regionFieldPlaceholder: { color: colors.muted, fontWeight: "400" },
  postalFieldWrap: { gap: 5 },
  shippingAutoStatus: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CCE9F8",
    backgroundColor: colors.white,
  },
  shippingAutoCopy: { minWidth: 0, flex: 1 },
  shippingAutoTitle: { color: colors.navy, fontSize: 9, fontWeight: "700" },
  shippingAutoNote: {
    minWidth: 0,
    flex: 1,
    color: colors.muted,
    fontSize: 8,
    lineHeight: 12,
  },
  shippingErrorStatus: {
    borderColor: "#F5C9CE",
    backgroundColor: colors.red50,
  },
  shippingErrorTitle: { color: colors.red, fontSize: 9, fontWeight: "700" },
  shippingRetryButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  shippingReadyStatus: {
    borderColor: "#CBEDE5",
    backgroundColor: colors.mint50,
  },
  shippingReadyText: { color: "#14836E", fontSize: 9, fontWeight: "600" },
  shippingOrigin: {
    gap: 8,
    marginTop: 2,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#CCE9F8",
  },
  shippingOriginHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shippingOriginIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  shippingOriginCopy: { minWidth: 0, flex: 1 },
  shippingOriginLabel: {
    color: colors.sky600,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  shippingOriginName: {
    marginTop: 2,
    color: colors.text,
    fontSize: 9,
    fontWeight: "600",
  },
  shippingRates: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  shippingRate: {
    minWidth: 102,
    flexGrow: 1,
    padding: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  shippingRateSelected: {
    borderColor: colors.sky500,
    backgroundColor: "#E7F6FD",
  },
  shippingRateName: { color: colors.navy, fontSize: 10, fontWeight: "700" },
  shippingRatePrice: {
    marginTop: 2,
    color: colors.sky600,
    fontSize: 10,
    fontWeight: "700",
  },
  shippingRateSla: { marginTop: 2, color: colors.muted, fontSize: 8 },
  inputLabel: { color: colors.text, fontSize: 12, fontWeight: "600" },
  promoRow: { flexDirection: "row", gap: 7 },
  promoInput: {
    minWidth: 0,
    height: 40,
    flex: 1,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 10,
  },
  pointsInput: {
    height: 40,
    paddingHorizontal: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.text,
    backgroundColor: colors.white,
    fontSize: 10,
  },
  applyButton: {
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: colors.navy,
  },
  applyText: { color: colors.white, fontSize: 10, fontWeight: "600" },
  quoteError: { color: colors.red, fontSize: 9, lineHeight: 13 },
  summaryCard: {
    gap: 8,
    marginTop: 2,
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryLabel: { color: colors.muted, fontSize: 10 },
  summaryValue: { color: colors.text, fontSize: 10, fontWeight: "600" },
  discountLabel: { color: colors.mint, fontSize: 10 },
  discountValue: { color: colors.mint, fontSize: 10, fontWeight: "600" },
  summaryDivider: { height: 1, backgroundColor: colors.line },
  totalLabel: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  totalValue: { color: colors.sky600, fontSize: 15, fontWeight: "700" },
});
