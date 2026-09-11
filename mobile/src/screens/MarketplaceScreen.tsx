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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createMobileOrder,
  createMobilePaymentIntent,
  getMobileDistricts,
  getMobileProductReviews,
  getMobileProducts,
  getMobileProvinces,
  getMobileRegencies,
  getMobileVillages,
  quoteMobileOrder,
  saveMobileProductReview,
  type MobileOrderQuote,
  type MobileOrderInput,
  type MobilePaymentIntent,
  type MobileProduct,
  type MobileProductReview,
  type MobileRegionOption,
} from "../api";
import {
  MobileBatpayModal,
  MobilePaymentMethods,
} from "../components/BatpayPayment";
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

type SortMode = "recommended" | "popular" | "rating" | "price";

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
  intent?: {
    token: number;
    productId?: string;
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

function ProductVisual({
  product,
  large = false,
}: {
  product: MobileProduct;
  large?: boolean;
}) {
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
  onAdd,
  onFavorite,
}: {
  product: MobileProduct;
  favorite: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onFavorite: () => void;
}) {
  const { formatCurrency } = useI18n();
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
        <Text numberOfLines={2} style={styles.productName}>
          {product.name}
        </Text>
        <View style={styles.productStoreBadge}>
          <Ionicons name="storefront-outline" size={12} color={colors.sky600} />
          <Text numberOfLines={1} style={styles.storeName}>
            {product.business_name}
          </Text>
        </View>
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
            <Ionicons name="bag-add-outline" size={16} color={colors.white} />
            <Text style={styles.addButtonText}>Tambah</Text>
          </Pressable>
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
  intent,
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
    () => [
      { id: "Semua toko", name: "Semua toko", city: "" },
      ...Array.from(
        new Map(
          catalogProducts.map((item) => [
            item.business_id,
            { id: item.business_id, name: item.business_name, city: item.city },
          ]),
        ).values(),
      ),
    ],
    [catalogProducts],
  );
  const visibleProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = catalogProducts.filter(
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
  const cartItems = useMemo(
    () =>
      Object.entries(cart).flatMap(([id, quantity]) => {
        const product = productsById.get(id);
        return product && quantity > 0 ? [{ product, quantity }] : [];
      }),
    [cart, productsById],
  );
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
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
      setCart((current) => {
        if (!safeQuantity) {
          const next = { ...current };
          delete next[product.id];
          return next;
        }
        return { ...current, [product.id]: safeQuantity };
      });
      invalidateQuote();
    },
    [invalidateQuote],
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

  useEffect(() => {
    if (!intent || loading || handledIntent.current === intent.token) return;
    queueMicrotask(() => {
      handledIntent.current = intent.token;
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
    productsById,
    invalidateQuote,
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
            {Math.max(0, stores.length - 1)} toko
          </Text>
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
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${item.name}${item.city ? `, ${item.city}` : ""}`}
                key={item.id}
                onPress={() => setStore(item.id)}
                style={[styles.storeChip, active && styles.storeChipActive]}
              >
                <View
                  style={[styles.storeIcon, active && styles.storeIconActive]}
                >
                  <Ionicons
                    name={index ? "storefront-outline" : "sparkles-outline"}
                    size={20}
                    color={active ? colors.sky600 : "#8B4A20"}
                  />
                </View>
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
                    {index ? item.city || "Toko resmi" : "Lihat semuanya"}
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
              ["rating", "Rating"],
              ["price", "Harga termurah"],
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
            icon="search-outline"
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
        }}
        onQuantity={setQuantity}
        onQuote={() => void refreshQuote(undefined, true)}
        onCheckout={() => void checkout()}
      />

      <MobileBatpayModal
        payment={payment}
        onClose={() => setPayment(undefined)}
        onPaid={() => {
          setCart({});
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
          style={styles.sheetSafeArea}
        >
          <View style={styles.sheet}>
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
  const { formatCurrency, formatDate } = useI18n();
  if (!product) return null;
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
        <View style={styles.detailStoreRow}>
          <View style={styles.detailStoreIcon}>
            <Ionicons name="storefront-outline" size={19} color="#8B4A20" />
          </View>
          <View style={styles.detailStoreCopy}>
            <Text style={styles.detailStoreName}>{product.business_name}</Text>
            <Text style={styles.detailStoreMeta}>
              {product.branch_name} · {product.city || "Indonesia"}
            </Text>
          </View>
          <Pill tone="mint">Terverifikasi</Pill>
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

        <View style={styles.reviewHeader}>
          <View>
            <Text style={styles.detailSectionTitle}>Ulasan & komentar</Text>
            <Text style={styles.reviewHint}>
              Hanya pembeli terverifikasi yang dapat menulis ulasan.
            </Text>
          </View>
          <Text style={styles.reviewCount}>{reviews.length}</Text>
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
  productCard: { width: "48.5%", overflow: "hidden", borderRadius: 22, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  productVisualWrap: { position: "relative", height: 122 },
  productImage: { width: "100%", height: "100%" },
  productImageLarge: { height: 230, borderRadius: 18 },
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
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: colors.sky50,
  },
  storeName: {
    minWidth: 0,
    flex: 1,
    color: colors.navy,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "600",
  },
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
  addButton: {
    minWidth: 68,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 13,
    backgroundColor: colors.sky600,
  },
  addButtonText: { color: colors.white, fontSize: 9, fontWeight: "600" },
  disabledButton: { opacity: 0.42 },
  stars: { flexDirection: "row", alignItems: "center", gap: 1 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13,35,54,.45)",
  },
  sheetSafeArea: { maxHeight: "88%" },
  sheet: {
    overflow: "hidden",
    maxHeight: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    ...shadow,
  },
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
  regionFieldLabel: { color: colors.text, fontSize: 9, fontWeight: "600" },
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
  inputLabel: { color: colors.text, fontSize: 9, fontWeight: "600" },
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
