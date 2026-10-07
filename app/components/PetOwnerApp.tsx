"use client";
import { PetOwnerFlowProvider, PetRequiredNotice, usePetOwnerFlow } from "./PetOwnerFlow";
import { WorldNavigation } from "./WorldNavigation";
import { isWorldMode, worldFeatures, type PetOwnerWorldMode } from "../../mobile/src/petowner-flow";
import { SlivaSelect } from "./SlivaSelect";
import { DiscountBadge } from "./DiscountBadge";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Icon, type IconName } from "./Icon";
import { BrandLogo as Logo } from "./BrandLogo";
import { OpeningExperience } from "./OpeningExperience";
import {
  MarketplaceChatPanel,
  type MarketplaceChatShortcut,
} from "./marketplace/ShopMarketplace";
import { usePetOwnerI18n } from "./PetOwnerI18n";
import AddPetExperience from "./integrations/AddPetExperience";
import CommunityExperience from "./integrations/CommunityExperience";
import LocationModal from "./integrations/LocationModal";
import SlivaCareDrawer from "./integrations/SlivaCareDrawer";
import PlatformDiscovery from "./platform/PlatformDiscovery";
import PawDatingExperience from "./pawdating/PawDatingExperience";
import { FundraisingView, PetshipView } from "./platform/PetshipFundraising";
import type { LocationResult } from "../lib/petowner-api";
import { ApiError } from "../lib/session";
import ShippingAddressModal from "./ShippingAddressModal";
import { downloadPetMedicalPDF } from "../lib/pet-pdf";
import { finiteNumber } from "../lib/safe-number";
import {
  PLATFORM_API_URL,
  activateLostPetMode,
  clearPlatformCache,
  closeLostPetMode,
  cancelPetOwnerBooking,
  cancelPetOwnerOrder,
  requestPetOwnerShopReturn,
  getPetOwnerInvoice,
  getPetOwnerInvoices,
  createPetOwnerBooking,
  getMyDocumentRequests,
  resubmitPetDocuments,
  createPetOwnerSupportTicket,
  getDiscoveryProducts,
  getDiscoveryService,
  getDiscoveryServiceAvailability,
  getDiscoveryServices,
  getVeterinarians,
  getMedicalRecords,
  getMarketplaceChats,
  globalSearch,
  getPetFamily,
  getLostPetMode,
  getPetOwnerBootstrap,
  getPetOwnerActivityCenter,
  getNotifications,
  getPetOwnerShippingAddresses,
  getPetOwnerSupportTickets,
  getPetOwnerSupportTicketMessages,
  sendPetOwnerSupportTicketMessage,
  getTransactionInvoiceHTML,
  deletePetOwnerShippingAddress,
  setPrimaryPetOwnerShippingAddress,
  getCurrentUser,
  invitePetFamily,
  revokePetFamily,
  isPetOwnerAuthenticated,
  saveTokens,
  clearSession,
  logoutSession,
  startAutomaticRefresh,
  readAllNotifications,
  readNotification,
  togglePetOwnerFavorite,
  updatePetOwnerPet,
  updatePetOwnerProfile,
  getCareReminders,
  getPublicCampaigns,
  createCareReminder,
  completeCareReminder,
  createPaymentIntent,
  createPetOwnerOrder,
  quotePetOwnerOrder,
  snoozeCareReminder,
  type ActivityShipment,
  type PetOwnerInvoice,
  type PetOwnerInvoiceDetail,
  type ActivityType,
  type PetOwnerActivityCenterItem,
  type PetOwnerActivityCenterResponse,
  type DiscoveryProduct,
  type DiscoveryServiceDetail,
  type FamilyAccess,
  type MedicalRecord,
  type MarketplaceChatThread,
  type NotificationItem,
  type GlobalSearchResult,
  type PetOwnerBootstrap,
  type PetOwnerShippingAddress,
  type OrderQuote,
  type OrderShippingInput,
  type ShippingQuote,
  type RegionOption,
  type CareReminder,
  type PublicCampaign,
  type PaymentIntent,
  type RewardFormula,
  type MembershipStatus,
  type PetOwnerSupportTicket,
  type SupportMessage,
  type ServiceAvailability,
  type Veterinarian,
} from "../lib/platform-api";
import { QrisPaymentPanel, PaymentMethodPicker } from "./payments/QrisPayment";
import {
  RequirementUploads,
  type UploadedDocument,
} from "./platform/DocumentUploads";
import { QRCodeSVG } from "qrcode.react";
import {
  activityAttentionReason,
  activityRepeatLabels,
  activityStatusLabel,
  activityStatusText,
  activityTypeMeta,
  activityTypeOrder,
  formatActivityDate,
  getActivityTypeMeta,
  shipmentPresentation,
} from "../lib/activity-center";
import {
  formatRupiah,
  type AppView,
  type Pet,
  type Product,
  type Service,
} from "../lib/petowner-domain";

function MarketplaceLoading() {
  return (
    <section
      className="marketplace-loading"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="loading-spinner" aria-hidden="true" />
      <div>
        <b>Menyiapkan pengalaman terbaik…</b>
        <small>Katalog dan jadwal dimuat saat dibutuhkan.</small>
      </div>
    </section>
  );
}

const ShopMarketplace = dynamic(() => import("./marketplace/ShopMarketplace"), {
  loading: MarketplaceLoading,
});
const CareMarketplace = dynamic(() => import("./platform/CareMarketplace"), {
  loading: MarketplaceLoading,
});

type Notify = (message: string) => void;

const starterMembership: MembershipStatus = {
  id: "paw_starter",
  name: "Paw Starter",
  icon: "🐾",
  min_points: 0,
  next_level_points: 1000,
  points_to_next: 1000,
};

function rewardFormulaText(formula: RewardFormula) {
  if (!formula.enabled) return "SlivaRewards sedang tidak aktif.";
  const methods = (formula.payment_methods ?? []).map((method) => {
    if (method.mode === "fixed")
      return `${method.label}: ${method.fixed_points.toLocaleString("id-ID")} poin per transaksi`;
    if (method.mode === "transaction_divisor")
      return `${method.label}: ${method.points_per_unit.toLocaleString("id-ID")} poin per ${formatRupiah(method.divisor)}`;
    return `${method.label}: tanpa base poin`;
  });
  // Without a per-method table the earn rate is the flat divisor from
  // reward_settings: 1 poin per Rp10.000 nilai transaksi bersih.
  if (methods.length === 0 && formula.earn_divisor_rupiah)
    methods.push(
      `1 poin per ${formatRupiah(formula.earn_divisor_rupiah)} nilai transaksi bersih`,
    );
  return [
    ...methods,
    `1 poin bernilai ${formatRupiah(formula.point_value_rupiah ?? 0)}`,
    `tersedia setelah ${formula.settlement_hold_days ?? 0} hari dan berlaku ${formula.expiry_days ?? 0} hari`,
  ].join(" · ");
}

const navItems: { id: AppView; label: string; icon: IconName }[] = [
  { id: "home", label: "Beranda", icon: "home" },
  { id: "pets", label: "Hewan Saya", icon: "paw" },
  { id: "discover", label: "Layanan", icon: "search" },
  { id: "bookings", label: "Aktivitas", icon: "calendar" },
  { id: "health", label: "Kesehatan", icon: "heart" },
  { id: "shop", label: "Belanja", icon: "bag" },
  { id: "favorites", label: "Favorit Saya", icon: "heart" },
  { id: "community", label: "Komunitas", icon: "users" },
  { id: "world", label: "Sliva World", icon: "sparkle" },
  { id: "academy", label: "Pet Academy", icon: "sparkle" },
  { id: "events", label: "Pet Event", icon: "calendar" },
  { id: "petspot", label: "PetSpot", icon: "map" },
  { id: "pethub", label: "PetHub", icon: "video" },
  { id: "consult", label: "Konsultasi", icon: "heart" },
  { id: "adoption", label: "Adopsi", icon: "paw" },
  { id: "documents", label: "Pet Documents", icon: "download" },
  { id: "pawdating", label: "PAW Dating", icon: "heart" },
  { id: "petship", label: "Petship", icon: "map" },
  { id: "fundraising", label: "Animal Fund", icon: "heart" },
  { id: "messages", label: "Chat", icon: "chat" },
  { id: "support", label: "Pusat Bantuan", icon: "chat" },
  { id: "profile", label: "Akun", icon: "user" },
];

const navGroups: { label: string; items: AppView[] }[] = [
  { label: "Navigasi utama", items: ["home", "shop", "community", "bookings"] },
  { label: "Akun & perawatan", items: ["messages", "discover", "world", "health", "profile"] },
  { label: "Kebutuhan pet", items: ["pets", "favorites", "petship", "fundraising", "support"] },
];

// Pages arrive newest first; entries of `later` already in `first` are dropped.
function mergeActivityPages(
  first: PetOwnerActivityCenterItem[],
  later: PetOwnerActivityCenterItem[],
) {
  const seen = new Set(first.map((item) => `${item.type}-${item.id}`));
  return [
    ...first,
    ...later.filter((item) => !seen.has(`${item.type}-${item.id}`)),
  ];
}

const titles: Record<AppView, { title: string; subtitle: string }> = {
  world: { title: "Sliva World", subtitle: "Seluruh dunia pet dalam satu aplikasi." },
  home: {
    title: "Selamat datang di Slivadoc",
    subtitle: "Semua kebutuhan pet tersinkron dalam satu tempat.",
  },
  pets: {
    title: "Hewan Saya",
    subtitle: "Satu tempat untuk semua profil dan kebutuhan mereka.",
  },
  discover: {
    title: "Jelajahi Layanan",
    subtitle: "Temukan perawatan terbaik di sekitar kamu.",
  },
  bookings: {
    title: "Aktivitas",
    subtitle: "Pantau booking, pesanan, kelas, tiket, reservasi, dan dokumen pet-mu.",
  },
  health: {
    title: "Pusat Kesehatan",
    subtitle: "Riwayat lengkap dan jadwal perawatan pet pilihanmu.",
  },
  shop: {
    title: "Sliva Pet Shop",
    subtitle:
      "Katalog produk, stok, penjual, dan informasi kepatuhan dalam satu alur.",
  },
  community: {
    title: "Komunitas",
    subtitle: "Berbagi, belajar, dan membantu sesama pet parent.",
  },
  academy: {
    title: "Pet Academy",
    subtitle: "Program training terverifikasi untuk pet dan pet parent.",
  },
  events: {
    title: "Pet Event",
    subtitle: "Festival, workshop, meet-up, dan aktivitas pet pilihan.",
  },
  petspot: {
    title: "PetSpot",
    subtitle: "Temukan cafe, mall, taman, dan playground yang pet friendly.",
  },
  pethub: {
    title: "PetHub",
    subtitle: "Live streaming, video, channel, dan pet thread dalam satu hub.",
  },
  consult: {
    title: "Konsultasi Dokter Hewan",
    subtitle: "Chat, voice call, atau video call dengan dokter terverifikasi.",
  },
  adoption: {
    title: "Adopsi Bertanggung Jawab",
    subtitle: "Temukan teman baru dengan screening dan pendampingan Slivadoc.",
  },
  documents: {
    title: "Pet Documents",
    subtitle:
      "Akte pet dan dokumen perjalanan pesawat atau kapal dalam satu alur.",
  },
  pawdating: {
    title: "PAW Dating",
    subtitle:
      "Temukan pasangan sehat dengan screening, silsilah, dan persetujuan yang aman.",
  },
  petship: {
    title: "Petship",
    subtitle: "Temukan teman anabul yang sedang berada di tempat yang sama.",
  },
  fundraising: {
    title: "Animal Fund",
    subtitle: "Bantu biaya perawatan hewan melalui campaign terverifikasi.",
  },
  favorites: {
    title: "Favorit Saya",
    subtitle: "Semua layanan dan tempat yang kamu simpan.",
  },
  notifications: {
    title: "Notifikasi",
    subtitle: "Update kesehatan, booking, pesanan, komunitas, dan keamanan.",
  },
  messages: {
    title: "Chat",
    subtitle: "Semua percakapan dengan toko dan dokter hewan dalam satu tempat.",
  },
  support: {
    title: "Pusat Bantuan",
    subtitle:
      "Laporkan kendala dan pantau penyelesaiannya tanpa kehilangan konteks transaksi.",
  },
  profile: {
    title: "Akun & Keluarga",
    subtitle: "Kelola profil, pembayaran, keamanan, dan benefit.",
  },
};

const featureSearchItems: GlobalSearchResult[] = navItems.map((item) => ({
  category: "feature",
  id: item.id,
  title: item.label,
  subtitle: titles[item.id].subtitle,
  route: item.id,
}));

const protectedViews: AppView[] = [
  "pets",
  "favorites",
  "notifications",
  "support",
];

function apiPetToView(pet: PetOwnerBootstrap["pets"][number]): Pet {
  const months = Number(pet.age_months || 0);
  const years = Math.floor(months / 12);
  const remaining = months % 12;
  return {
    id: pet.id,
    name: pet.name,
    type: ({
      dog: "Dog",
      cat: "Cat",
      small_mammal: "Small Mammal",
      bird: "Bird",
      reptile: "Reptile",
      amphibian: "Amphibian",
      fish: "Fish",
      aquatic: "Aquatic",
      arachnid: "Arachnid",
      insect: "Insect",
      equine: "Equine",
      farm_animal: "Farm Animal",
    }[pet.species_group] ?? "Other") as Pet["type"],
    speciesCode: pet.species,
    speciesGroup: pet.species_group,
    breed: pet.breed,
    age:
      [years ? `${years} tahun` : "", remaining ? `${remaining} bulan` : ""]
        .filter(Boolean)
        .join(" ") || "Belum diisi",
    weight: `${pet.weight_kg || 0} kg`,
    gender: pet.sex === "female" ? "Betina" : "Jantan",
    color: pet.color || "#8aa5b7",
    avatar: pet.emoji || "🐾",
    photoUrl: pet.photo_url,
    birthDate: pet.birth_date,
    healthScore: Number(pet.health_score || 0),
    nextCare: pet.last_medical_record_at
      ? `Update medis ${new Date(pet.last_medical_record_at).toLocaleDateString("id-ID")}`
      : "Belum ada jadwal",
    microchip: pet.microchip_number || "Belum terdaftar",
    notes: pet.medical_notes,
    allergies: pet.allergies,
    accessRole: pet.access_role,
    permissions: pet.permissions,
  };
}

const checkoutSuccessStorageKey = "slivadoc.checkout-success";

export default function PetOwnerApp() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<AppView>("home");
  const [navigationVersion, setNavigationVersion] = useState(0);
  const [worldMode, setWorldMode] = useState<PetOwnerWorldMode>("academy");
  const featureView = activeView === "world" ? worldMode : activeView;
  const [petProfiles, setPetProfiles] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [account, setAccount] = useState<PetOwnerBootstrap["user"] | null>(
    null,
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // The badge shows the server's full unread count; notifications holds only a
  // slice, so reading one locally lowers the count by what changed in the slice.
  const [unreadSnapshot, setUnreadSnapshot] = useState({
    server: 0,
    baseline: 0,
  });
  const loadedUnread = notifications.filter((item) => !item.read_at).length;
  const unreadCount = Math.max(
    0,
    unreadSnapshot.server - (unreadSnapshot.baseline - loadedUnread),
  );
  function applyNotifications(items: NotificationItem[], serverUnread: number) {
    setNotifications(items);
    setUnreadSnapshot({
      server: serverUnread,
      baseline: items.filter((item) => !item.read_at).length,
    });
  }
  async function loadAllNotifications() {
    const result = await getNotifications("", 100);
    applyNotifications(result.data, result.unread_count);
  }
  const [activities, setActivities] = useState<PetOwnerActivityCenterItem[]>(
    [],
  );
  const [activitySummary, setActivitySummary] = useState<
    PetOwnerActivityCenterResponse["summary"] | null
  >(null);
  const [activityFocus, setActivityFocus] = useState<{
    type: ActivityType;
    id: string;
    token: number;
  } | null>(null);
  const [activityCursor, setActivityCursor] = useState<string | null>(null);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  // Once a later page is loaded, a refresh updates page 1 in place instead of
  // dropping the pages the owner scrolled to.
  const moreActivitiesLoaded = useRef(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [points, setPoints] = useState(0);
  const [membership, setMembership] =
    useState<MembershipStatus>(starterMembership);
  const [rewardFormula, setRewardFormula] = useState<RewardFormula>({
    enabled: false,
  });
  const [remoteProducts, setRemoteProducts] = useState<DiscoveryProduct[]>([]);
  const [remoteServices, setRemoteServices] = useState<Service[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationCategory, setNotificationCategory] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState<"assistant" | "care-team" | "support">(
    "assistant",
  );
  const [inboxChatThread, setInboxChatThread] =
    useState<MarketplaceChatThread>();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationResult | null>(
    null,
  );
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [directBuyCart, setDirectBuyCart] = useState<Record<string, number> | null>(null);
  const [cartAddedOpen, setCartAddedOpen] = useState(false);
  const cartAddedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  function completeCheckout() {
    window.sessionStorage.setItem(checkoutSuccessStorageKey, "1");
    setCheckoutSuccess(true);
    setCartOpen(false);
    setDirectBuyCart(null);
  }
  function dismissCheckoutSuccess() {
    window.sessionStorage.removeItem(checkoutSuccessStorageKey);
    setCheckoutSuccess(false);
  }
  useEffect(
    () => () => {
      if (cartAddedTimer.current) clearTimeout(cartAddedTimer.current);
    },
    [],
  );

  const selectedPet = petProfiles.find((pet) => pet.id === selectedPetId) ??
    petProfiles[0] ?? {
      id: "",
      name: "pet kamu",
      type: "Other",
      breed: "Profil belum ditambahkan",
      age: "-",
      weight: "-",
      gender: "-",
      color: "#8aa5b7",
      avatar: "🐾",
      healthScore: 0,
      nextCare: "Login untuk melihat data",
      microchip: "Belum terdaftar",
    };
  const cartCount = Object.values(cart).reduce(
    (total, quantity) => total + quantity,
    0,
  );
  const serviceCatalog = remoteServices;
  const productCatalog: Product[] = useMemo(
    () =>
      remoteProducts.map((item) => ({
        id: item.id,
        name: item.name,
        brand:
          item.brand_name ||
          item.business_name ||
          "Nama penjual belum dicantumkan",
        businessName:
          item.business_name || item.brand_name || "Partner Slivadoc",
        businessId: item.business_id || item.branch_id || item.id,
        storeLogoUrl: item.store_logo_url || undefined,
        storeIsOnline: item.store_is_online,
        storeLastSeenAt: item.store_last_seen_at || undefined,
        branchName: item.branch_name || "Cabang belum dicantumkan",
        city: item.city || "Lokasi belum dicantumkan",
        sku: item.sku || "-",
        barcode: item.barcode || "",
        description: item.description || "",
        price: Math.max(0, finiteNumber(item.price) ?? 0),
        originalPrice:
          (finiteNumber(item.original_price) ?? 0) >
          (finiteNumber(item.price) ?? 0)
            ? finiteNumber(item.original_price) ?? undefined
            : undefined,
        rating: Math.min(5, Math.max(0, finiteNumber(item.rating) ?? 0)),
        reviewCount: Math.max(0, finiteNumber(item.review_count) ?? 0),
        soldCount: Math.max(0, finiteNumber(item.sold_count) ?? 0),
        stock: Math.max(0, Math.floor(finiteNumber(item.stock) ?? 0)),
        minimumStock: Math.max(0, finiteNumber(item.minimum_stock) ?? 0),
        available:
          typeof item.available === "boolean"
            ? item.available
            : (finiteNumber(item.stock) ?? 0) > 0,
        sold: `${Math.max(0, finiteNumber(item.sold_count) ?? 0).toLocaleString("id-ID")} terjual`,
        emoji: item.category.toLowerCase().includes("food") ? "🥣" : "🛍️",
        imageUrl: item.image_url || undefined,
        imageUrls: item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [],
        category: item.category || "Kebutuhan pet",
        createdAt: item.created_at,
        badge: (
          typeof item.available === "boolean"
            ? item.available
            : (finiteNumber(item.stock) ?? 0) > 0
        )
          ? undefined
          : "Stok habis",
        manufacturer: item.manufacturer,
        originCountry: item.origin_country,
        netContent: item.net_content,
        ingredients: item.ingredients,
        usageInstructions: item.usage_instructions,
        storageInstructions: item.storage_instructions,
        warnings: item.warnings,
        packageContents: item.package_contents,
        returnPolicy: item.return_policy,
        warrantyPolicy: item.warranty_policy,
        registrationType: item.registration_type,
        registrationNumber: item.registration_number,
        halalCertificateNumber: item.halal_certificate_number,
        sniNumber: item.sni_number,
        licenseStatus: item.business_license_status,
      })),
    [remoteProducts],
  );

  useEffect(() => {
    const savedLocation = window.localStorage.getItem("slivadoc.location");
    const savedCart = window.localStorage.getItem("slivadoc.cart");
    try {
      queueMicrotask(() => {
        if (savedLocation) setCurrentLocation(JSON.parse(savedLocation));
        if (savedCart) setCart(JSON.parse(savedCart));
        const requested = new URLSearchParams(window.location.search).get(
          "view",
        ) as AppView | null;
        const savedView = window.localStorage.getItem(
          "slivadoc.active_view",
        ) as AppView | null;
        const view =
          requested && titles[requested]
            ? requested
            : savedView && titles[savedView]
              ? savedView
              : "home";
        setActiveView(view);
        const mode = new URLSearchParams(window.location.search).get("world_mode");
        setWorldMode(isWorldMode(mode) ? mode : "academy");
        const savedPet = window.localStorage.getItem("slivadoc.active_pet");
        if (savedPet) setSelectedPetId(savedPet);
        if (window.sessionStorage.getItem(checkoutSuccessStorageKey) === "1")
          setCheckoutSuccess(true);
      });
    } catch {
      window.localStorage.removeItem("slivadoc.location");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("slivadoc.cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    const listener = () => setLoginOpen(true);
    window.addEventListener("slivadoc:login-required", listener);
    return () =>
      window.removeEventListener("slivadoc:login-required", listener);
  }, []);
  useEffect(() => {
    const listener = (event: Event) => {
      const view = (event as CustomEvent<AppView>).detail;
      if (!view) return;
      if (protectedViews.includes(view) && !authenticated) setLoginOpen(true);
      else setActiveView(view);
    };
    window.addEventListener("slivadoc:navigate", listener);
    return () => window.removeEventListener("slivadoc:navigate", listener);
  }, [authenticated]);
  useEffect(() => {
    const restoreViewFromURL = () => {
      const requested = new URLSearchParams(window.location.search).get("view") as AppView | null;
      const next = requested && titles[requested] ? requested : "home";
      if (protectedViews.includes(next) && !authenticated) {
        setLoginOpen(true);
        return;
      }
      setNavigationVersion((value) => value + 1);
      setActiveView(next);
      const mode = new URLSearchParams(window.location.search).get("world_mode");
      setWorldMode(isWorldMode(mode) ? mode : "academy");
      window.localStorage.setItem("slivadoc.active_view", next);
    };
    window.addEventListener("popstate", restoreViewFromURL);
    return () => window.removeEventListener("popstate", restoreViewFromURL);
  }, [authenticated]);

  const notify: Notify = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }, []);
  const openNotifications = useCallback((category = "") => {
    setNotificationCategory(category);
    setNotificationOpen(true);
  }, []);
  useEffect(() => {
    return startAutomaticRefresh(() => {
      setAuthenticated(false);
      notify("Session pet owner berakhir. Silakan login kembali.");
    });
  }, [notify]);
  const syncActivities = useCallback(async () => {
    const center = await getPetOwnerActivityCenter();
    const keep = moreActivitiesLoaded.current;
    setActivities((current) =>
      keep ? mergeActivityPages(center.data, current) : center.data,
    );
    if (!keep) setActivityCursor(center.next_cursor);
    setActivitySummary(center.summary);
  }, []);
  const loadMoreActivities = useCallback(async () => {
    if (!activityCursor || activityLoadingMore) return;
    setActivityLoadingMore(true);
    try {
      const page = await getPetOwnerActivityCenter(activityCursor);
      moreActivitiesLoaded.current = true;
      setActivities((current) => mergeActivityPages(current, page.data));
      setActivityCursor(page.next_cursor);
      setActivitySummary(page.summary);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Aktivitas berikutnya belum dapat dimuat",
      );
    } finally {
      setActivityLoadingMore(false);
    }
  }, [activityCursor, activityLoadingMore, notify]);
  // A failed fetch keeps the last count rather than showing a made-up one.
  const syncChatUnread = useCallback(async () => {
    try {
      const chats = await getMarketplaceChats();
      setChatUnread(
        chats.data.reduce((total, thread) => total + thread.unread_count, 0),
      );
    } catch {}
  }, []);
  const inboxOpen = activeView === "messages";
  useEffect(() => {
    if (!authenticated) return;
    const timer = window.setTimeout(() => void syncChatUnread(), 0);
    return () => window.clearTimeout(timer);
  }, [authenticated, inboxOpen, inboxChatThread, syncChatUnread]);
  const handleActivityFocus = useCallback(
    (token: number) =>
      setActivityFocus((current) => (current?.token === token ? null : current)),
    [],
  );

  async function loadBootstrap() {
    setBootstrapLoading(true);
    const loggedIn = isPetOwnerAuthenticated();
    setAuthenticated(loggedIn);
    if (!loggedIn) {
      setAccount(null);
      setPetProfiles([]);
      applyNotifications([], 0);
      setActivities([]);
      setActivitySummary(null);
      setChatUnread(0);
      setActivityCursor(null);
      moreActivitiesLoaded.current = false;
      setFavoriteIds([]);
      setPoints(0);
      setMembership(starterMembership);
      setRewardFormula({ enabled: false });
      setBootstrapLoading(false);
      return;
    }
    try {
      clearPlatformCache();
      const identity = await getCurrentUser();
      if (identity?.role === "official_brand") {
        router.push("/brand");
        return;
      }
      // A failed center load keeps the current list; the 15s sync retries it.
      const [data] = await Promise.all([
        getPetOwnerBootstrap(),
        syncActivities().catch(() => undefined),
      ]);
      const mapped = data.pets.map(apiPetToView);
      setAccount(data.user);
      setPetProfiles(mapped);
      setSelectedPetId((current) =>
        mapped.some((item) => item.id === current)
          ? current
          : (mapped[0]?.id ?? ""),
      );
      applyNotifications(data.notifications, data.unread_notifications);
      setFavoriteIds(data.favorites.map((item) => item.entity_id));
      setPoints(data.points.balance);
      setMembership(data.points.membership ?? starterMembership);
      setRewardFormula(data.points.formula);
      setAuthenticated(true);
    } catch (error) {
      clearSession();
      setAuthenticated(false);
      notify(
        error instanceof Error ? error.message : "Session pet owner berakhir",
      );
    } finally {
      setBootstrapLoading(false);
    }
  }
  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    const sync = () => {
      clearPlatformCache();
      void getPetOwnerBootstrap()
        .then((data) => {
          if (cancelled) return;
          const mapped = data.pets.map(apiPetToView);
          setPetProfiles(mapped);
          setSelectedPetId((current) => mapped.some((pet) => pet.id === current) ? current : mapped[0]?.id ?? "");
          applyNotifications(data.notifications, data.unread_notifications);
          setPoints(data.points.balance);
          setMembership(data.points.membership ?? starterMembership);
          setRewardFormula(data.points.formula);
        })
        .catch(() => undefined);
      void syncActivities().catch(() => undefined);
      void syncChatUnread();
    };
    const timer = window.setInterval(sync, 15_000);
    const foreground = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", foreground);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", foreground);
    };
  }, [authenticated, syncActivities, syncChatUnread]);
  useEffect(() => {
    queueMicrotask(() => {
      void loadBootstrap();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    void Promise.all([
      getDiscoveryServices(
        currentLocation
          ? {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }
          : undefined,
      ),
      getDiscoveryProducts(),
    ])
      .then(([serviceResponse, productResponse]) => {
        setRemoteServices(
          serviceResponse.data.map((item, index) => {
            const distance = finiteNumber(item.distance_km);
            const category = item.category.toLowerCase();
            const type: Service["type"] = category.includes("groom")
              ? "Grooming"
              : category.includes("hotel")
                ? "Pet Hotel"
                : category.includes("home")
                  ? "Home Care"
                  : category.includes("shop")
                    ? "Pet Shop"
                    : "Clinic";
            return {
              id: item.id,
              branchId: item.branch_id,
              businessId: item.business_id,
              businessName: item.business_name,
              branchName: item.branch_name,
              city: item.city,
              priceValue: item.price,
              originalPrice:
                item.original_price && item.original_price > item.price
                  ? item.original_price
                  : undefined,
              discountPercent: item.discount_percent ?? 0,
              name: item.name,
              type,
              distance:
                distance !== null ? `${distance.toFixed(1)} km` : item.city,
              rating: finiteNumber(item.rating) ?? 0,
              reviews: finiteNumber(item.review_count) ?? 0,
              price:
                item.price > 0 ? `Mulai ${formatRupiah(item.price)}` : "Gratis",
              status: "Cek slot tersedia",
              address: `${item.branch_name} · ${item.address}`,
              imageUrl: item.image_url,
              imageUrls: item.image_urls?.length ? item.image_urls : item.image_url ? [item.image_url] : [],
              emoji:
                type === "Grooming"
                  ? "🛁"
                  : type === "Pet Hotel"
                    ? "🏡"
                    : type === "Home Care"
                      ? "🚗"
                      : type === "Pet Shop"
                        ? "🛍️"
                        : "🏥",
              accent: ["mint", "blue", "violet", "peach"][index % 4],
              tags: [
                item.business_name,
                `${item.duration_minutes} menit`,
                item.city,
              ],
              description: item.description,
              durationMinutes: item.duration_minutes,
              inclusions: item.inclusions,
              supportedSpecies: item.supported_species,
              cancellationPolicy: item.cancellation_policy,
              cancellationCutoffHours: item.cancellation_cutoff_hours,
              licenseStatus: item.business_license_status,
            };
          }).filter(
            (service, index, all) =>
              all.findIndex((candidate) => candidate.id === service.id) === index,
          ),
        );
        setRemoteProducts(productResponse.data);
      })
      .catch(() => {
        setRemoteServices([]);
        setRemoteProducts([]);
      });
  }, [currentLocation]);

  useEffect(() => {
    if (selectedPetId) window.localStorage.setItem("slivadoc.active_pet", selectedPetId);
  }, [selectedPetId]);

  function requireLogin() {
    if (authenticated) return true;
    setLoginOpen(true);
    return false;
  }
  function openPetSetup() {
    if (!requireLogin()) return;
    setBookingOpen(false);
    setCartOpen(false);
    setNotificationOpen(false);
    navigate("profile");
    setAddPetOpen(true);
    notify("Tambahkan profil pet terlebih dahulu. Akunmu sedang dalam mode lihat saja.");
  }
  function requirePet() {
    if (!requireLogin()) return false;
    if (petProfiles.length) return true;
    openPetSetup();
    return false;
  }
  useEffect(() => {
    const listener = () => {
      if (!authenticated) setLoginOpen(true);
      else {
        window.localStorage.setItem("slivadoc.active_view", "profile");
        const url = new URL(window.location.href);
        url.search = "?view=profile";
        window.history.pushState({ view: "profile" }, "", `${url.pathname}${url.search}`);
        setActiveView("profile");
        setBookingOpen(false);
        setCartOpen(false);
        setAddPetOpen(true);
      }
    };
    window.addEventListener("slivadoc:pet-required", listener);
    return () => window.removeEventListener("slivadoc:pet-required", listener);
  }, [authenticated]);

  const navigate = (view: AppView) => {
    if (protectedViews.includes(view) && !authenticated) {
      setLoginOpen(true);
      return;
    }
    if (view === "world") setWorldMode("academy");
    setActiveView(view);
    window.localStorage.setItem("slivadoc.active_view", view);
    const url = new URL(window.location.href);
    if (view !== "shop") {
      url.searchParams.delete("product");
      url.searchParams.delete("store");
      url.searchParams.delete("store_section");
    }
    if (view !== "discover") {
      url.searchParams.delete("service");
      url.searchParams.delete("service_type");
    }
    if (view !== "bookings") {
      url.searchParams.delete("activity");
      url.searchParams.delete("activity_type");
    }
    if (view !== "consult" && view !== "world") url.searchParams.delete("veterinarian");
    url.searchParams.delete("world_item");
    if (view === "world") url.searchParams.set("world_mode", "academy");
    else url.searchParams.delete("world_mode");
    if (view === "home") url.searchParams.delete("view");
    else url.searchParams.set("view", view);
    window.history.pushState(
      { view },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };

  const openServiceCatalog = (serviceType?: Service["type"], serviceId?: string) => {
    setActiveView("discover");
    window.localStorage.setItem("slivadoc.active_view", "discover");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "discover");
    url.searchParams.delete("product");
    url.searchParams.delete("store");
    url.searchParams.delete("store_section");
    url.searchParams.delete("activity");
    if (serviceType) url.searchParams.set("service_type", serviceType);
    else url.searchParams.delete("service_type");
    if (serviceId) url.searchParams.set("service", serviceId);
    else url.searchParams.delete("service");
    window.history.pushState(
      { view: "discover", serviceType, serviceId },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const openPartnerProfile = (businessId: string) => {
    setActiveView("shop");
    window.localStorage.setItem("slivadoc.active_view", "shop");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "shop");
    url.searchParams.set("store", businessId);
    url.searchParams.set("store_section", "services");
    url.searchParams.delete("product");
    url.searchParams.delete("service");
    url.searchParams.delete("service_type");
    url.searchParams.delete("activity");
    url.searchParams.delete("veterinarian");
    window.history.pushState(
      { view: "shop", store: businessId, section: "services" },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const openInboxChatShortcut = (shortcut: MarketplaceChatShortcut) => {
    const thread = inboxChatThread;
    if (!thread) return;
    setInboxChatThread(undefined);
    if (shortcut === "pet_hotel") {
      openServiceCatalog("Pet Hotel");
      return;
    }
    if (shortcut === "orders") {
      navigate("bookings");
      const url = new URL(window.location.href);
      url.searchParams.set("activity_type", "order");
      window.history.replaceState(
        { view: "bookings", activityType: "order" },
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      return;
    }
    setActiveView("shop");
    window.localStorage.setItem("slivadoc.active_view", "shop");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "shop");
    url.searchParams.set("store", thread.business_id);
    url.searchParams.set(
      "store_section",
      shortcut === "services" ? "services" : "products",
    );
    url.searchParams.delete("product");
    window.history.pushState(
      { view: "shop", store: thread.business_id, section: shortcut },
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const openWorld = (mode: PetOwnerWorldMode, itemId?: string, veterinarianId?: string) => {
    setWorldMode(mode);
    setActiveView("world");
    window.localStorage.setItem("slivadoc.active_view", "world");
    const url = new URL(window.location.href);
    for (const key of ["product", "store", "store_section", "service", "service_type", "activity", "activity_type", "veterinarian", "world_item"]) url.searchParams.delete(key);
    url.searchParams.set("view", "world");
    url.searchParams.set("world_mode", mode);
    if (itemId) url.searchParams.set("world_item", itemId);
    if (veterinarianId) url.searchParams.set("veterinarian", veterinarianId);
    window.history.pushState({ view: "world", worldMode: mode }, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const openConsultation = (veterinarianId?: string) => openWorld("consult", undefined, veterinarianId);

  const openSearchResult = (result: GlobalSearchResult) => {
    if (result.id === "booking") { openServiceCatalog(); return; }
    if (result.category === "service") {
      const service = serviceCatalog.find((item) => item.id === result.id);
      openServiceCatalog(service?.type, result.id);
      return;
    }
    if (result.category === "product") {
      setActiveView("shop");
      window.localStorage.setItem("slivadoc.active_view", "shop");
      const url = new URL(window.location.href);
      url.searchParams.set("view", "shop");
      url.searchParams.set("product", result.id);
      url.searchParams.delete("store");
      url.searchParams.delete("store_section");
      window.history.pushState(
        { view: "shop", product: result.id },
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }
    if (result.category === "veterinarian") {
      openConsultation(result.id);
      return;
    }
    const mode = result.category === "event" ? "events" : result.category;
    if (isWorldMode(mode)) {
      openWorld(mode, result.id);
      return;
    }
    const aliases: Record<string, AppView> = { marketplace: "shop", product: "shop", products: "shop", activity: "bookings", world: "world" };
    const route = aliases[result.route] ?? result.route as AppView;
    if (isWorldMode(route)) openWorld(route);
    else if (titles[route]) navigate(route);
    else notify(`${result.title} · ${result.subtitle}`);
  };

  const openBooking = (service?: Service) => {
    if (!service) { openServiceCatalog(); return; }
    if (!requirePet()) return;
    setSelectedService(service);
    setBookingOpen(true);
  };

  const toggleFavorite = async (entityType: string, id: string) => {
    if (!requirePet()) return;
    try {
      const result = await togglePetOwnerFavorite(entityType, id);
      setFavoriteIds((current) =>
        result.favorite
          ? [...new Set([...current, id])]
          : current.filter((item) => item !== id),
      );
      notify(
        result.favorite ? "Ditambahkan ke favorit" : "Dihapus dari favorit",
      );
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Favorit belum dapat diperbarui",
      );
    }
  };

  const addToCart = async (id: string, quantity = 1) => {
    if (!requirePet()) return false;
    const product = productCatalog.find((item) => item.id === id);
    if (!product?.available) {
      notify("Produk sedang tidak tersedia");
      return false;
    }
    const safeQuantity = Math.max(1, Math.floor(quantity));
    setCart((current) => ({
      ...current,
      [id]: Math.min(product.stock, (current[id] ?? 0) + safeQuantity),
    }));
    await new Promise((resolve) => window.setTimeout(resolve, 480));
    setCartAddedOpen(true);
    if (cartAddedTimer.current) clearTimeout(cartAddedTimer.current);
    cartAddedTimer.current = setTimeout(() => setCartAddedOpen(false), 1_650);
    return true;
  };

  const buyNow = (id: string, quantity = 1) => {
    if (!requirePet()) return;
    const product = productCatalog.find((item) => item.id === id);
    if (!product?.available) {
      notify("Produk sedang tidak tersedia");
      return;
    }
    const safeQuantity = Math.min(
      product.stock,
      Math.max(1, Math.floor(quantity)),
    );
    setDirectBuyCart({ [id]: safeQuantity });
    setCartOpen(true);
  };

  const checkoutCart = directBuyCart ?? cart;
  const setCheckoutCart: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  > = (next) => {
    if (directBuyCart) {
      setDirectBuyCart((current) => {
        const base = current ?? {};
        return typeof next === "function" ? next(base) : next;
      });
      return;
    }
    setCart(next);
  };

  const openActivity = (type: ActivityType, id: string) => {
    navigate("bookings");
    void syncActivities()
      .catch(() => undefined)
      .finally(() => setActivityFocus({ type, id, token: Date.now() }));
  };
  // Success screens in the module components dispatch this; re-subscribing on
  // every render keeps the listener on the current navigate closure.
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{ type: ActivityType; id: string }>)
        .detail;
      if (detail?.type && detail.id) openActivity(detail.type, detail.id);
    };
    window.addEventListener("slivadoc:open-activity", listener);
    return () =>
      window.removeEventListener("slivadoc:open-activity", listener);
  });

  // A store reply notification: open that thread over the inbox; if the thread
  // is gone the inbox alone is shown.
  const openStoreChatThread = async (threadId: string) => {
    navigate("messages");
    try {
      const chats = await getMarketplaceChats();
      setInboxChatThread(chats.data.find((thread) => thread.id === threadId));
    } catch {}
  };

  const openNotificationTarget = (item: NotificationItem) => {
    const type = item.metadata?.activity_type;
    const id = item.metadata?.activity_id;
    if (
      typeof type === "string" &&
      typeof id === "string" &&
      type in activityTypeMeta
    ) {
      openActivity(type as ActivityType, id);
      return;
    }
    const route = item.action_route.split("/").filter(Boolean).pop() ?? "";
    if (route === "care") {
      // A Care Team reply: open that pet's team chat.
      const petID = item.metadata?.pet_id;
      if (typeof petID === "string" && petID) setSelectedPetId(petID);
      setChatMode("care-team");
      setChatOpen(true);
    } else if (
      route === "shop" &&
      typeof item.metadata?.thread_id === "string" &&
      item.metadata.thread_id
    ) {
      void openStoreChatThread(item.metadata.thread_id);
    } else if (route === "activity" || route === "bookings")
      navigate("bookings");
    else if (route in titles) navigate(route as AppView);
    else notify(item.title);
  };

  const repeatActivity = (item: PetOwnerActivityCenterItem) => {
    if (item.type === "booking") {
      openBooking(serviceCatalog.find((service) => service.id === item.service_id));
      return;
    }
    if (item.type === "consultation") {
      navigate("consult");
      return;
    }
    const lines = item.items ?? [];
    const available = lines.filter(
      (line) =>
        productCatalog.find((product) => product.id === line.product_id)
          ?.available,
    );
    if (!available.length) {
      notify("Produk pada pesanan lama sudah tidak tersedia");
      return;
    }
    setCart((current) => {
      const next = { ...current };
      for (const line of available) {
        const stock =
          productCatalog.find((product) => product.id === line.product_id)
            ?.stock ?? 0;
        next[line.product_id] = Math.min(
          stock,
          (next[line.product_id] ?? 0) + line.quantity,
        );
      }
      return next;
    });
    setCartOpen(true);
    if (available.length < lines.length)
      notify("Sebagian produk pada pesanan lama sudah tidak tersedia");
  };

  if (bootstrapLoading)
    return <OpeningExperience />;

  return (
    <PetOwnerFlowProvider authenticated={authenticated} hasPet={petProfiles.length > 0} onLogin={() => setLoginOpen(true)} onAddPet={openPetSetup}>
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        setActiveView={navigate}
        account={account}
        authenticated={authenticated}
        onLogin={() => setLoginOpen(true)}
        selectedPet={selectedPet}
        needsActionCount={activities.filter((item) => item.needs_action).length}
      />

      <main className="main-shell">
        <Topbar
          unread={unreadCount}
          selectedPet={selectedPet}
          petProfiles={petProfiles}
          selectedPetId={selectedPetId}
          setSelectedPetId={setSelectedPetId}
          locationLabel={
            currentLocation?.label.split(",").slice(0, 2).join(", ") ??
            "Pilih lokasi spesifik"
          }
          onOpenLocation={() => setLocationOpen(true)}
          cartCount={cartCount}
          onOpenMessages={() => navigate("messages")}
          chatUnread={chatUnread}
          onOpenNotifications={() => openNotifications()}
          onOpenCart={() => setCartOpen(true)}
          account={account}
          points={points}
          authenticated={authenticated}
          navigate={navigate}
          onSearchResult={openSearchResult}
          onLogin={() => setLoginOpen(true)}
        />

        <div className="page-content">
          <PageHeading
            activeView={activeView}
            selectedPet={selectedPet}
            account={account}
          />
          {isWorldMode(featureView) ? <WorldNavigation active={featureView} onSelect={openWorld} /> : null}
          <PetRequiredNotice />
          {featureView === "home" && (
            <HomeView
              selectedPet={selectedPet}
              petProfiles={petProfiles}
              selectedPetId={selectedPetId}
              onSelectPet={setSelectedPetId}
              setActiveView={navigate}
              openServiceCatalog={openServiceCatalog}
              openPartnerProfile={openPartnerProfile}
              openConsultation={openConsultation}
              setChatOpen={(open) => { if (!open || requireLogin()) setChatOpen(open); }}
              services={serviceCatalog}
              activities={activities}
              openActivity={openActivity}
              ownerName={account?.full_name}
            />
          )}
          {featureView === "pets" && (
            <PetsView
              petProfiles={petProfiles}
              selectedPetId={selectedPetId}
              setSelectedPetId={setSelectedPetId}
              setAddPetOpen={(open) => { if (!open || requireLogin()) setAddPetOpen(open); }}
              setActiveView={navigate}
              notify={notify}
              onChanged={loadBootstrap}
            />
          )}
          {featureView === "discover" && (
            <DiscoverView
              favorites={favoriteIds}
              toggleFavorite={(id) => void toggleFavorite("service", id)}
              openBooking={openBooking}
              notify={notify}
              serviceCatalog={serviceCatalog}
            />
          )}
          {!authenticated && (featureView === "bookings" || featureView === "messages") && (
            <section className="empty-state panel">
              <h2>{featureView === "bookings" ? "Masuk untuk melihat aktivitas" : "Masuk untuk melihat chat"}</h2>
              <p>Booking, belanja, dan konsultasi tersimpan aman di akunmu.</p>
              <button type="button" className="primary-button" onClick={() => setLoginOpen(true)}>Masuk ke akun</button>
            </section>
          )}
          {featureView === "bookings" && authenticated && (
            <BookingsView
              openBooking={openBooking}
              setActiveView={navigate}
              notify={notify}
              activities={activities}
              summary={activitySummary}
              points={points}
              rewardFormula={rewardFormula}
              focus={activityFocus}
              onFocusHandled={handleActivityFocus}
              onRepeat={repeatActivity}
              onPaid={syncActivities}
              hasMoreActivities={activityCursor !== null}
              loadingMoreActivities={activityLoadingMore}
              onLoadMore={() => void loadMoreActivities()}
            />
          )}
          {featureView === "health" && (
            <HealthView pet={selectedPet} notify={notify} />
          )}
          {featureView === "shop" && (
            <ShopMarketplace
              addToCart={addToCart}
              buyNow={buyNow}
              setCartOpen={setCartOpen}
              cartCount={cartCount}
              notify={notify}
              productCatalog={productCatalog}
              serviceCatalog={serviceCatalog}
              onOpenService={(service) => openServiceCatalog(service.type, service.id)}
              petName={selectedPet.name}
              favorites={favoriteIds}
              authenticated={authenticated}
              onRequireLogin={() => setLoginOpen(true)}
              toggleFavorite={(id) => void toggleFavorite("product", id)}
            />
          )}
          {featureView === "community" && (
            <CommunityExperience
              notify={notify}
              onOpenLocation={() => setLocationOpen(true)}
            />
          )}
          {(["academy", "events", "petspot", "pethub"] as AppView[]).includes(
            featureView,
          ) && (
            <PlatformDiscovery
              key={`${featureView}:${navigationVersion}`}
              mode={featureView as "academy" | "events" | "petspot" | "pethub"}
              petName={selectedPet.name}
              pets={petProfiles.map((pet) => ({
                id: pet.id,
                name: pet.name,
                species: pet.speciesCode ?? pet.speciesGroup ?? "other",
                breed: pet.breed,
                avatar: pet.avatar,
              }))}
              ownerName={account?.full_name}
              ownerEmail={account?.email}
              notify={notify}
              initialItemId={typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("world_item") ?? undefined : undefined}
            />
          )}
          {(["consult", "adoption", "documents"] as AppView[]).includes(
            featureView,
          ) && (
            <CareMarketplace
              key={`${featureView}:${navigationVersion}`}
              mode={featureView as "consult" | "adoption" | "documents"}
              pet={selectedPet}
              pets={petProfiles}
              notify={notify}
              initialVeterinarianId={
                featureView === "consult" && typeof window !== "undefined"
                  ? new URLSearchParams(window.location.search).get("veterinarian") ?? undefined
                  : undefined
              }
            />
          )}
          {featureView === "pawdating" && (
            <PawDatingExperience pet={selectedPet} notify={notify} />
          )}
          {featureView === "petship" && (
            <PetshipView
              pet={selectedPet}
              authenticated={authenticated}
              location={currentLocation}
              notify={notify}
              onLogin={() => setLoginOpen(true)}
            />
          )}
          {featureView === "fundraising" && (
            <FundraisingView
              pet={selectedPet}
              authenticated={authenticated}
              notify={notify}
              onLogin={() => setLoginOpen(true)}
            />
          )}
          {featureView === "favorites" && (
            <FavoritesView
              services={serviceCatalog.filter((item) =>
                favoriteIds.includes(item.id),
              )}
              products={productCatalog.filter((item) =>
                favoriteIds.includes(item.id),
              )}
              openBooking={openBooking}
              addToCart={addToCart}
              remove={(type, id) => toggleFavorite(type, id)}
            />
          )}
          {featureView === "notifications" && (
            <NotificationCenter
              items={notifications}
              setItems={setNotifications}
              unread={unreadCount}
              loadAll={loadAllNotifications}
              notify={notify}
              onOpen={openNotificationTarget}
            />
          )}
          {featureView === "messages" && authenticated && (
            <>
              <ChatInboxView
                activities={activities}
                notify={notify}
                onOpenStore={setInboxChatThread}
                onOpenDoctor={(item) => openActivity(item.type, item.id)}
              />
              {inboxChatThread && (
                <MarketplaceChatPanel
                  threadId={inboxChatThread.id}
                  businessId={inboxChatThread.business_id}
                  product={productCatalog.find(
                    (item) => item.id === inboxChatThread.product_id,
                  )}
                  store={{
                    name: inboxChatThread.business_name,
                    logo_url: inboxChatThread.store_logo_url,
                    is_online: inboxChatThread.store_is_online,
                    last_seen_at: inboxChatThread.store_last_seen_at,
                  }}
                  onClose={() => setInboxChatThread(undefined)}
                  onShortcut={openInboxChatShortcut}
                  notify={notify}
                />
              )}
            </>
          )}
          {featureView === "support" && (
            <SupportCenter activities={activities} notify={notify} />
          )}
          {featureView === "profile" && !account && (
            <section className="empty-state" aria-label="Akun Pet Owner">
              <h2>Masuk ke akun</h2><p>Sinkronkan profil pet, aktivitas, dan membership Slivadoc.</p>
              <button type="button" className="primary-button" onClick={() => setLoginOpen(true)}>Masuk / Daftar</button>
            </section>
          )}
          {featureView === "profile" && account && (
            <ProfileView
              notify={notify}
              account={account}
              familyPet={petProfiles.length ? selectedPet : undefined}
              petCount={petProfiles.length}
              points={points}
              membership={membership}
              rewardFormula={rewardFormula}
              onChanged={loadBootstrap}
              currentLocation={currentLocation}
              onOpenLocation={() => setLocationOpen(true)}
              onOpenSupport={() => { if (requireLogin()) { setChatMode("support"); setChatOpen(true); } }}
              onOpenNotifications={openNotifications}
              onLogout={async () => {
                await logoutSession();
                void loadBootstrap();
                navigate("home");
              }}
            />
          )}
        </div>
      </main>

      <MobileNav
        activeView={activeView}
        setActiveView={navigate}
        cartCount={cartCount}
        authenticated={authenticated}
        onOpenChat={() => { if (requireLogin()) setChatOpen(true); }}
      />

      <button
        className="floating-chat"
        type="button"
        onClick={() => { if (requireLogin()) setChatOpen(true); }}
        aria-label="Buka chat SlivaCare"
      >
        <Icon name="chat" size={22} />
        <span>SlivaCare</span>
        <i />
      </button>

      {notificationOpen && (
        <NotificationDrawer
          onClose={() => setNotificationOpen(false)}
          initialCategory={notificationCategory}
          notify={notify}
          onOpen={openNotificationTarget}
          items={notifications}
          setItems={setNotifications}
          seeAll={() => {
            setNotificationOpen(false);
            navigate("notifications");
          }}
        />
      )}
      {chatOpen && (
        <SlivaCareDrawer
          key={chatMode}
          pet={selectedPet}
          owner={account ?? undefined}
          initialMode={chatMode}
          onClose={() => {
            setChatOpen(false);
            setChatMode("assistant");
          }}
          notify={notify}
        />
      )}
      {cartOpen && (
        <CartDrawer
          cart={checkoutCart}
          setCart={setCheckoutCart}
          onClose={() => {
            setCartOpen(false);
            setDirectBuyCart(null);
          }}
          notify={notify}
          productCatalog={productCatalog}
          onOpenAccount={() => {
            setCartOpen(false);
            navigate("profile");
          }}
          account={account}
          points={points}
          rewardFormula={rewardFormula}
          onCheckoutSuccess={completeCheckout}
          onRewardChanged={loadBootstrap}
        />
      )}
      {addPetOpen && (
        <AddPetExperience
          onClose={() => setAddPetOpen(false)}
          notify={notify}
          onSaved={(pet) => {
            setPetProfiles((current) => [...current, pet]);
            setSelectedPetId(pet.id);
            void loadBootstrap();
          }}
        />
      )}
      {locationOpen && (
        <LocationModal
          current={currentLocation}
          onClose={() => setLocationOpen(false)}
          onSelect={(location) => {
            setCurrentLocation(location);
            window.localStorage.setItem(
              "slivadoc.location",
              JSON.stringify(location),
            );
            setLocationOpen(false);
            notify("Lokasi layanan berhasil diperbarui");
          }}
        />
      )}
      {bookingOpen && selectedService && (
        <BookingModal
          service={selectedService}
          pets={petProfiles}
          selectedPetId={selectedPet.id}
          onSelectPet={setSelectedPetId}
          onClose={() => setBookingOpen(false)}
          onBooked={async (bookingId) => {
            await loadBootstrap();
            setBookingOpen(false);
            openActivity("booking", bookingId);
            notify("Booking berhasil. Jadwal dan status pembayaran tersedia di Aktivitas.");
          }}
        />
      )}
      {loginOpen && (
        <PetOwnerLogin
          close={() => setLoginOpen(false)}
          notify={notify}
          onSuccess={loadBootstrap}
        />
      )}
      {checkoutSuccess && (
        <div className="modal-overlay">
          <div
            className="modal success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-success-title"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Tutup"
              onClick={dismissCheckoutSuccess}
            >
              <Icon name="close" />
            </button>
            <span className="success-animation">
              <Icon name="check" size={34} />
            </span>
            <small>SLIVA PET SHOP</small>
            <h2 id="checkout-success-title">Pembayaran berhasil</h2>
            <p>Transaksi sudah tercatat dan pesanan sedang diproses.</p>
            <button
              className="primary-button full"
              type="button"
              onClick={dismissCheckoutSuccess}
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" size={15} />
          </span>
          {toast}
        </div>
      )}
      {cartAddedOpen && (
        <div className="cart-added-notice" role="status" aria-live="polite">
          <span>
            <Icon name="check" size={28} />
          </span>
          <strong>Ditambahkan ke keranjang</strong>
        </div>
      )}
    </div>
    </PetOwnerFlowProvider>
  );
}

const legalCopy = {
  terms: {
    title: "Syarat dan Ketentuan Slivadoc",
    sections: [
      "Slivadoc membantu pet parent mengelola profil pet, booking, transaksi, komunitas, lokasi Petship, dan layanan mitra. Informasi kesehatan di aplikasi bukan pengganti pemeriksaan langsung oleh dokter hewan.",
      "Kamu bertanggung jawab menjaga kerahasiaan akun, memberikan data yang benar, dan menggunakan komunitas secara aman. Konten yang menipu, membahayakan hewan, melanggar hak orang lain, atau memuat kontak pribadi pada area publik dapat dimoderasi.",
      "Booking, pembayaran, pembatalan, donasi, dan layanan mitra mengikuti detail yang ditampilkan sebelum konfirmasi. Slivadoc mencatat aktivitas penting untuk keamanan, dukungan, dan penyelesaian kendala.",
    ],
  },
  privacy: {
    title: "Kebijakan Privasi Slivadoc",
    sections: [
      "Kami memproses identitas akun, profil pet, catatan layanan, preferensi, dan data perangkat yang diperlukan untuk menjalankan fitur Slivadoc. Data lokasi Petship dibagikan pada tingkat tempat; koordinat personal tidak ditampilkan kepada pengguna lain.",
      "Data digunakan untuk autentikasi, personalisasi, transaksi, keselamatan, analitik agregat, pencegahan penyalahgunaan, serta komunikasi layanan. Akses dibatasi berdasarkan peran dan dicatat untuk kebutuhan audit.",
      "Kamu dapat memperbarui profil, mengelola akses keluarga, keluar dari perangkat, dan meminta bantuan terkait data melalui Pusat Bantuan. Data disimpan sesuai kebutuhan layanan dan kewajiban hukum yang berlaku.",
    ],
  },
} as const;

function PetOwnerLogin({
  close,
  notify,
  onSuccess,
}: {
  close: () => void;
  notify: Notify;
  onSuccess: () => Promise<void>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [formValid, setFormValid] = useState(false);
  const [registrationEmail, setRegistrationEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [policy, setPolicy] = useState<keyof typeof legalCopy | null>(null);
  const passwordValid = /(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/.test(
    password,
  );
  const registrationConsent =
    mode !== "register" || (terms && privacy && /^0[0-9]{8,15}$/.test(phone));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationConsent) return;
    setBusy(true);
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "verify") {
        const response = await fetch(
          `${PLATFORM_API_URL}/api/v1/auth/register/verify-otp`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: registrationEmail, otp }),
          },
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.message || "OTP belum dapat diverifikasi");
        setMode("login");
        setOtp("");
        setPassword("");
        setFormValid(false);
        setMessage("Email berhasil diverifikasi. Silakan login.");
        notify("Registrasi berhasil. Akun Pet Owner sudah aktif.");
        return;
      }
      const endpoint =
        mode === "login"
          ? "/api/v1/auth/login"
          : "/api/v1/auth/petowner/register";
      const response = await fetch(`${PLATFORM_API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Login belum dapat diproses");
      if (mode === "register") {
        setRegistrationEmail(String(values.email));
        setOtp(String(data.development_otp ?? ""));
        setMode("verify");
        setFormValid(false);
        setMessage(`OTP sudah dikirim ke ${values.email}.`);
        return;
      }
      saveTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        session_id: data.session_id,
        expires_in: data.expires_in,
      });
      clearPlatformCache();
      if (data.user?.role === "official_brand") {
        router.push("/brand");
        return;
      }
      await onSuccess();
      notify("Login berhasil. Selamat datang di Slivadoc.");
      close();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setBusy(false);
    }
  }
  async function resendOTP() {
    if (!registrationEmail || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `${PLATFORM_API_URL}/api/v1/auth/otp/resend`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: registrationEmail,
            purpose: "registration",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "OTP belum dapat dikirim ulang");
      setMessage("OTP baru sudah dikirim. Periksa inbox dan folder spam.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "OTP belum dapat dikirim ulang",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="modal-overlay" onMouseDown={close}>
        <section
          className="modal petowner-login"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button className="modal-close" onClick={close} aria-label="Tutup">
            <Icon name="close" />
          </button>
          <div className="login-brand">
            <Logo />
            <span>Pet Owner</span>
          </div>
          <span className="world-kicker">AKUN PET FAMILY</span>
          <h2>
            {mode === "login"
              ? "Senang melihatmu kembali"
              : mode === "register"
                ? "Mulai perjalanan pet parent"
                : "Verifikasi email kamu"}
          </h2>
          <p>
            Profil pet, rekam medis, booking, komunitas, dan benefit tersinkron
            aman dalam satu akun.
          </p>
          <form
            className="world-form login-form"
            onSubmit={submit}
            onInput={(event) =>
              setFormValid(event.currentTarget.checkValidity())
            }
          >
            {mode === "verify" ? (
              <>
                <div className="access-warning">
                  Masukkan 6 digit OTP yang dikirim ke{" "}
                  <b>{registrationEmail}</b>.
                </div>
                <label>
                  <span>Kode OTP</span>
                  <input
                    name="otp"
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    placeholder="000000"
                    required
                    autoFocus
                  />
                </label>
              </>
            ) : (
              mode === "register" && (
                <>
                  <label>
                    <span>Nama lengkap</span>
                    <input
                      name="full_name"
                      minLength={3}
                      placeholder="Nama sesuai identitas"
                      required
                    />
                  </label>
                  <label>
                    <span>WhatsApp</span>
                    <input
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value.replace(/\D/g, "").slice(0, 16),
                        )
                      }
                      pattern="0[0-9]{8,15}"
                      minLength={9}
                      maxLength={16}
                      title="Nomor HP harus diawali 0 dan berisi 9–16 digit"
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                    <small>
                      Harus diawali angka 0, tanpa spasi atau simbol.
                    </small>
                  </label>
                </>
              )
            )}
            {mode !== "verify" && (
              <label>
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  defaultValue={
                    mode === "login" ? registrationEmail : undefined
                  }
                  autoComplete="email"
                  placeholder="petparent@email.com"
                  required
                />
              </label>
            )}
            {mode !== "verify" && (
              <label>
                <span>Password</span>
                <span className="password-input">
                  <input
                    name="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={visible ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder="Minimal 8 karakter"
                    minLength={8}
                    pattern="(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}"
                    title="Wajib berisi huruf, angka, dan simbol"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((value) => !value)}
                    aria-label={
                      visible ? "Sembunyikan password" : "Tampilkan password"
                    }
                  >
                    {visible ? "◉" : "◎"}
                  </button>
                </span>
                <small>Gunakan kombinasi huruf, angka, dan simbol.</small>
              </label>
            )}
            {mode === "register" && (
              <div className="legal-consents">
                <label>
                  <input
                    type="checkbox"
                    checked={terms}
                    onChange={(event) => setTerms(event.target.checked)}
                    required
                  />
                  <span>
                    Saya menyetujui{" "}
                    <button type="button" onClick={() => setPolicy("terms")}>
                      <b>Syarat dan Ketentuan</b>
                    </button>
                    .
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={privacy}
                    onChange={(event) => setPrivacy(event.target.checked)}
                    required
                  />
                  <span>
                    Saya menyetujui{" "}
                    <button type="button" onClick={() => setPolicy("privacy")}>
                      <b>Kebijakan Privasi</b>
                    </button>
                    .
                  </span>
                </label>
              </div>
            )}
            {message && <div className="form-message">{message}</div>}
            <button
              className="primary-button full"
              disabled={
                busy ||
                (mode === "verify"
                  ? otp.length !== 6
                  : !passwordValid || !formValid || !registrationConsent)
              }
            >
              {busy ? (
                <>
                  <span className="button-spinner" /> Memproses…
                </>
              ) : mode === "login" ? (
                "Masuk ke Slivadoc"
              ) : mode === "verify" ? (
                "Verifikasi & aktifkan akun"
              ) : (
                "Daftar & kirim OTP"
              )}
            </button>
          </form>
          {mode === "verify" && (
            <button
              type="button"
              className="text-button login-switch"
              disabled={busy}
              onClick={() => void resendOTP()}
            >
              Kirim ulang OTP
            </button>
          )}
          <button
            className="text-button login-switch"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setMessage("");
              setPassword("");
              setPhone("");
              setTerms(false);
              setPrivacy(false);
              setFormValid(false);
            }}
          >
            {mode === "login"
              ? "Belum punya akun? Daftar gratis"
              : mode === "verify"
                ? "Kembali ke login"
                : "Sudah punya akun? Login"}
          </button>
        </section>
      </div>
      {policy && (
        <div
          className="modal-overlay legal-overlay"
          onMouseDown={() => setPolicy(null)}
        >
          <section
            className="modal legal-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setPolicy(null)}
              aria-label="Tutup"
            >
              <Icon name="close" />
            </button>
            <span className="section-eyebrow">LEGAL · SLIVADOC PET OWNER</span>
            <h2>{legalCopy[policy].title}</h2>
            <p>Berlaku sejak 26 Agustus 2026</p>
            <div>
              {legalCopy[policy].sections.map((section, index) => (
                <article key={section}>
                  <b>
                    {index + 1}.{" "}
                    {index === 0
                      ? "Ruang lingkup"
                      : index === 1
                        ? "Penggunaan yang bertanggung jawab"
                        : "Data dan layanan"}
                  </b>
                  <p>{section}</p>
                </article>
              ))}
            </div>
            <button
              className="primary-button full"
              onClick={() => setPolicy(null)}
            >
              Saya mengerti
            </button>
          </section>
        </div>
      )}
    </>
  );
}

function Sidebar({
  activeView,
  setActiveView,
  account,
  authenticated,
  onLogin,
  selectedPet,
  needsActionCount,
}: {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  account: PetOwnerBootstrap["user"] | null;
  authenticated: boolean;
  onLogin: () => void;
  selectedPet?: Pet;
  needsActionCount: number;
}) {
  const { t } = usePetOwnerI18n();
  return (
    <aside className="sidebar">
      <Logo />
      {selectedPet && (
        <button
          type="button"
          className="sidebar-pet-badge"
          onClick={() => setActiveView("health")}
          aria-label={`Profil kesehatan ${selectedPet.name}`}
        >
          <span className="sidebar-pet-avatar">{selectedPet.avatar}</span>
          <div className="sidebar-pet-meta">
            <b>{selectedPet.name}</b>
            <small>{selectedPet.breed}</small>
          </div>
          <span className="sidebar-pet-score">
            <Icon name="heart" size={11} /> {selectedPet.healthScore}
          </span>
        </button>
      )}
      <nav className="side-nav" aria-label="Navigasi utama">
        {navGroups.map((group) => (
          <div className="side-nav-group" key={group.label}>
            <p className="nav-eyebrow">{group.label}</p>
            {group.items
              .map((id) => navItems.find((item) => item.id === id))
              .filter(
                (item): item is (typeof navItems)[number] => item !== undefined,
              )
              .filter((item) => authenticated || item.id !== "profile")
              .map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={activeView === item.id || (item.id === "world" && isWorldMode(activeView)) ? "active" : ""}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{t(item.label)}</span>
                  {item.id === "bookings" && needsActionCount > 0 && (
                    <em>{needsActionCount > 9 ? "9+" : needsActionCount}</em>
                  )}
                </button>
              ))}
          </div>
        ))}
      </nav>
      <div className="side-spacer" />
      <button
        className="side-help"
        type="button"
        onClick={() => setActiveView("support")}
      >
        <span>?</span> Pusat Bantuan
      </button>
      {authenticated && account ? (
        <button
          className="side-profile"
          type="button"
          onClick={() => setActiveView("profile")}
        >
          <div className="avatar avatar-blue">
            {account.full_name
              .split(" ")
              .map((value) => value[0])
              .slice(0, 2)
              .join("")}
          </div>
          <span>
            <b>{account.full_name}</b>
            <small>Pet Parent • Akun aktif</small>
          </span>
          <Icon name="chevron" />
        </button>
      ) : (
        <button className="side-login-button" type="button" onClick={onLogin}>
          <Icon name="user" /> Masuk ke akun
        </button>
      )}
      <Link href="/brand" className="side-login-button">
        Official Brand workspace →
      </Link>
    </aside>
  );
}

function Topbar({
  selectedPet,
  petProfiles,
  selectedPetId,
  setSelectedPetId,
  locationLabel,
  onOpenLocation,
  cartCount,
  onOpenMessages,
  chatUnread,
  onOpenNotifications,
  unread,
  onOpenCart,
  account,
  points,
  authenticated,
  navigate,
  onSearchResult,
  onLogin,
}: {
  selectedPet: Pet;
  petProfiles: Pet[];
  selectedPetId: string;
  setSelectedPetId: (id: string) => void;
  locationLabel: string;
  onOpenLocation: () => void;
  cartCount: number;
  onOpenMessages: () => void;
  chatUnread: number;
  onOpenNotifications: () => void;
  unread: number;
  onOpenCart: () => void;
  account: PetOwnerBootstrap["user"] | null;
  points: number;
  authenticated: boolean;
  navigate: (view: AppView) => void;
  onSearchResult: (result: GlobalSearchResult) => void;
  onLogin: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      const normalized = query.trim().toLowerCase();
      const featureResults =
        category === "" || category === "feature"
          ? featureSearchItems.filter((item) =>
              `${item.title} ${item.subtitle}`
                .toLowerCase()
                .includes(normalized),
            )
          : [];
      setBusy(true);
      void globalSearch(query.trim(), category === "feature" ? "" : category)
        .then((response) => {
          const combined = [...featureResults, ...response.data];
          setResults(
            combined.filter(
              (item, index) =>
                combined.findIndex(
                  (value) =>
                    value.category === item.category && value.id === item.id,
                ) === index,
            ),
          );
        })
        .catch(() => setResults(featureResults))
        .finally(() => setBusy(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, category]);
  function choose(result: GlobalSearchResult) {
    onSearchResult(result);
    setSearchOpen(false);
    setQuery("");
  }
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <Logo />
      </div>
      <button
        className="location-picker"
        type="button"
        onClick={onOpenLocation}
      >
        <span>
          <Icon name="map" size={18} />
        </span>
        <span>
          <small>Lokasi kamu</small>
          <b>{locationLabel}</b>
        </span>
        <Icon name="chevron" size={15} />
      </button>
      <label className={`global-search ${searchOpen ? "open" : ""}`}>
        <Icon name="search" size={18} />
        <input
          type="search"
          aria-label="Cari di seluruh Slivadoc"
          value={query}
          placeholder="Cari dokter, layanan, produk..."
          onFocus={() => setSearchOpen(true)}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setSearchOpen(true);
            if (event.currentTarget.value.trim().length < 2) setResults([]);
          }}
        />
        <kbd>⌘ K</kbd>
        {searchOpen && (
          <div className="owner-search-results">
            <header>
              <b>Cari di seluruh Slivadoc</b>
              <button type="button" onClick={() => setSearchOpen(false)}>
                Tutup
              </button>
            </header>
            <div className="owner-search-tabs">
              {[
                ["", "Semua"],
                ["feature", "Fitur"],
                ["service", "Layanan"],
                ["product", "Produk"],
                ["petspot", "PetSpot"],
                ["event", "Event"],
                ["academy", "Academy"],
                ["veterinarian", "Dokter"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  className={category === value ? "active" : ""}
                  key={value || "all"}
                  onClick={() => setCategory(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {busy ? (
              <p>Memuat hasil…</p>
            ) : query.trim().length < 2 ? (
              <p>Ketik minimal 2 karakter untuk mulai mencari.</p>
            ) : results.length ? (
              results.map((item) => (
                <button
                  type="button"
                  key={`${item.category}-${item.id}`}
                  onClick={() => choose(item)}
                >
                  <span>{item.category.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <b>{item.title}</b>
                    <small>
                      {item.category} · {item.subtitle}
                    </small>
                  </div>
                  <Icon name="chevron" />
                </button>
              ))
            ) : (
              <p>Tidak ada hasil yang cocok.</p>
            )}
          </div>
        )}
      </label>
      <div className="top-actions">
        <button
          className="point-pill"
          type="button"
          onClick={() => (authenticated ? navigate("bookings") : onLogin())}
        >
          <span>✦</span>
          <b>{points.toLocaleString("id-ID")}</b>
          <small>pts</small>
        </button>
        {authenticated && petProfiles.length > 0 && (
          <label className="pet-switcher compact-select">
            <span className="pet-mini">{selectedPet.avatar}</span>
            <SlivaSelect
              aria-label="Pilih hewan"
              value={selectedPetId}
              onChange={(event) => setSelectedPetId(event.target.value)}
            >
              {petProfiles.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name}
                </option>
              ))}
            </SlivaSelect>
          </label>
        )}
        <button
          className="icon-button chat-header-button"
          type="button"
          onClick={authenticated ? onOpenMessages : onLogin}
          aria-label="Buka daftar chat"
        >
          <Icon name="chat" />
          {authenticated && chatUnread > 0 && (
            <span className="counter">
              {chatUnread > 99 ? "99+" : chatUnread}
            </span>
          )}
        </button>
        <button
          className="icon-button cart-header-button"
          type="button"
          onClick={onOpenCart}
          aria-label="Keranjang"
        >
          <Icon name="cart" />
          {cartCount > 0 && <span className="counter">{cartCount}</span>}
        </button>
        <button
          className="icon-button notification-header-button"
          type="button"
          onClick={authenticated ? onOpenNotifications : onLogin}
          aria-label="Notifikasi"
        >
          <Icon name="bell" />
          {authenticated && unread > 0 && <span className="notif-dot" />}
        </button>
        {!authenticated && (
          <button className="top-login" type="button" onClick={onLogin}>
            Masuk
          </button>
        )}
        {authenticated && account && (
          <button
            className="top-account"
            type="button"
            onClick={() => navigate("profile")}
          >
            {account.full_name
              .split(" ")
              .map((value) => value[0])
              .slice(0, 2)
              .join("")}
          </button>
        )}
      </div>
    </header>
  );
}

function PageHeading({
  activeView,
  selectedPet,
  account,
}: {
  activeView: AppView;
  selectedPet: Pet;
  account: PetOwnerBootstrap["user"] | null;
}) {
  const { locale, t } = usePetOwnerI18n();
  const item = titles[activeView];
  const date = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  return (
    <div
      className={`page-heading ${activeView === "home" ? "page-heading--home" : ""}`}
    >
      <div>
        <div className="heading-kicker">
          <span className="live-dot" />
          {date}
        </div>
        <h1>
          {activeView === "home" && account
            ? `Selamat datang, ${account.full_name.split(" ")[0]}!`
            : t(item.title)}
        </h1>
        <p>
          {activeView === "health"
            ? `Riwayat lengkap dan jadwal perawatan ${selectedPet.name}.`
            : t(item.subtitle)}
        </p>
      </div>
      {activeView !== "home" && (
        <button
          className="secondary-button heading-action"
          type="button"
          onClick={() => downloadViewSummary(activeView)}
        >
          <Icon name="download" size={17} /> {t("Unduh ringkasan")}
        </button>
      )}
    </div>
  );
}

function ChatInboxView({
  activities,
  onOpenStore,
  onOpenDoctor,
  notify,
}: {
  activities: PetOwnerActivityCenterItem[];
  onOpenStore: (thread: MarketplaceChatThread) => void;
  onOpenDoctor: (item: PetOwnerActivityCenterItem) => void;
  notify: Notify;
}) {
  const [category, setCategory] = useState<"store" | "veterinarian">("store");
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState<MarketplaceChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMarketplaceChats();
      setThreads(result.data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Daftar chat belum dapat dimuat.";
      setError(message);
      notify(message);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadThreads(), 0);
    return () => window.clearTimeout(timer);
  }, [loadThreads]);

  const normalizedQuery = query.trim().toLowerCase();
  const storeThreads = threads.filter((thread) =>
    thread.business_name.toLowerCase().includes(normalizedQuery),
  );
  const doctorThreads = activities
    .filter(
      (item) =>
        item.type === "consultation" &&
        item.provider_type !== "trainer" &&
        (item.provider_name || item.doctor_name || item.title)
          .toLowerCase()
          .includes(normalizedQuery),
    )
    .filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) =>
            (candidate.provider_id || candidate.veterinarian_id || candidate.id) ===
            (item.provider_id || item.veterinarian_id || item.id),
        ) === index,
    );

  return (
    <section className="chat-inbox" aria-busy={loading}>
      <div className="chat-inbox-toolbar">
        <div className="chat-inbox-tabs" role="tablist" aria-label="Kategori chat">
          <button type="button" role="tab" aria-selected={category === "store"} className={category === "store" ? "active" : ""} onClick={() => { setCategory("store"); setQuery(""); }}>
            <Icon name="bag" size={17} /> Toko
            {threads.reduce((total, thread) => total + thread.unread_count, 0) > 0 ? <span>{threads.reduce((total, thread) => total + thread.unread_count, 0)}</span> : null}
          </button>
          <button type="button" role="tab" aria-selected={category === "veterinarian"} className={category === "veterinarian" ? "active" : ""} onClick={() => { setCategory("veterinarian"); setQuery(""); }}>
            <Icon name="heart" size={17} /> Dokter Hewan
          </button>
        </div>
        <label className="chat-inbox-search">
          <Icon name="search" size={18} />
          <input type="search" aria-label={category === "store" ? "Cari nama toko" : "Cari nama dokter"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={category === "store" ? "Cari nama toko…" : "Cari nama dokter…"} />
        </label>
      </div>

      {loading && category === "store" ? (
        <div className="chat-inbox-loading" role="status"><span className="loading-spinner" /><div><b>Memuat percakapan…</b><small>Menyinkronkan pesan dan status toko terbaru.</small></div></div>
      ) : error && category === "store" ? (
        <div className="chat-inbox-empty"><Icon name="chat" size={27} /><b>Chat belum dapat dimuat</b><p>{error}</p><button type="button" onClick={() => void loadThreads()}>Coba lagi</button></div>
      ) : category === "store" && storeThreads.length ? (
        <div className="chat-inbox-list">
          {storeThreads.map((thread) => (
            <button type="button" key={thread.id} className="chat-inbox-row" onClick={() => onOpenStore(thread)}>
              <span className="chat-inbox-avatar">{thread.business_name.slice(0, 1).toUpperCase()}<i data-online={thread.store_is_online} /></span>
              <span className="chat-inbox-copy"><span><b>{thread.business_name}</b><time>{thread.last_message_created_at ? new Date(thread.last_message_created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Baru"}</time></span><small>{thread.last_message || `Mulai chat tentang ${thread.product_name || "produk toko"}`}</small></span>
              {thread.unread_count > 0 ? <em>{thread.unread_count}</em> : <Icon name="chevron" size={17} />}
            </button>
          ))}
        </div>
      ) : category === "veterinarian" && doctorThreads.length ? (
        <div className="chat-inbox-list">
          {doctorThreads.map((item) => (
            <button type="button" key={item.id} className="chat-inbox-row" onClick={() => onOpenDoctor(item)}>
              <span className="chat-inbox-avatar is-doctor"><Icon name="heart" size={20} /></span>
              <span className="chat-inbox-copy"><span><b>{item.provider_name || item.doctor_name || item.title}</b><time>{item.status}</time></span><small>{item.plan_name || item.subtitle} · {item.pet_name || "Pet-mu"}</small></span>
              <Icon name="chevron" size={17} />
            </button>
          ))}
        </div>
      ) : (
        <div className="chat-inbox-empty"><Icon name="chat" size={27} /><b>{query ? "Percakapan tidak ditemukan" : "Belum ada percakapan"}</b><p>{category === "store" ? "Chat dengan toko akan tersimpan di sini." : "Chat dokter muncul setelah kamu membuat konsultasi."}</p></div>
      )}
    </section>
  );
}

function HomeView({
  selectedPet,
  petProfiles,
  selectedPetId,
  onSelectPet,
  setActiveView,
  openServiceCatalog,
  openPartnerProfile,
  openConsultation,
  setChatOpen,
  services,
  activities,
  openActivity,
  ownerName,
}: {
  selectedPet: Pet;
  petProfiles: Pet[];
  selectedPetId: string;
  onSelectPet: (petId: string) => void;
  setActiveView: (view: AppView) => void;
  openServiceCatalog: (serviceType?: Service["type"], serviceId?: string) => void;
  openPartnerProfile: (businessId: string) => void;
  openConsultation: (veterinarianId?: string) => void;
  setChatOpen: (value: boolean) => void;
  services: Service[];
  activities: PetOwnerActivityCenterItem[];
  openActivity: (type: ActivityType, id: string) => void;
  ownerName?: string;
}) {
  const { t } = usePetOwnerI18n();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [petSwitcherOpen, setPetSwitcherOpen] = useState(false);
  useEffect(() => {
    void Promise.all([getPublicCampaigns(), getVeterinarians()])
      .then(([campaigns, doctors]) => {
        setCampaign(campaigns.data[0] ?? null);
        setVeterinarians(doctors.data);
      })
      .catch(() => {
        setCampaign(null);
        setVeterinarians([]);
      });
  }, []);

  const firstName = ownerName?.trim().split(/\s+/)[0];
  const featuredActivities = activities
    .filter((item) => item.state !== "history")
    .sort(
      (a, b) =>
        new Date(a.scheduled_at ?? a.occurred_at).getTime() -
        new Date(b.scheduled_at ?? b.occurred_at).getTime(),
    )
    .slice(0, 3);
  const nearestPartners = Array.from(
    services
      .filter((item) => item.type === "Clinic" || item.type === "Pet Shop")
      .reduce(
        (partners, service) => {
          const id = service.businessId || service.branchId || service.id;
          const current = partners.get(id);
          if (current) {
            current.serviceCount += 1;
            current.types.add(service.type);
            if (
              (Number.parseFloat(service.distance) || Number.MAX_SAFE_INTEGER) <
              (Number.parseFloat(current.service.distance) || Number.MAX_SAFE_INTEGER)
            )
              current.service = service;
          } else {
            partners.set(id, {
              id,
              name: service.businessName || service.branchName || service.name,
              service,
              serviceCount: 1,
              types: new Set<Service["type"]>([service.type]),
            });
          }
          return partners;
        },
        new Map<
          string,
          {
            id: string;
            name: string;
            service: Service;
            serviceCount: number;
            types: Set<Service["type"]>;
          }
        >(),
      )
      .values(),
  )
    .sort(
      (a, b) =>
        (Number.parseFloat(a.service.distance) || Number.MAX_SAFE_INTEGER) -
        (Number.parseFloat(b.service.distance) || Number.MAX_SAFE_INTEGER),
    )
    .slice(0, 6);
  const recommendedDoctors = [...veterinarians]
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.consultation_count - a.consultation_count ||
        b.experience_years - a.experience_years,
    )
    .slice(0, 5);
  const healthStatus =
    selectedPet.healthScore >= 80
      ? "Kondisi prima"
      : selectedPet.healthScore >= 60
        ? "Tetap terpantau"
        : "Lengkapi datanya";
  const featuredActions: Array<{
    label: string;
    note: string;
    icon: IconName;
    tone: "booking" | "consult";
    action: () => void;
  }> = [
    {
      label: "Booking",
      note: "Atur jadwal klinik",
      icon: "calendar",
      tone: "booking",
      action: () => openServiceCatalog(),
    },
    {
      label: "Tanya Dokter",
      note: "Pilih dokter & paket",
      icon: "chat",
      tone: "consult",
      action: () => openConsultation(),
    },
  ];
  const miniActions: Array<{
    label: string;
    note: string;
    icon: IconName;
    tone: "peach" | "red" | "violet" | "sky";
    action: () => void;
  }> = [
    {
      label: "Home Care",
      note: "Ke rumah",
      icon: "home",
      tone: "peach",
      action: () => openServiceCatalog("Home Care"),
    },
    {
      label: "Darurat",
      note: "Cari klinik",
      icon: "heart",
      tone: "red",
      action: () => openServiceCatalog("Clinic"),
    },
    {
      label: "Pet Hotel",
      note: "Terpercaya",
      icon: "paw",
      tone: "violet",
      action: () => openServiceCatalog("Pet Hotel"),
    },
    {
      label: "Sliva World",
      note: "Eksplorasi",
      icon: "sparkle",
      tone: "sky",
      action: () => setActiveView("world"),
    },
  ];

  return (
    <div className="home-layout home-workspace">
      <div className="home-main-col">
        <section className="home-greeting" aria-label="Sapaan">
          <div>
            <h2>{firstName ? `Hai, ${firstName}! 🐾` : "Hai, Pet Parent! 🐾"}</h2>
            <p>
              {firstName
                ? `Yuk, bikin hari ${selectedPet.name} makin sehat dan happy.`
                : "Satu tempat buat semua momen sehat dan happy bareng pet."}
            </p>
          </div>
          <span className="home-greeting-sparkle" aria-hidden="true">
            <Icon name="sparkle" size={18} />
          </span>
        </section>

        <section className="home-quick-panel" aria-labelledby="quick-title">
          <header className="home-section-heading">
            <div>
              <h2 id="quick-title">{t("Layanan cepat")}</h2>
              <p>{t("Semua yang pet-mu butuhkan, sekali tap")}</p>
            </div>
            <span className="home-quick-count">
              <Icon name="sparkle" size={12} /> 6 pilihan
            </span>
          </header>
          <div className="home-quick-feature-row">
            {featuredActions.map((item) => (
              <button
                className={`home-quick-feature home-quick-feature--${item.tone}`}
                type="button"
                key={item.label}
                onClick={item.action}
              >
                <span className="home-quick-feature-icon">
                  <Icon name={item.icon} size={20} />
                </span>
                <span className="home-quick-feature-arrow">
                  <Icon name="arrow" size={13} />
                </span>
                <b>{item.label}</b>
                <small>{item.note}</small>
              </button>
            ))}
          </div>
          <div className="home-quick-mini-grid">
            {miniActions.map((item) => (
              <button
                className="home-quick-mini"
                type="button"
                key={item.label}
                onClick={item.action}
              >
                <span
                  className={`home-quick-mini-icon home-quick-mini-icon--${item.tone}`}
                >
                  <Icon name={item.icon} size={20} />
                </span>
                <b>{item.label}</b>
                <small>{item.note}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="home-services-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow">REKOMENDASI</span>
              <h2>Pet clinic & petshop terdekat</h2>
              <p>Diurutkan dari titik lokasi yang kamu pilih</p>
            </div>
            <button type="button" onClick={() => openServiceCatalog()}>
              Jelajahi <Icon name="arrow" size={14} />
            </button>
          </header>
          <div className="home-service-row">
            {nearestPartners.map((partner) => {
              const service = partner.service;
              const typeLabel = partner.types.size > 1
                ? "Pet Clinic & Shop"
                : [...partner.types][0];
              return (
              <article
                className="home-service-card"
                key={partner.id}
                onClick={() => openPartnerProfile(partner.id)}
              >
                <div className={`home-service-visual ${service.accent}`}>
                  <span>{typeLabel}</span>
                  <button type="button" aria-label={`Simpan ${partner.name}`} onClick={(event) => event.stopPropagation()}>
                    <Icon name="heart" size={14} />
                  </button>
                  {service.imageUrl ? (
                    <Image
                      className="catalog-cover-image"
                      src={service.imageUrl}
                      alt={`Gambar ${partner.name}`}
                      fill
                      sizes="220px"
                      unoptimized
                    />
                  ) : (
                    <i>{service.emoji}</i>
                  )}
                </div>
                <div>
                  <b>{partner.name}</b>
                  <small>
                    <Icon name="map" size={11} /> {service.branchName || service.address}
                  </small>
                  <p>
                    <span>
                      <Icon name="bag" size={10} /> {partner.serviceCount} layanan
                    </span>
                    · {service.distance}
                  </p>
                  <footer>
                    <strong>{service.city || service.price}</strong>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openPartnerProfile(partner.id);
                      }}
                    >
                      Lihat profil <Icon name="arrow" size={12} />
                    </button>
                  </footer>
                </div>
              </article>
              );
            })}
            {nearestPartners.length === 0 && (
              <div className="empty-state compact">
                Belum ada pet clinic atau petshop di titik lokasi ini.
              </div>
            )}
          </div>
        </section>

        <section className="home-doctors-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow">DOKTER TERBAIK</span>
              <h2>Teman konsultasi untuk {selectedPet.name}</h2>
              <p>Dokter terverifikasi dengan rating dan konsultasi terbaik</p>
            </div>
            <button type="button" onClick={() => openConsultation()}>
              Lihat dokter <Icon name="arrow" size={14} />
            </button>
          </header>
          <div className="home-doctor-row">
            {recommendedDoctors.map((doctor) => (
              <article className="home-doctor-card" key={doctor.id}>
                <span className="home-doctor-avatar">
                  {doctor.photo_url ? (
                    <Image src={doctor.photo_url} alt={doctor.full_name} fill sizes="58px" unoptimized />
                  ) : (
                    <Icon name="user" size={24} />
                  )}
                  <i />
                </span>
                <div>
                  <small>{doctor.availability_status === "online" ? "ONLINE" : "DOKTER TERVERIFIKASI"}</small>
                  <b>{doctor.full_name}</b>
                  <p>{doctor.specialties.join(" · ") || "Dokter hewan umum"}</p>
                  <span><Icon name="star" size={11} /> {doctor.rating.toFixed(1)} · {doctor.consultation_count.toLocaleString("id-ID")} konsultasi</span>
                </div>
                <button type="button" onClick={() => openConsultation(doctor.id)}>
                  Konsultasi
                </button>
              </article>
            ))}
            {recommendedDoctors.length === 0 ? (
              <div className="empty-state compact">Dokter terbaik sedang disinkronkan.</div>
            ) : null}
          </div>
        </section>

        {campaign && (
          <section
            className="public-campaign-banner home-campaign"
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(5,104,159,.94),rgba(8,114,95,.78)),url(${campaign.banner_url})`,
            }}
          >
            <div>
              <span>REKOMENDASI SLIVADOC</span>
              <h2>{campaign.name}</h2>
              <p>{campaign.objective}</p>
              <button
                type="button"
                onClick={() =>
                  setActiveView(
                    (
                      {
                        events: "events",
                        pethub: "pethub",
                        petspot: "petspot",
                        community: "community",
                        home: "discover",
                      } as Partial<Record<string, AppView>>
                    )[campaign.placement] ?? "discover",
                  )
                }
              >
                Lihat selengkapnya <Icon name="chevron" size={15} />
              </button>
            </div>
          </section>
        )}
      </div>

      <aside
        className="home-pet-rail home-health-and-care"
        aria-label="Ringkasan kesehatan dan jadwal"
      >
        <section className="home-health-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow">HEALTH SNAPSHOT</span>
              <h2>Kondisi {selectedPet.name}</h2>
              <p>Pantau kesehatan tanpa ribet</p>
            </div>
            <button type="button" onClick={() => setActiveView("health")}>
              Detail <Icon name="arrow" size={14} />
            </button>
          </header>
          <div className="home-health-card">
            <span
              className="home-health-glow home-health-glow--large"
              aria-hidden="true"
            />
            <span
              className="home-health-glow home-health-glow--small"
              aria-hidden="true"
            />
            <div className="home-health-top">
              <span className="home-health-avatar">
                {selectedPet.avatar}
                <i>
                  <Icon name="check" size={10} />
                </i>
              </span>
              <div className="home-health-pet">
                <small>
                  <i /> PET AKTIF
                </small>
                <b>{selectedPet.name}</b>
                <span>
                  {selectedPet.breed} • {selectedPet.age}
                </span>
              </div>
              <button
                type="button"
                className="home-pet-switch"
                aria-expanded={petSwitcherOpen}
                onClick={() =>
                  petProfiles.length > 1
                    ? setPetSwitcherOpen((current) => !current)
                    : setActiveView("pets")
                }
              >
                Ganti <Icon name="arrow" size={12} />
              </button>
            </div>
            {petSwitcherOpen ? (
              <div className="home-pet-switcher" role="dialog" aria-label="Pilih pet aktif">
                <header><b>Ganti pet aktif</b><small>Ringkasan homepage akan langsung menyesuaikan.</small></header>
                {petProfiles.map((pet) => (
                  <button
                    type="button"
                    key={pet.id}
                    className={pet.id === selectedPetId ? "active" : ""}
                    onClick={() => {
                      onSelectPet(pet.id);
                      setPetSwitcherOpen(false);
                    }}
                  >
                    <span>{pet.avatar}</span>
                    <div><b>{pet.name}</b><small>{pet.breed} · {pet.age}</small></div>
                    <i>{pet.id === selectedPetId ? "✓" : ""}</i>
                  </button>
                ))}
                <button type="button" className="manage" onClick={() => setActiveView("pets")}>Kelola semua profil pet</button>
              </div>
            ) : null}
            <div className="home-health-overview">
              <div className="home-health-score">
                <div>
                  <b>{selectedPet.healthScore}</b>
                  <small>/ 100</small>
                </div>
                <strong>{healthStatus}</strong>
                <span>{selectedPet.nextCare || "Belum ada rekam medis"}</span>
              </div>
              <div className="home-health-metrics">
                <div>
                  <span className="home-health-metric-icon home-health-metric-icon--mint">
                    ⚖
                  </span>
                  <small>Berat badan</small>
                  <b>{selectedPet.weight}</b>
                </div>
                <div>
                  <span className="home-health-metric-icon home-health-metric-icon--violet">
                    <Icon name="heart" size={14} />
                  </span>
                  <small>Aktivitas</small>
                  <b>{activities.length} catatan</b>
                </div>
              </div>
            </div>
            <button
              className="home-health-insight"
              type="button"
              onClick={() => setActiveView("bookings")}
            >
              <span>
                <Icon name="sparkle" size={16} />
              </span>
              <div>
                <b>Insight untuk {selectedPet.name}</b>
                <small>
                  {featuredActivities[0]?.subtitle ||
                    "Belum ada aktivitas kesehatan terjadwal."}
                </small>
              </div>
              <i>
                <Icon name="arrow" size={14} />
              </i>
            </button>
          </div>
        </section>

        <section className="home-care-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow">CARE PLAN</span>
              <h2>Perawatan terdekat</h2>
              <p>Biar jadwal nggak kelewat</p>
            </div>
            <button type="button" onClick={() => setActiveView("bookings")}>
              Semua <Icon name="arrow" size={14} />
            </button>
          </header>
          <div className="home-care-card">
            {featuredActivities.length ? (
              featuredActivities.map((care, index) => {
                const meta = getActivityTypeMeta(care.type);
                return <button
                  className="home-care-row"
                  type="button"
                  key={`${care.type}-${care.id}`}
                  onClick={() => openActivity(care.type, care.id)}
                >
                  <span className="home-care-timeline">
                    <i
                      className={
                        meta.tone === "sky"
                          ? "home-care-icon"
                          : `home-care-icon home-care-icon--${meta.tone}`
                      }
                    >
                      <Icon name={meta.icon} size={18} />
                    </i>
                    {index < featuredActivities.length - 1 && <em />}
                  </span>
                  <span className="home-care-copy">
                    <small>
                      <Icon name="clock" size={11} />
                      {new Date(
                        care.scheduled_at || care.occurred_at,
                      ).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                    </small>
                    <b>{care.title}</b>
                    <span>{care.subtitle}</span>
                  </span>
                  <Icon name="chevron" size={15} />
                </button>;
              })
            ) : (
              <div className="empty-state compact home-care-empty">
                <span>
                  <Icon name="calendar" size={25} />
                </span>
                <div>
                  <b>Jadwal masih santai</b>
                  <p>Booking perawatan pertama dan kami bantu ingatkan.</p>
                </div>
              </div>
            )}
            <button
              className="home-care-cta"
              type="button"
              onClick={() =>
                featuredActivities.length
                  ? setActiveView("bookings")
                  : openServiceCatalog()
              }
            >
              <span>
                <Icon name="calendar" size={16} />
              </span>
              <div>
                <b>
                  {featuredActivities.length
                    ? "Lihat semua aktivitas"
                    : "Buat care plan pertama"}
                </b>
                <small>Semua jadwal pet dalam satu tempat</small>
              </div>
              <i>
                <Icon name="arrow" size={14} />
              </i>
            </button>
          </div>
        </section>

        <div className="home-rail-dock">
          <button
            type="button"
            className="home-rail-dock-action"
            onClick={() => setChatOpen(true)}
          >
            <span>
              <Icon name="chat" size={18} />
            </span>
            <div>
              <b>Tanya Dokter Hewan 24/7</b>
              <small>Konsultasi online cepat dan ramah</small>
            </div>
            <Icon name="arrow" size={14} />
          </button>
        </div>
      </aside>
    </div>
  );
}

function PetsView({
  petProfiles,
  selectedPetId,
  setSelectedPetId,
  setAddPetOpen,
  setActiveView,
  notify,
  onChanged,
}: {
  petProfiles: Pet[];
  selectedPetId: string;
  setSelectedPetId: (id: string) => void;
  setAddPetOpen: (value: boolean) => void;
  setActiveView: (view: AppView) => void;
  notify: Notify;
  onChanged: () => Promise<void>;
}) {
  const [modal, setModal] = useState<
    "id" | "edit" | "notes" | "family" | "lost" | null
  >(null);
  const pet =
    petProfiles.find((item) => item.id === selectedPetId) ?? petProfiles[0];
  // Shared pets keep only what the family role grants; the owner can do all.
  const can = (permission: string) =>
    !pet?.accessRole ||
    pet.accessRole === "owner" ||
    (pet.permissions ?? []).includes(permission);
  if (!pet)
    return (
      <div className="empty-state">
        <span>🐾</span>
        <h3>Belum ada pet di akunmu</h3>
        <p>
          Tambahkan profil pertama untuk mulai menyimpan identitas dan
          kesehatan.
        </p>
        <button className="primary-button" onClick={() => setAddPetOpen(true)}>
          Tambah pet
        </button>
      </div>
    );
  return (
    <div className="two-column-page">
      <section>
        <div className="pet-card-grid">
          {petProfiles.map((item) => (
            <button
              className={`pet-profile-card ${selectedPetId === item.id ? "selected" : ""}`}
              type="button"
              key={item.id}
              onClick={() => setSelectedPetId(item.id)}
            >
              <span
                className="pet-profile-avatar"
                style={{ background: `${item.color}24` }}
              >
                {item.photoUrl ? (
                  <Image
                    src={item.photoUrl}
                    alt={item.name}
                    width={96}
                    height={96}
                    unoptimized
                  />
                ) : (
                  item.avatar
                )}
                <i>
                  <Icon name="check" size={11} />
                </i>
              </span>
              <span className="pet-profile-copy">
                <b>{item.name}</b>
                <small>{item.breed}</small>
                <em>
                  {item.gender} • {item.age}
                  {item.accessRole && item.accessRole !== "owner" && (
                    <span className="shared-pet-badge"> · Dibagikan</span>
                  )}
                </em>
              </span>
              <span className="pet-score-small">
                <b>{item.healthScore}</b>
                <small>Health</small>
              </span>
            </button>
          ))}
          <button
            className="add-pet-card"
            type="button"
            onClick={() => setAddPetOpen(true)}
          >
            <span>
              <Icon name="plus" size={25} />
            </span>
            <b>Tambah hewan</b>
            <small>Buat profil untuk anggota keluarga baru</small>
          </button>
        </div>

        <section className="panel pet-detail-panel">
          <div className="panel-heading">
            <div>
              <span className="section-eyebrow">PET IDENTITY</span>
              <h3>Profil {pet.name}</h3>
            </div>
            {can("profile") && (
              <button
                className="secondary-button small"
                type="button"
                onClick={() => setModal("edit")}
              >
                <Icon name="edit" size={15} /> Edit profil
              </button>
            )}
          </div>
          <div className="pet-identity-banner">
            <div className="pet-id-avatar">{pet.avatar}</div>
            <div>
              <span className="verified-badge">
                <Icon name="shield" size={13} /> Identitas terverifikasi
              </span>
              <h2>{pet.name}</h2>
              <p>
                {pet.breed} • {pet.gender}
              </p>
              <small>Microchip: {pet.microchip}</small>
            </div>
            <button type="button" onClick={() => setModal("id")}>
              <span>▦</span>
              <small>Tampilkan Pet ID</small>
            </button>
          </div>
          <div className="info-grid">
            <Info label="Tanggal lahir" value="21 Juni 2023" />
            <Info label="Usia" value={pet.age} />
            <Info label="Berat terakhir" value={pet.weight} />
            <Info
              label="Warna"
              value={pet.type === "Dog" ? "Golden" : "Blue gray"}
            />
            <Info label="Sterilisasi" value="Sudah" />
            <Info
              label="Golongan darah"
              value={pet.type === "Dog" ? "DEA 1.1+" : "A"}
            />
          </div>
          <div className="pet-notes">
            <span>📝</span>
            <div>
              <b>Catatan khusus</b>
              <p>
                {pet.notes || "Belum ada catatan khusus."}
                {pet.allergies ? ` · Alergi: ${pet.allergies}` : ""}
              </p>
            </div>
            {can("profile") && (
              <button type="button" onClick={() => setModal("notes")}>
                <Icon name="edit" size={16} />
              </button>
            )}
          </div>
        </section>
      </section>
      <aside className="right-stack">
        <section className="panel compact-panel">
          <div className="panel-heading">
            <h3>Ringkasan perawatan</h3>
            <span className="score-chip">{pet.healthScore}/100</span>
          </div>
          <Progress label="Profil kesehatan" value={100} />
          <Progress label="Vaksin wajib" value={80} />
          <Progress label="Preventive care" value={75} />
          <button
            className="full-soft-button"
            type="button"
            onClick={() => setActiveView("health")}
          >
            Buka pusat kesehatan <Icon name="arrow" size={15} />
          </button>
        </section>
        <section className="panel compact-panel">
          <div className="panel-heading">
            <h3>Akses keluarga</h3>
            {can("family") && (
              <button
                className="round-button"
                type="button"
                onClick={() => setModal("family")}
              >
                <Icon name="plus" size={16} />
              </button>
            )}
          </div>
          <p className="muted-copy">
            Undang co-parent, caregiver, dokter, atau viewer dengan izin
            terperinci.
          </p>
          {can("family") && (
            <button
              className="full-soft-button"
              type="button"
              onClick={() => setModal("family")}
            >
              Kelola akses keluarga
            </button>
          )}
        </section>
        {can("lost_mode") && (
          <section className="lost-mode-card">
            <span>📍</span>
            <div>
              <b>Lost Pet Mode</b>
              <p>
                Aktifkan peringatan dan bagikan profil {pet.name} ke komunitas
                sekitar.
              </p>
              <button type="button" onClick={() => setModal("lost")}>
                Kelola Lost Pet Mode
              </button>
            </div>
          </section>
        )}
      </aside>
      {modal === "id" && <PetIDModal pet={pet} close={() => setModal(null)} />}{" "}
      {modal === "edit" && (
        <PetEditModal
          pet={pet}
          close={() => setModal(null)}
          changed={onChanged}
          notify={notify}
        />
      )}{" "}
      {modal === "notes" && (
        <PetNotesModal
          pet={pet}
          close={() => setModal(null)}
          changed={onChanged}
          notify={notify}
        />
      )}{" "}
      {modal === "family" && (
        <FamilyModal pet={pet} close={() => setModal(null)} notify={notify} />
      )}{" "}
      {modal === "lost" && (
        <LostModeModal pet={pet} close={() => setModal(null)} notify={notify} />
      )}
    </div>
  );
}

function PetIDModal({ pet, close }: { pet: Pet; close: () => void }) {
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal pet-id-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <div className="pet-id-card">
          <span className="pet-id-logo">
            <Logo />
          </span>
          <div className="pet-id-photo">
            {pet.photoUrl ? (
              <Image
                src={pet.photoUrl}
                alt={pet.name}
                width={240}
                height={240}
                unoptimized
              />
            ) : (
              pet.avatar
            )}
          </div>
          <span className="verified-badge">
            <Icon name="shield" size={13} /> Slivadoc Pet ID
          </span>
          <h2>{pet.name}</h2>
          <p>
            {pet.breed} · {pet.gender}
          </p>
          <div className="pet-id-qr" aria-label={`Kode Pet ID ${pet.id}`}>
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <code>{pet.id}</code>
          <dl>
            <div>
              <dt>Microchip</dt>
              <dd>{pet.microchip}</dd>
            </div>
            <div>
              <dt>Health score</dt>
              <dd>{pet.healthScore}/100</dd>
            </div>
          </dl>
          <small>
            Pindai untuk membuka identitas darurat terverifikasi Slivadoc.
          </small>
        </div>
      </section>
    </div>
  );
}

function PetEditModal({
  pet,
  close,
  changed,
  notify,
}: {
  pet: Pet;
  close: () => void;
  changed: () => Promise<void>;
  notify: Notify;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await updatePetOwnerPet(pet.id, {
        name: values.name,
        breed: values.breed,
        sex: values.sex,
        birth_date: values.birth_date,
        color: values.color,
        weight_kg: Number(values.weight_kg),
        microchip_number: values.microchip_number,
        allergies: pet.allergies || "",
        medical_notes: pet.notes || "",
        vaccination_status: "complete",
        photo_url: pet.photoUrl || "",
      });
      await changed();
      notify("Profil pet berhasil diperbarui");
      close();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Profil belum dapat diperbarui",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">PET IDENTITY</span>
        <h2>Edit profil {pet.name}</h2>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span>Nama</span>
            <input name="name" defaultValue={pet.name} minLength={2} required />
          </label>
          <label>
            <span>Ras</span>
            <input name="breed" defaultValue={pet.breed} />
          </label>
          <div className="form-row">
            <label>
              <span>Jenis kelamin</span>
              <SlivaSelect aria-label="Jenis kelamin"
                name="sex"
                defaultValue={pet.gender === "Betina" ? "female" : "male"}
              >
                <option value="male">Jantan</option>
                <option value="female">Betina</option>
              </SlivaSelect>
            </label>
            <label>
              <span>Tanggal lahir</span>
              <input
                name="birth_date"
                type="date"
                defaultValue={pet.birthDate?.slice(0, 10)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <span>Berat (kg)</span>
              <input
                name="weight_kg"
                type="number"
                step="0.1"
                defaultValue={parseFloat(pet.weight)}
              />
            </label>
            <label>
              <span>Warna</span>
              <input name="color" defaultValue={pet.color} />
            </label>
          </div>
          <label>
            <span>Nomor microchip</span>
            <input
              name="microchip_number"
              defaultValue={
                pet.microchip === "Belum terdaftar" ? "" : pet.microchip
              }
            />
          </label>
          <button className="primary-button full" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </form>
      </section>
    </div>
  );
}

function PetNotesModal({
  pet,
  close,
  changed,
  notify,
}: {
  pet: Pet;
  close: () => void;
  changed: () => Promise<void>;
  notify: Notify;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await updatePetOwnerPet(pet.id, {
        name: pet.name,
        breed: pet.breed,
        sex: pet.gender === "Betina" ? "female" : "male",
        birth_date: pet.birthDate?.slice(0, 10) || "",
        color: pet.color,
        weight_kg: parseFloat(pet.weight),
        microchip_number:
          pet.microchip === "Belum terdaftar" ? "" : pet.microchip,
        allergies: values.allergies,
        medical_notes: values.medical_notes,
        vaccination_status: "complete",
        photo_url: pet.photoUrl || "",
      });
      await changed();
      notify("Catatan khusus tersimpan");
      close();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Catatan belum dapat disimpan",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">CATATAN KHUSUS</span>
        <h2>Kebutuhan penting {pet.name}</h2>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span>Alergi</span>
            <textarea
              name="allergies"
              defaultValue={pet.allergies}
              placeholder="Contoh: protein ayam"
            />
          </label>
          <label>
            <span>Perilaku, preferensi, dan catatan medis</span>
            <textarea
              name="medical_notes"
              defaultValue={pet.notes}
              placeholder="Tuliskan hal yang perlu diketahui dokter, groomer, atau caregiver"
              rows={5}
            />
          </label>
          <button className="primary-button full" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan catatan"}
          </button>
        </form>
      </section>
    </div>
  );
}

function FamilyModal({
  pet,
  close,
  notify,
}: {
  pet: Pet;
  close: () => void;
  notify: Notify;
}) {
  const [items, setItems] = useState<FamilyAccess[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function reload() {
    await Promise.resolve();
    setLoading(true);
    try {
      setItems((await getPetFamily(pet.id)).data);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Akses keluarga belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    void getPetFamily(pet.id)
      .then((response) => {
        if (!cancelled) setItems(response.data);
      })
      .catch((error) =>
        notify(
          error instanceof Error
            ? error.message
            : "Akses keluarga belum dapat dimuat",
        ),
      )
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pet.id, notify]);
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    const values = Object.fromEntries(new FormData(form));
    try {
      await invitePetFamily(pet.id, {
        email: values.email,
        full_name: values.full_name,
        role: values.role,
        permissions: ["profile", "health", "booking"],
      });
      form.reset();
      await reload();
      notify("Undangan keluarga berhasil dibuat");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Undangan belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: string) {
    try {
      await revokePetFamily(id);
      await reload();
      notify("Akses berhasil dicabut");
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Akses belum dapat dicabut",
      );
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal family-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">
          AKSES KELUARGA · {pet.name.toUpperCase()}
        </span>
        <h2>Orang yang dipercaya</h2>
        <div className="family-access-list">
          {loading ? (
            <p>Memuat akses…</p>
          ) : (
            items.map((item) => (
              <div key={item.id}>
                <span>
                  {item.full_name
                    .split(" ")
                    .map((value) => value[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <p>
                  <b>{item.full_name}</b>
                  <small>
                    {item.email} · {item.role} · {item.status}
                  </small>
                </p>
                {item.role !== "owner" && (
                  <button onClick={() => void revoke(item.id)}>Cabut</button>
                )}
              </div>
            ))
          )}
        </div>
        <form className="world-form family-invite" onSubmit={invite}>
          <h3>Undang anggota</h3>
          <label>
            <span>Nama lengkap</span>
            <input name="full_name" required />
          </label>
          <label>
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <label>
            <span>Role akses</span>
            <SlivaSelect aria-label="Role akses" name="role">
              <option value="co_parent">Co-parent</option>
              <option value="caregiver">Caregiver</option>
              <option value="veterinarian">Dokter</option>
              <option value="viewer">Viewer</option>
            </SlivaSelect>
          </label>
          <button className="primary-button full" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim undangan"}
          </button>
        </form>
      </section>
    </div>
  );
}

function LostModeModal({
  pet,
  close,
  notify,
}: {
  pet: Pet;
  close: () => void;
  notify: Notify;
}) {
  const [mode, setMode] = useState<Awaited<
    ReturnType<typeof getLostPetMode>
  > | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void getLostPetMode(pet.id)
      .then(setMode)
      .catch(() => setMode({ active: false }));
  }, [pet.id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await activateLostPetMode(pet.id, {
        last_seen_at: new Date(String(values.last_seen_at)).toISOString(),
        last_seen_location: values.last_seen_location,
        latitude: values.latitude ? Number(values.latitude) : null,
        longitude: values.longitude ? Number(values.longitude) : null,
        radius_km: Number(values.radius_km),
        description: values.description,
        contact_phone: values.contact_phone,
        reward_amount: Number(values.reward_amount || 0),
      });
      setMode(result);
      notify(result.message);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Lost Pet Mode belum dapat diaktifkan",
      );
    } finally {
      setBusy(false);
    }
  }
  async function found() {
    setBusy(true);
    try {
      await closeLostPetMode(pet.id, "found");
      setMode({ active: false, status: "found" });
      notify(`${pet.name} ditandai sudah ditemukan`);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Laporan belum dapat ditutup",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal lost-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">LOST PET EMERGENCY</span>
        <h2>
          {mode?.active
            ? `Pencarian ${pet.name} sedang aktif`
            : `Aktifkan Lost Pet Mode`}
        </h2>
        {mode?.active ? (
          <div className="lost-active">
            <span>📡</span>
            <p>
              Komunitas radius {mode.radius_km} km sudah menerima laporan dari{" "}
              {mode.last_seen_location}.
            </p>
            <code>{mode.public_token}</code>
            <button
              className="primary-button full"
              disabled={busy}
              onClick={() => void found()}
            >
              {busy ? "Memproses…" : `${pet.name} sudah ditemukan`}
            </button>
          </div>
        ) : (
          <form className="world-form" onSubmit={submit}>
            <label>
              <span>Terakhir terlihat</span>
              <input name="last_seen_at" type="datetime-local" required />
            </label>
            <label>
              <span>Lokasi terakhir</span>
              <input
                name="last_seen_location"
                placeholder="Nama tempat / alamat lengkap"
                required
              />
            </label>
            <div className="form-row">
              <label>
                <span>Latitude</span>
                <input name="latitude" type="number" step="any" />
              </label>
              <label>
                <span>Longitude</span>
                <input name="longitude" type="number" step="any" />
              </label>
            </div>
            <label>
              <span>Radius notifikasi</span>
              <SlivaSelect aria-label="Radius notifikasi" name="radius_km" defaultValue="10">
                <option value="3">3 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
              </SlivaSelect>
            </label>
            <label>
              <span>Kronologi & ciri khusus</span>
              <textarea name="description" required />
            </label>
            <label>
              <span>Nomor kontak</span>
              <input name="contact_phone" required />
            </label>
            <label>
              <span>Imbalan (opsional)</span>
              <input name="reward_amount" type="number" min="0" />
            </label>
            <button className="primary-button full" disabled={busy}>
              {busy
                ? "Mengaktifkan jaringan…"
                : "Aktifkan peringatan komunitas"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function DiscoverView({
  favorites,
  toggleFavorite,
  openBooking,
  notify,
  serviceCatalog,
}: {
  favorites: string[];
  toggleFavorite: (id: string) => void | Promise<void>;
  openBooking: (service: Service) => void;
  notify: Notify;
  serviceCatalog: Service[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(() => {
    if (typeof window === "undefined") return "Semua";
    return new URL(window.location.href).searchParams.get("service_type") || "Semua";
  });
  const [sort, setSort] = useState<
    "recommended" | "distance" | "rating" | "price"
  >("recommended");
  const [filterOpen, setFilterOpen] = useState(false);
  const [detailID, setDetailID] = useState<string | null>(() =>
    typeof window === "undefined"
      ? null
      : new URL(window.location.href).searchParams.get("service"),
  );
  const detail = useMemo(
    () => serviceCatalog.find((service) => service.id === detailID) ?? null,
    [detailID, serviceCatalog],
  );
  const filters = [
    "Semua",
    "Clinic",
    "Grooming",
    "Pet Shop",
    "Pet Hotel",
    "Home Care",
  ];
  const result = useMemo(
    () =>
      serviceCatalog
        .filter(
          (service) =>
            (filter === "Semua" || service.type === filter) &&
            `${service.name} ${service.address} ${service.tags.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) => {
          if (sort === "distance")
            return (
              (Number.parseFloat(a.distance) || Number.MAX_SAFE_INTEGER) -
              (Number.parseFloat(b.distance) || Number.MAX_SAFE_INTEGER)
            );
          if (sort === "rating")
            return b.rating - a.rating || b.reviews - a.reviews;
          if (sort === "price")
            return (
              (a.priceValue ?? Number.MAX_SAFE_INTEGER) -
              (b.priceValue ?? Number.MAX_SAFE_INTEGER)
            );
          return (
            b.rating - a.rating ||
            b.reviews - a.reviews ||
            (Number.parseFloat(a.distance) || Number.MAX_SAFE_INTEGER) -
              (Number.parseFloat(b.distance) || Number.MAX_SAFE_INTEGER)
          );
        }),
    [serviceCatalog, filter, query, sort],
  );
  const reset = () => {
    setQuery("");
    setFilter("Semua");
    setSort("recommended");
    const url = new URL(window.location.href);
    url.searchParams.delete("service_type");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const chooseFilter = (value: string) => {
    setFilter(value);
    const url = new URL(window.location.href);
    if (value === "Semua") url.searchParams.delete("service_type");
    else url.searchParams.set("service_type", value);
    url.searchParams.delete("service");
    setDetailID(null);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const openDetail = (serviceId: string) => {
    setDetailID(serviceId);
    const url = new URL(window.location.href);
    url.searchParams.set("service", serviceId);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const closeDetail = () => {
    setDetailID(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("service");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  return (
    <div className="discover-native">
      <header className="native-screen-header">
        <div>
          <span>JELAJAHI LAYANAN</span>
          <h2>Mau manjain pet-mu dengan apa? ✨</h2>
          <p>
            Bandingkan detail layanan, status izin mitra, dan slot aktual di
            dekatmu.
          </p>
        </div>
      </header>
      <section className="discover-search-card">
        <label>
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari klinik atau layanan"
          />
        </label>
      </section>
      <div className="filter-bar">
        <div className="filter-pills">
          {filters.map((item) => (
            <button
              type="button"
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => chooseFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="secondary-button small discover-filter-button"
          type="button"
          onClick={() => setFilterOpen(true)}
        >
          <Icon name="filter" size={16} /> Filter
        </button>
      </div>
      <div className="discover-result-head">
        <p>
          <b>{result.length} layanan</b> dari seluruh area layanan Slivadoc
        </p>
        <SlivaSelect
          aria-label="Urutkan layanan"
          value={sort}
          onChange={(event) => setSort(event.target.value as typeof sort)}
        >
          <option value="recommended">Paling direkomendasikan</option>
          <option value="distance">Jarak terdekat</option>
          <option value="rating">Rating tertinggi</option>
          <option value="price">Harga terendah</option>
        </SlivaSelect>
      </div>
      <div className="service-list-grid">
        {result.map((service) => (
          <article
            className="service-result-card"
            key={`${service.id}:${service.branchId}`}
          >
            <div className={`service-result-cover ${service.accent}`}>
              {service.imageUrl ? (
                <Image
                  className="catalog-cover-image"
                  src={service.imageUrl}
                  alt={`Gambar ${service.name}`}
                  fill
                  sizes="(max-width: 620px) 100vw, 155px"
                  unoptimized
                />
              ) : (
                <span>{service.emoji}</span>
              )}
              <em>{service.type}</em>
              {service.discountPercent && service.discountPercent > 0 ? (
                <DiscountBadge percent={service.discountPercent} />
              ) : null}
              <button
                type="button"
                aria-label="Favorit"
                className={favorites.includes(service.id) ? "favorite" : ""}
                onClick={() => toggleFavorite(service.id)}
              >
                <Icon name="heart" size={18} />
              </button>
            </div>
            <div className="service-result-body">
              <div className="service-name-row">
                <div>
                  <h3>{service.name}</h3>
                  <p>
                    <Icon name="map" size={14} /> {service.distance} •{" "}
                    {service.address}
                  </p>
                </div>
                <span className="rating-box">
                  <span>
                    <Icon name="star" size={12} />
                    <b>
                      {service.rating > 0 ? service.rating.toFixed(1) : "-"}
                    </b>
                  </span>
                  <small>
                    {service.reviews.toLocaleString("id-ID")} ulasan
                  </small>
                </span>
              </div>
              <div className="tag-row">
                {service.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="availability">
                <span className="live-dot" />
                <b>{service.status}</b>
              </div>
              <div className="service-result-footer">
                <div>
                  <small>Estimasi harga</small>
                  {service.originalPrice ? (
                    <span className="service-promo-price">
                      <s>{formatRupiah(service.originalPrice)}</s>
                      <b>{service.price}</b>
                    </span>
                  ) : (
                    <b>{service.price}</b>
                  )}
                </div>
                <button
                  className="secondary-button small"
                  type="button"
                  onClick={() => openDetail(service.id)}
                >
                  Lihat detail
                </button>
                <button
                  className="primary-button small"
                  type="button"
                  onClick={() => openBooking(service)}
                >
                  Booking
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {result.length === 0 && (
        <div className="empty-state">
          <span>🔎</span>
          <h3>Layanan belum ditemukan</h3>
          <p>Coba kata kunci atau kategori lain.</p>
          <button
            className="primary-button small"
            type="button"
            onClick={reset}
          >
            Reset pencarian
          </button>
        </div>
      )}
      {filterOpen && (
        <div
          className="filter-panel-backdrop"
          onMouseDown={() => setFilterOpen(false)}
        >
          <section
            className="discover-filter-panel"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="section-eyebrow">FILTER JELAJAHI</span>
                <h2>Temukan layanan yang pas</h2>
              </div>
              <button
                className="modal-close"
                onClick={() => setFilterOpen(false)}
                aria-label="Tutup"
              >
                <Icon name="close" />
              </button>
            </header>
            <label>
              <span>Jenis layanan</span>
              <div className="filter-panel-pills">
                {filters.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={filter === item ? "active" : ""}
                    onClick={() => chooseFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <label>
              <span>Urutkan berdasarkan</span>
              <SlivaSelect aria-label="Urutkan berdasarkan"
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
              >
                <option value="recommended">Paling direkomendasikan</option>
                <option value="distance">Jarak terdekat</option>
                <option value="rating">Rating tertinggi</option>
                <option value="price">Harga terendah</option>
              </SlivaSelect>
            </label>
            <footer>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  reset();
                  notify("Filter layanan direset");
                }}
              >
                Reset
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => setFilterOpen(false)}
              >
                Tampilkan {result.length} hasil
              </button>
            </footer>
          </section>
        </div>
      )}
      {detail && (
        <ServiceDetail
          service={detail}
          close={closeDetail}
          book={() => {
            closeDetail();
            openBooking(detail);
          }}
        />
      )}
    </div>
  );
}

const activityStateTabs = [
  ["upcoming", "Mendatang"],
  ["ongoing", "Berlangsung"],
  ["history", "Riwayat"],
] as const;

function BookingsView({
  openBooking,
  setActiveView,
  notify,
  activities,
  summary,
  points,
  rewardFormula,
  focus,
  onFocusHandled,
  onRepeat,
  onPaid,
  hasMoreActivities,
  loadingMoreActivities,
  onLoadMore,
}: {
  openBooking: (service?: Service) => void;
  setActiveView: (view: AppView) => void;
  notify: Notify;
  activities: PetOwnerActivityCenterItem[];
  summary: PetOwnerActivityCenterResponse["summary"] | null;
  points: number;
  rewardFormula: RewardFormula;
  focus: { type: ActivityType; id: string; token: number } | null;
  onFocusHandled: (token: number) => void;
  onRepeat: (item: PetOwnerActivityCenterItem) => void;
  onPaid: () => Promise<void>;
  hasMoreActivities: boolean;
  loadingMoreActivities: boolean;
  onLoadMore: () => void;
}) {
  const [invoicesOpen, setInvoicesOpen] = useState(false);
  const [tab, setTab] =
    useState<PetOwnerActivityCenterItem["state"]>("upcoming");
  // The marketplace "Pesanan" shortcut lands here with ?activity_type=order.
  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">(() => {
    const requested = new URL(window.location.href).searchParams.get(
      "activity_type",
    );
    return requested && requested in activityTypeMeta
      ? (requested as ActivityType)
      : "all";
  });
  // The detail renders the current list entry, so it refreshes after a sync;
  // the stored item is the fallback once it drops out of the list.
  const [detail, setDetail] = useState<{
    item: PetOwnerActivityCenterItem;
    autoPay: boolean;
  } | null>(null);
  const detailItem = detail
    ? (activities.find(
        (entry) =>
          entry.type === detail.item.type && entry.id === detail.item.id,
      ) ?? detail.item)
    : null;
  useEffect(() => {
    if (!focus) return;
    queueMicrotask(() => {
      const item = activities.find(
        (entry) => entry.type === focus.type && entry.id === focus.id,
      );
      if (item) {
        setTab(item.state);
        setTypeFilter("all");
        setDetail({ item, autoPay: false });
      } else notify("Aktivitas belum tersedia. Coba lagi sebentar.");
      onFocusHandled(focus.token);
    });
  }, [focus, activities, notify, onFocusHandled]);
  const attention = activities.filter((item) => item.needs_action);
  const visible = activities.filter(
    (item) =>
      item.state === tab && (typeFilter === "all" || item.type === typeFilter),
  );
  const typeCount = (type: ActivityType) => summary?.[type] ?? 0;
  const chips = activityTypeOrder.filter((type) => typeCount(type) > 0);
  const totalCount = activityTypeOrder.reduce(
    (total, type) => total + typeCount(type),
    0,
  );

  return (
    <div className="activity-native">
      <header className="native-screen-header">
        <div>
          <h2>Aktivitas</h2>
          <p>Booking, pesanan, kelas, tiket, reservasi, dan dokumen pet-mu.</p>
        </div>
      </header>

      {attention.length > 0 && (
        <section className="activity-attention" aria-label="Perlu tindakan">
          <header>
            <h3>Perlu tindakan</h3>
            <span className="activity-tab-count">{attention.length}</span>
          </header>
          {attention.map((item) => {
            const meta = getActivityTypeMeta(item.type);
            return (
              <article key={`${item.type}-${item.id}`}>
                <span
                  className={`activity-native-icon activity-native-icon--${meta.tone}`}
                >
                  <Icon name={meta.icon} size={18} />
                </span>
                <div>
                  <b>{item.title}</b>
                  <small>{activityAttentionReason(item)}</small>
                </div>
                <button
                  className="primary-button small"
                  type="button"
                  onClick={() => setDetail({ item, autoPay: item.payable })}
                >
                  {item.payable
                    ? "Bayar"
                    : item.type === "event"
                      ? "Tiket QR"
                      : "Lihat detail"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      <div className="activity-controls">
        <div
          className="activity-state-tabs"
          role="group"
          aria-label="Status aktivitas"
        >
          {activityStateTabs.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={tab === value ? "active" : ""}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              <span>{label}</span>
              <span className="activity-tab-count">
                {activities.filter((item) => item.state === value).length}
              </span>
            </button>
          ))}
        </div>
        <div
          className="activity-type-chips"
          role="group"
          aria-label="Jenis aktivitas"
        >
          <button
            type="button"
            aria-pressed={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          >
            Semua <span className="activity-tab-count">{totalCount}</span>
          </button>
          {chips.map((type) => (
            <button
              type="button"
              key={type}
              aria-pressed={typeFilter === type}
              onClick={() => setTypeFilter(type)}
            >
              {getActivityTypeMeta(type).label}{" "}
              <span className="activity-tab-count">{typeCount(type)}</span>
            </button>
          ))}
        </div>
      </div>

      <header className="activity-native-toolbar">
        <div className="activity-native-summary">
          <h3 aria-live="polite">{visible.length} aktivitas</h3>
        </div>
        <div className="activity-native-actions">
          <button
            className="activity-points"
            type="button"
            onClick={() =>
              notify(
                points
                  ? `Saldo ${points.toLocaleString("id-ID")} poin. ${rewardFormulaText(rewardFormula)}`
                  : "Belum ada transaksi terbayar, jadi Sliva Point masih 0.",
              )
            }
          >
            <Icon name="sparkle" size={14} />
            {points.toLocaleString("id-ID")} poin
          </button>
          <button
            className="primary-button small"
            type="button"
            onClick={() => openBooking()}
          >
            <Icon name="plus" size={15} /> Buat booking
          </button>
          <button
            className="secondary-button small"
            type="button"
            onClick={() => setInvoicesOpen(true)}
          >
            <Icon name="download" size={15} /> Invoice
          </button>
        </div>
      </header>

      <div className="activity-native-list">
        {visible.length ? (
          visible.map((item) => {
            const meta = getActivityTypeMeta(item.type);
            const repeatLabel = activityRepeatLabels[item.type];
            return (
              <article
                className="activity-native-card"
                key={`${item.type}-${item.id}`}
              >
                <button
                  className="activity-native-main"
                  type="button"
                  onClick={() => setDetail({ item, autoPay: false })}
                >
                  <span
                    className={`activity-native-icon activity-native-icon--${meta.tone}`}
                  >
                    <Icon name={meta.icon} size={21} />
                  </span>
                  <span className="activity-native-copy">
                    <span className="activity-native-meta">
                      <small>{meta.label}</small>
                      <i>{activityStatusLabel(item)}</i>
                    </span>
                    <b>{item.title}</b>
                    <span>{item.subtitle}</span>
                    <small className="activity-native-date">
                      <Icon name="clock" size={13} />
                      {formatActivityDate(item.scheduled_at || item.occurred_at)}
                    </small>
                  </span>
                  <Icon name="chevron" size={17} />
                </button>
                <footer>
                  <span>
                    <Icon
                      name={item.type === "order" ? "bag" : "paw"}
                      size={14}
                    />
                    {item.type === "order"
                      ? `${item.item_count ?? 0} produk`
                      : item.pet_name || "Pet kamu"}
                  </span>
                  {item.latitude != null && item.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="map" size={14} /> Arah
                    </a>
                  ) : null}
                  {repeatLabel && (
                    <button type="button" onClick={() => onRepeat(item)}>
                      <Icon name="arrow" size={14} /> {repeatLabel}
                    </button>
                  )}
                </footer>
              </article>
            );
          })
        ) : (
          <div className="empty-state activity-native-empty">
            <span>
              <Icon
                name={
                  typeFilter === "all"
                    ? "calendar"
                    : getActivityTypeMeta(typeFilter).icon
                }
                size={28}
              />
            </span>
            <h3>
              {activities.length
                ? "Tidak ada aktivitas yang cocok"
                : "Belum ada aktivitas"}
            </h3>
            <p>
              {activities.length
                ? "Ubah status atau jenis aktivitas untuk melihat catatan lainnya."
                : "Booking, belanja, konsultasi, kelas, tiket, dan reservasi pet-mu akan muncul di sini."}
            </p>
          </div>
        )}
      </div>
      {hasMoreActivities && (
        <button
          className="secondary-button full"
          type="button"
          disabled={loadingMoreActivities}
          onClick={onLoadMore}
        >
          {loadingMoreActivities ? "Memuat…" : "Muat lebih banyak"}
        </button>
      )}

      <section className="activity-native-cta">
        <div>
          <span>
            <Icon name="sparkle" size={17} />
          </span>
          <p>
            <b>Butuh layanan lain?</b>
            <small>
              Booking dokter, grooming, home care, atau hotel dalam beberapa
              langkah.
            </small>
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setActiveView("discover")}
        >
          Jelajahi layanan
        </button>
      </section>
      {detailItem && detail && (
        <ActivityDetail
          key={`${detailItem.type}-${detailItem.id}`}
          item={detailItem}
          autoPay={detail.autoPay}
          close={() => setDetail(null)}
          onPaid={onPaid}
          onRepeat={onRepeat}
        />
      )}
      {invoicesOpen && <InvoicesPanel close={() => setInvoicesOpen(false)} />}
    </div>
  );
}

const invoiceStatusLabels: Record<PetOwnerInvoice["status"], string> = {
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  void: "Dibatalkan",
  refunded: "Dana dikembalikan",
  partially_refunded: "Dikembalikan sebagian",
};

function InvoicesPanel({ close }: { close: () => void }) {
  const [invoices, setInvoices] = useState<PetOwnerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setInvoices((await getPetOwnerInvoices()).data);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Invoice belum dapat dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  if (selectedId)
    return (
      <InvoiceDetail
        invoiceId={selectedId}
        back={() => setSelectedId("")}
        close={close}
      />
    );
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal activity-detail-modal"
        aria-label="Invoice"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close} aria-label="Tutup">
          <Icon name="close" />
        </button>
        <header className="activity-detail-hero">
          <span>
            <Icon name="download" size={24} />
          </span>
          <div>
            <small>INVOICE</small>
            <h2>Invoice klinik & toko</h2>
          </div>
        </header>
        {loading ? (
          <p className="form-message" role="status">
            Memuat invoice…
          </p>
        ) : error ? (
          <div className="form-message" role="alert">
            <p>{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void load()}
            >
              Coba lagi
            </button>
          </div>
        ) : invoices.length ? (
          <div className="activity-native-list">
            {invoices.map((invoice) => (
              <article className="activity-native-card" key={invoice.id}>
                <button
                  className="activity-native-main"
                  type="button"
                  onClick={() => setSelectedId(invoice.id)}
                >
                  <span className="activity-native-copy">
                    <span className="activity-native-meta">
                      <small>{invoice.invoice_number}</small>
                      <i>{invoiceStatusLabels[invoice.status]}</i>
                    </span>
                    <b>
                      {[invoice.business_name, invoice.branch_name]
                        .filter(Boolean)
                        .join(" · ") || "Invoice"}
                    </b>
                    <span>{formatRupiah(invoice.total_amount)}</span>
                    {(invoice.issued_at ?? invoice.paid_at) && (
                      <small className="activity-native-date">
                        <Icon name="clock" size={13} />
                        {formatActivityDate(
                          (invoice.issued_at ?? invoice.paid_at) as string,
                        )}
                      </small>
                    )}
                  </span>
                  <Icon name="chevron" size={17} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state activity-native-empty">
            <h3>Belum ada invoice</h3>
            <p>
              Belum ada invoice tertaut. Tautkan kode pet owner di klinik agar
              invoice muncul di sini.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function InvoiceDetail({
  invoiceId,
  back,
  close,
}: {
  invoiceId: string;
  back: () => void;
  close: () => void;
}) {
  const [invoice, setInvoice] = useState<PetOwnerInvoiceDetail | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      setInvoice(await getPetOwnerInvoice(invoiceId));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Invoice belum dapat dimuat",
      );
    }
  }, [invoiceId]);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  const outstanding = invoice
    ? invoice.status === "pending"
      ? Math.max(0, invoice.total_amount - invoice.paid_amount)
      : 0
    : 0;
  const date = (value: string | null) => (value ? formatActivityDate(value) : "");
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal activity-detail-modal"
        aria-label="Detail invoice"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close} aria-label="Tutup">
          <Icon name="close" />
        </button>
        {error ? (
          <div className="form-message" role="alert">
            <p>{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void load()}
            >
              Coba lagi
            </button>
          </div>
        ) : !invoice ? (
          <p className="form-message" role="status">
            Memuat invoice…
          </p>
        ) : (
          <>
            <header className="activity-detail-hero">
              <span>
                <Icon name="download" size={24} />
              </span>
              <div>
                <small>INVOICE</small>
                <h2>{invoice.invoice_number}</h2>
                <em>{invoiceStatusLabels[invoice.status]}</em>
              </div>
            </header>
            <dl>
              {(
                [
                  [
                    "Penerbit",
                    [invoice.business_name, invoice.branch_name]
                      .filter(Boolean)
                      .join(" · "),
                  ],
                  ["Diterbitkan", date(invoice.issued_at)],
                  ["Dibayar", date(invoice.paid_at)],
                  ["Subtotal", formatRupiah(invoice.subtotal)],
                  [
                    "Diskon",
                    invoice.discount_amount
                      ? `-${formatRupiah(invoice.discount_amount)}`
                      : "",
                  ],
                  [
                    "Pajak",
                    invoice.tax_amount ? formatRupiah(invoice.tax_amount) : "",
                  ],
                  ["Total", formatRupiah(invoice.total_amount)],
                  ["Sudah dibayar", formatRupiah(invoice.paid_amount)],
                  [
                    "Dikembalikan",
                    invoice.refunded_amount
                      ? formatRupiah(invoice.refunded_amount)
                      : "",
                  ],
                  [
                    "Sisa tagihan",
                    outstanding ? formatRupiah(outstanding) : "",
                  ],
                ] as Array<[string, string]>
              )
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            <div className="activity-detail-copy">
              <span className="activity-detail-label">Rincian item</span>
              {invoice.items.length ? (
                <ul>
                  {invoice.items.map((line, index) => (
                    <li key={`${line.description}-${index}`}>
                      {line.description} × {line.quantity} ·{" "}
                      {formatRupiah(line.line_total)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Tidak ada rincian item.</p>
              )}
            </div>
          </>
        )}
        <footer>
          <button className="secondary-button" type="button" onClick={back}>
            Kembali ke daftar
          </button>
        </footer>
      </section>
    </div>
  );
}

function HealthView({ pet, notify }: { pet: Pet; notify: Notify }) {
  const { requirePet } = usePetOwnerFlow();
  const [tab, setTab] = useState("all");
  const [screen, setScreen] = useState<"summary" | "records">("summary");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<MedicalRecord | null>(null);
  const [reminders, setReminders] = useState<CareReminder[]>([]);
  const [reminderOpen, setReminderOpen] = useState(false);
  useEffect(() => {
    if (!pet.id) {
      queueMicrotask(() => { setRecords([]); setLoading(false); });
      return;
    }
    let active = true;
    void getMedicalRecords(pet.id)
      .then((response) => { if (active) setRecords(response.data); })
      .catch((error) => {
        setRecords([]);
        notify(
          error instanceof Error
            ? error.message
            : "Rekam medis belum dapat dimuat",
        );
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pet.id, notify]);
  const loadReminders = useCallback(async () => {
    if (!pet.id) return;
    try {
      setReminders(
        (await getCareReminders()).data.filter(
          (item) => item.pet_id === pet.id,
        ),
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Pengingat belum dapat dimuat",
      );
    }
  }, [pet.id, notify]);
  useEffect(() => {
    queueMicrotask(() => void loadReminders());
  }, [loadReminders]);
  const latest = records[0];
  const categories = [
    { id: "all", label: "Semua" },
    { id: "consultation", label: "Konsultasi" },
    { id: "vaccination", label: "Vaksin" },
    { id: "medication", label: "Obat" },
    { id: "laboratory", label: "Laboratorium" },
  ];
  const visible =
    tab === "all"
      ? records
      : records.filter((record) =>
          record.record_type.toLowerCase().includes(tab),
        );
  return (
    <div className="health-native">
      <header className="native-screen-header">
        <div>
          <span>PUSAT KESEHATAN</span>
          <h2>Digital health record</h2>
        </div>
      </header>

      <section className="health-hero-panel health-native-hero">
        <span className="health-native-glow" aria-hidden="true" />
        <div className="health-pet">
          <span>{pet.avatar}</span>
          <div>
            <small>HEALTH PROFILE ✦</small>
            <h2>{pet.name}</h2>
            <p>
              {pet.breed} • {pet.weight}
            </p>
          </div>
        </div>
        <div className="health-hero-score">
          <div
            style={
              {
                "--score": `${pet.healthScore * 3.6}deg`,
              } as React.CSSProperties
            }
          >
            <span>
              <b>{pet.healthScore}</b>
              <small>Health</small>
            </span>
          </div>
        </div>
        <div className="health-hero-meta">
          <span>
            <small>Alergi</small>
            <b>{pet.allergies || "Belum dicatat"}</b>
          </span>
          <span>
            <small>Dokter terakhir</small>
            <b>{latest?.doctor_name || "Belum ada"}</b>
          </span>
          <span>
            <small>Update terakhir</small>
            <b>
              {latest
                ? new Date(latest.occurred_at).toLocaleDateString("id-ID")
                : "Belum ada record"}
            </b>
          </span>
        </div>
      </section>

      <div
        className="health-native-tabs"
        role="tablist"
        aria-label="Halaman kesehatan"
      >
        <button
          type="button"
          role="tab"
          className={screen === "summary" ? "active" : ""}
          aria-selected={screen === "summary"}
          onClick={() => setScreen("summary")}
        >
          Ringkasan
        </button>
        <button
          type="button"
          role="tab"
          className={screen === "records" ? "active" : ""}
          aria-selected={screen === "records"}
          onClick={() => setScreen("records")}
        >
          Rekam Medis <span>{records.length}</span>
        </button>
      </div>

      {screen === "summary" ? (
        <>
          <header className="health-native-section-header">
            <div>
              <span>RINGKASAN KESEHATAN</span>
              <h3>Data medis {pet.name}</h3>
            </div>
            <button type="button" onClick={() => requirePet() && setReminderOpen(true)}>
              <Icon name="plus" size={15} /> Pengingat
            </button>
          </header>

          <section className="health-native-prevention">
            <div className="health-native-progress">
              <b>{records.length}</b>
              <small>Record</small>
            </div>
            <div>
              <p>
                <span className={records.length ? "done" : ""}>
                  {records.length ? <Icon name="check" size={12} /> : "!"}
                </span>
                <b>
                  {records.length
                    ? "Rekam medis tersinkron"
                    : "Belum ada rekam medis"}
                </b>
                <small>
                  {latest?.title ||
                    "Buat booking pemeriksaan untuk memulai record"}
                </small>
              </p>
              <p>
                <span className={pet.healthScore > 0 ? "done" : ""}>
                  {pet.healthScore > 0 ? <Icon name="check" size={12} /> : "!"}
                </span>
                <b>Health score {pet.healthScore || "belum tersedia"}</b>
                <small>
                  {pet.nextCare || "Lengkapi profil dan aktivitas pet"}
                </small>
              </p>
            </div>
          </section>

          <section className="health-native-facts">
            <article>
              <span>
                <Icon name="shield" size={17} />
              </span>
              <small>Microchip</small>
              <b>{pet.microchip}</b>
            </article>
            <article>
              <span>
                <Icon name="heart" size={17} />
              </span>
              <small>Berat terbaru</small>
              <b>{latest?.weight_kg ? `${latest.weight_kg} kg` : pet.weight}</b>
            </article>
          </section>

          {latest ? (
            <>
              <header className="health-native-section-header">
                <div>
                  <span>RECORD TERBARU</span>
                  <h3>{latest.title}</h3>
                </div>
                <button type="button" onClick={() => setScreen("records")}>
                  Semua <Icon name="arrow" size={14} />
                </button>
              </header>
              <button
                className="health-native-latest"
                type="button"
                onClick={() => setDetail(latest)}
              >
                <span>
                  <Icon name="heart" size={20} />
                </span>
                <p>
                  <small>
                    {new Date(latest.occurred_at).toLocaleString("id-ID")}
                  </small>
                  <b>{latest.diagnosis || latest.complaint || latest.title}</b>
                  <span>{latest.doctor_name || "Dokter belum dicatat"}</span>
                </p>
                <i>
                  <Icon name="arrow" size={15} />
                </i>
              </button>
            </>
          ) : null}

          <section className="panel care-reminder-panel health-native-reminders">
            <header className="health-native-section-header">
              <div>
                <span>PENGINGAT PERAWATAN</span>
                <h3>Jadwal penting {pet.name}</h3>
              </div>
              <button type="button" onClick={() => requirePet() && setReminderOpen(true)}>
                <Icon name="plus" size={15} /> Tambah
              </button>
            </header>
            <div className="care-reminder-list">
              {reminders.filter((item) =>
                ["scheduled", "snoozed"].includes(item.status),
              ).length ? (
                reminders
                  .filter((item) =>
                    ["scheduled", "snoozed"].includes(item.status),
                  )
                  .map((item) => (
                    <article key={item.id}>
                      <span>
                        {item.reminder_type === "vaccination"
                          ? "💉"
                          : item.reminder_type === "medication"
                            ? "💊"
                            : item.reminder_type === "grooming"
                              ? "✂️"
                              : "🔔"}
                      </span>
                      <div>
                        <b>{item.title}</b>
                        <small>
                          {new Date(item.due_at).toLocaleString("id-ID")} ·{" "}
                          {item.recurrence === "once"
                            ? "Satu kali"
                            : `Berulang ${item.recurrence}`}
                        </small>
                        <p>
                          {item.notes || `Pengingat untuk ${item.pet_name}`}
                        </p>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={async () => {
                            await snoozeCareReminder(item.id, 1440);
                            await loadReminders();
                            notify("Pengingat ditunda satu hari");
                          }}
                        >
                          Tunda
                        </button>
                        <button
                          className="complete"
                          type="button"
                          onClick={async () => {
                            await completeCareReminder(item.id);
                            await loadReminders();
                            notify("Perawatan ditandai selesai");
                          }}
                        >
                          Selesai
                        </button>
                      </div>
                    </article>
                  ))
              ) : (
                <div className="empty-state compact health-native-reminder-empty">
                  Belum ada pengingat. Tambahkan jadwal vaksin, obat, grooming,
                  atau kontrol berikutnya.
                </div>
              )}
            </div>
          </section>

          {(pet.notes || pet.allergies) && (
            <section className="health-special-note">
              <span>
                <Icon name="shield" size={18} />
              </span>
              <div>
                <small>CATATAN KHUSUS</small>
                <b>
                  {pet.allergies
                    ? `Alergi: ${pet.allergies}`
                    : "Catatan kesehatan"}
                </b>
                <p>{pet.notes || "Tidak ada catatan medis tambahan."}</p>
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <div
            className="health-record-filter"
            role="tablist"
            aria-label="Jenis rekam medis"
          >
            {categories.map((item) => (
              <button
                type="button"
                role="tab"
                className={tab === item.id ? "active" : ""}
                key={item.id}
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <section className="panel health-record-api health-native-records">
            <header className="health-native-section-header">
              <div>
                <span>PET MEDICAL RECORD</span>
                <h3>Riwayat {pet.name}</h3>
              </div>
              <button
                type="button"
                disabled={!records.length}
                onClick={() => downloadPetMedicalPDF(pet, records)}
              >
                <Icon name="download" size={15} /> Unduh
              </button>
            </header>
            {loading ? (
              <div className="empty-state compact health-native-record-empty">
                Memuat rekam medis {pet.name}…
              </div>
            ) : visible.length ? (
              <div className="health-native-record-list">
                {visible.map((record) => (
                  <button
                    type="button"
                    key={record.id}
                    onClick={() => setDetail(record)}
                  >
                    <span>
                      <Icon name="heart" size={20} />
                    </span>
                    <p>
                      <small>
                        {record.record_type.toUpperCase()} ·{" "}
                        {new Date(record.occurred_at).toLocaleString("id-ID")}
                      </small>
                      <b>{record.title}</b>
                      <span>
                        {record.diagnosis ||
                          record.clinical_notes ||
                          record.complaint ||
                          "Tidak ada keterangan tambahan"}
                      </span>
                    </p>
                    <Icon name="chevron" size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state health-native-record-empty">
                <span>
                  <Icon name="heart" size={28} />
                </span>
                <h3>Belum ada rekam medis</h3>
                <p>
                  Record akan muncul setelah pemeriksaan atau konsultasi untuk{" "}
                  {pet.name}.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {detail && (
        <div className="modal-overlay" onMouseDown={() => setDetail(null)}>
          <section
            className="modal medical-record-detail"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setDetail(null)}>
              <Icon name="close" />
            </button>
            <span className="section-eyebrow">
              {detail.record_type.toUpperCase()}
            </span>
            <h2>{detail.title}</h2>
            <p>
              {new Date(detail.occurred_at).toLocaleString("id-ID")} ·{" "}
              {detail.doctor_name || "Dokter belum dicatat"}
            </p>
            <dl>
              {[
                ["Keluhan", detail.complaint],
                ["Diagnosis", detail.diagnosis],
                ["Perawatan", detail.treatment],
                ["Catatan klinis", detail.clinical_notes],
                [
                  "Kontrol berikutnya",
                  detail.next_control_at
                    ? new Date(detail.next_control_at).toLocaleString("id-ID")
                    : "",
                ],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
            <button
              className="primary-button full"
              onClick={() => setDetail(null)}
            >
              Selesai
            </button>
          </section>
        </div>
      )}
      {reminderOpen && (
        <ReminderModal
          pet={pet}
          close={() => setReminderOpen(false)}
          notify={notify}
          created={loadReminders}
        />
      )}
    </div>
  );
}

function ReminderModal({
  pet,
  close,
  notify,
  created,
}: {
  pet: Pet;
  close: () => void;
  notify: Notify;
  created: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await createCareReminder({
        pet_id: pet.id,
        reminder_type: values.reminder_type,
        title: values.title,
        notes: values.notes,
        due_at: new Date(String(values.due_at)).toISOString(),
        timezone: "Asia/Jakarta",
        recurrence: values.recurrence,
        recurrence_days:
          values.recurrence === "custom"
            ? Number(values.recurrence_days || 30)
            : null,
        lead_minutes: [10080, 1440, 120],
        channels: ["in_app", "email"],
      });
      await created();
      notify("Pengingat berhasil dijadwalkan");
      close();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Pengingat belum dapat dibuat",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal reminder-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close}>
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">PENGINGAT PERAWATAN</span>
        <h2>Jadwalkan untuk {pet.name}</h2>
        <p className="muted-copy">
          Notifikasi disiapkan 7 hari, 1 hari, dan 2 jam sebelum jadwal.
        </p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span>Jenis perawatan</span>
            <SlivaSelect aria-label="Jenis perawatan" name="reminder_type">
              <option value="vaccination">Vaksinasi</option>
              <option value="medication">Obat</option>
              <option value="deworming">Obat cacing</option>
              <option value="flea_tick">Kutu & caplak</option>
              <option value="grooming">Grooming</option>
              <option value="follow_up">Kontrol dokter</option>
              <option value="document">Dokumen</option>
              <option value="custom">Lainnya</option>
            </SlivaSelect>
          </label>
          <label>
            <span>Judul</span>
            <input
              name="title"
              minLength={3}
              placeholder="Contoh: Booster rabies"
              required
            />
          </label>
          <label>
            <span>Tanggal & waktu</span>
            <input name="due_at" type="datetime-local" required />
          </label>
          <div className="form-row">
            <label>
              <span>Pengulangan</span>
              <SlivaSelect aria-label="Pengulangan" name="recurrence" defaultValue="yearly">
                <option value="once">Satu kali</option>
                <option value="daily">Harian</option>
                <option value="weekly">Mingguan</option>
                <option value="monthly">Bulanan</option>
                <option value="quarterly">Tiga bulanan</option>
                <option value="yearly">Tahunan</option>
                <option value="custom">Jarak khusus</option>
              </SlivaSelect>
            </label>
            <label>
              <span>Jarak khusus (hari)</span>
              <input
                name="recurrence_days"
                type="number"
                min="1"
                defaultValue="30"
              />
            </label>
          </div>
          <label>
            <span>Catatan</span>
            <textarea
              name="notes"
              placeholder="Dosis, klinik, atau persiapan khusus"
            />
          </label>
          <button className="primary-button full" disabled={busy}>
            {busy ? "Menjadwalkan…" : "Simpan pengingat"}
          </button>
        </form>
      </section>
    </div>
  );
}
function SupportTicketThread({
  ticketId,
  closed,
  notify,
}: {
  ticketId: string;
  closed: boolean;
  notify: Notify;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setMessages((await getPetOwnerSupportTicketMessages(ticketId)).data);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Percakapan belum dapat dimuat.",
      );
    }
  }, [ticketId]);
  useEffect(() => {
    if (!open) return;
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [open, load]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const message = await sendPetOwnerSupportTicketMessage(ticketId, text);
      setMessages((current) => [...current, message]);
      setBody("");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Pesan belum dapat dikirim.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="support-thread">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Sembunyikan percakapan" : "Percakapan & balas"}
      </button>
      {open && (
        <>
          {error && <div className="form-message">{error}</div>}
          <ul>
            {messages.map((message) => (
              <li
                key={message.id}
                className={message.sender_role === "support" ? "support" : "owner"}
              >
                <b>
                  {message.sender_role === "support"
                    ? "Tim Slivadoc"
                    : "Kamu"}
                </b>
                <p>{message.body}</p>
                <time>
                  {new Date(message.created_at).toLocaleString("id-ID")}
                </time>
              </li>
            ))}
            {messages.length === 0 && !error && (
              <li className="empty">Belum ada balasan.</li>
            )}
          </ul>
          {!closed && (
            <form onSubmit={send}>
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                placeholder="Tulis balasan…"
                aria-label="Balasan ticket"
              />
              <button className="primary-button" disabled={busy || !body.trim()}>
                Kirim
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function SupportCenter({
  activities,
  notify,
}: {
  activities: PetOwnerActivityCenterItem[];
  notify: Notify;
}) {
  const [tickets, setTickets] = useState<PetOwnerSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState("order");
  const [reference, setReference] = useState("");
  const referenceOptions = useMemo(
    () =>
      activities
        .filter(
          (item) =>
            item.reference_id &&
            (item.type === "order" || item.type === "booking"),
        )
        .slice(0, 30)
        .map((item) => ({
          value: `${item.type}|${item.reference_id}`,
          label: `${item.title} · ${item.subtitle}`,
        })),
    [activities],
  );
  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTickets((await getPetOwnerSupportTickets()).data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Riwayat bantuan belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadTickets(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTickets]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const [referenceType, referenceID] = reference.split("|");
    setSubmitting(true);
    setError("");
    try {
      const result = await createPetOwnerSupportTicket({
        category,
        subject: String(values.subject ?? ""),
        description: String(values.description ?? ""),
        reference_type: referenceType || "other",
        ...(referenceID ? { reference_id: referenceID } : {}),
      });
      notify(`${result.ticket_number} berhasil dibuat.`);
      form.reset();
      setReference("");
      await loadTickets();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Pengaduan belum dapat dikirim.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="support-center">
      <section className="support-hero panel">
        <div>
          <span className="section-eyebrow">BANTUAN YANG DAPAT DILACAK</span>
          <h2>Sampaikan kendala tanpa mengulang kronologi.</h2>
          <p>
            Kaitkan pengaduan ke pesanan atau booking. Nomor ticket, tenggat
            respons, status, dan penyelesaian tersimpan di akunmu.
          </p>
        </div>
        <aside>
          <Icon name="shield" size={24} />
          <b>Target respons</b>
          <strong>1 hari kerja</strong>
          <small>Untuk tanggapan pertama tim Slivadoc.</small>
        </aside>
      </section>

      <div className="support-layout">
        <section className="panel support-form-card">
          <header>
            <span>BUAT PENGADUAN</span>
            <h3>Ceritakan kendalanya</h3>
          </header>
          <form className="world-form" onSubmit={submit}>
            <label>
              <span>Kategori</span>
              <SlivaSelect aria-label="Kategori"
                name="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="order">Pesanan</option>
                <option value="shipping">Pengiriman</option>
                <option value="booking">Booking</option>
                <option value="payment">Pembayaran</option>
                <option value="product">Produk</option>
                <option value="service">Layanan</option>
                <option value="account">Akun</option>
                <option value="privacy">Privasi & data</option>
                <option value="other">Lainnya</option>
              </SlivaSelect>
            </label>
            <label>
              <span>
                Pesanan atau booking terkait <small>(opsional)</small>
              </span>
              <SlivaSelect aria-label="Pesanan atau booking terkait (opsional)"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              >
                <option value="">Tidak ada referensi</option>
                {referenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SlivaSelect>
            </label>
            <label>
              <span>Subjek</span>
              <input
                name="subject"
                minLength={5}
                maxLength={180}
                required
                placeholder="Contoh: Status pengiriman belum berubah"
              />
            </label>
            <label>
              <span>Kronologi dan hasil yang diharapkan</span>
              <textarea
                name="description"
                minLength={20}
                maxLength={5000}
                required
                placeholder="Jelaskan waktu kejadian, kondisi terakhir, dan bantuan yang kamu butuhkan."
              />
            </label>
            {error && (
              <div className="form-message" role="alert">
                {error}
              </div>
            )}
            <button className="primary-button full" disabled={submitting}>
              {submitting
                ? "Mengirim pengaduan…"
                : "Kirim & dapatkan nomor ticket"}
            </button>
          </form>
        </section>

        <section className="panel support-history">
          <header>
            <span>RIWAYAT BANTUAN</span>
            <h3>Status pengaduanmu</h3>
            <button
              type="button"
              onClick={() => void loadTickets()}
              disabled={loading}
            >
              Muat ulang
            </button>
          </header>
          {loading ? (
            <div className="support-state" role="status">
              Memuat ticket…
            </div>
          ) : tickets.length ? (
            <div className="support-ticket-list">
              {tickets.map((ticket) => (
                <article key={ticket.id}>
                  <div>
                    <span>{ticket.ticket_number}</span>
                    <em className={`status-badge ${ticket.status}`}>
                      {ticket.status.replaceAll("_", " ")}
                    </em>
                  </div>
                  <h4>{ticket.subject}</h4>
                  <p>{ticket.description}</p>
                  {ticket.resolution && (
                    <blockquote>
                      <b>Penyelesaian</b>
                      {ticket.resolution}
                    </blockquote>
                  )}
                  <footer>
                    <span>
                      Dibuat{" "}
                      {new Date(ticket.created_at).toLocaleString("id-ID")}
                    </span>
                    {ticket.response_due_at && !ticket.first_response_at && (
                      <span>
                        Target respons{" "}
                        {new Date(ticket.response_due_at).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    )}
                    {ticket.first_response_at && (
                      <span>
                        Ditanggapi{" "}
                        {new Date(ticket.first_response_at).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    )}
                  </footer>
                  <SupportTicketThread
                    ticketId={ticket.id}
                    closed={
                      ticket.status === "resolved" || ticket.status === "closed"
                    }
                    notify={notify}
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="support-state">
              Belum ada pengaduan. Ticket yang kamu buat akan tampil di sini.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ProfileView({
  notify,
  account,
  familyPet,
  petCount,
  points,
  membership,
  rewardFormula,
  onLogout,
  onChanged,
  currentLocation,
  onOpenLocation,
  onOpenSupport,
  onOpenNotifications,
}: {
  notify: Notify;
  account: PetOwnerBootstrap["user"];
  familyPet?: Pet;
  petCount: number;
  points: number;
  membership: MembershipStatus;
  rewardFormula: RewardFormula;
  onLogout: () => void;
  onChanged: () => Promise<void>;
  currentLocation: LocationResult | null;
  onOpenLocation: () => void;
  onOpenSupport: () => void;
  onOpenNotifications: (category?: string) => void;
}) {
  const { language, locale, setLanguage, t } = usePetOwnerI18n();
  const initials = account.full_name
    .split(" ")
    .map((value) => value[0])
    .slice(0, 2)
    .join("");
  const [edit, setEdit] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<PetOwnerShippingAddress | null>(null);
  const [shippingAddresses, setShippingAddresses] = useState<
    PetOwnerShippingAddress[]
  >([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const membershipProgress = membership.next_level_points
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((membership.next_level_points -
              membership.points_to_next -
              membership.min_points) /
              (membership.next_level_points - membership.min_points)) *
              100,
          ),
        ),
      )
    : 100;
  const profileTier = `${membership.id} ${membership.name}`.toLowerCase().includes("royal")
    ? "royal"
    : `${membership.id} ${membership.name}`.toLowerCase().match(/happy|hound/)
      ? "happy"
      : `${membership.id} ${membership.name}`.toLowerCase().match(/play|pup/)
        ? "playful"
        : "starter";
  const profileMemberNumber = account.public_code
    ? `SLV-PO-${account.public_code}`
    : `SLV-PO-${account.id.slice(0, 8).toUpperCase()}`;
  useEffect(() => {
    let live = true;
    void getPetOwnerShippingAddresses()
      .then((result) => {
        if (live) setShippingAddresses(result.addresses);
      })
      .catch((error) => {
        if (live)
          notify(
            error instanceof Error
              ? error.message
              : "Alamat belum dapat dimuat",
          );
      })
      .finally(() => {
        if (live) setAddressLoading(false);
      });
    return () => {
      live = false;
    };
  }, [notify]);
  async function makePrimary(addressID: string) {
    try {
      const result = await setPrimaryPetOwnerShippingAddress(addressID);
      setShippingAddresses((current) =>
        current.map((address) => ({
          ...address,
          is_primary: address.id === result.address.id,
        })),
      );
      notify(result.message);
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Alamat utama belum dapat diubah",
      );
    }
  }
  async function removeAddress(address: PetOwnerShippingAddress) {
    if (!window.confirm(`Hapus alamat ${address.label}?`)) return;
    try {
      const result = await deletePetOwnerShippingAddress(address.id);
      setShippingAddresses((current) =>
        current.filter((item) => item.id !== address.id),
      );
      notify(result.message);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Alamat belum dapat dihapus",
      );
    }
  }
  return (
    <div className="profile-native profile-workspace">
      <header className="native-screen-header">
        <div>
          <span>{t("Akun & Keluarga").toUpperCase()}</span>
          <h2>{t("Profil pet parent")}</h2>
        </div>
      </header>
      <div className="profile-identity-col">
        <section className={`profile-member-card profile-member-card--${profileTier}`}>
          <span className="profile-member-orb" aria-hidden="true" />
          <header><div><strong>SLIVADOC</strong><small>PET OWNER MEMBER</small></div><em>{membership.icon} {membership.name}</em></header>
          <div className="profile-member-identity"><span><Icon name="paw" size={25}/></span><div><small>{t("Nomor member").toUpperCase()}</small><b>{profileMemberNumber}</b><p>{account.full_name}</p></div><i><Icon name="shield" size={22}/></i></div>
          <footer><span><small>{t("Member sejak").toUpperCase()}</small><b>{new Date(account.member_since).toLocaleDateString(locale, { month: "short", year: "numeric" })}</b></span><span><small>{t("Sliva Point").toUpperCase()}</small><b>{points.toLocaleString(locale)}</b></span><span><small>{t("Level member").toUpperCase()}</small><b>{membership.name}</b></span></footer>
          <p>{t("Satu identitas untuk setiap momen perawatan")} ✦</p>
        </section>
        <section className="profile-main-card profile-native-card">
          <div className="profile-person profile-person--clean">
            <div className="profile-photo">{initials}</div>
            <div>
              <h2>{account.full_name}</h2>
              <p>
                {account.email} · {account.phone || "Nomor telepon belum diisi"}
              </p>
              <span className="gold-member">✓ AKUN AKTIF</span>
            </div>
            <button
              className="native-header-icon"
              type="button"
              aria-label="Edit profil"
              onClick={() => setEdit(true)}
            >
              <Icon name="edit" size={16} />
            </button>
          </div>
          <div className="profile-stats">
            <span>
              <b>{petCount}</b>
              <small>Hewan</small>
            </span>
            <span>
              <b>{points.toLocaleString("id-ID")}</b>
              <small>Points</small>
            </span>
            <span>
              <b>
                {membership.icon} {membership.name}
              </b>
              <small>Level member</small>
            </span>
            <span>
              <b>Aktif</b>
              <small>Sinkron</small>
            </span>
          </div>
        </section>

        <section className="profile-native-points">
          <header>
            <span>SLIVA POINT</span>
            <h3>Saldo dan aturan klaim</h3>
          </header>
          <div>
            <span>
              <Icon name="sparkle" size={19} />
            </span>
            <p>
              <b>{points.toLocaleString("id-ID")} Sliva Points</b>
              <small>
                {points
                  ? "Tersedia untuk klaim sesuai syarat"
                  : "Belum ada transaksi lunas"}
              </small>
            </p>
            <i>AKTIF</i>
          </div>
          <div className="profile-membership-rank">
            <span aria-hidden="true">{membership.icon}</span>
            <p>
              <b>{membership.name}</b>
              <small>
                {membership.next_level_points
                  ? `${membership.points_to_next.toLocaleString("id-ID")} poin lagi ke level berikutnya`
                  : "Level tertinggi—terima kasih, Pet Royalty!"}
              </small>
            </p>
            <strong>{membershipProgress}%</strong>
            <progress max={100} value={membershipProgress} />
          </div>
          <ul>
            {(rewardFormula.rules?.length
              ? rewardFormula.rules
              : [rewardFormulaText(rewardFormula)]
            )
              .slice(0, 3)
              .map((rule) => (
                <li key={rule}>
                  <Icon name="check" size={12} /> {rule}
                </li>
              ))}
          </ul>
        </section>

        <section className="profile-shipping-address">
          <header>
            <span>ALAMAT PENGIRIMAN</span>
            <div className="profile-address-heading-row">
              <h3>Alamat tersimpan</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressModalOpen(true);
                }}
              >
                Tambah
              </button>
            </div>
          </header>
          {addressLoading ? (
            <p className="profile-address-muted">Memuat alamat tersimpan…</p>
          ) : shippingAddresses.length > 0 ? (
            <div className="profile-address-list">
              {shippingAddresses.map((address) => (
                <article
                  className={
                    address.is_primary
                      ? "profile-address-card primary"
                      : "profile-address-card"
                  }
                  key={address.id}
                >
                  <div>
                    <div className="profile-address-card-title">
                      <b>{address.label}</b>
                      {address.is_primary && <span>UTAMA</span>}
                    </div>
                    <strong>{address.recipient_name}</strong>
                    <small>{address.phone}</small>
                    <p>{address.address}</p>
                    <small>
                      {address.village.name}, {address.district.name},{" "}
                      {address.regency.name} · {address.post_code}
                    </small>
                  </div>
                  <div className="profile-address-card-actions">
                    {!address.is_primary && (
                      <button
                        type="button"
                        onClick={() => void makePrimary(address.id)}
                      >
                        Jadikan utama
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAddress(address);
                        setAddressModalOpen(true);
                      }}
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeAddress(address)}
                    >
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-address-empty">
              <p>
                Belum ada alamat tersimpan. Tambahkan alamat untuk checkout
                lebih cepat.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressModalOpen(true);
                }}
              >
                Tambah alamat
              </button>
            </div>
          )}
        </section>
        <div className="profile-actions-stack">
          <button
            className="profile-native-support"
            type="button"
            onClick={onOpenSupport}
          >
            <span>
              <Icon name="chat" size={20} />
            </span>
            <p>
              <b>Chat Customer Support</b>
              <small>Hubungi tim Slivadoc langsung dari aplikasi.</small>
            </p>
            <Icon name="arrow" size={16} />
          </button>

          <button
            className="profile-native-logout"
            type="button"
            onClick={() => setConfirmLogout(true)}
          >
            <span>
              <Icon name="logout" size={20} />
            </span>
            <p>
              <b>Keluar dari akun</b>
              <small>Akhiri sesi hanya di perangkat ini.</small>
            </p>
            <Icon name="chevron" size={17} />
          </button>
        </div>
      </div>
      <aside className="profile-settings-col">
        <section className="panel profile-native-settings">
          <header>
            <span>PREFERENSI</span>
            <h3>{t("Pengaturan akun")}</h3>
          </header>
          <div className="profile-language-setting">
            <span><Icon name="settings" size={19} /></span>
            <p><b>{t("Bahasa aplikasi")}</b><small>Indonesia / English</small></p>
            <div role="group" aria-label={t("Bahasa aplikasi")}>
              <button className={language === "id" ? "active" : ""} type="button" onClick={() => setLanguage("id")}>ID</button>
              <button className={language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>EN</button>
            </div>
          </div>
          <button type="button" onClick={() => setEdit(true)}>
            <span>
              <Icon name="user" size={19} />
            </span>
            <p>
              <b>Profil pet parent</b>
              <small>{account.full_name}</small>
            </p>
            <Icon name="chevron" size={17} />
          </button>
          <button
            type="button"
            onClick={() => onOpenNotifications()}
          >
            <span>
              <Icon name="bell" size={19} />
            </span>
            <p>
              <b>Notifikasi</b>
              <small>Buka daftar dan detail update</small>
            </p>
            <Icon name="chevron" size={17} />
          </button>
          <button
            type="button"
            onClick={() => onOpenNotifications("security")}
          >
            <span>
              <Icon name="shield" size={19} />
            </span>
            <p>
              <b>Privasi & keamanan</b>
              <small>Tinjau notifikasi keamanan akun</small>
            </p>
            <Icon name="chevron" size={17} />
          </button>
          <button
            type="button"
            onClick={() =>
              familyPet
                ? setFamilyOpen(true)
                : notify("Tambahkan pet sebelum mengatur akses keluarga.")
            }
          >
            <span>
              <Icon name="users" size={19} />
            </span>
            <p>
              <b>Keluarga & akses</b>
              <small>Kelola orang tepercaya untuk pet</small>
            </p>
            <Icon name="chevron" size={17} />
          </button>
        </section>
      </aside>
      {edit && (
        <ProfileEditModal
          account={account}
          close={() => setEdit(false)}
          notify={notify}
          changed={onChanged}
        />
      )}{" "}
      {familyOpen && familyPet && (
        <FamilyModal
          pet={familyPet}
          close={() => setFamilyOpen(false)}
          notify={notify}
        />
      )}
      {addressModalOpen && (
        <ShippingAddressModal
          account={account}
          current={editingAddress}
          currentLocation={currentLocation}
          onOpenLocation={onOpenLocation}
          close={() => setAddressModalOpen(false)}
          notify={notify}
          onSaved={(address) => {
            setShippingAddresses((current) => {
              const exists = current.some((item) => item.id === address.id);
              return exists
                ? current.map((item) =>
                    item.id === address.id ? address : item,
                  )
                : [address, ...current];
            });
            setAddressModalOpen(false);
          }}
        />
      )}
      {confirmLogout && (
        <div
          className="modal-overlay"
          onMouseDown={() => setConfirmLogout(false)}
        >
          <section
            className="modal confirm-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setConfirmLogout(false)}
            >
              <Icon name="close" />
            </button>
            <span className="section-eyebrow">KONFIRMASI KELUAR</span>
            <h2>Keluar dari akun?</h2>
            <p>
              Sesi Slivadoc di perangkat ini akan diakhiri. Data dan profil pet
              tetap aman.
            </p>
            <footer>
              <button
                className="secondary-button"
                onClick={() => setConfirmLogout(false)}
              >
                Tetap masuk
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  notify("Kamu sudah keluar dari akun");
                  onLogout();
                }}
              >
                Ya, keluar
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
function ProfileEditModal({
  account,
  close,
  notify,
  changed,
}: {
  account: PetOwnerBootstrap["user"];
  close: () => void;
  notify: Notify;
  changed: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [fullNameOverride, setFullNameOverride] = useState<string | null>(null);
  const [phoneOverride, setPhoneOverride] = useState<string | null>(null);
  const fullName = fullNameOverride ?? account.full_name;
  const phone = phoneOverride ?? account.phone ?? "";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = fullName.trim();
    const normalizedPhone = phone.trim();
    if (normalizedName.length < 2) {
      notify("Nama lengkap minimal 2 karakter.");
      return;
    }
    if (normalizedPhone && !/^0[0-9]{8,15}$/.test(normalizedPhone)) {
      notify("Nomor telepon harus diawali 0 dan berisi 9 sampai 16 angka.");
      return;
    }
    setBusy(true);
    try {
      await updatePetOwnerProfile({
        full_name: normalizedName,
        phone: normalizedPhone,
      });
      await changed();
      notify("Profil berhasil diperbarui");
      close();
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Profil belum dapat diperbarui",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal form-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close} aria-label="Tutup edit profil">
          <Icon name="close" />
        </button>
        <span className="section-eyebrow">DATA AKUN</span>
        <h2>Edit profil pet parent</h2>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span>Nama lengkap</span>
            <input
              name="full_name"
              value={fullName}
              onChange={(event) => setFullNameOverride(event.target.value)}
              minLength={2}
              required
            />
          </label>
          <label>
            <span>Email login</span>
            <input value={account.email} disabled />
          </label>
          <label>
            <span>Nomor telepon</span>
            <input
              name="phone"
              value={phone}
              onChange={(event) => setPhoneOverride(event.target.value)}
              inputMode="tel"
              pattern="0[0-9]{8,15}"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
            />
          </label>
          <button className="primary-button full" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </form>
      </section>
    </div>
  );
}
function ServiceDetail({
  service,
  close,
  book,
}: {
  service: Service;
  close: () => void;
  book: () => void;
}) {
  const rating = service.rating > 0 ? service.rating.toFixed(1) : "Baru";
  const [detail, setDetail] = useState<DiscoveryServiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(Boolean(service.branchId));
  const [detailError, setDetailError] = useState("");
  const [serviceImageIndex, setServiceImageIndex] = useState(0);
  const [serviceViewerOpen, setServiceViewerOpen] = useState(false);
  useEffect(() => {
    let active = true;
    if (!service.branchId) return;
    void getDiscoveryService(service.id, service.branchId)
      .then((result) => {
        if (active) setDetail(result);
      })
      .catch((error) => {
        if (active)
          setDetailError(
            error instanceof Error
              ? error.message
              : "Detail layanan belum dapat dimuat.",
          );
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
  }, [service.branchId, service.id]);
  const licenseStatus =
    detail?.business_license_status ?? service.licenseStatus;
  const licenseLabel =
    licenseStatus === "verified"
      ? "Izin usaha terverifikasi"
      : licenseStatus === "pending"
        ? "Izin usaha sedang ditinjau"
        : licenseStatus === "rejected"
          ? "Izin usaha perlu diperbarui"
          : "Status izin belum tersedia";
  const inclusions = detail?.inclusions?.length
    ? detail.inclusions
    : (service.inclusions ?? []);
  const serviceImages = [
    ...new Set(
      [
        ...(detail?.image_urls ?? []),
        ...(service.imageUrls ?? []),
        service.imageUrl,
      ].filter((url): url is string => Boolean(url)),
    ),
  ];
  useEffect(() => {
    if (serviceImages.length < 2) return;
    const timer = window.setInterval(
      () =>
        setServiceImageIndex(
          (current) => (current + 1) % serviceImages.length,
        ),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [service.id, serviceImages.length]);
  const activeServiceImage = serviceImages[serviceImageIndex];
  const moveServiceImage = (direction: number) =>
    setServiceImageIndex(
      (current) =>
        (current + direction + serviceImages.length) % serviceImages.length,
    );
  return (
    <div className="modal-overlay service-detail-overlay" onMouseDown={close}>
      <section
        className="modal service-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal-close service-detail-close"
          onClick={close}
          aria-label="Tutup detail layanan"
        >
          <Icon name="close" />
        </button>
        <header className="service-detail-hero">
          <div className={`service-detail-visual ${service.accent}`}>
            {activeServiceImage ? (
              <button
                type="button"
                className="service-image-open"
                onClick={() => setServiceViewerOpen(true)}
                aria-label={`Buka galeri ${service.name}`}
              >
                <Image
                  className="catalog-cover-image"
                  src={activeServiceImage}
                  alt={`Gambar ${service.name}`}
                  fill
                  sizes="230px"
                  unoptimized
                />
              </button>
            ) : (
              <span>{service.emoji}</span>
            )}
            <em>{service.type}</em>
            <i>
              {licenseStatus === "verified"
                ? "✓ IZIN TERVERIFIKASI"
                : "MITRA AKTIF"}
            </i>
            {serviceImages.length > 1 ? (
              <div className="service-image-pager">
                <button type="button" onClick={() => moveServiceImage(-1)} aria-label="Gambar sebelumnya">‹</button>
                <span>{serviceImageIndex + 1}/{serviceImages.length}</span>
                <button type="button" onClick={() => moveServiceImage(1)} aria-label="Gambar berikutnya">›</button>
              </div>
            ) : null}
          </div>
          <div className="service-detail-heading">
            <span className="service-verified-pill">
              <Icon name="shield" size={13} /> {licenseLabel}
            </span>
            <h2 id="service-detail-title">{service.name}</h2>
            <p>
              <Icon name="map" size={15} />
              <span>{service.address}</span>
            </p>
            <div className="service-detail-live">
              <i />
              <b>{service.status}</b>
              <span>·</span>
              <span>{service.distance} dari lokasi kamu</span>
            </div>
          </div>
        </header>
        <div className="service-detail-body">
          <section className="service-detail-highlight">
            <div>
              <span className="detail-highlight-icon">★</span>
              <p>
                <b>{rating}</b>
                <small>
                  {service.reviews > 0
                    ? `${service.reviews.toLocaleString("id-ID")} ulasan pet parent`
                    : "Mitra baru"}
                </small>
              </p>
            </div>
            <div>
              <span className="detail-highlight-icon mint">Rp</span>
              <p>
                {service.originalPrice ? <s className="service-detail-old-price">{formatRupiah(service.originalPrice)}</s> : null}
                <b>{service.price}</b>
                <small>{service.discountPercent ? `Promo hemat ${service.discountPercent}%` : "Estimasi biaya layanan"}</small>
              </p>
            </div>
            <div>
              <span className="detail-highlight-icon violet">
                <Icon name="clock" size={17} />
              </span>
              <p>
                <b>Siap dipesan</b>
                <small>Jadwal dipilih saat booking</small>
              </p>
        </div>
        {serviceViewerOpen && activeServiceImage ? (
          <div
            className="world-image-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Galeri ${service.name}`}
            onMouseDown={() => setServiceViewerOpen(false)}
          >
            <button type="button" className="world-image-close" onClick={() => setServiceViewerOpen(false)} aria-label="Tutup galeri">×</button>
            <div className="world-image-lightbox-frame" onMouseDown={(event) => event.stopPropagation()}>
              <Image src={activeServiceImage} alt={`Gambar ${service.name}`} fill sizes="100vw" unoptimized priority />
            </div>
            {serviceImages.length > 1 ? (
              <>
                <button type="button" className="world-image-prev" onClick={(event) => { event.stopPropagation(); moveServiceImage(-1); }} aria-label="Gambar sebelumnya">‹</button>
                <button type="button" className="world-image-next" onClick={(event) => { event.stopPropagation(); moveServiceImage(1); }} aria-label="Gambar berikutnya">›</button>
                <span className="world-image-count">{serviceImageIndex + 1} / {serviceImages.length}</span>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
          <section className="service-detail-section">
            <div className="service-detail-section-title">
              <span>INFORMASI LAYANAN</span>
              <h3>Yang tersedia untuk pet-mu</h3>
            </div>
            <div className="service-detail-benefits">
              {[...new Set([...service.tags, ...inclusions])].map((tag) => (
                <span key={tag}>
                  <i>
                    <Icon name="check" size={12} />
                  </i>
                  {tag}
                </span>
              ))}
            </div>
            <p className="service-detail-description">
              {detail?.description ||
                service.description ||
                "Deskripsi rinci belum dicantumkan oleh mitra."}
            </p>
          </section>
          {detailLoading && (
            <div className="service-detail-data-state" role="status">
              Menyinkronkan rincian layanan dari mitra…
            </div>
          )}
          {detailError && (
            <div className="service-detail-data-state error" role="alert">
              {detailError}
            </div>
          )}
          {detail && (
            <section className="service-detail-section service-detail-disclosures">
              <div className="service-detail-section-title">
                <span>PERSIAPAN & KEBIJAKAN</span>
                <h3>Yang perlu diketahui sebelum booking</h3>
              </div>
              <div className="service-detail-disclosure-grid">
                <div>
                  <b>Pet yang didukung</b>
                  <p>
                    {detail.supported_species.length
                      ? detail.supported_species.join(", ")
                      : "Belum dicantumkan oleh mitra"}
                  </p>
                </div>
                <div>
                  <b>Persiapan</b>
                  <p>
                    {detail.preparation.length
                      ? detail.preparation.join(" · ")
                      : "Tidak ada persiapan khusus yang dicantumkan"}
                  </p>
                </div>
                <div>
                  <b>Perawatan setelah layanan</b>
                  <p>
                    {detail.aftercare.length
                      ? detail.aftercare.join(" · ")
                      : "Belum ada instruksi lanjutan"}
                  </p>
                </div>
                <div>
                  <b>Pembatalan & perubahan jadwal</b>
                  <p>
                    {[detail.cancellation_policy, detail.reschedule_policy]
                      .filter(Boolean)
                      .join(" · ") || "Kebijakan belum dicantumkan oleh mitra"}
                  </p>
                </div>
              </div>
            </section>
          )}
          <aside className="service-detail-assurance">
            <span>
              <Icon name="shield" size={20} />
            </span>
            <div>
              <b>Booking lebih tenang bersama Slivadoc</b>
              <p>
                Informasi mitra, jadwal, aktivitas, dan status layanan tersimpan
                dalam satu alur yang mudah dipantau.
              </p>
            </div>
          </aside>
        </div>
        <footer className="service-detail-actions">
          <button className="secondary-button" type="button" onClick={close}>
            Kembali
          </button>
          <button className="primary-button" type="button" onClick={book}>
            Pilih jadwal & booking <Icon name="arrow" size={16} />
          </button>
        </footer>
      </section>
    </div>
  );
}

function activityDetailRows(
  item: PetOwnerActivityCenterItem,
): Array<[string, React.ReactNode]> {
  const date = (value?: string | null) =>
    value ? formatActivityDate(value) : "";
  const join = (...parts: Array<string | number | null | undefined>) =>
    parts.filter(Boolean).join(" · ");
  const range = (start?: string | null, end?: string | null) =>
    start && end ? `${date(start)} – ${date(end)}` : date(start);
  const place = [item.address, item.city].filter(Boolean).join(", ");
  const money = (value?: number) =>
    value === undefined ? "" : formatRupiah(value);
  switch (item.type) {
    case "booking":
      return [
        ["Jadwal", date(item.scheduled_at)],
        [
          "Layanan",
          join(
            item.service_name,
            item.service_duration_minutes
              ? `${item.service_duration_minutes} menit`
              : "",
          ),
        ],
        ["Klinik", join(item.business_name, item.branch_name)],
        ["Alamat", place],
        ["Pet", item.pet_name],
        ["Catatan", item.notes],
        [
          "Pembatalan",
          item.cancellable_until
            ? `Bisa dibatalkan hingga ${date(item.cancellable_until)}`
            : "",
        ],
      ];
    case "order": {
      const discount = (item.discount_amount ?? 0) + (item.points_discount ?? 0);
      return [
        [
          "Produk",
          item.items?.length ? (
            <ul>
              {item.items.map((line) => (
                <li key={line.product_id}>
                  {line.name} × {line.quantity}
                </li>
              ))}
            </ul>
          ) : (
            ""
          ),
        ],
        ["Subtotal", money(item.subtotal)],
        ["Ongkir", money(item.shipping_fee)],
        ["Diskon", discount ? `-${formatRupiah(discount)}` : ""],
        ["Total", money(item.total_amount ?? item.amount)],
        [
          "Pengiriman",
          item.shipments?.length ? (
            <div className="activity-shipments">
              {item.shipments.map((shipment) => (
                <ActivityShipmentCard key={shipment.id} shipment={shipment} />
              ))}
            </div>
          ) : (
            ""
          ),
        ],
      ];
    }
    case "consultation":
      return [
        [
          "Provider",
          join(
            item.provider_name,
            item.provider_type === "trainer" ? "Pet Trainer" : "Dokter hewan",
          ),
        ],
        ["Paket", join(item.plan_name, item.mode)],
        ["Jadwal", date(item.scheduled_at)],
        [
          "Durasi",
          item.duration_minutes ? `${item.duration_minutes} menit` : "",
        ],
        ["Pet", item.pet_name],
        ["Keluhan", item.complaint],
        ["Diagnosis", item.diagnosis],
        [
          item.provider_type === "trainer" ? "Rencana latihan" : "Catatan",
          item.doctor_notes,
        ],
        [
          "Follow-up",
          item.followup_until
            ? date(item.followup_until)
            : item.followup_days
              ? `${item.followup_days} hari`
              : "",
        ],
      ];
    case "academy":
      return [
        ["Program", item.program_title],
        ["Academy", item.academy_name],
        ["Trainer", item.trainer_name],
        [
          "Sesi berikutnya",
          item.scheduled_at ? (
            <>
              {join(range(item.scheduled_at, item.ends_at), item.location)}
              {item.online_url && (
                <>
                  {" · "}
                  <a href={item.online_url} target="_blank" rel="noreferrer">
                    Link kelas online
                  </a>
                </>
              )}
            </>
          ) : (
            ""
          ),
        ],
        [
          "Progres",
          item.progress_percent !== undefined ? (
            <>
              <div className="activity-progress">
                <span style={{ width: `${item.progress_percent}%` }} />
              </div>
              <small>
                {join(
                  `${item.progress_percent}%`,
                  item.progress_notes,
                  date(item.last_progress_at),
                )}
              </small>
            </>
          ) : (
            ""
          ),
        ],
        ["Peserta", join(item.participant_name, item.pet_name)],
      ];
    case "event":
      return [
        ["Waktu", range(item.scheduled_at, item.ends_at)],
        ["Lokasi", join(item.venue, place)],
        ["Tiket", item.ticket_quantity ? `${item.ticket_quantity} tiket` : ""],
        ["Pet", item.pet_name],
        [
          "Check-in",
          item.payment_status === "paid"
            ? item.status === "checked_in"
              ? "Sudah check-in"
              : "Belum check-in"
            : "",
        ],
      ];
    case "reservation":
      return [
        ["Tempat", join(item.spot_name, item.resource_name)],
        ["Waktu", range(item.scheduled_at, item.ends_at)],
        [
          "Tamu",
          item.guest_count !== undefined
            ? `${item.guest_count} orang · ${item.pet_count ?? 0} pet`
            : "",
        ],
        ["DP", money(item.deposit_amount)],
        [
          "Sisa dibayar di lokasi",
          item.remaining_amount ? formatRupiah(item.remaining_amount) : "",
        ],
        ["Lokasi", place],
      ];
    case "document":
      return [
        ["Layanan", item.product_name],
        [
          "Rute",
          item.origin_city && item.destination_city
            ? `${item.origin_city} → ${item.destination_city}`
            : "",
        ],
        ["Keberangkatan", date(item.departure_at)],
        [
          "Persyaratan kurang",
          item.status === "need_revision" &&
          item.missing_requirements?.length ? (
            <ul>
              {item.missing_requirements.map((requirement) => (
                <li key={requirement}>{requirement}</li>
              ))}
            </ul>
          ) : (
            ""
          ),
        ],
        [
          "Dokumen terbit",
          item.status === "issued" && item.issued_document_url ? (
            <a
              href={item.issued_document_url}
              target="_blank"
              rel="noreferrer"
            >
              Unduh dokumen
            </a>
          ) : (
            ""
          ),
        ],
        ["Pet", item.pet_name],
      ];
    case "donation":
      return [
        ["Campaign", item.fundraiser_title],
        ["Penerima", item.beneficiary_name],
        ["Pesan", item.message],
        [
          "Anonim",
          item.anonymous === undefined ? "" : item.anonymous ? "Ya" : "Tidak",
        ],
        ["Dibayar", date(item.paid_at)],
      ];
    case "hotel":
      return [
        ["Kamar", item.room_name],
        ["Klinik", join(item.business_name, item.branch_name)],
        [
          "Check-in",
          join(
            item.scheduled_at && `rencana ${date(item.scheduled_at)}`,
            item.checked_in_at && `aktual ${date(item.checked_in_at)}`,
          ),
        ],
        [
          "Check-out",
          join(
            item.ends_at && `rencana ${date(item.ends_at)}`,
            item.checked_out_at && `aktual ${date(item.checked_out_at)}`,
          ),
        ],
        ["Pet", item.pet_name],
      ];
    case "home_service":
      return [
        ["Kode", item.job_code],
        ["Layanan", item.service_type],
        ["Jadwal", date(item.scheduled_at)],
        ["Jemput di", item.pickup_address],
        ["Tujuan", item.destination_address],
        ["Driver", item.driver_name],
        ["Pet", item.pet_name],
      ];
  }
}

function ActivityShipmentCard({ shipment }: { shipment: ActivityShipment }) {
  const presentation = shipmentPresentation(shipment.status);
  return (
    <article className="activity-shipment">
      <b>{shipment.shipping_number}</b>
      <small>
        {[shipment.provider || "Lion Parcel", shipment.service_code]
          .filter(Boolean)
          .join(" · ")}{" "}
        · {presentation.label}
      </small>
      <div className="activity-progress">
        <span style={{ width: `${(presentation.stage / 3) * 100}%` }} />
      </div>
      <small>
        STT / AWB: {shipment.stt_no || "Menunggu scan Lion Parcel"} · Estimasi:{" "}
        {shipment.estimated_sla || "Mengikuti rute"}
      </small>
      {shipment.events.length > 0 && (
        <ul>
          {shipment.events.map((event) => (
            <li key={`${event.status_code}-${event.occurred_at}`}>
              <b>{event.description || event.status}</b>
              <small>
                {[event.location, formatActivityDate(event.occurred_at)]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function ActivityDetail({
  item,
  close,
  autoPay,
  onPaid,
  onRepeat,
}: {
  item: PetOwnerActivityCenterItem;
  close: () => void;
  autoPay: boolean;
  onPaid: () => Promise<void>;
  onRepeat: (item: PetOwnerActivityCenterItem) => void;
}) {
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const autoPayStarted = useRef(false);
  const meta = getActivityTypeMeta(item.type);
  const repeatLabel = activityRepeatLabels[item.type];
  const rows = activityDetailRows(item).filter(
    ([, value]) => value !== "" && value !== undefined && value !== null,
  );
  async function pay() {
    setPaying(true);
    setPayError("");
    try {
      setPayment(
        await createPaymentIntent(
          item.payment_reference_type,
          item.reference_id,
          "qris",
        ),
      );
    } catch (cause) {
      setPayError(
        cause instanceof Error ? cause.message : "Pembayaran belum dapat dibuka",
      );
    } finally {
      setPaying(false);
    }
  }
  useEffect(() => {
    if (!autoPay || autoPayStarted.current) return;
    autoPayStarted.current = true;
    queueMicrotask(() => void pay());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [now] = useState(() => Date.now());
  const canCancel =
    item.type === "booking" &&
    item.source !== "clinic" &&
    !!item.cancellable_until &&
    now <= Date.parse(item.cancellable_until);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [revisionDocs, setRevisionDocs] = useState<UploadedDocument[]>([]);
  const [revisionBusy, setRevisionBusy] = useState(false);
  async function cancelBooking() {
    setCancelBusy(true);
    setActionMessage("");
    try {
      const result = await cancelPetOwnerBooking(item.reference_id);
      setCancelOpen(false);
      setActionMessage(
        result.refund_queued
          ? "Booking dibatalkan. Dana akan dikembalikan setelah diverifikasi tim finance."
          : "Booking dibatalkan.",
      );
      await onPaid();
    } catch (cause) {
      setActionMessage(
        cause instanceof Error ? cause.message : "Booking belum dapat dibatalkan",
      );
    } finally {
      setCancelBusy(false);
    }
  }
  async function cancelOrder() {
    setCancelBusy(true);
    setActionMessage("");
    try {
      const result = await cancelPetOwnerOrder(item.reference_id);
      setCancelOpen(false);
      setActionMessage(
        result.refund_queued
          ? "Pesanan dibatalkan. Dana akan dikembalikan setelah diverifikasi tim finance."
          : "Pesanan dibatalkan.",
      );
      await onPaid();
    } catch (cause) {
      setCancelOpen(false);
      setActionMessage(
        cause instanceof Error ? cause.message : "Pesanan belum dapat dibatalkan",
      );
      // A 409 means the order moved on; resync so the button reflects it.
      if (cause instanceof ApiError && cause.status === 409)
        await onPaid().catch(() => undefined);
    } finally {
      setCancelBusy(false);
    }
  }
  const [returnFor, setReturnFor] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnError, setReturnError] = useState("");
  // Delivered parcels still inside the return window, plus those already requested.
  const returnRows =
    item.type === "order"
      ? (item.fulfillments ?? []).filter(
          (entry) =>
            entry.return_requested ||
            (entry.status === "delivered" &&
              !!entry.return_until &&
              now < Date.parse(entry.return_until)),
        )
      : [];
  async function submitReturn(fulfillmentId: string) {
    const reason = returnReason.trim();
    if (reason.length < 10 || reason.length > 1000) {
      setReturnError("Alasan retur harus 10 sampai 1000 karakter.");
      return;
    }
    setReturnBusy(true);
    setReturnError("");
    setActionMessage("");
    try {
      const result = await requestPetOwnerShopReturn(
        item.reference_id,
        fulfillmentId,
        reason,
      );
      setReturnFor("");
      setReturnReason("");
      setActionMessage(`Permintaan retur terkirim (${result.ticket_number})`);
      await onPaid();
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Permintaan retur belum dapat dikirim";
      if (cause instanceof ApiError && cause.code === "return_already_requested") {
        setReturnFor("");
        setActionMessage(message);
        await onPaid().catch(() => undefined);
      } else setReturnError(message);
    } finally {
      setReturnBusy(false);
    }
  }
  async function resubmitDocuments() {
    setRevisionBusy(true);
    setActionMessage("");
    try {
      // The backend replaces the whole list, so keep what was already uploaded.
      const current = await getMyDocumentRequests();
      const existing = (
        current.data.find((request) => request.id === item.reference_id)
          ?.submitted_documents ?? []
      ).flatMap((doc) =>
        typeof doc.requirement === "string" &&
        typeof doc.url === "string" &&
        !revisionDocs.some((next) => next.requirement === doc.requirement)
          ? [
              {
                requirement: doc.requirement,
                url: doc.url,
                file_name:
                  typeof doc.file_name === "string" ? doc.file_name : "",
                mime_type:
                  typeof doc.mime_type === "string" ? doc.mime_type : "",
              },
            ]
          : [],
      );
      await resubmitPetDocuments(item.reference_id, [
        ...existing,
        ...revisionDocs,
      ]);
      setRevisionDocs([]);
      setActionMessage("Dokumen terkirim dan sedang diverifikasi ulang.");
      await onPaid();
    } catch (cause) {
      setActionMessage(
        cause instanceof Error
          ? cause.message
          : "Dokumen belum dapat dikirim",
      );
    } finally {
      setRevisionBusy(false);
    }
  }
  const [invoiceHTML, setInvoiceHTML] = useState("");
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  // A paid item has a Slivadoc invoice; PetSpot deposits are receipted by the spot.
  const invoiceReferenceType =
    item.payment_status === "paid" &&
    item.payment_reference_type &&
    item.payment_reference_type !== "petspot_reservation"
      ? (item.payment_reference_type as Parameters<
          typeof getTransactionInvoiceHTML
        >[0])
      : null;
  async function openInvoice() {
    if (!invoiceReferenceType) return;
    setInvoiceBusy(true);
    setInvoiceError("");
    try {
      setInvoiceHTML(
        await getTransactionInvoiceHTML(invoiceReferenceType, item.reference_id),
      );
    } catch (error) {
      setInvoiceError(
        error instanceof Error ? error.message : "Invoice belum dapat dibuka",
      );
    } finally {
      setInvoiceBusy(false);
    }
  }
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        className="modal activity-detail-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={close} aria-label="Tutup">
          <Icon name="close" />
        </button>
        <header className="activity-detail-hero">
          <span>
            <Icon name={meta.icon} size={24} />
          </span>
          <div>
            <small>{meta.label.toUpperCase()}</small>
            <h2>{item.title}</h2>
            <em>{activityStatusLabel(item)}</em>
          </div>
        </header>
        <div className="activity-detail-copy">
          <span className="activity-detail-label">RINGKASAN AKTIVITAS</span>
          <p>{[item.code, item.subtitle].filter(Boolean).join(" · ")}</p>
        </div>
        {item.type === "event" &&
          item.payment_status === "paid" &&
          (item.status === "confirmed" || item.status === "checked_in") &&
          item.qr_token && (
            <div className="activity-ticket">
              <QRCodeSVG
                value={item.qr_token}
                size={200}
                marginSize={2}
                title="QR tiket event"
              />
              <b>{item.qr_token.slice(0, 13).toUpperCase()}</b>
              <small>Tunjukkan QR ini ke petugas saat check-in.</small>
            </div>
          )}
        {rows.length > 0 && (
          <dl>
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {item.amount > 0 && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label">Status pembayaran</span>
            <p>
              <b>
                {item.payable
                  ? "Menunggu pembayaran"
                  : activityStatusText(item.payment_status)}
              </b>{" "}
              · {formatRupiah(item.amount)}
            </p>
            {item.payable && !payment && (
              <button
                className="primary-button full"
                type="button"
                disabled={paying}
                onClick={() => void pay()}
              >
                Bayar sekarang
              </button>
            )}
            {payError && <p className="form-message">{payError}</p>}
            {payment && (
              <QrisPaymentPanel payment={payment} onPaid={() => void onPaid()} />
            )}
          </div>
        )}
        {item.type === "booking" &&
          item.source !== "clinic" &&
          item.cancellable_until &&
          (item.status === "requested" || item.status === "confirmed") && (
            <div className="activity-detail-copy">
              <span className="activity-detail-label">Pembatalan</span>
              {canCancel ? (
                <>
                  <p>
                    Bisa dibatalkan hingga{" "}
                    {item.cancellation_cutoff_hours ?? 24} jam sebelum jadwal.
                  </p>
                  <button
                    className="secondary-button full"
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => setCancelOpen(true)}
                  >
                    Batalkan booking
                  </button>
                </>
              ) : (
                <p>
                  Batas pembatalan sudah lewat. Hubungi klinik untuk perubahan.
                </p>
              )}
              {cancelOpen && (
                <div className="form-message" role="alertdialog">
                  <p>
                    {item.cancellation_policy ||
                      "Booking yang dibatalkan tidak dapat dipulihkan."}
                  </p>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => void cancelBooking()}
                  >
                    {cancelBusy ? "Membatalkan…" : "Ya, batalkan"}
                  </button>{" "}
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => setCancelOpen(false)}
                  >
                    Tidak jadi
                  </button>
                </div>
              )}
            </div>
          )}
        {item.type === "order" && item.cancellable && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label">Pembatalan</span>
            <p>Pesanan dapat dibatalkan sebelum penjual memprosesnya.</p>
            <button
              className="secondary-button full"
              type="button"
              disabled={cancelBusy}
              onClick={() => setCancelOpen(true)}
            >
              Batalkan pesanan
            </button>
            {cancelOpen && (
              <div className="form-message" role="alertdialog">
                <p>
                  Batalkan pesanan ini? Pesanan yang dibatalkan tidak dapat
                  dipulihkan.
                </p>
                <button
                  className="primary-button"
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => void cancelOrder()}
                >
                  {cancelBusy ? "Membatalkan…" : "Ya, batalkan"}
                </button>{" "}
                <button
                  className="secondary-button"
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => setCancelOpen(false)}
                >
                  Tidak jadi
                </button>
              </div>
            )}
          </div>
        )}
        {returnRows.length > 0 && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label">Retur</span>
            {returnRows.map((entry) => (
              <div key={entry.id}>
                <p>
                  <b>{entry.business_name}</b>
                  {entry.return_until && !entry.return_requested
                    ? ` · retur hingga ${formatActivityDate(entry.return_until)}`
                    : ""}
                </p>
                {entry.return_requested ? (
                  <p>
                    <b>Retur diajukan</b>
                  </p>
                ) : returnFor === entry.id ? (
                  <div className="form-message">
                    <label>
                      <span>Alasan retur</span>
                      <textarea
                        value={returnReason}
                        maxLength={1000}
                        rows={3}
                        disabled={returnBusy}
                        onChange={(event) => setReturnReason(event.target.value)}
                        placeholder="Jelaskan kendala pada barang yang diterima (minimal 10 karakter)"
                      />
                    </label>
                    {returnError && <p role="alert">{returnError}</p>}
                    <button
                      className="primary-button"
                      type="button"
                      disabled={returnBusy}
                      onClick={() => void submitReturn(entry.id)}
                    >
                      {returnBusy ? "Mengirim…" : "Kirim permintaan retur"}
                    </button>{" "}
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={returnBusy}
                      onClick={() => setReturnFor("")}
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    className="secondary-button full"
                    type="button"
                    onClick={() => {
                      setReturnFor(entry.id);
                      setReturnError("");
                    }}
                  >
                    Ajukan retur
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {item.type === "document" && item.status === "need_revision" && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label">Lengkapi dokumen</span>
            <RequirementUploads
              requirements={item.missing_requirements ?? []}
              value={revisionDocs}
              onChange={setRevisionDocs}
              disabled={revisionBusy}
            />
            <button
              className="primary-button full"
              type="button"
              disabled={
                revisionBusy ||
                !(item.missing_requirements ?? []).every((requirement) =>
                  revisionDocs.some((doc) => doc.requirement === requirement),
                )
              }
              onClick={() => void resubmitDocuments()}
            >
              {revisionBusy ? "Mengirim…" : "Kirim dokumen"}
            </button>
          </div>
        )}
        {actionMessage && <p className="form-message">{actionMessage}</p>}
        <footer>
          {item.latitude != null && item.longitude != null && (
            <a
              className="secondary-button"
              href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="map" size={16} /> Petunjuk arah
            </a>
          )}
          {invoiceReferenceType ? (
            <button
              className="secondary-button"
              type="button"
              disabled={invoiceBusy}
              onClick={() => void openInvoice()}
            >
              <Icon name="download" size={16} />
              {invoiceBusy ? "Membuka invoice…" : "Buka invoice Slivadoc"}
            </button>
          ) : null}
          {repeatLabel && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                close();
                onRepeat(item);
              }}
            >
              <Icon name="arrow" size={16} /> {repeatLabel}
            </button>
          )}
          <button className="primary-button" type="button" onClick={close}>
            Selesai
          </button>
        </footer>
        {invoiceError ? (
          <div className="activity-invoice-error" role="alert">
            {invoiceError}
          </div>
        ) : null}
      </section>
      {invoiceHTML ? (
        <div
          className="activity-invoice-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Invoice Slivadoc"
          onMouseDown={() => setInvoiceHTML("")}
        >
          <header onMouseDown={(event) => event.stopPropagation()}>
            <span><Icon name="download" size={18} /></span>
            <div><small>DOKUMEN TRANSAKSI</small><b>{item.title}</b></div>
            <button type="button" onClick={() => setInvoiceHTML("")} aria-label="Tutup invoice"><Icon name="close" size={19} /></button>
          </header>
          <iframe
            title={`Invoice ${item.title}`}
            srcDoc={invoiceHTML}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

function FavoritesView({
  services,
  products,
  openBooking,
  addToCart,
  remove,
}: {
  services: Service[];
  products: Product[];
  openBooking: (service: Service) => void;
  addToCart: (id: string) => void;
  remove: (type: string, id: string) => void | Promise<void>;
}) {
  const empty = !services.length && !products.length;
  return (
    <div>
      <div className="favorites-intro">
        <span>♡</span>
        <div>
          <h2>Koleksi favoritmu</h2>
          <p>
            Layanan dan produk favorit tersimpan pada akun di semua perangkat.
          </p>
        </div>
      </div>
      {services.length > 0 && (
        <>
          <div className="panel-heading">
            <div>
              <span className="section-eyebrow">LAYANAN</span>
              <h3>Favorit layanan</h3>
            </div>
          </div>
          <div className="service-list-grid">
            {services.map((service) => (
              <article
                className="service-result-card"
                key={`${service.id}:${service.branchId}`}
              >
                <div className={`service-result-cover ${service.accent}`}>
                  {service.imageUrl ? (
                    <Image
                      className="catalog-cover-image"
                      src={service.imageUrl}
                      alt={`Gambar ${service.name}`}
                      fill
                      sizes="(max-width: 620px) 100vw, 155px"
                      unoptimized
                    />
                  ) : (
                    <span>{service.emoji}</span>
                  )}
                  <em>{service.type}</em>
                  <button
                    className="favorite"
                    onClick={() => void remove("service", service.id)}
                    aria-label={`Hapus ${service.name} dari favorit`}
                  >
                    <Icon name="heart" />
                  </button>
                </div>
                <div className="service-result-body">
                  <h3>{service.name}</h3>
                  <p>{service.address}</p>
                  <div className="service-result-footer">
                    <b>{service.price}</b>
                    <button
                      className="primary-button small"
                      onClick={() => openBooking(service)}
                    >
                      Booking
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {products.length > 0 && (
        <>
          <div className="panel-heading favorite-product-heading">
            <div>
              <span className="section-eyebrow">PRODUK</span>
              <h3>Favorit produk</h3>
            </div>
          </div>
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-visual">
                  {product.imageUrl ? (
                    <Image
                      className="catalog-cover-image"
                      src={product.imageUrl}
                      alt={`Gambar ${product.name}`}
                      fill
                      sizes="(max-width: 580px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <span>{product.emoji}</span>
                  )}
                  <button
                    className="favorite"
                    onClick={() => void remove("product", product.id)}
                    aria-label={`Hapus ${product.name} dari favorit`}
                  >
                    <Icon name="heart" />
                  </button>
                </div>
                <div className="product-body">
                  <small>{product.brand}</small>
                  <h3>{product.name}</h3>
                  <div className="product-price">
                    <b>{formatRupiah(product.price)}</b>
                    <button onClick={() => addToCart(product.id)}>
                      <Icon name="plus" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {empty && (
        <div className="empty-state">
          <span>♡</span>
          <h3>Belum ada favorit</h3>
          <p>
            Tekan ikon hati di Jelajahi atau Pet Shop untuk menyimpan pilihan.
          </p>
        </div>
      )}
    </div>
  );
}

function NotificationDetail({ item, onBack, onOpen }: {
  item: NotificationItem;
  onBack: () => void;
  onOpen: () => void;
}) {
  return (
    <article className="notification-detail panel">
      <button type="button" className="ghost-text" onClick={onBack}>← Kembali ke semua update</button>
      <span className="section-eyebrow">{item.category} · {item.read_at ? "Sudah dibaca" : "Belum dibaca"}</span>
      <h2>{item.title}</h2>
      <p>{item.body}</p>
      <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("id-ID")}</time>
      {item.action_route ? <button type="button" className="primary-button full" onClick={onOpen}>Buka halaman terkait</button> : null}
    </article>
  );
}

function NotificationCenter({
  items,
  setItems,
  unread,
  loadAll,
  notify,
  onOpen,
}: {
  items: NotificationItem[];
  setItems: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  unread: number;
  loadAll: () => Promise<void>;
  notify: Notify;
  onOpen: (item: NotificationItem) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = items.find((item) => item.id === selectedId);
  const [category, setCategory] = useState("");
  // The bootstrap slice holds only the latest few; the center shows up to 100.
  useEffect(() => {
    void loadAll().catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const categories = [...new Set(items.map((item) => item.category))];
  const visible = category
    ? items.filter((item) => item.category === category)
    : items;
  async function open(item: NotificationItem) {
    setSelectedId(item.id);
    try {
      if (!item.read_at) {
        await readNotification(item.id);
        setItems((current) =>
          current.map((value) =>
            value.id === item.id
              ? { ...value, read_at: new Date().toISOString() }
              : value,
          ),
        );
      }

    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Notifikasi belum dapat dibuka",
      );
    }
  }
  if (selected) return <NotificationDetail item={selected} onBack={() => setSelectedId("")} onOpen={() => onOpen(selected)} />;
  return (
    <div>
      <div className="notification-center-head">
        <div>
          <b>{unread}</b>
          <span>belum dibaca</span>
        </div>
        <button
          disabled={unread === 0}
          onClick={async () => {
            await readAllNotifications(category);
            setItems((current) =>
              current.map((item) =>
                !category || item.category === category
                  ? {
                      ...item,
                      read_at: item.read_at || new Date().toISOString(),
                    }
                  : item,
              ),
            );
          }}
        >
          Tandai semua dibaca
        </button>
      </div>
      <div className="notification-filter-tabs">
        <button
          className={!category ? "active" : ""}
          onClick={() => setCategory("")}
        >
          Semua
        </button>
        {categories.map((value) => (
          <button
            key={value}
            className={category === value ? "active" : ""}
            onClick={() => setCategory(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <section className="panel notification-center-list">
        {visible.length ? (
          visible.map((item) => (
            <button
              className={!item.read_at ? "unread" : ""}
              key={item.id}
              onClick={() => void open(item)}
            >
              <span>
                {item.category === "health"
                  ? "🩺"
                  : item.category === "booking"
                    ? "📅"
                    : item.category === "points"
                      ? "✦"
                      : "🔔"}
              </span>
              <div>
                <small>{item.category.toUpperCase()}</small>
                <b>{item.title}</b>
                <p>{item.body}</p>
                <time>{new Date(item.created_at).toLocaleString("id-ID")}</time>
              </div>
              {!item.read_at && <i />}
            </button>
          ))
        ) : (
          <div className="empty-state compact">
            Tidak ada notifikasi pada kategori ini.
          </div>
        )}
      </section>
    </div>
  );
}

function MobileNav({
  activeView,
  setActiveView,
  cartCount,
  authenticated,
  onOpenChat,
}: {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  cartCount: number;
  authenticated: boolean;
  onOpenChat: () => void;
}) {
  const { t } = usePetOwnerI18n();
  const [more, setMore] = useState(false);
  const primaryIds: AppView[] = ["home", "shop", "community", "bookings"];
  const worldIds: AppView[] = worldFeatures.map((item) => item.mode);
  const moreIds: AppView[] = ["messages", "discover", "health", "profile"];
  const items = primaryIds
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is (typeof navItems)[number] => Boolean(item));
  const moreActive = more || !primaryIds.includes(activeView);
  return (
    <>
      <nav className="mobile-nav" aria-label="Navigasi utama">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className={activeView === item.id || (item.id === "world" && isWorldMode(activeView)) ? "active" : ""}
            onClick={() => {
              setMore(false);
              setActiveView(item.id);
            }}
          >
            <span>
              <Icon name={item.icon} size={22} />
            </span>
            <small>{t(item.label)}</small>
          </button>
        ))}
        <button
          type="button"
          className={moreActive ? "active" : ""}
          onClick={() => setMore(true)}
          aria-expanded={more}
        >
          <span>
            <Icon name="more" size={22} />
            {cartCount > 0 && <i>{cartCount}</i>}
          </span>
          <small>{t("Lainnya")}</small>
        </button>
      </nav>
      {more && (
        <div
          className="mobile-more-backdrop"
          onMouseDown={() => setMore(false)}
        >
          <section
            className="mobile-more-sheet"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>{t("Semua fitur Slivadoc").toUpperCase()}</span>
                <h2>{t("Mau ke mana?")}</h2>
              </div>
              <button onClick={() => setMore(false)} aria-label="Tutup">
                <Icon name="close" />
              </button>
            </header>
            <div className="mobile-more-content">
              <section className="mobile-more-group">
                <h3>{t("Akun & perawatan").toUpperCase()}</h3>
                <div className="mobile-more-grid">
              <button
                type="button"
                onClick={() => {
                  setMore(false);
                  onOpenChat();
                }}
              >
                <span>
                  <Icon name="chat" />
                </span>
                <b>SlivaCare</b>
              </button>
              {moreIds.map((id) => navItems.find((item) => item.id === id)!)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMore(false);
                      setActiveView(item.id);
                    }}
                  >
                    <span>
                      <Icon name={item.icon} />
                    </span>
                    <b>{t(item.id === "profile" && !authenticated ? "Masuk ke akun" : item.label)}</b>
                    {item.id === "shop" && cartCount > 0 && (
                      <em>{cartCount}</em>
                    )}
                  </button>
                ))}
                </div>
              </section>
              <section className="mobile-more-group mobile-more-world">
                <h3>SLIVA WORLD</h3>
                <p>{t("Semua fitur komunitas dan gaya hidup pet, langsung sekali tap.")}</p>
                <div className="mobile-more-grid">
                  {worldIds.map((id) => navItems.find((item) => item.id === id)!).map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setMore(false);
                        setActiveView(item.id);
                      }}
                    >
                      <span><Icon name={item.icon} /></span>
                      <b>{t(item.label)}</b>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function NotificationDrawer({
  onClose,
  initialCategory,
  notify,
  onOpen,
  items,
  setItems,
  seeAll,
}: {
  onClose: () => void;
  initialCategory: string;
  notify: Notify;
  onOpen: (item: NotificationItem) => void;
  items: NotificationItem[];
  setItems: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  seeAll: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const selected = items.find((item) => item.id === selectedId);
  const [category, setCategory] = useState(initialCategory);
  const categories = Array.from(
    new Set([initialCategory, ...items.map((item) => item.category)].filter(Boolean)),
  );
  const visibleItems = category
    ? items.filter((item) => item.category === category)
    : items;
  async function markAll() {
    try {
      await readAllNotifications(category);
      setItems((current) =>
        current.map((item) =>
          !category || item.category === category
            ? {
                ...item,
                read_at: item.read_at || new Date().toISOString(),
              }
            : item,
        ),
      );
      notify("Semua notifikasi ditandai dibaca");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Notifikasi belum dapat diperbarui",
      );
    }
  }
  async function open(item: NotificationItem) {
    setSelectedId(item.id);
    try {
    if (!item.read_at) {
      await readNotification(item.id);
      setItems((current) =>
        current.map((value) =>
          value.id === item.id
            ? { ...value, read_at: new Date().toISOString() }
            : value,
        ),
      );
    }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Notifikasi belum dapat diperbarui");
    }
  }
  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside
        className="drawer notification-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={selected ? "Detail notifikasi" : "Notifikasi"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-eyebrow">UPDATE TERBARU</span>
            <h2>{selected ? "Detail notifikasi" : "Notifikasi"}</h2>
          </div>
          <button type="button" aria-label="Tutup notifikasi" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {selected ? <NotificationDetail item={selected} onBack={() => setSelectedId("")} onOpen={() => { onClose(); onOpen(selected); }} /> : <>
        <div className="notification-category-chips" role="group" aria-label="Filter notifikasi">
          <button
            type="button"
            className={!category ? "active" : ""}
            aria-pressed={!category}
            onClick={() => setCategory("")}
          >
            Semua
          </button>
          {categories.map((value) => (
            <button
              type="button"
              key={value}
              className={category === value ? "active" : ""}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value === "security" ? "Keamanan" : value}
            </button>
          ))}
        </div>
        <button
          className="mark-read"
          type="button"
          disabled={!visibleItems.some((item) => !item.read_at)}
          onClick={() => void markAll()}
        >
          Tandai semua sudah dibaca
        </button>
        <div className="notification-list">
          {visibleItems.length ? (
            visibleItems.map((item) => (
              <Notification
                key={item.id}
                icon={
                  item.category === "health"
                    ? "💊"
                    : item.category === "order"
                      ? "📦"
                      : item.category === "points"
                        ? "✦"
                        : "🔔"
                }
                tone={
                  item.category === "health"
                    ? "mint"
                    : item.category === "points"
                      ? "yellow"
                      : "blue"
                }
                title={item.title}
                note={item.body}
                time={new Date(item.created_at).toLocaleString("id-ID")}
                unread={!item.read_at}
                onClick={() => void open(item)}
              />
            ))
          ) : (
            <div className="empty-state compact">
              Belum ada notifikasi pada kategori ini.
            </div>
          )}
        </div>
        <button className="full-soft-button" type="button" onClick={seeAll}>
          Lihat semua berdasarkan kategori
        </button>
        </>}
      </aside>
    </div>
  );
}

function BookingModal({
  service: initialService,
  pets,
  selectedPetId,
  onSelectPet,
  onClose,
  onBooked,
}: {
  service: Service;
  pets: Pet[];
  selectedPetId: string;
  onSelectPet: (petId: string) => void;
  onClose: () => void;
  onBooked: (bookingId: string) => Promise<void>;
}) {
  const pet = pets.find((item) => item.id === selectedPetId) ?? pets[0];
  const service = {
    ...initialService,
    priceValue: initialService.priceValue ?? 0,
  };
  const [step, setStep] = useState(1);
  const [availability, setAvailability] = useState<ServiceAvailability | null>(
    null,
  );
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState("");
  const [date, setDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const selectedDay = availability?.data.find((item) => item.date === date);
  const selectedSlot = selectedDay?.slots.find(
    (item) => item.starts_at === startsAt,
  );
  const refreshAvailability = useCallback(async () => {
    if (!service.branchId) {
      setAvailability(null);
      setAvailabilityError("Cabang layanan ini belum menerima booking.");
      setAvailabilityLoading(false);
      return;
    }
    setAvailabilityLoading(true);
    setAvailabilityError("");
    try {
      const result = await getDiscoveryServiceAvailability(
        service.id,
        service.branchId,
        { days: 14 },
      );
      setAvailability(result);
      const firstDay = result.data.find((item) => item.slots.length > 0);
      setDate((current) =>
        result.data.some(
          (item) => item.date === current && item.slots.length > 0,
        )
          ? current
          : (firstDay?.date ?? ""),
      );
      setStartsAt((current) =>
        result.data.some((item) =>
          item.slots.some((slot) => slot.starts_at === current),
        )
          ? current
          : (firstDay?.slots[0]?.starts_at ?? ""),
      );
      if (!firstDay) {
        setAvailabilityError(
          result.reason ||
            "Belum ada slot tersedia dalam 14 hari ke depan. Pilih layanan lain atau coba lagi nanti.",
        );
      }
    } catch (error) {
      setAvailability(null);
      setAvailabilityError(
        error instanceof Error
          ? error.message
          : "Jadwal layanan belum dapat dimuat.",
      );
    } finally {
      setAvailabilityLoading(false);
    }
  }, [service.branchId, service.id]);
  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAvailability(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshAvailability]);
  const formattedDate = startsAt
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: availability?.timezone,
      }).format(new Date(startsAt))
    : "Jadwal belum dipilih";
  async function confirm() {
    if (!pet?.id) {
      setMessage("Pilih profil pet terlebih dahulu sebelum membuat booking.");
      setStep(1);
      return;
    }
    if (!service.branchId || !startsAt || !selectedSlot) {
      setMessage("Pilih tanggal dan slot yang masih tersedia.");
      setStep(2);
      return;
    }
    if (!consent) {
      setMessage(
        "Persetujuan kebijakan pembatalan dan penggunaan data wajib diberikan.",
      );
      return;
    }
    if (service.priceValue > 0 && !paymentMethod) {
      setMessage("Tunggu hingga pembayaran QRIS tersedia.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const booking = await createPetOwnerBooking({
        pet_id: pet.id,
        service_id: service.id,
        branch_id: service.branchId,
        scheduled_at: startsAt,
        notes,
      });
      if (booking.amount > 0) {
        setPayment(
          await createPaymentIntent(
            "petowner_booking",
            booking.id,
            paymentMethod,
          ),
        );
      } else {
        await onBooked(booking.id);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Booking atau pembayaran belum dapat dibuat",
      );
      await refreshAvailability();
    } finally {
      setBusy(false);
    }
  }
  if (payment)
    return (
      <div className="modal-overlay">
        <div className="modal booking-modal qris-modal">
          <button className="modal-close" type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
          <QrisPaymentPanel
            payment={payment}
            onPaid={() => {
              void onBooked(payment.reference_id);
            }}
          />
        </div>
      </div>
    );
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal booking-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-eyebrow">BOOKING LAYANAN</span>
            <h2>{service.name}</h2>
          </div>
          <button className="modal-close" type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        <div className="stepper">
          {[1, 2, 3].map((item) => (
            <div key={item} className={step >= item ? "active" : ""}>
              <span>
                {step > item ? <Icon name="check" size={13} /> : item}
              </span>
              <small>
                {item === 1 ? "Layanan" : item === 2 ? "Jadwal" : "Konfirmasi"}
              </small>
            </div>
          ))}
        </div>
        {step === 1 && (
          <div className="booking-step">
            <div className="booking-step-intro">
              <span>1</span>
              <div><b>Untuk siapa booking ini?</b><small>Pilih pet supaya kebutuhan dan riwayatnya terhubung ke aktivitas.</small></div>
            </div>
            <label className="field-label">Pilih hewan</label>
            <div className="booking-pet-options">
              {pets.map((option) => (
                <button
                  className={`selected-pet-box ${option.id === pet?.id ? "selected" : ""}`}
                  type="button"
                  key={option.id}
                  onClick={() => onSelectPet(option.id)}
                >
                  <span>{option.avatar}</span>
                  <div>
                    <b>{option.name}</b>
                    <small>{option.breed} • {option.weight}</small>
                  </div>
                  <i>{option.id === pet?.id ? <Icon name="check" size={15} /> : null}</i>
                </button>
              ))}
            </div>
            <label className="field-label">Layanan yang dipilih</label>
            <div className="service-option selected">
              <span>{service.emoji}</span>
              <div>
                <b>{service.name}</b>
                <small>{service.tags.join(" · ")}</small>
              </div>
              <strong>{service.price}</strong>
              <i>
                <Icon name="check" size={13} />
              </i>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="booking-step">
            <div className="booking-step-intro">
              <span>2</span>
              <div><b>Pilih slot aktual dari cabang</b><small>Jadwal dan kapasitas disinkronkan langsung dari sistem mitra.</small></div>
            </div>
            <label className="field-label">Pilih tanggal</label>
            {availabilityLoading && (
              <div className="booking-availability-state" role="status">
                Menyinkronkan jadwal cabang…
              </div>
            )}
            {availabilityError && !availabilityLoading && (
              <div className="booking-availability-state error" role="alert">
                <span>{availabilityError}</span>
                <button
                  type="button"
                  onClick={() => void refreshAvailability()}
                >
                  Coba lagi
                </button>
              </div>
            )}
            <div className="date-options">
              {availability?.data
                .filter((item) => item.slots.length > 0)
                .map((item) => {
                  const localDate = new Date(`${item.date}T12:00:00`);
                  return (
                    <button
                      className={date === item.date ? "selected" : ""}
                      type="button"
                      key={item.date}
                      onClick={() => {
                        setDate(item.date);
                        setStartsAt(item.slots[0]?.starts_at ?? "");
                      }}
                    >
                      <small>
                        {localDate
                          .toLocaleDateString("id-ID", { weekday: "short" })
                          .toUpperCase()}
                      </small>
                      <b>{localDate.getDate()}</b>
                      <span>
                        {localDate.toLocaleDateString("id-ID", {
                          month: "short",
                        })}
                      </span>
                    </button>
                  );
                })}
            </div>
            <label className="field-label">Pilih waktu</label>
            <div className="time-options">
              {selectedDay?.slots.map((slot) => (
                <button
                  type="button"
                  key={slot.starts_at}
                  className={startsAt === slot.starts_at ? "selected" : ""}
                  onClick={() => setStartsAt(slot.starts_at)}
                >
                  {slot.local_time}
                  {slot.remaining_capacity <= 3 && (
                    <small>Sisa {slot.remaining_capacity}</small>
                  )}
                </button>
              ))}
            </div>
            <label className="field-label">
              Catatan khusus <small>(opsional)</small>
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              placeholder="Ceritakan keluhan atau kebutuhan khusus pet..."
            />
          </div>
        )}
        {step === 3 && (
          <div className="booking-step">
            <div className="booking-step-intro">
              <span>3</span>
              <div><b>Periksa sekali lagi</b><small>Pastikan pet, jadwal, biaya, dan kebijakan sudah sesuai.</small></div>
            </div>
            <div className="booking-summary">
              <div className={`summary-service ${service.accent}`}>
                {service.emoji}
              </div>
              <div>
                <span className="status-badge confirmed">
                  Slot dikonfirmasi server
                </span>
                <h3>{service.name}</h3>
                <p>{service.address}</p>
              </div>
            </div>
            <div className="summary-lines">
              <span>
                <small>Hewan</small>
                <b>
                  {pet?.avatar ?? "🐾"} {pet?.name ?? "Pet"}
                </b>
              </span>
              <span>
                <small>Layanan</small>
                <b>{service.name}</b>
              </span>
              <span>
                <small>Jadwal</small>
                <b>
                  {formattedDate} • {selectedSlot?.local_time ?? "-"}{" "}
                  {availability?.timezone ?? ""}
                </b>
              </span>
              <span className="total">
                <small>Total pembayaran</small>
                <span className="service-checkout-price">
                  {service.originalPrice ? <s>{formatRupiah(service.originalPrice)}</s> : null}
                  <b>{formatRupiah(service.priceValue || 0)}</b>
                  {service.discountPercent ? <em>Hemat {service.discountPercent}%</em> : null}
                </span>
              </span>
            </div>
            {service.priceValue > 0 && (
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={busy}
              />
            )}{" "}
            {notes && <p className="booking-note">Catatan: {notes}</p>}
            {service.cancellationCutoffHours !== undefined && (
              <p className="booking-note">
                Bisa dibatalkan hingga {service.cancellationCutoffHours} jam
                sebelum jadwal
              </p>
            )}
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />{" "}
              Saya menyetujui kebijakan pembatalan
              {service.cancellationPolicy
                ? ` (${service.cancellationPolicy})`
                : " yang dicantumkan mitra"}{" "}
              dan penggunaan data kesehatan.
            </label>
          </div>
        )}
        {message && <div className="form-message">{message}</div>}
        <footer>
          <button
            className="secondary-button"
            type="button"
            disabled={
              busy || (step === 2 && (!startsAt || availabilityLoading))
            }
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          >
            {step === 1 ? "Batal" : "Kembali"}
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={
              busy ||
              (step === 1 && !pet?.id) ||
              (step === 2 && (!startsAt || availabilityLoading)) ||
              (step === 3 && service.priceValue > 0 && !paymentMethod)
            }
            onClick={() => (step < 3 ? setStep(step + 1) : void confirm())}
          >
            {busy
              ? "Membuat pembayaran…"
              : step < 3
                ? "Lanjutkan"
                : service.priceValue > 0
                  ? "Lanjut ke pembayaran"
                  : "Konfirmasi booking"}{" "}
            <Icon name="arrow" size={16} />
          </button>
        </footer>
      </div>
    </div>
  );
}
type CartRegionLevel = "province" | "regency" | "district" | "village";
type CartRegionIDs = Record<CartRegionLevel, string>;
type CartRegions = Record<CartRegionLevel, RegionOption[]>;
type CartAddress = {
  name: string;
  phone: string;
  address: string;
  post_code: string;
};

const emptyCartRegionIDs = (): CartRegionIDs => ({
  province: "",
  regency: "",
  district: "",
  village: "",
});

const emptyCartRegions = (): CartRegions => ({
  province: [],
  regency: [],
  district: [],
  village: [],
});

function cartRegionLabel(value: string, prefixes: string[]) {
  const normalized = value.trim().replace(/\s+/g, " ").toUpperCase();
  const prefix = prefixes.find((candidate) => normalized.startsWith(candidate));
  return prefix ? normalized.slice(prefix.length).trim() : normalized;
}

function cartShippingArea(district: string, regency: string) {
  return `${cartRegionLabel(district, ["KECAMATAN ", "KEC. "])}, ${cartRegionLabel(
    regency,
    [
      "KABUPATEN ADMINISTRASI ",
      "KOTA ADMINISTRASI ",
      "KOTA ADM. ",
      "KABUPATEN ",
      "KAB. ",
      "KOTA ",
    ],
  )}`;
}

function isCartAddressComplete(address: CartAddress, regionIDs: CartRegionIDs) {
  return (
    address.name.trim().length >= 2 &&
    address.phone.trim().length >= 8 &&
    address.address.trim().length >= 8 &&
    /^\d{5}$/.test(address.post_code.trim()) &&
    Object.values(regionIDs).every(Boolean)
  );
}
function cheapestCartShippingRate(quote: ShippingQuote) {
  return quote.rates.reduce<ShippingQuote["rates"][number] | undefined>(
    (best, rate) => (!best || rate.fee < best.fee ? rate : best),
    undefined,
  );
}

function CartDrawer({
  cart,
  setCart,
  onClose,
  notify,
  productCatalog,
  onOpenAccount,
  account,
  points,
  rewardFormula,
  onRewardChanged,
  onCheckoutSuccess,
}: {
  cart: Record<string, number>;
  setCart: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onClose: () => void;
  notify: Notify;
  productCatalog: Product[];
  onOpenAccount: () => void;
  account: PetOwnerBootstrap["user"] | null;
  points: number;
  rewardFormula: RewardFormula;
  onRewardChanged: () => Promise<void>;
  onCheckoutSuccess: () => void;
}) {
  const [selectedCartIDs, setSelectedCartIDs] = useState<Set<string>>(
    () => new Set(Object.keys(cart)),
  );
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState("");
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [payment, setPayment] = useState<PaymentIntent | null>(null);
  const pendingOrder = useRef<{ id: string; key: string } | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "shipping">("cart");
  const [busy, setBusy] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [accountShippingAddress, setAccountShippingAddress] =
    useState<PetOwnerShippingAddress | null>(null);
  const [accountAddressLoading, setAccountAddressLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState<CartAddress>(() => ({
    name: account?.full_name ?? "",
    phone: account?.phone ?? "",
    address: "",
    post_code: "",
  }));
  const [shippingRegionIDs, setShippingRegionIDs] =
    useState<CartRegionIDs>(emptyCartRegionIDs);
  const [shippingRegions, setShippingRegions] =
    useState<CartRegions>(emptyCartRegions);
  const [shippingSelections, setShippingSelections] = useState<
    Record<string, string>
  >({});
  const [shippingBranchID, setShippingBranchID] = useState("");
  const [shippingOptions, setShippingOptions] = useState<ShippingQuote[]>([]);
  const [shippingRequired, setShippingRequired] = useState(false);
  const [quoteErrorState, setQuoteErrorState] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const [stockError, setStockError] = useState<{
    productID: string;
    availableStock?: number;
  } | null>(null);
  // The server's breakdown. Nothing in this drawer computes the platform fee or
  // a discount itself: the cart used to do exactly that and drifted away from
  // what checkout actually charged. The breakdown is stored with the cart it
  // was quoted for, so a stale total can never be shown against a newer cart.
  const [quoted, setQuoted] = useState<{
    key: string;
    value: OrderQuote;
  } | null>(null);
  useEffect(() => {
    let live = true;
    void getPetOwnerShippingAddresses()
      .then((result) => {
        if (!live) return;
        const address =
          result.addresses.find((item) => item.is_primary) ??
          result.addresses[0] ??
          null;
        setAccountShippingAddress(address);
        if (!address) {
          setShippingAddress({
            name: account?.full_name ?? "",
            phone: account?.phone ?? "",
            address: "",
            post_code: "",
          });
          setShippingRegionIDs(emptyCartRegionIDs());
          setShippingRegions(emptyCartRegions());
          return;
        }
        setShippingAddress({
          name: address.recipient_name,
          phone: address.phone,
          address: address.address,
          post_code: address.post_code,
        });
        setShippingRegionIDs({
          province: address.province.code,
          regency: address.regency.code,
          district: address.district.code,
          village: address.village.code,
        });
        setShippingRegions({
          province: [{ id: address.province.code, ...address.province }],
          regency: [{ id: address.regency.code, ...address.regency }],
          district: [{ id: address.district.code, ...address.district }],
          village: [{ id: address.village.code, ...address.village }],
        });
      })
      .catch((error) => {
        if (live)
          notify(
            error instanceof Error
              ? error.message
              : "Alamat belum dapat dimuat",
          );
      })
      .finally(() => {
        if (live) setAccountAddressLoading(false);
      });
    return () => {
      live = false;
    };
  }, [account?.full_name, account?.phone, notify]);
  const items = useMemo(
    () => productCatalog.filter((product) => cart[product.id]),
    [productCatalog, cart],
  );
  const selectedCartItems = useMemo(
    () => items.filter((item) => selectedCartIDs.has(item.id)),
    [items, selectedCartIDs],
  );
  const orderItems = useMemo(
    () =>
      selectedCartItems.map((product) => ({
        product_id: product.id,
        quantity: cart[product.id],
      })),
    [selectedCartItems, cart],
  );
  const allCartItemsSelected =
    items.length > 0 && selectedCartItems.length === items.length;
  const cartSubtotal = useMemo(
    () =>
      selectedCartItems.reduce(
        (total, item) => total + item.price * cart[item.id],
        0,
      ),
    [selectedCartItems, cart],
  );
  const shippingAddressComplete = isCartAddressComplete(
    shippingAddress,
    shippingRegionIDs,
  );
  const shippingInput = useMemo<OrderShippingInput | undefined>(() => {
    if (!shippingAddressComplete) return undefined;
    const regency = shippingRegions.regency.find(
      (item) => item.id === shippingRegionIDs.regency,
    );
    const district = shippingRegions.district.find(
      (item) => item.id === shippingRegionIDs.district,
    );
    if (!regency || !district) return undefined;
    return {
      address: {
        ...shippingAddress,
        name: shippingAddress.name.trim(),
        phone: shippingAddress.phone.trim(),
        address: shippingAddress.address.trim(),
        post_code: shippingAddress.post_code.trim(),
        area: cartShippingArea(district.name, regency.name),
        email: account?.email,
        geoloc:
          accountShippingAddress?.latitude != null &&
          accountShippingAddress.longitude != null
            ? `${accountShippingAddress.latitude},${accountShippingAddress.longitude}`
            : undefined,
      },
      shipment_type: "PICKUP",
      use_insurance: false,
      branch_id: shippingBranchID || undefined,
      selections: Object.entries(shippingSelections).map(
        ([branch_id, service_code]) => ({ branch_id, service_code }),
      ),
    };
  }, [
    account?.email,
    accountShippingAddress,
    shippingAddress,
    shippingAddressComplete,
    shippingBranchID,
    shippingRegionIDs,
    shippingRegions,
    shippingSelections,
  ]);
  const authenticatedForQuote = isPetOwnerAuthenticated();
  const quoteKey = JSON.stringify([
    orderItems,
    appliedVoucher,
    redeemPoints,
    authenticatedForQuote,
    checkoutStep,
    shippingInput ?? (shippingRequired ? "shipping-required" : "no-shipping"),
  ]);
  const quote = quoted?.key === quoteKey ? quoted.value : null;
  const quoteError =
    checkoutStep === "shipping"
      ? quote
        ? ""
        : quoteErrorState?.key === quoteKey
          ? quoteErrorState.message
          : orderItems.length > 0 && !authenticatedForQuote
            ? "Login diperlukan untuk menghitung total keranjang"
            : accountAddressLoading
              ? "Memuat alamat pengiriman…"
              : !accountShippingAddress
                ? "Tambahkan alamat pengiriman di Akun"
                : shippingRequired && !shippingInput
                  ? "Alamat pengiriman belum siap dihitung"
                  : ""
      : "";
  const shippingFormVisible = checkoutStep === "shipping";
  const singleBranchOptions =
    shippingOptions.length > 1 &&
    new Set(shippingOptions.map((shipment) => shipment.business_id)).size === 1
      ? shippingOptions
      : [];

  function returnToCartForUnavailableProduct(error: unknown) {
    if (
      !(error instanceof ApiError) ||
      error.code !== "product_unavailable" ||
      !error.productID
    ) {
      return false;
    }
    setStockError({
      productID: error.productID,
      ...(error.availableStock == null
        ? {}
        : { availableStock: error.availableStock }),
    });
    setQuoteErrorState(null);
    setCheckoutStep("cart");
    return true;
  }
  useEffect(() => {
    let live = true;
    if (
      checkoutStep !== "shipping" ||
      orderItems.length === 0 ||
      !authenticatedForQuote ||
      accountAddressLoading ||
      !accountShippingAddress ||
      (shippingRequired && !shippingInput)
    ) {
      return;
    }
    void quotePetOwnerOrder({
      items: orderItems,
      voucher_code: appliedVoucher,
      redeem_points: redeemPoints,
      ...(shippingInput ? { shipping: shippingInput } : {}),
    })
      .then((result) => {
        if (!live) return;
        if (result.shipping_ready && !shippingInput) {
          setShippingRequired(true);
          setQuoted(null);
          return;
        }
        if (shippingInput && result.shipping_quotes.length > 0) {
          const businessIDs = new Set(
            result.shipping_quotes.map((shipment) => shipment.business_id),
          );
          if (businessIDs.size === 1) {
            if (
              shippingOptions.length === 0 ||
              result.shipping_quotes.length > 1
            ) {
              setShippingOptions(result.shipping_quotes);
            }
            let selectedBranch = shippingBranchID
              ? result.shipping_quotes.find(
                  (shipment) => shipment.branch_id === shippingBranchID,
                )
              : undefined;
            if (!shippingBranchID) {
              selectedBranch = result.shipping_quotes[0];
              if (!selectedBranch) return;
              setShippingBranchID(selectedBranch.branch_id);
              setShippingSelections({});
              return;
            }
            if (selectedBranch) {
              const requested = shippingSelections[selectedBranch.branch_id];
              const selected = selectedBranch.rates.find(
                (rate) => rate.service_code === requested,
              );
              const cheapest = cheapestCartShippingRate(selectedBranch);
              const chosenRate = selected ?? cheapest;
              const nextSelections: Record<string, string> = chosenRate
                ? { [selectedBranch.branch_id]: chosenRate.service_code }
                : {};
              if (
                JSON.stringify(nextSelections) !==
                JSON.stringify(shippingSelections)
              ) {
                setShippingSelections(nextSelections);
                return;
              }
            }
          } else {
            const nextSelections: Record<string, string> = {};
            for (const shipment of result.shipping_quotes) {
              const requested = shippingSelections[shipment.branch_id];
              const selected = shipment.rates.find(
                (rate) => rate.service_code === requested,
              );
              const cheapest = cheapestCartShippingRate(shipment);
              const chosenRate = selected ?? cheapest;
              if (chosenRate)
                nextSelections[shipment.branch_id] = chosenRate.service_code;
            }
            if (
              JSON.stringify(nextSelections) !==
              JSON.stringify(shippingSelections)
            ) {
              setShippingSelections(nextSelections);
              return;
            }
          }
        }
        setShippingRequired(result.shipping_ready);
        setQuoteErrorState(null);
        setStockError(null);
        setQuoted({ key: quoteKey, value: result });
      })
      .catch((error) => {
        if (!live) return;
        setQuoted(null);
        if (returnToCartForUnavailableProduct(error)) return;
        if (error instanceof ApiError && error.code === "shipping_required") {
          setShippingRequired(true);
          setQuoteErrorState({
            key: quoteKey,
            message:
              "Lengkapi alamat dan pilih layanan Lion Parcel untuk menghitung total",
          });
          return;
        }
        setQuoteErrorState({
          key: quoteKey,
          message:
            error instanceof Error
              ? error.message
              : "Ringkasan keranjang belum dapat dihitung",
        });
      });
    return () => {
      live = false;
    };
    // orderItems is rebuilt on every render; quoteKey is its stable identity
    // together with voucher, redemption, shipping destination and service.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);
  const minimumRedemption =
    quote?.min_redemption_points ?? rewardFormula.min_redemption_points ?? 0;
  const maximumRedeemable = quote?.max_redeemable_points ?? 0;
  function update(id: string, amount: number) {
    setShippingBranchID("");
    setShippingOptions([]);
    setShippingSelections({});
    if ((cart[id] ?? 0) + amount <= 0) {
      setSelectedCartIDs((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      setStockError((current) => (current?.productID === id ? null : current));
    }
    setCart((current) => {
      const next = {
        ...current,
        [id]: Math.max(0, (current[id] ?? 0) + amount),
      };
      if (!next[id]) delete next[id];
      return next;
    });
  }
  function toggleCartItem(id: string) {
    setShippingBranchID("");
    setShippingOptions([]);
    setShippingSelections({});
    setSelectedCartIDs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function deleteSelectedCartItems() {
    const ids = new Set(selectedCartItems.map((item) => item.id));
    if (ids.size === 0) return;
    setStockError((current) =>
      current && ids.has(current.productID) ? null : current,
    );
    setCart((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id]) => !ids.has(id)),
      ),
    );
    setSelectedCartIDs(new Set());
    setShippingBranchID("");
    setShippingOptions([]);
    setShippingSelections({});
  }
  async function applyVoucher() {
    const code = voucherInput.toUpperCase();
    setVoucherBusy(true);
    try {
      const result = await quotePetOwnerOrder({
        items: orderItems,
        voucher_code: code,
        redeem_points: redeemPoints,
        ...(shippingInput ? { shipping: shippingInput } : {}),
      });
      // A rejected code is not applied, so the breakdown that gets stored is
      // the one for an empty voucher: full price, plus the reason.
      const applied = result.voucher_error ? "" : code;
      setQuoteErrorState(null);
      setStockError(null);
      setShippingRequired(result.shipping_ready);
      setQuoted({
        key: JSON.stringify([
          orderItems,
          applied,
          redeemPoints,
          authenticatedForQuote,
          shippingInput ??
            (result.shipping_ready ? "shipping-required" : "no-shipping"),
        ]),
        value: result,
      });
      setAppliedVoucher(applied);
      if (result.voucher_error) {
        notify(result.voucher_error);
        return;
      }
      notify(
        `Voucher ${code} dipakai · potongan ${formatRupiah(result.voucher_discount)}`,
      );
    } catch (error) {
      if (returnToCartForUnavailableProduct(error)) return;
      if (error instanceof ApiError && error.code === "shipping_required") {
        setShippingRequired(true);
      }
      notify(
        error instanceof Error
          ? error.message
          : "Voucher belum dapat diverifikasi",
      );
    } finally {
      setVoucherBusy(false);
    }
  }
  async function checkout() {
    if (!isPetOwnerAuthenticated()) {
      notify("Login diperlukan untuk checkout Pet Shop");
      window.dispatchEvent(new CustomEvent("slivadoc:login-required"));
      return;
    }
    if (shippingRequired && !shippingInput) {
      notify("Lengkapi alamat pengiriman untuk melanjutkan");
      return;
    }
    if (!quote) {
      notify(quoteError || "Tunggu ringkasan keranjang selesai dihitung");
      return;
    }
    if (!paymentMethod) {
      notify("Tunggu hingga pembayaran QRIS tersedia.");
      return;
    }
    setBusy(true);
    // The order outlives a failed payment intent: retry pays it again instead
    // of creating a second order. A cart change makes the key differ.
    const key = JSON.stringify([
      orderItems,
      appliedVoucher,
      redeemPoints,
      shippingInput ?? null,
    ]);
    try {
      let orderID =
        pendingOrder.current?.key === key ? pendingOrder.current.id : "";
      if (!orderID) {
        const order = await createPetOwnerOrder({
          items: orderItems,
          voucher_code: appliedVoucher,
          redeem_points: redeemPoints,
          ...(shippingInput ? { shipping: shippingInput } : {}),
        });
        orderID = order.id;
        pendingOrder.current = { id: orderID, key };
      }
      try {
        setPayment(await createPaymentIntent("shop_order", orderID, paymentMethod));
      } catch (error) {
        // A 4xx means the order can no longer be paid (closed or expired).
        if (error instanceof ApiError && error.status < 500)
          pendingOrder.current = null;
        throw error;
      }
    } catch (error) {
      if (!returnToCartForUnavailableProduct(error)) {
        notify(
          error instanceof Error
            ? error.message
            : "Checkout belum dapat diproses",
        );
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay" onMouseDown={onClose}>
      <aside
        className="drawer cart-drawer"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="section-eyebrow">SLIVA PET SHOP</span>
            <h2>
              {payment
                ? "Pembayaran"
                : checkoutStep === "shipping"
                  ? "Pengiriman"
                  : "Keranjangmu"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            <Icon name="close" />
          </button>
        </header>
        {!payment && checkoutStep === "shipping" && (
          <button
            className="cart-back-button"
            type="button"
            onClick={() => setCheckoutStep("cart")}
          >
            ← Kembali ke keranjang
          </button>
        )}
        {payment ? (
          <QrisPaymentPanel
            payment={payment}
            onPaid={() => {
              pendingOrder.current = null;
              setCart({});
              onCheckoutSuccess();
              void onRewardChanged();
            }}
          />
        ) : items.length === 0 ? (
          <div className="empty-state compact">
            <span>🛒</span>
            <h3>Keranjang masih kosong</h3>
            <p>Yuk, pilih kebutuhan terbaik untuk mereka.</p>
            <button
              className="primary-button small"
              type="button"
              onClick={onClose}
            >
              Mulai belanja
            </button>
          </div>
        ) : (
          <>
            {checkoutStep === "cart" ? (
              <>
                <div className="cart-bulk-actions">
                  <button
                    type="button"
                    aria-pressed={allCartItemsSelected}
                    onClick={() =>
                      setSelectedCartIDs(
                        allCartItemsSelected
                          ? new Set()
                          : new Set(items.map((item) => item.id)),
                      )
                    }
                  >
                    {allCartItemsSelected ? "Batalkan pilihan" : "Pilih semua"}
                  </button>
                  {selectedCartItems.length > 0 && (
                    <button
                      className="cart-delete-selected"
                      type="button"
                      onClick={deleteSelectedCartItems}
                    >
                      Hapus dipilih ({selectedCartItems.length})
                    </button>
                  )}
                </div>
                <div className="cart-items">
                  {items.map((item) => {
                    const selected = selectedCartIDs.has(item.id);
                    const productStockError =
                      stockError?.productID === item.id ? stockError : null;
                    return (
                      <div className="cart-item" key={item.id}>
                        <button
                          className={`cart-item-select${selected ? " selected" : ""}`}
                          type="button"
                          aria-label={`${selected ? "Batalkan pilihan" : "Pilih"} ${item.name}`}
                          aria-pressed={selected}
                          onClick={() => toggleCartItem(item.id)}
                        >
                          <span>{item.emoji}</span>
                          <small>
                            {selected ? (
                              <Icon name="check" size={12} />
                            ) : (
                              "Pilih"
                            )}
                          </small>
                        </button>
                        <div>
                          <small>{item.brand}</small>
                          <b>{item.name}</b>
                          <strong>{formatRupiah(item.price)}</strong>
                          {productStockError && (
                            <small
                              className="cart-item-stock-warning"
                              role="status"
                            >
                              {productStockError.availableStock == null
                                ? "Produk tidak tersedia atau stok berubah. Sesuaikan jumlah atau hapus produk ini."
                                : `Stok tersedia: ${productStockError.availableStock.toLocaleString("id-ID")}. Sesuaikan jumlah lalu cek ulang pengiriman.`}
                            </small>
                          )}
                        </div>
                        <div className="quantity">
                          <button
                            type="button"
                            onClick={() => update(item.id, -1)}
                          >
                            −
                          </button>
                          <b>{cart[item.id]}</b>
                          <button
                            type="button"
                            onClick={() => update(item.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="cart-summary cart-cart-summary">
                  <span>
                    <small>
                      Subtotal {selectedCartItems.length} produk dipilih
                    </small>
                    <b>{formatRupiah(cartSubtotal)}</b>
                  </span>
                </div>
                <button
                  className="primary-button full"
                  type="button"
                  disabled={selectedCartItems.length === 0}
                  onClick={() => setCheckoutStep("shipping")}
                >
                  {selectedCartItems.length === 0
                    ? "Pilih produk untuk checkout"
                    : "Atur pengiriman"}{" "}
                  <Icon name="arrow" size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="cart-order-preview">
                  <span>
                    {selectedCartItems.length} produk dipilih ·{" "}
                    {formatRupiah(cartSubtotal)}
                  </span>
                  <button type="button" onClick={() => setCheckoutStep("cart")}>
                    Ubah keranjang
                  </button>
                </div>
                {shippingFormVisible && (
                  <section className="cart-shipping">
                    <div className="cart-shipping-heading">
                      <b>Alamat pengiriman</b>
                      <small>Alamat dikelola dari halaman Akun.</small>
                    </div>
                    {accountAddressLoading ? (
                      <p className="profile-address-muted">
                        Memuat alamat tersimpan…
                      </p>
                    ) : accountShippingAddress ? (
                      <div className="cart-shipping-saved">
                        <div>
                          <b>{accountShippingAddress.recipient_name}</b>
                          <span>{accountShippingAddress.phone}</span>
                          <p>{accountShippingAddress.address}</p>
                          <small>
                            {accountShippingAddress.village.name},{" "}
                            {accountShippingAddress.district.name},{" "}
                            {accountShippingAddress.regency.name} ·{" "}
                            {accountShippingAddress.post_code}
                          </small>
                        </div>
                        <button type="button" onClick={onOpenAccount}>
                          Ubah di Akun
                        </button>
                      </div>
                    ) : (
                      <div className="cart-shipping-empty">
                        <p>Belum ada alamat tersimpan untuk checkout.</p>
                        <button type="button" onClick={onOpenAccount}>
                          Tambah alamat di Akun
                        </button>
                      </div>
                    )}
                    {singleBranchOptions.length > 0 && (
                      <div className="cart-shipping-branches">
                        <small className="cart-shipping-branch-label">
                          PILIH CABANG PENGIRIMAN · DEFAULT TERDEKAT
                        </small>
                        <div className="cart-shipping-branch-options">
                          {singleBranchOptions.map((branch) => {
                            const cheapest = cheapestCartShippingRate(branch);
                            return (
                              <button
                                className={
                                  shippingBranchID === branch.branch_id
                                    ? "selected"
                                    : ""
                                }
                                type="button"
                                key={branch.branch_id}
                                onClick={() => {
                                  setShippingBranchID(branch.branch_id);
                                  setShippingSelections({});
                                }}
                              >
                                <b>{branch.branch_name}</b>
                                <span>{branch.origin}</span>
                                {branch.distance_km != null ? (
                                  <small>
                                    {branch.distance_km.toFixed(1)} km dari
                                    alamat
                                  </small>
                                ) : cheapest ? (
                                  <strong>{formatRupiah(cheapest.fee)}</strong>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {(singleBranchOptions.length > 0
                      ? quote?.shipping_quotes.filter(
                          (shipment) => shipment.branch_id === shippingBranchID,
                        )
                      : quote?.shipping_quotes
                    )?.map((shipment) => (
                      <div
                        className="cart-shipping-origin"
                        key={shipment.branch_id}
                      >
                        <small>
                          DIKIRIM DARI {shipment.branch_name} ·{" "}
                          {shipment.origin}
                        </small>
                        <div className="cart-shipping-rates">
                          {shipment.rates.map((rate) => (
                            <button
                              className={
                                shippingSelections[shipment.branch_id] ===
                                rate.service_code
                                  ? "selected"
                                  : ""
                              }
                              type="button"
                              key={rate.service_code}
                              onClick={() =>
                                setShippingSelections((current) => ({
                                  ...current,
                                  [shipment.branch_id]: rate.service_code,
                                }))
                              }
                            >
                              <b>{rate.service_code}</b>
                              <span>{formatRupiah(rate.fee)}</span>
                              <small>
                                {rate.estimated_sla || "Sesuai rute"}
                              </small>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}
                <label className="voucher">
                  <span>🎟️</span>
                  <input
                    value={voucherInput}
                    onChange={(event) => {
                      setVoucherInput(
                        event.target.value.replace(/[^A-Za-z0-9]/g, ""),
                      );
                      setAppliedVoucher("");
                    }}
                    minLength={6}
                    placeholder="Minimal 6 huruf/angka"
                  />
                  <button
                    type="button"
                    disabled={voucherInput.length < 6 || voucherBusy}
                    onClick={() => void applyVoucher()}
                  >
                    {voucherBusy ? "Memeriksa…" : "Pakai"}
                  </button>
                </label>
                {appliedVoucher && quote && quote.voucher_discount > 0 && (
                  <small className="voucher-applied">
                    Voucher {appliedVoucher} aktif · potongan{" "}
                    {formatRupiah(quote.voucher_discount)}
                    {quote.voucher_description
                      ? ` · ${quote.voucher_description}`
                      : ""}
                  </small>
                )}
                {rewardFormula.enabled &&
                  points > 0 &&
                  maximumRedeemable > 0 && (
                    <section className="points-redemption-card">
                      <div>
                        <span>✦</span>
                        <p>
                          <b>Pakai SlivaPoints</b>
                          <small>
                            Saldo {points.toLocaleString("id-ID")} · maksimal
                            checkout ini{" "}
                            {maximumRedeemable.toLocaleString("id-ID")} poin
                          </small>
                        </p>
                      </div>
                      <label>
                        <input
                          type="number"
                          min={minimumRedemption}
                          max={maximumRedeemable}
                          step="1"
                          value={redeemPoints || ""}
                          placeholder={`Min. ${minimumRedemption.toLocaleString("id-ID")}`}
                          onChange={(event) =>
                            setRedeemPoints(
                              Math.max(
                                0,
                                Math.min(
                                  maximumRedeemable,
                                  Number(event.target.value || 0),
                                ),
                              ),
                            )
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setRedeemPoints(maximumRedeemable)}
                        >
                          Maks
                        </button>
                      </label>
                      {redeemPoints > 0 && redeemPoints < minimumRedemption && (
                        <small>
                          Minimum penukaran{" "}
                          {minimumRedemption.toLocaleString("id-ID")} poin.
                        </small>
                      )}
                    </section>
                  )}
                {quoteError && <p className="cart-quote-error">{quoteError}</p>}
                <div className="cart-summary">
                  <span>
                    <small>Subtotal</small>
                    <b>{quote ? formatRupiah(quote.subtotal) : "…"}</b>
                  </span>
                  <span>
                    <small>Pengiriman</small>
                    <b>{quote ? formatRupiah(quote.shipping_fee) : "—"}</b>
                  </span>
                  <span>
                    <small>Biaya layanan</small>
                    <b>{quote ? formatRupiah(quote.platform_fee) : "…"}</b>
                  </span>
                  {quote && quote.voucher_discount > 0 && (
                    <span>
                      <small>Voucher ({quote.voucher_code})</small>
                      <b className="good">
                        −{formatRupiah(quote.voucher_discount)}
                      </b>
                    </span>
                  )}
                  {quote && quote.points_discount > 0 && (
                    <span>
                      <small>
                        SlivaPoints (
                        {quote.points_redeemed.toLocaleString("id-ID")})
                      </small>
                      <b className="good">
                        −{formatRupiah(quote.points_discount)}
                      </b>
                    </span>
                  )}
                  <span className="total">
                    <small>Total</small>
                    <b>
                      {quote
                        ? formatRupiah(quote.total_amount)
                        : quoteError
                          ? "Belum tersedia"
                          : "Menghitung…"}
                    </b>
                  </span>
                </div>
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  disabled={busy}
                />
                <button
                  className="primary-button full"
                  type="button"
                  disabled={busy || !paymentMethod}
                  onClick={() => void checkout()}
                >
                  {busy ? "Membuat pembayaran…" : "Lanjut ke pembayaran"}{" "}
                  <Icon name="arrow" size={16} />
                </button>
              </>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="progress-row">
      <span>
        <small>{label}</small>
        <b>{value}%</b>
      </span>
      <div>
        <i style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
function Notification({
  icon,
  tone,
  title,
  note,
  time,
  unread,
  onClick,
}: {
  icon: string;
  tone: string;
  title: string;
  note: string;
  time: string;
  unread?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`notification ${unread ? "unread" : ""}`}
      onClick={onClick}
    >
      <span className={tone}>{icon}</span>
      <p>
        <b>{title}</b>
        <small>{note}</small>
        <em>{time}</em>
      </p>
      {unread && <i />}
    </button>
  );
}

function downloadViewSummary(view: AppView) {
  const content = [
    `Slivadoc Pet Owner · ${titles[view].title}`,
    titles[view].subtitle,
    `Dibuat: ${new Date().toLocaleString("id-ID")}`,
    "",
    "Ringkasan ini dibuat dari informasi pada akun dan tampilan yang sedang aktif.",
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `slivadoc-${view}-summary.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
