"use client";
import { HorizontalTabPositioning } from "./HorizontalTabPositioning";
import { petOwnerIntlLocale } from "../lib/petowner-locale";
import { confirmSlivaDialog } from "./SlivaDialog";
import { LocalizedCopy, LocalizedButton, LocalizedInput, LocalizedTextarea } from "./LocalizedCopy";
import { SlivaDatePicker } from "./SlivaDatePicker";
import { useDialogFocus } from "./useDialogFocus";
import { PetOwnerFlowProvider, PetRequiredNotice, usePetOwnerFlow } from "./PetOwnerFlow";
import { WorldNavigation } from "./WorldNavigation";
import { featureSearchShortcuts, isWorldMode, worldFeatures, type PetOwnerWorldMode } from "../../shared/petowner-flow";
import { SlivaSelect } from "./SlivaSelect";
import { DiscountBadge } from "./DiscountBadge";

import { LocalizedImage as Image } from "./LocalizedCopy";
import { LocalizedLink as Link } from "./LocalizedCopy";
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
import ClinicDirectory from "./clinics/ClinicDirectory";
import SlivaCareDrawer from "./integrations/SlivaCareDrawer";
import PlatformDiscovery from "./platform/PlatformDiscovery";
import PawDatingExperience from "./pawdating/PawDatingExperience";
import { FundraisingView, PetshipView } from "./platform/PetshipFundraising";
import type { LocationResult } from "../lib/petowner-api";
import { CLINIC_ENTRY_POINT, recordStoreOpen } from "../lib/entry-point";
import { clinicTypeLabel, formatDistanceKm } from "../lib/clinic-directory";
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
  requestPetOwnerAccountDeletion,
  confirmPetOwnerAccountDeletion,
  cancelPetOwnerAccountDeletion,
  getPetOwnerAccountDeletionStatus,
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
  trackPetOwnerEvent,
  getDiscoveryBranches,
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
  type DiscoveryBranch,
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
        <b><LocalizedCopy>{"Menyiapkan pengalaman terbaik…"}</LocalizedCopy></b>
        <small><LocalizedCopy>{"Katalog dan jadwal dimuat saat dibutuhkan."}</LocalizedCopy></small>
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
      return `${method.label}: ${method.fixed_points.toLocaleString(petOwnerIntlLocale())} poin per transaksi`;
    if (method.mode === "transaction_divisor")
      return `${method.label}: ${method.points_per_unit.toLocaleString(petOwnerIntlLocale())} poin per ${formatRupiah(method.divisor)}`;
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
  { id: "clinics", label: "Klinik & Petshop", icon: "clinic" },
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
  { label: "Akun & perawatan", items: ["messages", "discover", "clinics", "world", "health", "profile"] },
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
  clinics: {
    title: "Klinik & Petshop",
    subtitle: "Klinik hewan dan petshop terdekat dari lokasimu.",
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

const featureSearchItems: GlobalSearchResult[] = [...featureSearchShortcuts, ...navItems.map((item) => ({
  category: "feature",
  id: item.id,
  title: item.label,
  subtitle: titles[item.id].subtitle,
  route: item.id,
}))];

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
      ? `Update medis ${new Date(pet.last_medical_record_at).toLocaleDateString(petOwnerIntlLocale())}`
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
  const { language } = usePetOwnerI18n();
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
        sold: `${Math.max(0, finiteNumber(item.sold_count) ?? 0).toLocaleString(petOwnerIntlLocale())} terjual`,
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
      url.searchParams.delete("branch");
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

  // Card click in Klinik & Petshop attributes the session to the menu and is
  // counted; the Home teaser and deep links open the same store unattributed.
  const openClinicBranch = (
    branch: DiscoveryBranch,
    { fromMenu = false, replace = false } = {},
  ) => {
    recordStoreOpen(fromMenu ? CLINIC_ENTRY_POINT : "other");
    if (fromMenu)
      void trackPetOwnerEvent({
        event: "clinic_card_click",
        branch_id: branch.branch_id,
        business_id: branch.business_id,
      }).catch(() => undefined);
    setActiveView("shop");
    window.localStorage.setItem("slivadoc.active_view", "shop");
    const url = new URL(window.location.href);
    url.searchParams.set("view", "shop");
    url.searchParams.set("store", branch.business_id);
    url.searchParams.set("branch", branch.branch_id);
    if (branch.type === "petclinic") url.searchParams.set("store_section", "services");
    else url.searchParams.delete("store_section");
    for (const key of ["product", "service", "service_type", "activity", "veterinarian"])
      url.searchParams.delete(key);
    window.history[replace ? "replaceState" : "pushState"](
      { view: "shop", store: branch.business_id, branch: branch.branch_id },
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
    recordStoreOpen("other");
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
    <div className="app-shell" lang={language}>
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

        <HorizontalTabPositioning/>
      <div className="page-content">
          <PageHeading
            activeView={activeView}
            selectedPet={selectedPet}
            account={account}
          />
          <LocalizedCopy>{isWorldMode(featureView) && featureView !== "petspot" ? <WorldNavigation active={featureView} onSelect={openWorld} /> : null}</LocalizedCopy>
          <PetRequiredNotice />
          <LocalizedCopy>{featureView === "home" && (
            <HomeView
              selectedPet={selectedPet}
              petProfiles={petProfiles}
              selectedPetId={selectedPetId}
              onSelectPet={setSelectedPetId}
              setActiveView={navigate}
              openServiceCatalog={openServiceCatalog}
              openClinicBranch={openClinicBranch}
              location={currentLocation}
              onOpenLocation={() => setLocationOpen(true)}
              openConsultation={openConsultation}
              setChatOpen={(open) => { if (!open || requireLogin()) setChatOpen(open); }}
              activities={activities}
              openActivity={openActivity}
              ownerName={account?.full_name}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "pets" && (
            <PetsView
              petProfiles={petProfiles}
              selectedPetId={selectedPetId}
              setSelectedPetId={setSelectedPetId}
              setAddPetOpen={(open) => { if (!open || requireLogin()) setAddPetOpen(open); }}
              setActiveView={navigate}
              notify={notify}
              onChanged={loadBootstrap}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "discover" && (
            <DiscoverView
              favorites={favoriteIds}
              toggleFavorite={(id) => void toggleFavorite("service", id)}
              openBooking={openBooking}
              notify={notify}
              serviceCatalog={serviceCatalog}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "clinics" && (
            <ClinicDirectory
              location={currentLocation}
              onOpenLocation={() => setLocationOpen(true)}
              onOpenBranch={openClinicBranch}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{!authenticated && (featureView === "bookings" || featureView === "messages") && (
            <section className="empty-state panel">
              <h2><LocalizedCopy>{featureView === "bookings" ? "Masuk untuk melihat aktivitas" : "Masuk untuk melihat chat"}</LocalizedCopy></h2>
              <p><LocalizedCopy>{"Booking, belanja, dan konsultasi tersimpan aman di akunmu."}</LocalizedCopy></p>
              <LocalizedButton type="button" className="primary-button" onClick={() => setLoginOpen(true)}><LocalizedCopy>{"Masuk ke akun"}</LocalizedCopy></LocalizedButton>
            </section>
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "bookings" && authenticated && (
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
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "health" && (
            <HealthView pet={selectedPet} notify={notify} />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "shop" && (
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
              location={currentLocation}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "community" && (
            <CommunityExperience
              notify={notify}
              onOpenLocation={() => setLocationOpen(true)}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{(["academy", "events", "petspot", "pethub"] as AppView[]).includes(
            featureView,
          ) && (
            <PlatformDiscovery
              key={`${featureView}:${navigationVersion}`}
              mode={featureView as "academy" | "events" | "petspot" | "pethub"}
              navigation={featureView === "petspot" ? <WorldNavigation active="petspot" onSelect={openWorld} embedded /> : undefined}
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
          )}</LocalizedCopy>
          <LocalizedCopy>{(["consult", "adoption", "documents"] as AppView[]).includes(
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
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "pawdating" && (
            <PawDatingExperience pet={selectedPet} notify={notify} />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "petship" && (
            <PetshipView
              pet={selectedPet}
              authenticated={authenticated}
              location={currentLocation}
              notify={notify}
              onLogin={() => setLoginOpen(true)}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "fundraising" && (
            <FundraisingView
              pet={selectedPet}
              authenticated={authenticated}
              notify={notify}
              onLogin={() => setLoginOpen(true)}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "favorites" && (
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
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "notifications" && (
            <NotificationCenter
              items={notifications}
              setItems={setNotifications}
              unread={unreadCount}
              loadAll={loadAllNotifications}
              notify={notify}
              onOpen={openNotificationTarget}
            />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "messages" && authenticated && (
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
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "support" && (
            <SupportCenter activities={activities} notify={notify} />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "profile" && !account && (
            <GuestAccount onLogin={() => setLoginOpen(true)} />
          )}</LocalizedCopy>
          <LocalizedCopy>{featureView === "profile" && account && (
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
          )}</LocalizedCopy>
        </div>
      </main>

      <MobileNav
        activeView={activeView}
        setActiveView={navigate}
        cartCount={cartCount}
        authenticated={authenticated}
        onOpenChat={() => { if (requireLogin()) setChatOpen(true); }}
      />

      <LocalizedButton
        className="floating-chat"
        type="button"
        onClick={() => { if (requireLogin()) setChatOpen(true); }}
        aria-label="Buka chat SlivaCare"
      >
        <Icon name="chat" size={22} />
        <span><LocalizedCopy>{"SlivaCare"}</LocalizedCopy></span>
        <i />
      </LocalizedButton>

      <LocalizedCopy>{notificationOpen && (
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
      )}</LocalizedCopy>
      <LocalizedCopy>{chatOpen && (
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
      )}</LocalizedCopy>
      <LocalizedCopy>{cartOpen && (
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
      )}</LocalizedCopy>
      <LocalizedCopy>{addPetOpen && (
        <AddPetExperience
          onClose={() => setAddPetOpen(false)}
          notify={notify}
          onSaved={(pet) => {
            setPetProfiles((current) => [...current, pet]);
            setSelectedPetId(pet.id);
            void loadBootstrap();
          }}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{locationOpen && (
        <LocationModal
          current={currentLocation}
          authenticated={authenticated}
          onLogin={() => {
            setLocationOpen(false);
            setLoginOpen(true);
          }}
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
      )}</LocalizedCopy>
      <LocalizedCopy>{bookingOpen && selectedService && (
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
      )}</LocalizedCopy>
      <LocalizedCopy>{loginOpen && (
        <PetOwnerLogin
          close={() => setLoginOpen(false)}
          notify={notify}
          onSuccess={loadBootstrap}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{checkoutSuccess && (
        <div className="modal-overlay">
          <div
            className="modal success-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-success-title"
          >
            <LocalizedButton
              className="modal-close"
              type="button"
              aria-label="Tutup"
              onClick={dismissCheckoutSuccess}
            >
              <Icon name="close" />
            </LocalizedButton>
            <span className="success-animation">
              <Icon name="check" size={34} />
            </span>
            <small><LocalizedCopy>{"SLIVA PET SHOP"}</LocalizedCopy></small>
            <h2 id="checkout-success-title"><LocalizedCopy>{"Pembayaran berhasil"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Transaksi sudah tercatat dan pesanan sedang diproses."}</LocalizedCopy></p>
            <LocalizedButton
              className="primary-button full"
              type="button"
              onClick={dismissCheckoutSuccess}
            ><LocalizedCopy>{"Selesai"}</LocalizedCopy></LocalizedButton>
          </div>
        </div>
      )}</LocalizedCopy>

      <LocalizedCopy>{toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Icon name="check" size={15} />
          </span>
          <LocalizedCopy>{toast}</LocalizedCopy>
        </div>
      )}</LocalizedCopy>
      <LocalizedCopy>{cartAddedOpen && (
        <div className="cart-added-notice" role="status" aria-live="polite">
          <span>
            <Icon name="check" size={28} />
          </span>
          <strong><LocalizedCopy>{"Ditambahkan ke keranjang"}</LocalizedCopy></strong>
        </div>
      )}</LocalizedCopy>
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
    headings: ["Ruang lingkup", "Penggunaan yang bertanggung jawab", "Data dan layanan"],
  },
  privacy: {
    title: "Kebijakan Privasi Slivadoc",
    sections: [
      "Kami memproses data akun, profil pet, transaksi, dan lokasi yang diperlukan untuk menjalankan fitur Slivadoc. Data lokasi Petship dibagikan pada tingkat tempat; koordinat personal tidak ditampilkan kepada pengguna lain. Data dibagikan kepada mitra layanan hanya sebatas yang dibutuhkan untuk memproses booking, pesanan, dan pembayaran kamu.",
      "Kamu berhak mengakses dan memperbarui data, mengelola akses keluarga, serta meminta penghapusan akun langsung dari aplikasi di Profil > Hapus akun. Data pribadi dihapus setelah masa tenggang 14 hari, sedangkan data transaksi dipertahankan secara teranonim sesuai kewajiban hukum.",
    ],
    headings: ["Data dan mitra layanan", "Hak kamu"],
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
          <LocalizedButton className="modal-close" onClick={close} aria-label="Tutup">
            <Icon name="close" />
          </LocalizedButton>
          <div className="login-brand">
            <Logo />
            <span><LocalizedCopy>{"Pet Owner"}</LocalizedCopy></span>
          </div>
          <span className="world-kicker"><LocalizedCopy>{"AKUN PET FAMILY"}</LocalizedCopy></span>
          <h2>
            <LocalizedCopy>{mode === "login"
              ? "Senang melihatmu kembali"
              : mode === "register"
                ? "Mulai perjalanan pet parent"
                : "Verifikasi email kamu"}</LocalizedCopy>
          </h2>
          <p><LocalizedCopy>{"Profil pet, rekam medis, booking, komunitas, dan benefit tersinkron aman dalam satu akun."}</LocalizedCopy></p>
          <form
            className="world-form login-form"
            onSubmit={submit}
            onInput={(event) =>
              setFormValid(event.currentTarget.checkValidity())
            }
          >
            <LocalizedCopy>{mode === "verify" ? (
              <>
                <div className="access-warning"><LocalizedCopy>{"Masukkan 6 digit OTP yang dikirim ke"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                  <b><LocalizedCopy>{registrationEmail}</LocalizedCopy></b><LocalizedCopy>{"."}</LocalizedCopy></div>
                <label>
                  <span><LocalizedCopy>{"Kode OTP"}</LocalizedCopy></span>
                  <LocalizedInput
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
                    <span><LocalizedCopy>{"Nama lengkap"}</LocalizedCopy></span>
                    <LocalizedInput
                      name="full_name"
                      minLength={3}
                      placeholder="Nama sesuai identitas"
                      required
                    />
                  </label>
                  <label>
                    <span><LocalizedCopy>{"WhatsApp"}</LocalizedCopy></span>
                    <LocalizedInput
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
                    <small><LocalizedCopy>{"Harus diawali angka 0, tanpa spasi atau simbol."}</LocalizedCopy></small>
                  </label>
                </>
              )
            )}</LocalizedCopy>
            <LocalizedCopy>{mode !== "verify" && (
              <label>
                <span><LocalizedCopy>{"Email"}</LocalizedCopy></span>
                <LocalizedInput
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
            )}</LocalizedCopy>
            <LocalizedCopy>{mode !== "verify" && (
              <label>
                <span><LocalizedCopy>{"Password"}</LocalizedCopy></span>
                <span className="password-input">
                  <LocalizedInput
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
                  <LocalizedButton
                    type="button"
                    onClick={() => setVisible((value) => !value)}
                    aria-label={
                      visible ? "Sembunyikan password" : "Tampilkan password"
                    }
                  >
                    <LocalizedCopy>{visible ? "◉" : "◎"}</LocalizedCopy>
                  </LocalizedButton>
                </span>
                <small><LocalizedCopy>{"Gunakan kombinasi huruf, angka, dan simbol."}</LocalizedCopy></small>
              </label>
            )}</LocalizedCopy>
            <LocalizedCopy>{mode === "register" && (
              <div className="legal-consents">
                <label>
                  <LocalizedInput
                    type="checkbox"
                    checked={terms}
                    onChange={(event) => setTerms(event.target.checked)}
                    required
                  />
                  <span><LocalizedCopy>{"Saya menyetujui"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedButton type="button" onClick={() => setPolicy("terms")}>
                      <b><LocalizedCopy>{"Syarat dan Ketentuan"}</LocalizedCopy></b>
                    </LocalizedButton><LocalizedCopy>{"."}</LocalizedCopy></span>
                </label>
                <label>
                  <LocalizedInput
                    type="checkbox"
                    checked={privacy}
                    onChange={(event) => setPrivacy(event.target.checked)}
                    required
                  />
                  <span><LocalizedCopy>{"Saya menyetujui"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedButton type="button" onClick={() => setPolicy("privacy")}>
                      <b><LocalizedCopy>{"Kebijakan Privasi"}</LocalizedCopy></b>
                    </LocalizedButton><LocalizedCopy>{"."}</LocalizedCopy></span>
                </label>
              </div>
            )}</LocalizedCopy>
            <LocalizedCopy>{message && <div className="form-message"><LocalizedCopy>{message}</LocalizedCopy></div>}</LocalizedCopy>
            <LocalizedButton
              className="primary-button full"
              disabled={
                busy ||
                (mode === "verify"
                  ? otp.length !== 6
                  : !passwordValid || !formValid || !registrationConsent)
              }
            >
              <LocalizedCopy>{busy ? (
                <>
                  <span className="button-spinner" /> Memproses…
                </>
              ) : mode === "login" ? (
                "Masuk ke Slivadoc"
              ) : mode === "verify" ? (
                "Verifikasi & aktifkan akun"
              ) : (
                "Daftar & kirim OTP"
              )}</LocalizedCopy>
            </LocalizedButton>
          </form>
          <LocalizedCopy>{mode === "verify" && (
            <LocalizedButton
              type="button"
              className="text-button login-switch"
              disabled={busy}
              onClick={() => void resendOTP()}
            ><LocalizedCopy>{"Kirim ulang OTP"}</LocalizedCopy></LocalizedButton>
          )}</LocalizedCopy>
          <LocalizedButton
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
            <LocalizedCopy>{mode === "login"
              ? "Belum punya akun? Daftar gratis"
              : mode === "verify"
                ? "Kembali ke login"
                : "Sudah punya akun? Login"}</LocalizedCopy>
          </LocalizedButton>
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
            <LocalizedButton
              className="modal-close"
              onClick={() => setPolicy(null)}
              aria-label="Tutup"
            >
              <Icon name="close" />
            </LocalizedButton>
            <span className="section-eyebrow"><LocalizedCopy>{"LEGAL · SLIVADOC PET OWNER"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{legalCopy[policy].title}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Berlaku sejak 26 Agustus 2026"}</LocalizedCopy></p>
            <div>
              <LocalizedCopy>{legalCopy[policy].sections.map((section, index) => (
                <article key={section}>
                  <b>
                    <LocalizedCopy>{index + 1}</LocalizedCopy><LocalizedCopy>{"."}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{legalCopy[policy].headings[index]}</LocalizedCopy>
                  </b>
                  <p><LocalizedCopy>{section}</LocalizedCopy></p>
                </article>
              ))}</LocalizedCopy>
              {policy === "privacy" && (
                <p>
                  <LocalizedCopy>{"Kebijakan privasi lengkap tersedia di "}</LocalizedCopy>
                  <Link href="/privasi"><LocalizedCopy>{"slivadoc.com/privasi"}</LocalizedCopy></Link>
                  <LocalizedCopy>{"."}</LocalizedCopy>
                </p>
              )}
            </div>
            <LocalizedButton
              className="primary-button full"
              onClick={() => setPolicy(null)}
            ><LocalizedCopy>{"Saya mengerti"}</LocalizedCopy></LocalizedButton>
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
      <LocalizedCopy>{selectedPet && (
        <LocalizedButton
          type="button"
          className="sidebar-pet-badge"
          onClick={() => setActiveView("health")}
          aria-label={`Profil kesehatan ${selectedPet.name}`}
        >
          <span className="sidebar-pet-avatar"><LocalizedCopy>{selectedPet.avatar}</LocalizedCopy></span>
          <div className="sidebar-pet-meta">
            <b><LocalizedCopy>{selectedPet.name}</LocalizedCopy></b>
            <small><LocalizedCopy>{selectedPet.breed}</LocalizedCopy></small>
          </div>
          <span className="sidebar-pet-score">
            <Icon name="heart" size={11} /> <LocalizedCopy>{selectedPet.healthScore}</LocalizedCopy>
          </span>
        </LocalizedButton>
      )}</LocalizedCopy>
      <nav className="side-nav" aria-label="Navigasi utama">
        <LocalizedCopy>{navGroups.map((group) => (
          <div className="side-nav-group" key={group.label}>
            <p className="nav-eyebrow"><LocalizedCopy>{group.label}</LocalizedCopy></p>
            <LocalizedCopy>{group.items
              .map((id) => navItems.find((item) => item.id === id))
              .filter(
                (item): item is (typeof navItems)[number] => item !== undefined,
              )
              .map((item) => (
                <LocalizedButton
                  type="button"
                  key={item.id}
                  className={activeView === item.id || (item.id === "world" && isWorldMode(activeView)) ? "active" : ""}
                  onClick={() => setActiveView(item.id)}
                >
                  <Icon name={item.icon} size={19} />
                  <span><LocalizedCopy>{t(item.label)}</LocalizedCopy></span>
                  <LocalizedCopy>{item.id === "bookings" && needsActionCount > 0 && (
                    <em><LocalizedCopy>{needsActionCount > 9 ? "9+" : needsActionCount}</LocalizedCopy></em>
                  )}</LocalizedCopy>
                </LocalizedButton>
              ))}</LocalizedCopy>
          </div>
        ))}</LocalizedCopy>
      </nav>
      <div className="side-spacer" />
      <LocalizedButton
        className="side-help"
        type="button"
        onClick={() => setActiveView("support")}
      >
        <span><LocalizedCopy>{"?"}</LocalizedCopy></span><LocalizedCopy>{" Pusat Bantuan"}</LocalizedCopy></LocalizedButton>
      <LocalizedCopy>{authenticated && account ? (
        <LocalizedButton
          className="side-profile"
          type="button"
          onClick={() => setActiveView("profile")}
        >
          <div className="avatar avatar-blue">
            <LocalizedCopy>{account.full_name
              .split(" ")
              .map((value) => value[0])
              .slice(0, 2)
              .join("")}</LocalizedCopy>
          </div>
          <span>
            <b><LocalizedCopy preserve>{account.full_name}</LocalizedCopy></b>
            <small><LocalizedCopy>{"Pet Parent • Akun aktif"}</LocalizedCopy></small>
          </span>
          <Icon name="chevron" />
        </LocalizedButton>
      ) : (
        <LocalizedButton className="side-login-button" type="button" onClick={onLogin}>
          <Icon name="user" /><LocalizedCopy>{" Masuk ke akun"}</LocalizedCopy></LocalizedButton>
      )}</LocalizedCopy>
      <Link href="/brand" className="side-login-button"><LocalizedCopy>{"Official Brand workspace →"}</LocalizedCopy></Link>
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
  const { t } = usePetOwnerI18n();
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
              `${item.title} ${item.subtitle} ${t(item.title)} ${t(item.subtitle)}`
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
                    value.category === item.category &&
                    (item.category === "feature" ? value.route === item.route : value.id === item.id),
                ) === index,
            ),
          );
        })
        .catch(() => setResults(featureResults))
        .finally(() => setBusy(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, category, t]);
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
      <LocalizedButton
        className="location-picker"
        type="button"
        onClick={onOpenLocation}
      >
        <span>
          <Icon name="map" size={18} />
        </span>
        <span>
          <small><LocalizedCopy>{"Lokasi kamu"}</LocalizedCopy></small>
          <b><LocalizedCopy>{locationLabel}</LocalizedCopy></b>
        </span>
        <Icon name="chevron" size={15} />
      </LocalizedButton>
      <label className={`global-search ${searchOpen ? "open" : ""}`}>
        <Icon name="search" size={18} />
        <LocalizedInput
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
        <kbd><LocalizedCopy>{"⌘ K"}</LocalizedCopy></kbd>
        <LocalizedCopy>{searchOpen && (
          <div className="owner-search-results">
            <header>
              <b><LocalizedCopy>{"Cari di seluruh Slivadoc"}</LocalizedCopy></b>
              <LocalizedButton type="button" onClick={() => setSearchOpen(false)}><LocalizedCopy>{"Tutup"}</LocalizedCopy></LocalizedButton>
            </header>
            <div className="owner-search-tabs">
              <LocalizedCopy>{[
                ["", "Semua"],
                ["feature", "Fitur"],
                ["service", "Layanan"],
                ["product", "Produk"],
                ["petspot", "PetSpot"],
                ["event", "Event"],
                ["academy", "Academy"],
                ["veterinarian", "Dokter"],
              ].map(([value, label]) => (
                <LocalizedButton
                  type="button"
                  className={category === value ? "active" : ""}
                  key={value || "all"}
                  onClick={() => setCategory(value)}
                >
                  <LocalizedCopy>{label}</LocalizedCopy>
                </LocalizedButton>
              ))}</LocalizedCopy>
            </div>
            <LocalizedCopy>{busy ? (
              <p><LocalizedCopy>{"Memuat hasil…"}</LocalizedCopy></p>
            ) : query.trim().length < 2 ? (
              <p><LocalizedCopy>{"Ketik minimal 2 karakter untuk mulai mencari."}</LocalizedCopy></p>
            ) : results.length ? (
              results.map((item) => (
                <LocalizedButton
                  type="button"
                  key={`${item.category}-${item.id}`}
                  onClick={() => choose(item)}
                >
                  <span><LocalizedCopy>{item.category.slice(0, 1).toUpperCase()}</LocalizedCopy></span>
                  <div>
                    <b><LocalizedCopy>{item.title}</LocalizedCopy></b>
                    <small>
                      <LocalizedCopy>{item.category}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.subtitle}</LocalizedCopy>
                    </small>
                  </div>
                  <Icon name="chevron" />
                </LocalizedButton>
              ))
            ) : (
              <p><LocalizedCopy>{"Tidak ada hasil yang cocok."}</LocalizedCopy></p>
            )}</LocalizedCopy>
          </div>
        )}</LocalizedCopy>
      </label>
      <div className="top-actions">
        <LocalizedButton
          className="point-pill"
          type="button"
          onClick={() => (authenticated ? navigate("bookings") : onLogin())}
        >
          <span><LocalizedCopy>{"✦"}</LocalizedCopy></span>
          <b><LocalizedCopy>{points.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy></b>
          <small><LocalizedCopy>{"pts"}</LocalizedCopy></small>
        </LocalizedButton>
        <LocalizedCopy>{authenticated && petProfiles.length > 0 && (
          <label className="pet-switcher compact-select">
            <span className="pet-mini"><LocalizedCopy>{selectedPet.avatar}</LocalizedCopy></span>
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
        )}</LocalizedCopy>
        <LocalizedButton
          className="icon-button chat-header-button"
          type="button"
          onClick={authenticated ? onOpenMessages : onLogin}
          aria-label="Buka daftar chat"
        >
          <Icon name="chat" />
          <LocalizedCopy>{authenticated && chatUnread > 0 && (
            <span className="counter">
              <LocalizedCopy>{chatUnread > 99 ? "99+" : chatUnread}</LocalizedCopy>
            </span>
          )}</LocalizedCopy>
        </LocalizedButton>
        <LocalizedButton
          className="icon-button cart-header-button"
          type="button"
          onClick={onOpenCart}
          aria-label="Keranjang"
        >
          <Icon name="cart" />
          <LocalizedCopy>{cartCount > 0 && <span className="counter"><LocalizedCopy>{cartCount}</LocalizedCopy></span>}</LocalizedCopy>
        </LocalizedButton>
        <LocalizedButton
          className="icon-button notification-header-button"
          type="button"
          onClick={authenticated ? onOpenNotifications : onLogin}
          aria-label="Notifikasi"
        >
          <Icon name="bell" />
          <LocalizedCopy>{authenticated && unread > 0 && <span className="notif-dot" />}</LocalizedCopy>
        </LocalizedButton>
        <LocalizedCopy>{!authenticated && (
          <LocalizedButton className="top-login" type="button" onClick={onLogin}><LocalizedCopy>{"Masuk"}</LocalizedCopy></LocalizedButton>
        )}</LocalizedCopy>
        <LocalizedCopy>{authenticated && account && (
          <LocalizedButton
            className="top-account"
            type="button"
            onClick={() => navigate("profile")}
          >
            <LocalizedCopy>{account.full_name
              .split(" ")
              .map((value) => value[0])
              .slice(0, 2)
              .join("")}</LocalizedCopy>
          </LocalizedButton>
        )}</LocalizedCopy>
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
  const { t } = usePetOwnerI18n();
  if (activeView === "world" || isWorldMode(activeView)) return null;
  const item = titles[activeView];
  return (
    <div
      className={`page-heading ${activeView === "home" ? "page-heading--home" : ""}`}
    >
      <div>
        <h1>
          <LocalizedCopy>{activeView === "home" && account
            ? `Selamat datang, ${account.full_name.split(" ")[0]}!`
            : t(item.title)}</LocalizedCopy>
        </h1>
        <p>
          <LocalizedCopy>{activeView === "health"
            ? `Riwayat lengkap dan jadwal perawatan ${selectedPet.name}.`
            : t(item.subtitle)}</LocalizedCopy>
        </p>
      </div>
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
          <LocalizedButton type="button" role="tab" aria-selected={category === "store"} className={category === "store" ? "active" : ""} onClick={() => { setCategory("store"); setQuery(""); }}>
            <Icon name="bag" size={17} /><LocalizedCopy>{" Toko"}</LocalizedCopy><LocalizedCopy>{threads.reduce((total, thread) => total + thread.unread_count, 0) > 0 ? <span><LocalizedCopy>{threads.reduce((total, thread) => total + thread.unread_count, 0)}</LocalizedCopy></span> : null}</LocalizedCopy>
          </LocalizedButton>
          <LocalizedButton type="button" role="tab" aria-selected={category === "veterinarian"} className={category === "veterinarian" ? "active" : ""} onClick={() => { setCategory("veterinarian"); setQuery(""); }}>
            <Icon name="heart" size={17} /><LocalizedCopy>{" Dokter Hewan"}</LocalizedCopy></LocalizedButton>
        </div>
        <label className="chat-inbox-search">
          <Icon name="search" size={18} />
          <LocalizedInput type="search" aria-label={category === "store" ? "Cari nama toko" : "Cari nama dokter"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={category === "store" ? "Cari nama toko…" : "Cari nama dokter…"} />
        </label>
      </div>

      <LocalizedCopy>{loading && category === "store" ? (
        <div className="chat-inbox-loading" role="status"><span className="loading-spinner" /><div><b><LocalizedCopy>{"Memuat percakapan…"}</LocalizedCopy></b><small><LocalizedCopy>{"Menyinkronkan pesan dan status toko terbaru."}</LocalizedCopy></small></div></div>
      ) : error && category === "store" ? (
        <div className="chat-inbox-empty"><Icon name="chat" size={27} /><b><LocalizedCopy>{"Chat belum dapat dimuat"}</LocalizedCopy></b><p><LocalizedCopy>{error}</LocalizedCopy></p><LocalizedButton type="button" onClick={() => void loadThreads()}><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></LocalizedButton></div>
      ) : category === "store" && storeThreads.length ? (
        <div className="chat-inbox-list">
          <LocalizedCopy>{storeThreads.map((thread) => (
            <LocalizedButton type="button" key={thread.id} className="chat-inbox-row" onClick={() => onOpenStore(thread)}>
              <span className="chat-inbox-avatar"><LocalizedCopy>{thread.business_name.slice(0, 1).toUpperCase()}</LocalizedCopy><i data-online={thread.store_is_online} /></span>
              <span className="chat-inbox-copy"><span><b><LocalizedCopy>{thread.business_name}</LocalizedCopy></b><time><LocalizedCopy>{thread.last_message_created_at ? new Date(thread.last_message_created_at).toLocaleString(petOwnerIntlLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Baru"}</LocalizedCopy></time></span><small><LocalizedCopy>{thread.last_message || `Mulai chat tentang ${thread.product_name || "produk toko"}`}</LocalizedCopy></small></span>
              <LocalizedCopy>{thread.unread_count > 0 ? <em><LocalizedCopy>{thread.unread_count}</LocalizedCopy></em> : <Icon name="chevron" size={17} />}</LocalizedCopy>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
      ) : category === "veterinarian" && doctorThreads.length ? (
        <div className="chat-inbox-list">
          <LocalizedCopy>{doctorThreads.map((item) => (
            <LocalizedButton type="button" key={item.id} className="chat-inbox-row" onClick={() => onOpenDoctor(item)}>
              <span className="chat-inbox-avatar is-doctor"><Icon name="heart" size={20} /></span>
              <span className="chat-inbox-copy"><span><b><LocalizedCopy>{item.provider_name || item.doctor_name || item.title}</LocalizedCopy></b><time><LocalizedCopy>{item.status}</LocalizedCopy></time></span><small><LocalizedCopy>{item.plan_name || item.subtitle}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.pet_name || "Pet-mu"}</LocalizedCopy></small></span>
              <Icon name="chevron" size={17} />
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
      ) : (
        <div className="chat-inbox-empty"><Icon name="chat" size={27} /><b><LocalizedCopy>{query ? "Percakapan tidak ditemukan" : "Belum ada percakapan"}</LocalizedCopy></b><p><LocalizedCopy>{category === "store" ? "Chat dengan toko akan tersimpan di sini." : "Chat dokter muncul setelah kamu membuat konsultasi."}</LocalizedCopy></p></div>
      )}</LocalizedCopy>
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
  openClinicBranch,
  location,
  onOpenLocation,
  openConsultation,
  setChatOpen,
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
  openClinicBranch: (branch: DiscoveryBranch) => void;
  location: LocationResult | null;
  onOpenLocation: () => void;
  openConsultation: (veterinarianId?: string) => void;
  setChatOpen: (value: boolean) => void;
  activities: PetOwnerActivityCenterItem[];
  openActivity: (type: ActivityType, id: string) => void;
  ownerName?: string;
}) {
  const { t, language } = usePetOwnerI18n();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsError, setDoctorsError] = useState(false);
  const [doctorsAttempt, setDoctorsAttempt] = useState(0);
  const [petSwitcherOpen, setPetSwitcherOpen] = useState(false);
  useEffect(() => {
    let active = true;
    void getPublicCampaigns().then((result) => { if (active) setCampaign(result.data[0] ?? null); }).catch(() => { if (active) setCampaign(null); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) { setDoctorsLoading(true); setDoctorsError(false); } });
    void getVeterinarians().then((result) => { if (active) setVeterinarians(result.data); })
      .catch(() => { if (active) { setVeterinarians([]); setDoctorsError(true); } })
      .finally(() => { if (active) setDoctorsLoading(false); });
    return () => { active = false; };
  }, [doctorsAttempt]);
  const [nearbyBranches, setNearbyBranches] = useState<
    { key: string; state: "ready"; items: DiscoveryBranch[] } | { key: string; state: "error" }
  >();
  const [branchesAttempt, setBranchesAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    const key = `${location?.latitude}:${location?.longitude}:${branchesAttempt}`;
    getDiscoveryBranches({ limit: 6, latitude: location?.latitude, longitude: location?.longitude })
      .then((result) => { if (active) setNearbyBranches({ key, state: "ready", items: result.data }); })
      .catch(() => { if (active) setNearbyBranches({ key, state: "error" }); });
    return () => { active = false; };
  }, [location?.latitude, location?.longitude, branchesAttempt]);

  const firstName = ownerName?.trim().split(/\s+/)[0];
  const featuredActivities = activities
    .filter((item) => item.state !== "history")
    .sort(
      (a, b) =>
        new Date(a.scheduled_at ?? a.occurred_at).getTime() -
        new Date(b.scheduled_at ?? b.occurred_at).getTime(),
    )
    .slice(0, 3);
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  const branchesKey = `${latitude}:${longitude}:${branchesAttempt}`;
  const nearby: { state: "loading" } | NonNullable<typeof nearbyBranches> =
    nearbyBranches?.key === branchesKey ? nearbyBranches : { state: "loading" };
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
            <h2><LocalizedCopy>{firstName ? `Hai, ${firstName}! 🐾` : "Hai, Pet Parent! 🐾"}</LocalizedCopy></h2>
            <p>
              <LocalizedCopy>{firstName
                ? `Yuk, bikin hari ${selectedPet.name} makin sehat dan happy.`
                : "Satu tempat buat semua momen sehat dan happy bareng pet."}</LocalizedCopy>
            </p>
          </div>
          <span className="home-greeting-sparkle" aria-hidden="true">
            <Icon name="sparkle" size={18} />
          </span>
        </section>

        <section className="home-quick-panel" aria-labelledby="quick-title">
          <header className="home-section-heading">
            <div>
              <h2 id="quick-title"><LocalizedCopy>{t("Layanan cepat")}</LocalizedCopy></h2>
              <p><LocalizedCopy>{t("Semua yang pet-mu butuhkan, sekali tap")}</LocalizedCopy></p>
            </div>
            <span className="home-quick-count">
              <Icon name="sparkle" size={12} /><LocalizedCopy>{" 6 pilihan"}</LocalizedCopy></span>
          </header>
          <div className="home-quick-feature-row">
            <LocalizedCopy>{featuredActions.map((item) => (
              <LocalizedButton
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
                <b><LocalizedCopy>{item.label}</LocalizedCopy></b>
                <small><LocalizedCopy>{item.note}</LocalizedCopy></small>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
          <div className="home-quick-mini-grid">
            <LocalizedCopy>{miniActions.map((item) => (
              <LocalizedButton
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
                <b><LocalizedCopy>{item.label}</LocalizedCopy></b>
                <small><LocalizedCopy>{item.note}</LocalizedCopy></small>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
        </section>

        <section className="home-services-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow"><LocalizedCopy>{"REKOMENDASI"}</LocalizedCopy></span>
              <h2><LocalizedCopy>{"Pet clinic & petshop terdekat"}</LocalizedCopy></h2>
              <p><LocalizedCopy>{"Diurutkan dari titik lokasi yang kamu pilih"}</LocalizedCopy></p>
            </div>
            <LocalizedButton type="button" onClick={() => setActiveView("clinics")}><LocalizedCopy>{"Jelajahi "}</LocalizedCopy><Icon name="arrow" size={14} />
            </LocalizedButton>
          </header>
          <LocalizedCopy>{!location && (
            <button type="button" className="clinic-home-prompt" onClick={onOpenLocation}>
              <Icon name="map" size={15} />
              <LocalizedCopy>{"Pilih lokasi agar urutannya dari yang terdekat"}</LocalizedCopy>
              <b><LocalizedCopy>{"Pilih lokasi"}</LocalizedCopy></b>
            </button>
          )}</LocalizedCopy>
          <div className="home-service-row" aria-busy={nearby.state === "loading"}>
            <LocalizedCopy>{nearby.state === "loading" && [0, 1, 2].map((index) => (
              <div className="home-service-card clinic-home-skeleton" key={index} aria-hidden="true">
                <span className="home-service-visual" />
                <div><i style={{ width: "70%" }} /><i style={{ width: "45%" }} /><i style={{ width: "85%" }} /></div>
              </div>
            ))}</LocalizedCopy>
            <LocalizedCopy>{nearby.state === "ready" && nearby.items.map((branch, index) => {
              const image = branch.banner_url || branch.logo_url;
              const distance = formatDistanceKm(branch.distance_km);
              return (
              <article
                className="home-service-card"
                key={branch.branch_id}
                onClick={() => openClinicBranch(branch)}
              >
                <div className={`home-service-visual ${["mint", "blue", "violet", "peach"][index % 4]}`}>
                  <span>{clinicTypeLabel(branch.type, language)}</span>
                  <LocalizedCopy>{image ? (
                    <Image
                      className="catalog-cover-image"
                      src={image}
                      alt=""
                      fill
                      sizes="220px"
                      unoptimized
                    />
                  ) : (
                    <i><Icon name="clinic" size={30} /></i>
                  )}</LocalizedCopy>
                </div>
                <div>
                  <b>{branch.business_name}</b>
                  <small>
                    <Icon name="map" size={11} /> {branch.branch_name}
                  </small>
                  <p>
                    <span>
                      <Icon name="bag" size={10} /> {t(`${branch.service_count} layanan · ${branch.product_count} produk`)}</span>
                    {distance ? ` · ${distance}` : ""}
                  </p>
                  <footer>
                    <strong>{branch.city}</strong>
                    <LocalizedButton
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openClinicBranch(branch);
                      }}
                    ><LocalizedCopy>{"Lihat profil "}</LocalizedCopy><Icon name="arrow" size={12} />
                    </LocalizedButton>
                  </footer>
                </div>
              </article>
              );
            })}</LocalizedCopy>
            <LocalizedCopy>{nearby.state === "ready" && nearby.items.length === 0 && (
              <div className="empty-state compact"><LocalizedCopy>{location ? "Belum ada pet clinic atau petshop di titik lokasi ini." : "Belum ada pet clinic atau petshop yang terdaftar."}</LocalizedCopy></div>
            )}</LocalizedCopy>
            <LocalizedCopy>{nearby.state === "error" && (
              <div className="empty-state compact">
                <LocalizedCopy>{"Pet clinic dan petshop belum dapat dimuat."}</LocalizedCopy>
                <LocalizedButton type="button" className="secondary-button small" onClick={() => setBranchesAttempt((value) => value + 1)}><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></LocalizedButton>
              </div>
            )}</LocalizedCopy>
          </div>
        </section>

        <section className="home-doctors-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow"><LocalizedCopy>{"DOKTER TERBAIK"}</LocalizedCopy></span>
              <h2><LocalizedCopy>{"Teman konsultasi untuk "}</LocalizedCopy><LocalizedCopy>{selectedPet.name}</LocalizedCopy></h2>
              <p><LocalizedCopy>{"Dokter terverifikasi dengan rating dan konsultasi terbaik"}</LocalizedCopy></p>
            </div>
            <LocalizedButton type="button" onClick={() => openConsultation()}><LocalizedCopy>{"Lihat dokter "}</LocalizedCopy><Icon name="arrow" size={14} />
            </LocalizedButton>
          </header>
          <div className="home-doctor-row">
            <LocalizedCopy>{recommendedDoctors.map((doctor) => (
              <article className="home-doctor-card" key={doctor.id}>
                <span className="home-doctor-avatar">
                  <LocalizedCopy>{doctor.photo_url ? (
                    <Image src={doctor.photo_url} alt={doctor.full_name} fill sizes="58px" unoptimized />
                  ) : (
                    <Icon name="user" size={24} />
                  )}</LocalizedCopy>
                  <i />
                </span>
                <div>
                  <small><LocalizedCopy>{doctor.availability_status === "online" ? "ONLINE" : "DOKTER TERVERIFIKASI"}</LocalizedCopy></small>
                  <b><LocalizedCopy preserve>{doctor.full_name}</LocalizedCopy></b>
                  <p><LocalizedCopy>{doctor.specialties.join(" · ") || "Dokter hewan umum"}</LocalizedCopy></p>
                  <span><Icon name="star" size={11} /> <LocalizedCopy>{doctor.rating.toFixed(1)}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{doctor.consultation_count.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" konsultasi"}</LocalizedCopy></span>
                </div>
                <LocalizedButton type="button" onClick={() => openConsultation(doctor.id)}><LocalizedCopy>{"Konsultasi"}</LocalizedCopy></LocalizedButton>
              </article>
            ))}</LocalizedCopy>
            <LocalizedCopy>{recommendedDoctors.length === 0 ? (
              <div className="empty-state compact home-doctor-empty" role={doctorsError ? "alert" : "status"}>
                <LocalizedCopy>{doctorsLoading ? "Memuat dokter…" : doctorsError ? "Dokter belum dapat dimuat." : "Belum ada dokter yang tersedia."}</LocalizedCopy>
                {doctorsError && <LocalizedButton type="button" className="secondary-button" onClick={() => setDoctorsAttempt((attempt) => attempt + 1)}><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></LocalizedButton>}
              </div>
            ) : null}</LocalizedCopy>
          </div>
        </section>

        <LocalizedCopy>{campaign && (
          <section
            className="public-campaign-banner home-campaign"
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(5,104,159,.94),rgba(8,114,95,.78)),url(${campaign.banner_url})`,
            }}
          >
            <div>
              <span><LocalizedCopy>{"REKOMENDASI SLIVADOC"}</LocalizedCopy></span>
              <h2><LocalizedCopy>{campaign.name}</LocalizedCopy></h2>
              <p><LocalizedCopy>{campaign.objective}</LocalizedCopy></p>
              <LocalizedButton
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
              ><LocalizedCopy>{"Lihat selengkapnya "}</LocalizedCopy><Icon name="chevron" size={15} />
              </LocalizedButton>
            </div>
          </section>
        )}</LocalizedCopy>
      </div>

      <aside
        className="home-pet-rail home-health-and-care"
        aria-label="Ringkasan kesehatan dan jadwal"
      >
        <section className="home-health-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow"><LocalizedCopy>{"HEALTH SNAPSHOT"}</LocalizedCopy></span>
              <h2><LocalizedCopy>{"Kondisi "}</LocalizedCopy><LocalizedCopy>{selectedPet.name}</LocalizedCopy></h2>
              <p><LocalizedCopy>{"Pantau kesehatan tanpa ribet"}</LocalizedCopy></p>
            </div>
            <LocalizedButton type="button" onClick={() => setActiveView("health")}><LocalizedCopy>{"Detail "}</LocalizedCopy><Icon name="arrow" size={14} />
            </LocalizedButton>
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
                <LocalizedCopy>{selectedPet.avatar}</LocalizedCopy>
                <i>
                  <Icon name="check" size={10} />
                </i>
              </span>
              <div className="home-health-pet">
                <small>
                  <i /><LocalizedCopy>{" PET AKTIF"}</LocalizedCopy></small>
                <b><LocalizedCopy>{selectedPet.name}</LocalizedCopy></b>
                <span>
                  <LocalizedCopy>{selectedPet.breed}</LocalizedCopy><LocalizedCopy>{" • "}</LocalizedCopy><LocalizedCopy>{selectedPet.age}</LocalizedCopy>
                </span>
              </div>
              <LocalizedButton
                type="button"
                className="home-pet-switch"
                aria-expanded={petSwitcherOpen}
                onClick={() =>
                  petProfiles.length > 1
                    ? setPetSwitcherOpen((current) => !current)
                    : setActiveView("pets")
                }
              ><LocalizedCopy>{"Ganti "}</LocalizedCopy><Icon name="arrow" size={12} />
              </LocalizedButton>
            </div>
            <LocalizedCopy>{petSwitcherOpen ? (
              <div className="home-pet-switcher" role="dialog" aria-label="Pilih pet aktif">
                <header><b><LocalizedCopy>{"Ganti pet aktif"}</LocalizedCopy></b><small><LocalizedCopy>{"Ringkasan homepage akan langsung menyesuaikan."}</LocalizedCopy></small></header>
                <LocalizedCopy>{petProfiles.map((pet) => (
                  <LocalizedButton
                    type="button"
                    key={pet.id}
                    className={pet.id === selectedPetId ? "active" : ""}
                    onClick={() => {
                      onSelectPet(pet.id);
                      setPetSwitcherOpen(false);
                    }}
                  >
                    <span><LocalizedCopy>{pet.avatar}</LocalizedCopy></span>
                    <div><b><LocalizedCopy preserve>{pet.name}</LocalizedCopy></b><small><LocalizedCopy>{pet.breed}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{pet.age}</LocalizedCopy></small></div>
                    <i><LocalizedCopy>{pet.id === selectedPetId ? "✓" : ""}</LocalizedCopy></i>
                  </LocalizedButton>
                ))}</LocalizedCopy>
                <LocalizedButton type="button" className="manage" onClick={() => setActiveView("pets")}><LocalizedCopy>{"Kelola semua profil pet"}</LocalizedCopy></LocalizedButton>
              </div>
            ) : null}</LocalizedCopy>
            <div className="home-health-overview">
              <div className="home-health-score">
                <div>
                  <b><LocalizedCopy>{selectedPet.healthScore}</LocalizedCopy></b>
                  <small><LocalizedCopy>{"/ 100"}</LocalizedCopy></small>
                </div>
                <strong><LocalizedCopy>{healthStatus}</LocalizedCopy></strong>
                <span><LocalizedCopy>{selectedPet.nextCare || "Belum ada rekam medis"}</LocalizedCopy></span>
              </div>
              <div className="home-health-metrics">
                <div>
                  <span className="home-health-metric-icon home-health-metric-icon--mint"><LocalizedCopy>{"⚖"}</LocalizedCopy></span>
                  <small><LocalizedCopy>{"Berat badan"}</LocalizedCopy></small>
                  <b><LocalizedCopy>{selectedPet.weight}</LocalizedCopy></b>
                </div>
                <div>
                  <span className="home-health-metric-icon home-health-metric-icon--violet">
                    <Icon name="heart" size={14} />
                  </span>
                  <small><LocalizedCopy>{"Aktivitas"}</LocalizedCopy></small>
                  <b><LocalizedCopy>{activities.length}</LocalizedCopy><LocalizedCopy>{" catatan"}</LocalizedCopy></b>
                </div>
              </div>
            </div>
            <LocalizedButton
              className="home-health-insight"
              type="button"
              onClick={() => setActiveView("bookings")}
            >
              <span>
                <Icon name="sparkle" size={16} />
              </span>
              <div>
                <b><LocalizedCopy>{"Insight untuk "}</LocalizedCopy><LocalizedCopy>{selectedPet.name}</LocalizedCopy></b>
                <small>
                  <LocalizedCopy>{featuredActivities[0]?.subtitle ||
                    "Belum ada aktivitas kesehatan terjadwal."}</LocalizedCopy>
                </small>
              </div>
              <i>
                <Icon name="arrow" size={14} />
              </i>
            </LocalizedButton>
          </div>
        </section>

        <section className="home-care-section">
          <header className="home-section-heading home-section-heading--action">
            <div>
              <span className="home-section-eyebrow"><LocalizedCopy>{"CARE PLAN"}</LocalizedCopy></span>
              <h2><LocalizedCopy>{"Perawatan terdekat"}</LocalizedCopy></h2>
              <p><LocalizedCopy>{"Biar jadwal nggak kelewat"}</LocalizedCopy></p>
            </div>
            <LocalizedButton type="button" onClick={() => setActiveView("bookings")}><LocalizedCopy>{"Semua "}</LocalizedCopy><Icon name="arrow" size={14} />
            </LocalizedButton>
          </header>
          <div className="home-care-card">
            <LocalizedCopy>{featuredActivities.length ? (
              featuredActivities.map((care, index) => {
                const meta = getActivityTypeMeta(care.type);
                return <LocalizedButton
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
                    <LocalizedCopy>{index < featuredActivities.length - 1 && <em />}</LocalizedCopy>
                  </span>
                  <span className="home-care-copy">
                    <small>
                      <Icon name="clock" size={11} />
                      <LocalizedCopy>{new Date(
                        care.scheduled_at || care.occurred_at,
                      ).toLocaleDateString(petOwnerIntlLocale(), {
                        day: "numeric",
                        month: "short",
                      })}</LocalizedCopy>
                    </small>
                    <b><LocalizedCopy>{care.title}</LocalizedCopy></b>
                    <span><LocalizedCopy>{care.subtitle}</LocalizedCopy></span>
                  </span>
                  <Icon name="chevron" size={15} />
                </LocalizedButton>;
              })
            ) : (
              <div className="empty-state compact home-care-empty">
                <span>
                  <Icon name="calendar" size={25} />
                </span>
                <div>
                  <b><LocalizedCopy>{"Jadwal masih santai"}</LocalizedCopy></b>
                  <p><LocalizedCopy>{"Booking perawatan pertama dan kami bantu ingatkan."}</LocalizedCopy></p>
                </div>
              </div>
            )}</LocalizedCopy>
            <LocalizedButton
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
                  <LocalizedCopy>{featuredActivities.length
                    ? "Lihat semua aktivitas"
                    : "Buat care plan pertama"}</LocalizedCopy>
                </b>
                <small><LocalizedCopy>{"Semua jadwal pet dalam satu tempat"}</LocalizedCopy></small>
              </div>
              <i>
                <Icon name="arrow" size={14} />
              </i>
            </LocalizedButton>
          </div>
        </section>

        <div className="home-rail-dock">
          <LocalizedButton
            type="button"
            className="home-rail-dock-action"
            onClick={() => setChatOpen(true)}
          >
            <span>
              <Icon name="chat" size={18} />
            </span>
            <div>
              <b><LocalizedCopy>{"Tanya Dokter Hewan 24/7"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Konsultasi online cepat dan ramah"}</LocalizedCopy></small>
            </div>
            <Icon name="arrow" size={14} />
          </LocalizedButton>
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
        <span><LocalizedCopy>{"🐾"}</LocalizedCopy></span>
        <h3><LocalizedCopy>{"Belum ada pet di akunmu"}</LocalizedCopy></h3>
        <p><LocalizedCopy>{"Tambahkan profil pertama untuk mulai menyimpan identitas dan kesehatan."}</LocalizedCopy></p>
        <LocalizedButton className="primary-button" onClick={() => setAddPetOpen(true)}><LocalizedCopy>{"Tambah pet"}</LocalizedCopy></LocalizedButton>
      </div>
    );
  return (
    <div className="two-column-page">
      <section>
        <div className="pet-card-grid">
          <LocalizedCopy>{petProfiles.map((item) => (
            <LocalizedButton
              className={`pet-profile-card ${selectedPetId === item.id ? "selected" : ""}`}
              type="button"
              key={item.id}
              onClick={() => setSelectedPetId(item.id)}
            >
              <span
                className="pet-profile-avatar"
                style={{ background: `${item.color}24` }}
              >
                <LocalizedCopy>{item.photoUrl ? (
                  <Image
                    src={item.photoUrl}
                    alt={item.name}
                    width={96}
                    height={96}
                    unoptimized
                  />
                ) : (
                  item.avatar
                )}</LocalizedCopy>
                <i>
                  <Icon name="check" size={11} />
                </i>
              </span>
              <span className="pet-profile-copy">
                <b><LocalizedCopy>{item.name}</LocalizedCopy></b>
                <small><LocalizedCopy>{item.breed}</LocalizedCopy></small>
                <em>
                  <LocalizedCopy>{item.gender}</LocalizedCopy><LocalizedCopy>{" • "}</LocalizedCopy><LocalizedCopy>{item.age}</LocalizedCopy>
                  <LocalizedCopy>{item.accessRole && item.accessRole !== "owner" && (
                    <span className="shared-pet-badge"><LocalizedCopy>{" · Dibagikan"}</LocalizedCopy></span>
                  )}</LocalizedCopy>
                </em>
              </span>
              <span className="pet-score-small">
                <b><LocalizedCopy>{item.healthScore}</LocalizedCopy></b>
                <small><LocalizedCopy>{"Health"}</LocalizedCopy></small>
              </span>
            </LocalizedButton>
          ))}</LocalizedCopy>
          <LocalizedButton
            className="add-pet-card"
            type="button"
            onClick={() => setAddPetOpen(true)}
          >
            <span>
              <Icon name="plus" size={25} />
            </span>
            <b><LocalizedCopy>{"Tambah hewan"}</LocalizedCopy></b>
            <small><LocalizedCopy>{"Buat profil untuk anggota keluarga baru"}</LocalizedCopy></small>
          </LocalizedButton>
        </div>

        <section className="panel pet-detail-panel">
          <div className="panel-heading">
            <div>
              <span className="section-eyebrow"><LocalizedCopy>{"PET IDENTITY"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{"Profil "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h3>
            </div>
            <LocalizedCopy>{can("profile") && (
              <LocalizedButton
                className="secondary-button small"
                type="button"
                onClick={() => setModal("edit")}
              >
                <Icon name="edit" size={15} /><LocalizedCopy>{" Edit profil"}</LocalizedCopy></LocalizedButton>
            )}</LocalizedCopy>
          </div>
          <div className="pet-identity-banner">
            <div className="pet-id-avatar"><LocalizedCopy>{pet.avatar}</LocalizedCopy></div>
            <div>
              <span className="verified-badge">
                <Icon name="shield" size={13} /><LocalizedCopy>{" Identitas terverifikasi"}</LocalizedCopy></span>
              <h2><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h2>
              <p>
                <LocalizedCopy>{pet.breed}</LocalizedCopy><LocalizedCopy>{" • "}</LocalizedCopy><LocalizedCopy>{pet.gender}</LocalizedCopy>
              </p>
              <small><LocalizedCopy>{"Microchip: "}</LocalizedCopy><LocalizedCopy>{pet.microchip}</LocalizedCopy></small>
            </div>
            <LocalizedButton type="button" onClick={() => setModal("id")}>
              <span><LocalizedCopy>{"▦"}</LocalizedCopy></span>
              <small><LocalizedCopy>{"Tampilkan Pet ID"}</LocalizedCopy></small>
            </LocalizedButton>
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
            <span><LocalizedCopy>{"📝"}</LocalizedCopy></span>
            <div>
              <b><LocalizedCopy>{"Catatan khusus"}</LocalizedCopy></b>
              <p>
                <LocalizedCopy>{pet.notes || "Belum ada catatan khusus."}</LocalizedCopy>
                <LocalizedCopy>{pet.allergies ? ` · Alergi: ${pet.allergies}` : ""}</LocalizedCopy>
              </p>
            </div>
            <LocalizedCopy>{can("profile") && (
              <LocalizedButton type="button" onClick={() => setModal("notes")}>
                <Icon name="edit" size={16} />
              </LocalizedButton>
            )}</LocalizedCopy>
          </div>
        </section>
      </section>
      <aside className="right-stack">
        <section className="panel compact-panel">
          <div className="panel-heading">
            <h3><LocalizedCopy>{"Ringkasan perawatan"}</LocalizedCopy></h3>
            <span className="score-chip"><LocalizedCopy>{pet.healthScore}</LocalizedCopy><LocalizedCopy>{"/100"}</LocalizedCopy></span>
          </div>
          <Progress label="Profil kesehatan" value={100} />
          <Progress label="Vaksin wajib" value={80} />
          <Progress label="Preventive care" value={75} />
          <LocalizedButton
            className="full-soft-button"
            type="button"
            onClick={() => setActiveView("health")}
          ><LocalizedCopy>{"Buka pusat kesehatan "}</LocalizedCopy><Icon name="arrow" size={15} />
          </LocalizedButton>
        </section>
        <section className="panel compact-panel">
          <div className="panel-heading">
            <h3><LocalizedCopy>{"Akses keluarga"}</LocalizedCopy></h3>
            <LocalizedCopy>{can("family") && (
              <LocalizedButton
                className="round-button"
                type="button"
                onClick={() => setModal("family")}
              >
                <Icon name="plus" size={16} />
              </LocalizedButton>
            )}</LocalizedCopy>
          </div>
          <p className="muted-copy"><LocalizedCopy>{"Undang co-parent, caregiver, dokter, atau viewer dengan izin terperinci."}</LocalizedCopy></p>
          <LocalizedCopy>{can("family") && (
            <LocalizedButton
              className="full-soft-button"
              type="button"
              onClick={() => setModal("family")}
            ><LocalizedCopy>{"Kelola akses keluarga"}</LocalizedCopy></LocalizedButton>
          )}</LocalizedCopy>
        </section>
        <LocalizedCopy>{can("lost_mode") && (
          <section className="lost-mode-card">
            <span><LocalizedCopy>{"📍"}</LocalizedCopy></span>
            <div>
              <b><LocalizedCopy>{"Lost Pet Mode"}</LocalizedCopy></b>
              <p><LocalizedCopy>{"Aktifkan peringatan dan bagikan profil "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy><LocalizedCopy>{" ke komunitas sekitar."}</LocalizedCopy></p>
              <LocalizedButton type="button" onClick={() => setModal("lost")}><LocalizedCopy>{"Kelola Lost Pet Mode"}</LocalizedCopy></LocalizedButton>
            </div>
          </section>
        )}</LocalizedCopy>
      </aside>
      <LocalizedCopy>{modal === "id" && <PetIDModal pet={pet} close={() => setModal(null)} />}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{modal === "edit" && (
        <PetEditModal
          pet={pet}
          close={() => setModal(null)}
          changed={onChanged}
          notify={notify}
        />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{modal === "notes" && (
        <PetNotesModal
          pet={pet}
          close={() => setModal(null)}
          changed={onChanged}
          notify={notify}
        />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{modal === "family" && (
        <FamilyModal pet={pet} close={() => setModal(null)} notify={notify} />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{modal === "lost" && (
        <LostModeModal pet={pet} close={() => setModal(null)} notify={notify} />
      )}</LocalizedCopy>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <div className="pet-id-card">
          <span className="pet-id-logo">
            <Logo />
          </span>
          <div className="pet-id-photo">
            <LocalizedCopy>{pet.photoUrl ? (
              <Image
                src={pet.photoUrl}
                alt={pet.name}
                width={240}
                height={240}
                unoptimized
              />
            ) : (
              pet.avatar
            )}</LocalizedCopy>
          </div>
          <span className="verified-badge">
            <Icon name="shield" size={13} /><LocalizedCopy>{" Slivadoc Pet ID"}</LocalizedCopy></span>
          <h2><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h2>
          <p>
            <LocalizedCopy>{pet.breed}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{pet.gender}</LocalizedCopy>
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
          <code><LocalizedCopy>{pet.id}</LocalizedCopy></code>
          <dl>
            <div>
              <dt><LocalizedCopy>{"Microchip"}</LocalizedCopy></dt>
              <dd><LocalizedCopy>{pet.microchip}</LocalizedCopy></dd>
            </div>
            <div>
              <dt><LocalizedCopy>{"Health score"}</LocalizedCopy></dt>
              <dd><LocalizedCopy>{pet.healthScore}</LocalizedCopy><LocalizedCopy>{"/100"}</LocalizedCopy></dd>
            </div>
          </dl>
          <small><LocalizedCopy>{"Pindai untuk membuka identitas darurat terverifikasi Slivadoc."}</LocalizedCopy></small>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"PET IDENTITY"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Edit profil "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h2>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span><LocalizedCopy>{"Nama"}</LocalizedCopy></span>
            <LocalizedInput name="name" defaultValue={pet.name} minLength={2} required />
          </label>
          <label>
            <span><LocalizedCopy>{"Ras"}</LocalizedCopy></span>
            <LocalizedInput name="breed" defaultValue={pet.breed} />
          </label>
          <div className="form-row">
            <label>
              <span><LocalizedCopy>{"Jenis kelamin"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Jenis kelamin"
                name="sex"
                defaultValue={pet.gender === "Betina" ? "female" : "male"}
              >
                <option value="male">Jantan</option>
                <option value="female">Betina</option>
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Tanggal lahir"}</LocalizedCopy></span>
              <SlivaDatePicker
                name="birth_date"
                type="date"
                defaultValue={pet.birthDate?.slice(0, 10)}
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              <span><LocalizedCopy>{"Berat (kg)"}</LocalizedCopy></span>
              <LocalizedInput
                name="weight_kg"
                type="number"
                step="0.1"
                defaultValue={parseFloat(pet.weight)}
              />
            </label>
            <label>
              <span><LocalizedCopy>{"Warna"}</LocalizedCopy></span>
              <LocalizedInput name="color" defaultValue={pet.color} />
            </label>
          </div>
          <label>
            <span><LocalizedCopy>{"Nomor microchip"}</LocalizedCopy></span>
            <LocalizedInput
              name="microchip_number"
              defaultValue={
                pet.microchip === "Belum terdaftar" ? "" : pet.microchip
              }
            />
          </label>
          <LocalizedButton className="primary-button full" disabled={busy}>
            <LocalizedCopy>{busy ? "Menyimpan…" : "Simpan perubahan"}</LocalizedCopy>
          </LocalizedButton>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"CATATAN KHUSUS"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Kebutuhan penting "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h2>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span><LocalizedCopy>{"Alergi"}</LocalizedCopy></span>
            <LocalizedTextarea
              name="allergies"
              defaultValue={pet.allergies}
              placeholder="Contoh: protein ayam"
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Perilaku, preferensi, dan catatan medis"}</LocalizedCopy></span>
            <LocalizedTextarea
              name="medical_notes"
              defaultValue={pet.notes}
              placeholder="Tuliskan hal yang perlu diketahui dokter, groomer, atau caregiver"
              rows={5}
            />
          </label>
          <LocalizedButton className="primary-button full" disabled={busy}>
            <LocalizedCopy>{busy ? "Menyimpan…" : "Simpan catatan"}</LocalizedCopy>
          </LocalizedButton>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"AKSES KELUARGA · "}</LocalizedCopy><LocalizedCopy>{pet.name.toUpperCase()}</LocalizedCopy>
        </span>
        <h2><LocalizedCopy>{"Orang yang dipercaya"}</LocalizedCopy></h2>
        <div className="family-access-list">
          <LocalizedCopy>{loading ? (
            <p><LocalizedCopy>{"Memuat akses…"}</LocalizedCopy></p>
          ) : (
            items.map((item) => (
              <div key={item.id}>
                <span>
                  <LocalizedCopy>{item.full_name
                    .split(" ")
                    .map((value) => value[0])
                    .slice(0, 2)
                    .join("")}</LocalizedCopy>
                </span>
                <p>
                  <b><LocalizedCopy preserve>{item.full_name}</LocalizedCopy></b>
                  <small>
                    <LocalizedCopy>{item.email}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.role}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.status}</LocalizedCopy>
                  </small>
                </p>
                <LocalizedCopy>{item.role !== "owner" && (
                  <LocalizedButton onClick={() => void revoke(item.id)}><LocalizedCopy>{"Cabut"}</LocalizedCopy></LocalizedButton>
                )}</LocalizedCopy>
              </div>
            ))
          )}</LocalizedCopy>
        </div>
        <form className="world-form family-invite" onSubmit={invite}>
          <h3><LocalizedCopy>{"Undang anggota"}</LocalizedCopy></h3>
          <label>
            <span><LocalizedCopy>{"Nama lengkap"}</LocalizedCopy></span>
            <LocalizedInput name="full_name" required />
          </label>
          <label>
            <span><LocalizedCopy>{"Email"}</LocalizedCopy></span>
            <LocalizedInput name="email" type="email" required />
          </label>
          <label>
            <span><LocalizedCopy>{"Role akses"}</LocalizedCopy></span>
            <SlivaSelect aria-label="Role akses" name="role">
              <option value="co_parent">Co-parent</option>
              <option value="caregiver">Caregiver</option>
              <option value="veterinarian">Dokter</option>
              <option value="viewer">Viewer</option>
            </SlivaSelect>
          </label>
          <LocalizedButton className="primary-button full" disabled={busy}>
            <LocalizedCopy>{busy ? "Mengirim…" : "Kirim undangan"}</LocalizedCopy>
          </LocalizedButton>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"LOST PET EMERGENCY"}</LocalizedCopy></span>
        <h2>
          <LocalizedCopy>{mode?.active
            ? `Pencarian ${pet.name} sedang aktif`
            : `Aktifkan Lost Pet Mode`}</LocalizedCopy>
        </h2>
        <LocalizedCopy>{mode?.active ? (
          <div className="lost-active">
            <span><LocalizedCopy>{"📡"}</LocalizedCopy></span>
            <p><LocalizedCopy>{"Komunitas radius "}</LocalizedCopy><LocalizedCopy>{mode.radius_km}</LocalizedCopy><LocalizedCopy>{" km sudah menerima laporan dari"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedCopy>{mode.last_seen_location}</LocalizedCopy><LocalizedCopy>{"."}</LocalizedCopy></p>
            <code><LocalizedCopy>{mode.public_token}</LocalizedCopy></code>
            <LocalizedButton
              className="primary-button full"
              disabled={busy}
              onClick={() => void found()}
            >
              <LocalizedCopy>{busy ? "Memproses…" : `${pet.name} sudah ditemukan`}</LocalizedCopy>
            </LocalizedButton>
          </div>
        ) : (
          <form className="world-form" onSubmit={submit}>
            <label>
              <span><LocalizedCopy>{"Terakhir terlihat"}</LocalizedCopy></span>
              <SlivaDatePicker name="last_seen_at" type="datetime-local" required />
            </label>
            <label>
              <span><LocalizedCopy>{"Lokasi terakhir"}</LocalizedCopy></span>
              <LocalizedInput
                name="last_seen_location"
                placeholder="Nama tempat / alamat lengkap"
                required
              />
            </label>
            <div className="form-row">
              <label>
                <span><LocalizedCopy>{"Latitude"}</LocalizedCopy></span>
                <LocalizedInput name="latitude" type="number" step="any" />
              </label>
              <label>
                <span><LocalizedCopy>{"Longitude"}</LocalizedCopy></span>
                <LocalizedInput name="longitude" type="number" step="any" />
              </label>
            </div>
            <label>
              <span><LocalizedCopy>{"Radius notifikasi"}</LocalizedCopy></span>
              <SlivaSelect aria-label="Radius notifikasi" name="radius_km" defaultValue="10">
                <option value="3">3 km</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
              </SlivaSelect>
            </label>
            <label>
              <span><LocalizedCopy>{"Kronologi & ciri khusus"}</LocalizedCopy></span>
              <LocalizedTextarea name="description" required />
            </label>
            <label>
              <span><LocalizedCopy>{"Nomor kontak"}</LocalizedCopy></span>
              <LocalizedInput name="contact_phone" required />
            </label>
            <label>
              <span><LocalizedCopy>{"Imbalan (opsional)"}</LocalizedCopy></span>
              <LocalizedInput name="reward_amount" type="number" min="0" />
            </label>
            <LocalizedButton className="primary-button full" disabled={busy}>
              <LocalizedCopy>{busy
                ? "Mengaktifkan jaringan…"
                : "Aktifkan peringatan komunitas"}</LocalizedCopy>
            </LocalizedButton>
          </form>
        )}</LocalizedCopy>
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
          <span><LocalizedCopy>{"JELAJAHI LAYANAN"}</LocalizedCopy></span>
          <h2><LocalizedCopy>{"Mau manjain pet-mu dengan apa? ✨"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Bandingkan detail layanan, status izin mitra, dan slot aktual di dekatmu."}</LocalizedCopy></p>
        </div>
      </header>
      <section className="discover-search-card">
        <label>
          <Icon name="search" />
          <LocalizedInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari klinik atau layanan"
          />
        </label>
      </section>
      <div className="filter-bar">
        <div className="filter-pills">
          <LocalizedCopy>{filters.map((item) => (
            <LocalizedButton
              type="button"
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => chooseFilter(item)}
            >
              <LocalizedCopy>{item}</LocalizedCopy>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
        <LocalizedButton
          className="secondary-button small discover-filter-button"
          type="button"
          onClick={() => setFilterOpen(true)}
        >
          <Icon name="filter" size={16} /><LocalizedCopy>{" Filter"}</LocalizedCopy></LocalizedButton>
      </div>
      <div className="discover-result-head">
        <p>
          <b><LocalizedCopy>{result.length}</LocalizedCopy><LocalizedCopy>{" layanan"}</LocalizedCopy></b><LocalizedCopy>{" dari seluruh area layanan Slivadoc"}</LocalizedCopy></p>
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
        <LocalizedCopy catalogue>{result.map((service) => (
          <article
            className="service-result-card"
            key={`${service.id}:${service.branchId}`}
          >
            <div className={`service-result-cover ${service.accent}`}>
              <LocalizedCopy catalogue>{service.imageUrl ? (
                <Image
                  className="catalog-cover-image"
                  src={service.imageUrl}
                  alt={`Gambar ${service.name}`}
                  fill
                  sizes="(max-width: 620px) 100vw, 155px"
                  unoptimized
                />
              ) : (
                <span><LocalizedCopy>{service.emoji}</LocalizedCopy></span>
              )}</LocalizedCopy>
              <em><LocalizedCopy>{service.type}</LocalizedCopy></em>
              <LocalizedCopy>{service.discountPercent && service.discountPercent > 0 ? (
                <DiscountBadge percent={service.discountPercent} />
              ) : null}</LocalizedCopy>
              <LocalizedButton
                type="button"
                aria-label="Favorit"
                className={favorites.includes(service.id) ? "favorite" : ""}
                onClick={() => toggleFavorite(service.id)}
              >
                <Icon name="heart" size={18} />
              </LocalizedButton>
            </div>
            <div className="service-result-body">
              <div className="service-name-row">
                <div>
                  <h3><LocalizedCopy catalogue>{service.name}</LocalizedCopy></h3>
                  <p>
                    <Icon name="map" size={14} /> <LocalizedCopy>{service.distance}</LocalizedCopy><LocalizedCopy>{" •"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{service.address}</LocalizedCopy>
                  </p>
                </div>
                <span className="rating-box">
                  <span>
                    <Icon name="star" size={12} />
                    <b>
                      <LocalizedCopy>{service.rating > 0 ? service.rating.toFixed(1) : "-"}</LocalizedCopy>
                    </b>
                  </span>
                  <small>
                    <LocalizedCopy>{service.reviews.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" ulasan"}</LocalizedCopy></small>
                </span>
              </div>
              <div className="tag-row">
                <LocalizedCopy>{service.tags.map((tag) => (
                  <span key={tag}><LocalizedCopy>{tag}</LocalizedCopy></span>
                ))}</LocalizedCopy>
              </div>
              <div className="availability">
                <span className="live-dot" />
                <b><LocalizedCopy>{service.status}</LocalizedCopy></b>
              </div>
              <div className="service-result-footer">
                <div>
                  <small><LocalizedCopy>{"Estimasi harga"}</LocalizedCopy></small>
                  <LocalizedCopy>{service.originalPrice ? (
                    <span className="service-promo-price">
                      <s><LocalizedCopy>{formatRupiah(service.originalPrice)}</LocalizedCopy></s>
                      <b><LocalizedCopy>{service.price}</LocalizedCopy></b>
                    </span>
                  ) : (
                    <b><LocalizedCopy>{service.price}</LocalizedCopy></b>
                  )}</LocalizedCopy>
                </div>
                <LocalizedButton
                  className="secondary-button small"
                  type="button"
                  onClick={() => openDetail(service.id)}
                ><LocalizedCopy>{"Lihat detail"}</LocalizedCopy></LocalizedButton>
                <LocalizedButton
                  className="primary-button small"
                  type="button"
                  onClick={() => openBooking(service)}
                ><LocalizedCopy>{"Booking"}</LocalizedCopy></LocalizedButton>
              </div>
            </div>
          </article>
        ))}</LocalizedCopy>
      </div>
      <LocalizedCopy>{result.length === 0 && (
        <div className="empty-state">
          <span><LocalizedCopy>{"🔎"}</LocalizedCopy></span>
          <h3><LocalizedCopy>{"Layanan belum ditemukan"}</LocalizedCopy></h3>
          <p><LocalizedCopy>{"Coba kata kunci atau kategori lain."}</LocalizedCopy></p>
          <LocalizedButton
            className="primary-button small"
            type="button"
            onClick={reset}
          ><LocalizedCopy>{"Reset pencarian"}</LocalizedCopy></LocalizedButton>
        </div>
      )}</LocalizedCopy>
      <LocalizedCopy>{filterOpen && (
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
                <span className="section-eyebrow"><LocalizedCopy>{"FILTER JELAJAHI"}</LocalizedCopy></span>
                <h2><LocalizedCopy>{"Temukan layanan yang pas"}</LocalizedCopy></h2>
              </div>
              <LocalizedButton
                className="modal-close"
                onClick={() => setFilterOpen(false)}
                aria-label="Tutup"
              >
                <Icon name="close" />
              </LocalizedButton>
            </header>
            <label>
              <span><LocalizedCopy>{"Jenis layanan"}</LocalizedCopy></span>
              <div className="filter-panel-pills">
                <LocalizedCopy>{filters.map((item) => (
                  <LocalizedButton
                    type="button"
                    key={item}
                    className={filter === item ? "active" : ""}
                    onClick={() => chooseFilter(item)}
                  >
                    <LocalizedCopy>{item}</LocalizedCopy>
                  </LocalizedButton>
                ))}</LocalizedCopy>
              </div>
            </label>
            <label>
              <span><LocalizedCopy>{"Urutkan berdasarkan"}</LocalizedCopy></span>
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
              <LocalizedButton
                className="secondary-button"
                type="button"
                onClick={() => {
                  reset();
                  notify("Filter layanan direset");
                }}
              ><LocalizedCopy>{"Reset"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className="primary-button"
                type="button"
                onClick={() => setFilterOpen(false)}
              ><LocalizedCopy>{"Tampilkan "}</LocalizedCopy><LocalizedCopy>{result.length}</LocalizedCopy><LocalizedCopy>{" hasil"}</LocalizedCopy></LocalizedButton>
            </footer>
          </section>
        </div>
      )}</LocalizedCopy>
      <LocalizedCopy>{detail && (
        <ServiceDetail
          service={detail}
          close={closeDetail}
          book={() => {
            closeDetail();
            openBooking(detail);
          }}
        />
      )}</LocalizedCopy>
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
          <h2><LocalizedCopy>{"Aktivitas"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Booking, pesanan, kelas, tiket, reservasi, dan dokumen pet-mu."}</LocalizedCopy></p>
        </div>
      </header>

      <LocalizedCopy>{attention.length > 0 && (
        <section className="activity-attention" aria-label="Perlu tindakan">
          <header>
            <h3><LocalizedCopy>{"Perlu tindakan"}</LocalizedCopy></h3>
            <span className="activity-tab-count"><LocalizedCopy>{attention.length}</LocalizedCopy></span>
          </header>
          <LocalizedCopy>{attention.map((item) => {
            const meta = getActivityTypeMeta(item.type);
            return (
              <article key={`${item.type}-${item.id}`}>
                <span
                  className={`activity-native-icon activity-native-icon--${meta.tone}`}
                >
                  <Icon name={meta.icon} size={18} />
                </span>
                <div>
                  <b><LocalizedCopy>{item.title}</LocalizedCopy></b>
                  <small><LocalizedCopy>{activityAttentionReason(item)}</LocalizedCopy></small>
                </div>
                <LocalizedButton
                  className="primary-button small"
                  type="button"
                  onClick={() => setDetail({ item, autoPay: item.payable })}
                >
                  <LocalizedCopy>{item.payable
                    ? "Bayar"
                    : item.type === "event"
                      ? "Tiket QR"
                      : "Lihat detail"}</LocalizedCopy>
                </LocalizedButton>
              </article>
            );
          })}</LocalizedCopy>
        </section>
      )}</LocalizedCopy>

      <div className="activity-controls">
        <div
          className="activity-state-tabs"
          role="group"
          aria-label="Status aktivitas"
        >
          <LocalizedCopy>{activityStateTabs.map(([value, label]) => (
            <LocalizedButton
              type="button"
              key={value}
              className={tab === value ? "active" : ""}
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
            >
              <span><LocalizedCopy>{label}</LocalizedCopy></span>
              <span className="activity-tab-count">
                <LocalizedCopy>{activities.filter((item) => item.state === value).length}</LocalizedCopy>
              </span>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
        <div
          className="activity-type-chips"
          role="group"
          aria-label="Jenis aktivitas"
        >
          <LocalizedButton
            type="button"
            aria-pressed={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
          ><LocalizedCopy>{"Semua "}</LocalizedCopy><span className="activity-tab-count"><LocalizedCopy>{totalCount}</LocalizedCopy></span>
          </LocalizedButton>
          <LocalizedCopy>{chips.map((type) => (
            <LocalizedButton
              type="button"
              key={type}
              aria-pressed={typeFilter === type}
              onClick={() => setTypeFilter(type)}
            >
              <LocalizedCopy>{getActivityTypeMeta(type).label}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
              <span className="activity-tab-count"><LocalizedCopy>{typeCount(type)}</LocalizedCopy></span>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
      </div>

      <header className="activity-native-toolbar">
        <div className="activity-native-summary">
          <h3 aria-live="polite"><LocalizedCopy>{visible.length}</LocalizedCopy><LocalizedCopy>{" aktivitas"}</LocalizedCopy></h3>
        </div>
        <div className="activity-native-actions">
          <LocalizedButton
            className="activity-points"
            type="button"
            onClick={() =>
              notify(
                points
                  ? `Saldo ${points.toLocaleString(petOwnerIntlLocale())} poin. ${rewardFormulaText(rewardFormula)}`
                  : "Belum ada transaksi terbayar, jadi Sliva Point masih 0.",
              )
            }
          >
            <Icon name="sparkle" size={14} />
            <LocalizedCopy>{points.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" poin"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton
            className="primary-button small"
            type="button"
            onClick={() => openBooking()}
          >
            <Icon name="plus" size={15} /><LocalizedCopy>{" Buat booking"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton
            className="secondary-button small"
            type="button"
            onClick={() => setInvoicesOpen(true)}
          >
            <Icon name="download" size={15} /><LocalizedCopy>{" Invoice"}</LocalizedCopy></LocalizedButton>
        </div>
      </header>

      <div className="activity-native-list">
        <LocalizedCopy>{visible.length ? (
          visible.map((item) => {
            const meta = getActivityTypeMeta(item.type);
            const repeatLabel = activityRepeatLabels[item.type];
            return (
              <article
                className="activity-native-card"
                key={`${item.type}-${item.id}`}
              >
                <LocalizedButton
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
                      <small><LocalizedCopy>{meta.label}</LocalizedCopy></small>
                      <i><LocalizedCopy>{activityStatusLabel(item)}</LocalizedCopy></i>
                    </span>
                    <b><LocalizedCopy>{item.title}</LocalizedCopy></b>
                    <span><LocalizedCopy>{item.subtitle}</LocalizedCopy></span>
                    <small className="activity-native-date">
                      <Icon name="clock" size={13} />
                      <LocalizedCopy>{formatActivityDate(item.scheduled_at || item.occurred_at)}</LocalizedCopy>
                    </small>
                  </span>
                  <Icon name="chevron" size={17} />
                </LocalizedButton>
                <footer>
                  <span>
                    <Icon
                      name={item.type === "order" ? "bag" : "paw"}
                      size={14}
                    />
                    <LocalizedCopy>{item.type === "order"
                      ? `${item.item_count ?? 0} produk`
                      : item.pet_name || "Pet kamu"}</LocalizedCopy>
                  </span>
                  <LocalizedCopy>{item.latitude != null && item.longitude != null ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="map" size={14} /><LocalizedCopy>{" Arah"}</LocalizedCopy></a>
                  ) : null}</LocalizedCopy>
                  <LocalizedCopy>{repeatLabel && (
                    <LocalizedButton type="button" onClick={() => onRepeat(item)}>
                      <Icon name="arrow" size={14} /> <LocalizedCopy>{repeatLabel}</LocalizedCopy>
                    </LocalizedButton>
                  )}</LocalizedCopy>
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
              <LocalizedCopy>{activities.length
                ? "Tidak ada aktivitas yang cocok"
                : "Belum ada aktivitas"}</LocalizedCopy>
            </h3>
            <p>
              <LocalizedCopy>{activities.length
                ? "Ubah status atau jenis aktivitas untuk melihat catatan lainnya."
                : "Booking, belanja, konsultasi, kelas, tiket, dan reservasi pet-mu akan muncul di sini."}</LocalizedCopy>
            </p>
          </div>
        )}</LocalizedCopy>
      </div>
      <LocalizedCopy>{hasMoreActivities && (
        <LocalizedButton
          className="secondary-button full"
          type="button"
          disabled={loadingMoreActivities}
          onClick={onLoadMore}
        >
          <LocalizedCopy>{loadingMoreActivities ? "Memuat…" : "Muat lebih banyak"}</LocalizedCopy>
        </LocalizedButton>
      )}</LocalizedCopy>

      <section className="activity-native-cta">
        <div>
          <span>
            <Icon name="sparkle" size={17} />
          </span>
          <p>
            <b><LocalizedCopy>{"Butuh layanan lain?"}</LocalizedCopy></b>
            <small><LocalizedCopy>{"Booking dokter, grooming, home care, atau hotel dalam beberapa langkah."}</LocalizedCopy></small>
          </p>
        </div>
        <LocalizedButton
          className="secondary-button"
          type="button"
          onClick={() => setActiveView("discover")}
        ><LocalizedCopy>{"Jelajahi layanan"}</LocalizedCopy></LocalizedButton>
      </section>
      <LocalizedCopy>{detailItem && detail && (
        <ActivityDetail
          key={`${detailItem.type}-${detailItem.id}`}
          item={detailItem}
          autoPay={detail.autoPay}
          close={() => setDetail(null)}
          onPaid={onPaid}
          onRepeat={onRepeat}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{invoicesOpen && <InvoicesPanel close={() => setInvoicesOpen(false)} />}</LocalizedCopy>
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
        <LocalizedButton className="modal-close" onClick={close} aria-label="Tutup">
          <Icon name="close" />
        </LocalizedButton>
        <header className="activity-detail-hero">
          <span>
            <Icon name="download" size={24} />
          </span>
          <div>
            <small><LocalizedCopy>{"INVOICE"}</LocalizedCopy></small>
            <h2><LocalizedCopy>{"Invoice klinik & toko"}</LocalizedCopy></h2>
          </div>
        </header>
        <LocalizedCopy>{loading ? (
          <p className="form-message" role="status"><LocalizedCopy>{"Memuat invoice…"}</LocalizedCopy></p>
        ) : error ? (
          <div className="form-message" role="alert">
            <p><LocalizedCopy>{error}</LocalizedCopy></p>
            <LocalizedButton
              className="secondary-button"
              type="button"
              onClick={() => void load()}
            ><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></LocalizedButton>
          </div>
        ) : invoices.length ? (
          <div className="activity-native-list">
            <LocalizedCopy>{invoices.map((invoice) => (
              <article className="activity-native-card" key={invoice.id}>
                <LocalizedButton
                  className="activity-native-main"
                  type="button"
                  onClick={() => setSelectedId(invoice.id)}
                >
                  <span className="activity-native-copy">
                    <span className="activity-native-meta">
                      <small><LocalizedCopy>{invoice.invoice_number}</LocalizedCopy></small>
                      <i><LocalizedCopy>{invoiceStatusLabels[invoice.status]}</LocalizedCopy></i>
                    </span>
                    <b>
                      <LocalizedCopy>{[invoice.business_name, invoice.branch_name]
                        .filter(Boolean)
                        .join(" · ") || "Invoice"}</LocalizedCopy>
                    </b>
                    <span><LocalizedCopy>{formatRupiah(invoice.total_amount)}</LocalizedCopy></span>
                    <LocalizedCopy>{(invoice.issued_at ?? invoice.paid_at) && (
                      <small className="activity-native-date">
                        <Icon name="clock" size={13} />
                        <LocalizedCopy>{formatActivityDate(
                          (invoice.issued_at ?? invoice.paid_at) as string,
                        )}</LocalizedCopy>
                      </small>
                    )}</LocalizedCopy>
                  </span>
                  <Icon name="chevron" size={17} />
                </LocalizedButton>
              </article>
            ))}</LocalizedCopy>
          </div>
        ) : (
          <div className="empty-state activity-native-empty">
            <h3><LocalizedCopy>{"Belum ada invoice"}</LocalizedCopy></h3>
            <p><LocalizedCopy>{"Belum ada invoice tertaut. Tautkan kode pet owner di klinik agar invoice muncul di sini."}</LocalizedCopy></p>
          </div>
        )}</LocalizedCopy>
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
        <LocalizedButton className="modal-close" onClick={close} aria-label="Tutup">
          <Icon name="close" />
        </LocalizedButton>
        <LocalizedCopy>{error ? (
          <div className="form-message" role="alert">
            <p><LocalizedCopy>{error}</LocalizedCopy></p>
            <LocalizedButton
              className="secondary-button"
              type="button"
              onClick={() => void load()}
            ><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></LocalizedButton>
          </div>
        ) : !invoice ? (
          <p className="form-message" role="status"><LocalizedCopy>{"Memuat invoice…"}</LocalizedCopy></p>
        ) : (
          <>
            <header className="activity-detail-hero">
              <span>
                <Icon name="download" size={24} />
              </span>
              <div>
                <small><LocalizedCopy>{"INVOICE"}</LocalizedCopy></small>
                <h2><LocalizedCopy>{invoice.invoice_number}</LocalizedCopy></h2>
                <em><LocalizedCopy>{invoiceStatusLabels[invoice.status]}</LocalizedCopy></em>
              </div>
            </header>
            <dl>
              <LocalizedCopy>{(
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
                    <dt><LocalizedCopy>{label}</LocalizedCopy></dt>
                    <dd><LocalizedCopy>{value}</LocalizedCopy></dd>
                  </div>
                ))}</LocalizedCopy>
            </dl>
            <div className="activity-detail-copy">
              <span className="activity-detail-label"><LocalizedCopy>{"Rincian item"}</LocalizedCopy></span>
              <LocalizedCopy>{invoice.items.length ? (
                <ul>
                  <LocalizedCopy>{invoice.items.map((line, index) => (
                    <li key={`${line.description}-${index}`}>
                      <LocalizedCopy>{line.description}</LocalizedCopy><LocalizedCopy>{" × "}</LocalizedCopy><LocalizedCopy>{line.quantity}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{formatRupiah(line.line_total)}</LocalizedCopy>
                    </li>
                  ))}</LocalizedCopy>
                </ul>
              ) : (
                <p><LocalizedCopy>{"Tidak ada rincian item."}</LocalizedCopy></p>
              )}</LocalizedCopy>
            </div>
          </>
        )}</LocalizedCopy>
        <footer>
          <LocalizedButton className="secondary-button" type="button" onClick={back}><LocalizedCopy>{"Kembali ke daftar"}</LocalizedCopy></LocalizedButton>
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
          <span><LocalizedCopy>{"PUSAT KESEHATAN"}</LocalizedCopy></span>
          <h2><LocalizedCopy>{"Digital health record"}</LocalizedCopy></h2>
        </div>
      </header>

      <section className="health-hero-panel health-native-hero">
        <span className="health-native-glow" aria-hidden="true" />
        <div className="health-pet">
          <span><LocalizedCopy>{pet.avatar}</LocalizedCopy></span>
          <div>
            <small><LocalizedCopy>{"HEALTH PROFILE ✦"}</LocalizedCopy></small>
            <h2><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h2>
            <p>
              <LocalizedCopy>{pet.breed}</LocalizedCopy><LocalizedCopy>{" • "}</LocalizedCopy><LocalizedCopy>{pet.weight}</LocalizedCopy>
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
              <b><LocalizedCopy>{pet.healthScore}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Health"}</LocalizedCopy></small>
            </span>
          </div>
        </div>
        <div className="health-hero-meta">
          <span>
            <small><LocalizedCopy>{"Alergi"}</LocalizedCopy></small>
            <b><LocalizedCopy>{pet.allergies || "Belum dicatat"}</LocalizedCopy></b>
          </span>
          <span>
            <small><LocalizedCopy>{"Dokter terakhir"}</LocalizedCopy></small>
            <b><LocalizedCopy>{latest?.doctor_name || "Belum ada"}</LocalizedCopy></b>
          </span>
          <span>
            <small><LocalizedCopy>{"Update terakhir"}</LocalizedCopy></small>
            <b>
              <LocalizedCopy>{latest
                ? new Date(latest.occurred_at).toLocaleDateString(petOwnerIntlLocale())
                : "Belum ada record"}</LocalizedCopy>
            </b>
          </span>
        </div>
      </section>

      <div
        className="health-native-tabs"
        role="tablist"
        aria-label="Halaman kesehatan"
      >
        <LocalizedButton
          type="button"
          role="tab"
          className={screen === "summary" ? "active" : ""}
          aria-selected={screen === "summary"}
          onClick={() => setScreen("summary")}
        ><LocalizedCopy>{"Ringkasan"}</LocalizedCopy></LocalizedButton>
        <LocalizedButton
          type="button"
          role="tab"
          className={screen === "records" ? "active" : ""}
          aria-selected={screen === "records"}
          onClick={() => setScreen("records")}
        ><LocalizedCopy>{"Rekam Medis "}</LocalizedCopy><span><LocalizedCopy>{records.length}</LocalizedCopy></span>
        </LocalizedButton>
      </div>

      <LocalizedCopy>{screen === "summary" ? (
        <>
          <header className="health-native-section-header">
            <div>
              <span><LocalizedCopy>{"RINGKASAN KESEHATAN"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{"Data medis "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h3>
            </div>
            <LocalizedButton type="button" onClick={() => requirePet() && setReminderOpen(true)}>
              <Icon name="plus" size={15} /><LocalizedCopy>{" Pengingat"}</LocalizedCopy></LocalizedButton>
          </header>

          <section className="health-native-prevention">
            <div className="health-native-progress">
              <b><LocalizedCopy>{records.length}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Record"}</LocalizedCopy></small>
            </div>
            <div>
              <p>
                <span className={records.length ? "done" : ""}>
                  <LocalizedCopy>{records.length ? <Icon name="check" size={12} /> : "!"}</LocalizedCopy>
                </span>
                <b>
                  <LocalizedCopy>{records.length
                    ? "Rekam medis tersinkron"
                    : "Belum ada rekam medis"}</LocalizedCopy>
                </b>
                <small>
                  <LocalizedCopy>{latest?.title ||
                    "Buat booking pemeriksaan untuk memulai record"}</LocalizedCopy>
                </small>
              </p>
              <p>
                <span className={pet.healthScore > 0 ? "done" : ""}>
                  <LocalizedCopy>{pet.healthScore > 0 ? <Icon name="check" size={12} /> : "!"}</LocalizedCopy>
                </span>
                <b><LocalizedCopy>{"Health score "}</LocalizedCopy><LocalizedCopy>{pet.healthScore || "belum tersedia"}</LocalizedCopy></b>
                <small>
                  <LocalizedCopy>{pet.nextCare || "Lengkapi profil dan aktivitas pet"}</LocalizedCopy>
                </small>
              </p>
            </div>
          </section>

          <section className="health-native-facts">
            <article>
              <span>
                <Icon name="shield" size={17} />
              </span>
              <small><LocalizedCopy>{"Microchip"}</LocalizedCopy></small>
              <b><LocalizedCopy>{pet.microchip}</LocalizedCopy></b>
            </article>
            <article>
              <span>
                <Icon name="heart" size={17} />
              </span>
              <small><LocalizedCopy>{"Berat terbaru"}</LocalizedCopy></small>
              <b><LocalizedCopy>{latest?.weight_kg ? `${latest.weight_kg} kg` : pet.weight}</LocalizedCopy></b>
            </article>
          </section>

          {latest ? (
            <>
              <header className="health-native-section-header">
                <div>
                  <span><LocalizedCopy>{"RECORD TERBARU"}</LocalizedCopy></span>
                  <h3><LocalizedCopy>{latest.title}</LocalizedCopy></h3>
                </div>
                <LocalizedButton type="button" onClick={() => setScreen("records")}><LocalizedCopy>{"Semua "}</LocalizedCopy><Icon name="arrow" size={14} />
                </LocalizedButton>
              </header>
              <LocalizedButton
                className="health-native-latest"
                type="button"
                onClick={() => setDetail(latest)}
              >
                <span>
                  <Icon name="heart" size={20} />
                </span>
                <p>
                  <small>
                    <LocalizedCopy>{new Date(latest.occurred_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy>
                  </small>
                  <b><LocalizedCopy>{latest.diagnosis || latest.complaint || latest.title}</LocalizedCopy></b>
                  <span><LocalizedCopy>{latest.doctor_name || "Dokter belum dicatat"}</LocalizedCopy></span>
                </p>
                <i>
                  <Icon name="arrow" size={15} />
                </i>
              </LocalizedButton>
            </>
          ) : null}

          <section className="panel care-reminder-panel health-native-reminders">
            <header className="health-native-section-header">
              <div>
                <span><LocalizedCopy>{"PENGINGAT PERAWATAN"}</LocalizedCopy></span>
                <h3><LocalizedCopy>{"Jadwal penting "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h3>
              </div>
              <LocalizedButton type="button" onClick={() => requirePet() && setReminderOpen(true)}>
                <Icon name="plus" size={15} /><LocalizedCopy>{" Tambah"}</LocalizedCopy></LocalizedButton>
            </header>
            <div className="care-reminder-list">
              <LocalizedCopy>{reminders.filter((item) =>
                ["scheduled", "snoozed"].includes(item.status),
              ).length ? (
                reminders
                  .filter((item) =>
                    ["scheduled", "snoozed"].includes(item.status),
                  )
                  .map((item) => (
                    <article key={item.id}>
                      <span>
                        <LocalizedCopy>{item.reminder_type === "vaccination"
                          ? "💉"
                          : item.reminder_type === "medication"
                            ? "💊"
                            : item.reminder_type === "grooming"
                              ? "✂️"
                              : "🔔"}</LocalizedCopy>
                      </span>
                      <div>
                        <b><LocalizedCopy>{item.title}</LocalizedCopy></b>
                        <small>
                          <LocalizedCopy>{new Date(item.due_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                          <LocalizedCopy>{item.recurrence === "once"
                            ? "Satu kali"
                            : `Berulang ${item.recurrence}`}</LocalizedCopy>
                        </small>
                        <p>
                          <LocalizedCopy>{item.notes || `Pengingat untuk ${item.pet_name}`}</LocalizedCopy>
                        </p>
                      </div>
                      <div>
                        <LocalizedButton
                          type="button"
                          onClick={async () => {
                            await snoozeCareReminder(item.id, 1440);
                            await loadReminders();
                            notify("Pengingat ditunda satu hari");
                          }}
                        ><LocalizedCopy>{"Tunda"}</LocalizedCopy></LocalizedButton>
                        <LocalizedButton
                          className="complete"
                          type="button"
                          onClick={async () => {
                            await completeCareReminder(item.id);
                            await loadReminders();
                            notify("Perawatan ditandai selesai");
                          }}
                        ><LocalizedCopy>{"Selesai"}</LocalizedCopy></LocalizedButton>
                      </div>
                    </article>
                  ))
              ) : (
                <div className="empty-state compact health-native-reminder-empty"><LocalizedCopy>{"Belum ada pengingat. Tambahkan jadwal vaksin, obat, grooming, atau kontrol berikutnya."}</LocalizedCopy></div>
              )}</LocalizedCopy>
            </div>
          </section>

          {(pet.notes || pet.allergies) && (
            <section className="health-special-note">
              <span>
                <Icon name="shield" size={18} />
              </span>
              <div>
                <small><LocalizedCopy>{"CATATAN KHUSUS"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{pet.allergies
                    ? `Alergi: ${pet.allergies}`
                    : "Catatan kesehatan"}</LocalizedCopy>
                </b>
                <p><LocalizedCopy>{pet.notes || "Tidak ada catatan medis tambahan."}</LocalizedCopy></p>
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
            <LocalizedCopy>{categories.map((item) => (
              <LocalizedButton
                type="button"
                role="tab"
                className={tab === item.id ? "active" : ""}
                key={item.id}
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
              >
                <LocalizedCopy>{item.label}</LocalizedCopy>
              </LocalizedButton>
            ))}</LocalizedCopy>
          </div>
          <section className="panel health-record-api health-native-records">
            <header className="health-native-section-header">
              <div>
                <span><LocalizedCopy>{"PET MEDICAL RECORD"}</LocalizedCopy></span>
                <h3><LocalizedCopy>{"Riwayat "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h3>
              </div>
              <LocalizedButton
                type="button"
                disabled={!records.length}
                onClick={() => downloadPetMedicalPDF(pet, records)}
              >
                <Icon name="download" size={15} /><LocalizedCopy>{" Unduh"}</LocalizedCopy></LocalizedButton>
            </header>
            <LocalizedCopy>{loading ? (
              <div className="empty-state compact health-native-record-empty"><LocalizedCopy>{"Memuat rekam medis "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy><LocalizedCopy>{"…"}</LocalizedCopy></div>
            ) : visible.length ? (
              <div className="health-native-record-list">
                <LocalizedCopy>{visible.map((record) => (
                  <LocalizedButton
                    type="button"
                    key={record.id}
                    onClick={() => setDetail(record)}
                  >
                    <span>
                      <Icon name="heart" size={20} />
                    </span>
                    <p>
                      <small>
                        <LocalizedCopy>{record.record_type.toUpperCase()}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                        <LocalizedCopy>{new Date(record.occurred_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy>
                      </small>
                      <b><LocalizedCopy>{record.title}</LocalizedCopy></b>
                      <span>
                        <LocalizedCopy>{record.diagnosis ||
                          record.clinical_notes ||
                          record.complaint ||
                          "Tidak ada keterangan tambahan"}</LocalizedCopy>
                      </span>
                    </p>
                    <Icon name="chevron" size={16} />
                  </LocalizedButton>
                ))}</LocalizedCopy>
              </div>
            ) : (
              <div className="empty-state health-native-record-empty">
                <span>
                  <Icon name="heart" size={28} />
                </span>
                <h3><LocalizedCopy>{"Belum ada rekam medis"}</LocalizedCopy></h3>
                <p><LocalizedCopy>{"Record akan muncul setelah pemeriksaan atau konsultasi untuk"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy preserve>{pet.name}</LocalizedCopy><LocalizedCopy>{"."}</LocalizedCopy></p>
              </div>
            )}</LocalizedCopy>
          </section>
        </>
      )}</LocalizedCopy>

      <LocalizedCopy>{detail && (
        <div className="modal-overlay" onMouseDown={() => setDetail(null)}>
          <section
            className="modal medical-record-detail"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <LocalizedButton className="modal-close" onClick={() => setDetail(null)}>
              <Icon name="close" />
            </LocalizedButton>
            <span className="section-eyebrow">
              <LocalizedCopy>{detail.record_type.toUpperCase()}</LocalizedCopy>
            </span>
            <h2><LocalizedCopy>{detail.title}</LocalizedCopy></h2>
            <p>
              <LocalizedCopy>{new Date(detail.occurred_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
              <LocalizedCopy>{detail.doctor_name || "Dokter belum dicatat"}</LocalizedCopy>
            </p>
            <dl>
              <LocalizedCopy>{[
                ["Keluhan", detail.complaint],
                ["Diagnosis", detail.diagnosis],
                ["Perawatan", detail.treatment],
                ["Catatan klinis", detail.clinical_notes],
                [
                  "Kontrol berikutnya",
                  detail.next_control_at
                    ? new Date(detail.next_control_at).toLocaleString(petOwnerIntlLocale())
                    : "",
                ],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt><LocalizedCopy>{label}</LocalizedCopy></dt>
                    <dd><LocalizedCopy>{value}</LocalizedCopy></dd>
                  </div>
                ))}</LocalizedCopy>
            </dl>
            <LocalizedButton
              className="primary-button full"
              onClick={() => setDetail(null)}
            ><LocalizedCopy>{"Selesai"}</LocalizedCopy></LocalizedButton>
          </section>
        </div>
      )}</LocalizedCopy>
      <LocalizedCopy>{reminderOpen && (
        <ReminderModal
          pet={pet}
          close={() => setReminderOpen(false)}
          notify={notify}
          created={loadReminders}
        />
      )}</LocalizedCopy>
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
        <LocalizedButton className="modal-close" onClick={close}>
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"PENGINGAT PERAWATAN"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Jadwalkan untuk "}</LocalizedCopy><LocalizedCopy preserve>{pet.name}</LocalizedCopy></h2>
        <p className="muted-copy"><LocalizedCopy>{"Notifikasi disiapkan 7 hari, 1 hari, dan 2 jam sebelum jadwal."}</LocalizedCopy></p>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span><LocalizedCopy>{"Jenis perawatan"}</LocalizedCopy></span>
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
            <span><LocalizedCopy>{"Judul"}</LocalizedCopy></span>
            <LocalizedInput
              name="title"
              minLength={3}
              placeholder="Contoh: Booster rabies"
              required
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Tanggal & waktu"}</LocalizedCopy></span>
            <SlivaDatePicker name="due_at" type="datetime-local" required />
          </label>
          <div className="form-row">
            <label>
              <span><LocalizedCopy>{"Pengulangan"}</LocalizedCopy></span>
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
              <span><LocalizedCopy>{"Jarak khusus (hari)"}</LocalizedCopy></span>
              <LocalizedInput
                name="recurrence_days"
                type="number"
                min="1"
                defaultValue="30"
              />
            </label>
          </div>
          <label>
            <span><LocalizedCopy>{"Catatan"}</LocalizedCopy></span>
            <LocalizedTextarea
              name="notes"
              placeholder="Dosis, klinik, atau persiapan khusus"
            />
          </label>
          <LocalizedButton className="primary-button full" disabled={busy}>
            <LocalizedCopy>{busy ? "Menjadwalkan…" : "Simpan pengingat"}</LocalizedCopy>
          </LocalizedButton>
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
      <LocalizedButton type="button" onClick={() => setOpen((value) => !value)}>
        <LocalizedCopy>{open ? "Sembunyikan percakapan" : "Percakapan & balas"}</LocalizedCopy>
      </LocalizedButton>
      <LocalizedCopy>{open && (
        <>
          {error && <div className="form-message"><LocalizedCopy>{error}</LocalizedCopy></div>}
          <ul>
            <LocalizedCopy>{messages.map((message) => (
              <li
                key={message.id}
                className={message.sender_role === "support" ? "support" : "owner"}
              >
                <b>
                  <LocalizedCopy>{message.sender_role === "support"
                    ? "Tim Slivadoc"
                    : "Kamu"}</LocalizedCopy>
                </b>
                <p><LocalizedCopy>{message.body}</LocalizedCopy></p>
                <time>
                  <LocalizedCopy>{new Date(message.created_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy>
                </time>
              </li>
            ))}</LocalizedCopy>
            <LocalizedCopy>{messages.length === 0 && !error && (
              <li className="empty"><LocalizedCopy>{"Belum ada balasan."}</LocalizedCopy></li>
            )}</LocalizedCopy>
          </ul>
          {!closed && (
            <form onSubmit={send}>
              <LocalizedInput
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={2000}
                placeholder="Tulis balasan…"
                aria-label="Balasan ticket"
              />
              <LocalizedButton className="primary-button" disabled={busy || !body.trim()}><LocalizedCopy>{"Kirim"}</LocalizedCopy></LocalizedButton>
            </form>
          )}
        </>
      )}</LocalizedCopy>
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
          <span className="section-eyebrow"><LocalizedCopy>{"BANTUAN YANG DAPAT DILACAK"}</LocalizedCopy></span>
          <h2><LocalizedCopy>{"Sampaikan kendala tanpa mengulang kronologi."}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Kaitkan pengaduan ke pesanan atau booking. Nomor ticket, tenggat respons, status, dan penyelesaian tersimpan di akunmu."}</LocalizedCopy></p>
        </div>
        <aside>
          <Icon name="shield" size={24} />
          <b><LocalizedCopy>{"Target respons"}</LocalizedCopy></b>
          <strong><LocalizedCopy>{"1 hari kerja"}</LocalizedCopy></strong>
          <small><LocalizedCopy>{"Untuk tanggapan pertama tim Slivadoc."}</LocalizedCopy></small>
        </aside>
      </section>

      <div className="support-layout">
        <section className="panel support-form-card">
          <header>
            <span><LocalizedCopy>{"BUAT PENGADUAN"}</LocalizedCopy></span>
            <h3><LocalizedCopy>{"Ceritakan kendalanya"}</LocalizedCopy></h3>
          </header>
          <form className="world-form" onSubmit={submit}>
            <label>
              <span><LocalizedCopy>{"Kategori"}</LocalizedCopy></span>
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
              <span><LocalizedCopy>{"Pesanan atau booking terkait "}</LocalizedCopy><small><LocalizedCopy>{"(opsional)"}</LocalizedCopy></small>
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
              <span><LocalizedCopy>{"Subjek"}</LocalizedCopy></span>
              <LocalizedInput
                name="subject"
                minLength={5}
                maxLength={180}
                required
                placeholder="Contoh: Status pengiriman belum berubah"
              />
            </label>
            <label>
              <span><LocalizedCopy>{"Kronologi dan hasil yang diharapkan"}</LocalizedCopy></span>
              <LocalizedTextarea
                name="description"
                minLength={20}
                maxLength={5000}
                required
                placeholder="Jelaskan waktu kejadian, kondisi terakhir, dan bantuan yang kamu butuhkan."
              />
            </label>
            <LocalizedCopy>{error && (
              <div className="form-message" role="alert">
                <LocalizedCopy>{error}</LocalizedCopy>
              </div>
            )}</LocalizedCopy>
            <LocalizedButton className="primary-button full" disabled={submitting}>
              <LocalizedCopy>{submitting
                ? "Mengirim pengaduan…"
                : "Kirim & dapatkan nomor ticket"}</LocalizedCopy>
            </LocalizedButton>
          </form>
        </section>

        <section className="panel support-history">
          <header>
            <span><LocalizedCopy>{"RIWAYAT BANTUAN"}</LocalizedCopy></span>
            <h3><LocalizedCopy>{"Status pengaduanmu"}</LocalizedCopy></h3>
            <LocalizedButton
              type="button"
              onClick={() => void loadTickets()}
              disabled={loading}
            ><LocalizedCopy>{"Muat ulang"}</LocalizedCopy></LocalizedButton>
          </header>
          <LocalizedCopy>{loading ? (
            <div className="support-state" role="status"><LocalizedCopy>{"Memuat ticket…"}</LocalizedCopy></div>
          ) : tickets.length ? (
            <div className="support-ticket-list">
              <LocalizedCopy>{tickets.map((ticket) => (
                <article key={ticket.id}>
                  <div>
                    <span><LocalizedCopy>{ticket.ticket_number}</LocalizedCopy></span>
                    <em className={`status-badge ${ticket.status}`}>
                      <LocalizedCopy>{ticket.status.replaceAll("_", " ")}</LocalizedCopy>
                    </em>
                  </div>
                  <h4><LocalizedCopy>{ticket.subject}</LocalizedCopy></h4>
                  <p><LocalizedCopy>{ticket.description}</LocalizedCopy></p>
                  <LocalizedCopy>{ticket.resolution && (
                    <blockquote>
                      <b><LocalizedCopy>{"Penyelesaian"}</LocalizedCopy></b>
                      <LocalizedCopy>{ticket.resolution}</LocalizedCopy>
                    </blockquote>
                  )}</LocalizedCopy>
                  <footer>
                    <span><LocalizedCopy>{"Dibuat"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{new Date(ticket.created_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy>
                    </span>
                    <LocalizedCopy>{ticket.response_due_at && !ticket.first_response_at && (
                      <span><LocalizedCopy>{"Target respons"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                        <LocalizedCopy>{new Date(ticket.response_due_at).toLocaleString(
                          petOwnerIntlLocale(),
                        )}</LocalizedCopy>
                      </span>
                    )}</LocalizedCopy>
                    <LocalizedCopy>{ticket.first_response_at && (
                      <span><LocalizedCopy>{"Ditanggapi"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                        <LocalizedCopy>{new Date(ticket.first_response_at).toLocaleString(
                          petOwnerIntlLocale(),
                        )}</LocalizedCopy>
                      </span>
                    )}</LocalizedCopy>
                  </footer>
                  <SupportTicketThread
                    ticketId={ticket.id}
                    closed={
                      ticket.status === "resolved" || ticket.status === "closed"
                    }
                    notify={notify}
                  />
                </article>
              ))}</LocalizedCopy>
            </div>
          ) : (
            <div className="support-state"><LocalizedCopy>{"Belum ada pengaduan. Ticket yang kamu buat akan tampil di sini."}</LocalizedCopy></div>
          )}</LocalizedCopy>
        </section>
      </div>
    </div>
  );
}

function AccountLanguageSetting() {
  const { language, setLanguage, t } = usePetOwnerI18n();
  return (
    <div className="profile-language-setting">
      <span><Icon name="settings" size={19} /></span>
      <p><b><LocalizedCopy>{t("Bahasa aplikasi")}</LocalizedCopy></b><small><LocalizedCopy>{"Indonesia / English"}</LocalizedCopy></small></p>
      <div role="group" aria-label={t("Bahasa aplikasi")}>
        <LocalizedButton className={language === "id" ? "active" : ""} type="button" aria-pressed={language === "id"} onClick={() => setLanguage("id")}><LocalizedCopy>{"ID"}</LocalizedCopy></LocalizedButton>
        <LocalizedButton className={language === "en" ? "active" : ""} type="button" aria-pressed={language === "en"} onClick={() => setLanguage("en")}><LocalizedCopy>{"EN"}</LocalizedCopy></LocalizedButton>
      </div>
    </div>
  );
}

function GuestAccount({ onLogin }: { onLogin: () => void }) {
  const { t } = usePetOwnerI18n();
  return (
    <div className="profile-guest">
      <section className="empty-state panel" aria-label="Akun Pet Owner">
        <h2><LocalizedCopy>{t("Masuk ke akun")}</LocalizedCopy></h2>
        <p><LocalizedCopy>{t("Sinkronkan profil pet, aktivitas, dan membership Slivadoc.")}</LocalizedCopy></p>
        <LocalizedButton type="button" className="primary-button" onClick={onLogin}><LocalizedCopy>{t("Masuk / Daftar")}</LocalizedCopy></LocalizedButton>
      </section>
      <section className="panel profile-native-settings">
        <header><span><LocalizedCopy>{"PREFERENSI"}</LocalizedCopy></span><h3><LocalizedCopy>{t("Pengaturan akun")}</LocalizedCopy></h3></header>
        <AccountLanguageSetting />
      </section>
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
  const { locale, t } = usePetOwnerI18n();
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
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    if (!(await confirmSlivaDialog(`Hapus alamat ${address.label}?`))) return;
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
          <span><LocalizedCopy>{t("Akun & Keluarga").toUpperCase()}</LocalizedCopy></span>
          <h2><LocalizedCopy>{t("Profil pet parent")}</LocalizedCopy></h2>
        </div>
      </header>
      <div className="profile-identity-col">
        <section className={`profile-member-card profile-member-card--${profileTier}`}>
          <span className="profile-member-orb" aria-hidden="true" />
          <header><div><strong><LocalizedCopy>{"SLIVADOC"}</LocalizedCopy></strong><small><LocalizedCopy>{"PET OWNER MEMBER"}</LocalizedCopy></small></div><em><LocalizedCopy>{membership.icon}</LocalizedCopy> <LocalizedCopy>{membership.name}</LocalizedCopy></em></header>
          <div className="profile-member-identity"><span><Icon name="paw" size={25}/></span><div><small><LocalizedCopy>{t("Nomor member").toUpperCase()}</LocalizedCopy></small><b><LocalizedCopy>{profileMemberNumber}</LocalizedCopy></b><p><LocalizedCopy preserve>{account.full_name}</LocalizedCopy></p></div><i><Icon name="shield" size={22}/></i></div>
          <footer><span><small><LocalizedCopy>{t("Member sejak").toUpperCase()}</LocalizedCopy></small><b><LocalizedCopy>{new Date(account.member_since).toLocaleDateString(locale, { month: "short", year: "numeric" })}</LocalizedCopy></b></span><span><small><LocalizedCopy>{t("Sliva Point").toUpperCase()}</LocalizedCopy></small><b><LocalizedCopy>{points.toLocaleString(locale)}</LocalizedCopy></b></span><span><small><LocalizedCopy>{t("Level member").toUpperCase()}</LocalizedCopy></small><b><LocalizedCopy>{membership.name}</LocalizedCopy></b></span></footer>
          <p><LocalizedCopy>{t("Satu identitas untuk setiap momen perawatan")}</LocalizedCopy><LocalizedCopy>{" ✦"}</LocalizedCopy></p>
        </section>
        <section className="profile-main-card profile-native-card">
          <div className="profile-person profile-person--clean">
            <div className="profile-photo"><LocalizedCopy>{initials}</LocalizedCopy></div>
            <div>
              <h2><LocalizedCopy preserve>{account.full_name}</LocalizedCopy></h2>
              <p>
                <LocalizedCopy>{account.email}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{account.phone || "Nomor telepon belum diisi"}</LocalizedCopy>
              </p>
              <span className="gold-member"><LocalizedCopy>{"✓ AKUN AKTIF"}</LocalizedCopy></span>
            </div>
            <LocalizedButton
              className="native-header-icon"
              type="button"
              aria-label="Edit profil"
              onClick={() => setEdit(true)}
            >
              <Icon name="edit" size={16} />
            </LocalizedButton>
          </div>
          <div className="profile-stats">
            <span>
              <b><LocalizedCopy>{petCount}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Hewan"}</LocalizedCopy></small>
            </span>
            <span>
              <b><LocalizedCopy>{points.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Points"}</LocalizedCopy></small>
            </span>
            <span>
              <b>
                <LocalizedCopy>{membership.icon}</LocalizedCopy> <LocalizedCopy>{membership.name}</LocalizedCopy>
              </b>
              <small><LocalizedCopy>{"Level member"}</LocalizedCopy></small>
            </span>
            <span>
              <b><LocalizedCopy>{"Aktif"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Sinkron"}</LocalizedCopy></small>
            </span>
          </div>
        </section>

        <section className="profile-native-points">
          <header>
            <span><LocalizedCopy>{"SLIVA POINT"}</LocalizedCopy></span>
            <h3><LocalizedCopy>{"Saldo dan aturan klaim"}</LocalizedCopy></h3>
          </header>
          <div>
            <span>
              <Icon name="sparkle" size={19} />
            </span>
            <p>
              <b><LocalizedCopy>{points.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" Sliva Points"}</LocalizedCopy></b>
              <small>
                <LocalizedCopy>{points
                  ? "Tersedia untuk klaim sesuai syarat"
                  : "Belum ada transaksi lunas"}</LocalizedCopy>
              </small>
            </p>
            <i><LocalizedCopy>{"AKTIF"}</LocalizedCopy></i>
          </div>
          <div className="profile-membership-rank">
            <span aria-hidden="true"><LocalizedCopy>{membership.icon}</LocalizedCopy></span>
            <p>
              <b><LocalizedCopy>{membership.name}</LocalizedCopy></b>
              <small>
                <LocalizedCopy>{membership.next_level_points
                  ? `${membership.points_to_next.toLocaleString(petOwnerIntlLocale())} poin lagi ke level berikutnya`
                  : "Level tertinggi—terima kasih, Pet Royalty!"}</LocalizedCopy>
              </small>
            </p>
            <strong><LocalizedCopy>{membershipProgress}</LocalizedCopy><LocalizedCopy>{"%"}</LocalizedCopy></strong>
            <div className="sliva-progress" role="progressbar" aria-label={t("Level member")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={membershipProgress}><span style={{ width: `${membershipProgress}%` }} /></div>
          </div>
          <ul>
            <LocalizedCopy>{(rewardFormula.rules?.length
              ? rewardFormula.rules
              : [rewardFormulaText(rewardFormula)]
            )
              .slice(0, 3)
              .map((rule) => (
                <li key={rule}>
                  <Icon name="check" size={12} /> <LocalizedCopy>{rule}</LocalizedCopy>
                </li>
              ))}</LocalizedCopy>
          </ul>
        </section>

        <section className="profile-shipping-address">
          <header>
            <span><LocalizedCopy>{"ALAMAT PENGIRIMAN"}</LocalizedCopy></span>
            <div className="profile-address-heading-row">
              <h3><LocalizedCopy>{"Alamat tersimpan"}</LocalizedCopy></h3>
              <LocalizedButton
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressModalOpen(true);
                }}
              ><LocalizedCopy>{"Tambah"}</LocalizedCopy></LocalizedButton>
            </div>
          </header>
          <LocalizedCopy>{addressLoading ? (
            <p className="profile-address-muted"><LocalizedCopy>{"Memuat alamat tersimpan…"}</LocalizedCopy></p>
          ) : shippingAddresses.length > 0 ? (
            <div className="profile-address-list">
              <LocalizedCopy>{shippingAddresses.map((address) => (
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
                      <b><LocalizedCopy>{address.label}</LocalizedCopy></b>
                      <LocalizedCopy>{address.is_primary && <span><LocalizedCopy>{"UTAMA"}</LocalizedCopy></span>}</LocalizedCopy>
                    </div>
                    <strong><LocalizedCopy>{address.recipient_name}</LocalizedCopy></strong>
                    <small><LocalizedCopy>{address.phone}</LocalizedCopy></small>
                    <p><LocalizedCopy>{address.address}</LocalizedCopy></p>
                    <small>
                      <LocalizedCopy>{address.village.name}</LocalizedCopy><LocalizedCopy>{", "}</LocalizedCopy><LocalizedCopy>{address.district.name}</LocalizedCopy><LocalizedCopy>{","}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                      <LocalizedCopy>{address.regency.name}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{address.post_code}</LocalizedCopy>
                    </small>
                  </div>
                  <div className="profile-address-card-actions">
                    <LocalizedCopy>{!address.is_primary && (
                      <LocalizedButton
                        type="button"
                        onClick={() => void makePrimary(address.id)}
                      ><LocalizedCopy>{"Jadikan utama"}</LocalizedCopy></LocalizedButton>
                    )}</LocalizedCopy>
                    <LocalizedButton
                      type="button"
                      onClick={() => {
                        setEditingAddress(address);
                        setAddressModalOpen(true);
                      }}
                    ><LocalizedCopy>{"Ubah"}</LocalizedCopy></LocalizedButton>
                    <LocalizedButton
                      type="button"
                      onClick={() => void removeAddress(address)}
                    ><LocalizedCopy>{"Hapus"}</LocalizedCopy></LocalizedButton>
                  </div>
                </article>
              ))}</LocalizedCopy>
            </div>
          ) : (
            <div className="profile-address-empty">
              <p><LocalizedCopy>{"Belum ada alamat tersimpan. Tambahkan alamat untuk checkout lebih cepat."}</LocalizedCopy></p>
              <LocalizedButton
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setAddressModalOpen(true);
                }}
              ><LocalizedCopy>{"Tambah alamat"}</LocalizedCopy></LocalizedButton>
            </div>
          )}</LocalizedCopy>
        </section>
        <div className="profile-actions-stack">
          <LocalizedButton
            className="profile-native-support"
            type="button"
            onClick={onOpenSupport}
          >
            <span>
              <Icon name="chat" size={20} />
            </span>
            <p>
              <b><LocalizedCopy>{"Chat Customer Support"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Hubungi tim Slivadoc langsung dari aplikasi."}</LocalizedCopy></small>
            </p>
            <Icon name="arrow" size={16} />
          </LocalizedButton>

          <LocalizedButton
            className="profile-native-logout"
            type="button"
            onClick={() => setConfirmLogout(true)}
          >
            <span>
              <Icon name="logout" size={20} />
            </span>
            <p>
              <b><LocalizedCopy>{"Keluar dari akun"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Akhiri sesi hanya di perangkat ini."}</LocalizedCopy></small>
            </p>
            <Icon name="chevron" size={17} />
          </LocalizedButton>
        </div>
      </div>
      <aside className="profile-settings-col">
        <section className="panel profile-native-settings">
          <header>
            <span><LocalizedCopy>{"PREFERENSI"}</LocalizedCopy></span>
            <h3><LocalizedCopy>{t("Pengaturan akun")}</LocalizedCopy></h3>
          </header>
          <AccountLanguageSetting />
          <LocalizedButton type="button" onClick={() => setEdit(true)}>
            <span>
              <Icon name="user" size={19} />
            </span>
            <p>
              <b><LocalizedCopy>{"Profil pet parent"}</LocalizedCopy></b>
              <small><LocalizedCopy preserve>{account.full_name}</LocalizedCopy></small>
            </p>
            <Icon name="chevron" size={17} />
          </LocalizedButton>
          <LocalizedButton
            type="button"
            onClick={() => onOpenNotifications()}
          >
            <span>
              <Icon name="bell" size={19} />
            </span>
            <p>
              <b><LocalizedCopy>{"Notifikasi"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Buka daftar dan detail update"}</LocalizedCopy></small>
            </p>
            <Icon name="chevron" size={17} />
          </LocalizedButton>
          <LocalizedButton
            type="button"
            onClick={() => onOpenNotifications("security")}
          >
            <span>
              <Icon name="shield" size={19} />
            </span>
            <p>
              <b><LocalizedCopy>{"Privasi & keamanan"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Tinjau notifikasi keamanan akun"}</LocalizedCopy></small>
            </p>
            <Icon name="chevron" size={17} />
          </LocalizedButton>
          <LocalizedButton
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
              <b><LocalizedCopy>{"Keluarga & akses"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Kelola orang tepercaya untuk pet"}</LocalizedCopy></small>
            </p>
            <Icon name="chevron" size={17} />
          </LocalizedButton>
          <LocalizedButton type="button" onClick={() => setDeleteOpen(true)}>
            <span>
              <Icon name="close" size={19} />
            </span>
            <p>
              <b><LocalizedCopy>{"Hapus akun"}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Hapus akun dan data pribadi secara permanen"}</LocalizedCopy></small>
            </p>
            <Icon name="chevron" size={17} />
          </LocalizedButton>
        </section>
      </aside>
      <LocalizedCopy>{edit && (
        <ProfileEditModal
          account={account}
          close={() => setEdit(false)}
          notify={notify}
          changed={onChanged}
        />
      )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
      <LocalizedCopy>{familyOpen && familyPet && (
        <FamilyModal
          pet={familyPet}
          close={() => setFamilyOpen(false)}
          notify={notify}
        />
      )}</LocalizedCopy>
      <LocalizedCopy>{deleteOpen && (
        <AccountDeletionModal close={() => setDeleteOpen(false)} notify={notify} />
      )}</LocalizedCopy>
      <LocalizedCopy>{addressModalOpen && (
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
      )}</LocalizedCopy>
      <LocalizedCopy>{confirmLogout && (
        <div
          className="modal-overlay"
          onMouseDown={() => setConfirmLogout(false)}
        >
          <section
            className="modal confirm-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <LocalizedButton
              className="modal-close"
              onClick={() => setConfirmLogout(false)}
            >
              <Icon name="close" />
            </LocalizedButton>
            <span className="section-eyebrow"><LocalizedCopy>{"KONFIRMASI KELUAR"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{"Keluar dari akun?"}</LocalizedCopy></h2>
            <p><LocalizedCopy>{"Sesi Slivadoc di perangkat ini akan diakhiri. Data dan profil pet tetap aman."}</LocalizedCopy></p>
            <footer>
              <LocalizedButton
                className="secondary-button"
                onClick={() => setConfirmLogout(false)}
              ><LocalizedCopy>{"Tetap masuk"}</LocalizedCopy></LocalizedButton>
              <LocalizedButton
                className="danger-button"
                onClick={() => {
                  notify("Kamu sudah keluar dari akun");
                  onLogout();
                }}
              ><LocalizedCopy>{"Ya, keluar"}</LocalizedCopy></LocalizedButton>
            </footer>
          </section>
        </div>
      )}</LocalizedCopy>
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
        <LocalizedButton className="modal-close" onClick={close} aria-label="Tutup edit profil">
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"DATA AKUN"}</LocalizedCopy></span>
        <h2><LocalizedCopy>{"Edit profil pet parent"}</LocalizedCopy></h2>
        <form className="world-form" onSubmit={submit}>
          <label>
            <span><LocalizedCopy>{"Nama lengkap"}</LocalizedCopy></span>
            <LocalizedInput
              name="full_name"
              value={fullName}
              onChange={(event) => setFullNameOverride(event.target.value)}
              minLength={2}
              required
            />
          </label>
          <label>
            <span><LocalizedCopy>{"Email login"}</LocalizedCopy></span>
            <LocalizedInput value={account.email} disabled />
          </label>
          <label>
            <span><LocalizedCopy>{"Nomor telepon"}</LocalizedCopy></span>
            <LocalizedInput
              name="phone"
              value={phone}
              onChange={(event) => setPhoneOverride(event.target.value)}
              inputMode="tel"
              pattern="0[0-9]{8,15}"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
            />
          </label>
          <LocalizedButton className="primary-button full" disabled={busy}>
            <LocalizedCopy>{busy ? "Menyimpan…" : "Simpan perubahan"}</LocalizedCopy>
          </LocalizedButton>
        </form>
      </section>
    </div>
  );
}

function AccountDeletionModal({ close, notify }: { close: () => void; notify: Notify }) {
  const { locale } = usePetOwnerI18n();
  const dialog = useDialogFocus<HTMLElement>(true, close);
  const [step, setStep] = useState<"loading" | "info" | "otp" | "pending">("loading");
  const [graceUntil, setGraceUntil] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void getPetOwnerAccountDeletionStatus()
      .then((status) => {
        if (!live) return;
        setGraceUntil(status.grace_until);
        setStep(status.pending ? "pending" : "info");
      })
      .catch((error) => {
        if (!live) return;
        notify(error instanceof Error ? error.message : "Status penghapusan akun belum dapat dimuat");
        setStep("info");
      });
    return () => {
      live = false;
    };
  }, [notify]);
  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      notify(error instanceof Error ? error.message : failure);
    } finally {
      setBusy(false);
    }
  }
  const sendOtp = () =>
    run(async () => {
      await requestPetOwnerAccountDeletion();
      setOtp("");
      setStep("otp");
      notify("Kode OTP dikirim ke email akunmu.");
    }, "OTP belum dapat dikirim");
  const confirmDeletion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    return run(async () => {
      const result = await confirmPetOwnerAccountDeletion(otp.trim());
      setGraceUntil(result.grace_until);
      setStep("pending");
      notify("Penghapusan akun dijadwalkan.");
    }, "Penghapusan akun belum dapat dikonfirmasi");
  };
  const cancelDeletion = () =>
    run(async () => {
      await cancelPetOwnerAccountDeletion();
      setGraceUntil(null);
      setStep("info");
      notify("Penghapusan akun dibatalkan.");
    }, "Penghapusan akun belum dapat dibatalkan");
  return (
    <div className="modal-overlay" onMouseDown={close}>
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Hapus akun"
        tabIndex={-1}
        className="modal confirm-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <LocalizedButton className="modal-close" onClick={close} aria-label="Tutup hapus akun">
          <Icon name="close" />
        </LocalizedButton>
        <span className="section-eyebrow"><LocalizedCopy>{"HAPUS AKUN"}</LocalizedCopy></span>
        {step === "loading" && (
          <p><LocalizedCopy>{"Memuat status akun…"}</LocalizedCopy></p>
        )}
        {(step === "info" || step === "otp") && (
          <>
            <h2><LocalizedCopy>{"Hapus akun Slivadoc?"}</LocalizedCopy></h2>
            <ul style={{ listStyle: "disc", paddingLeft: 18, color: "var(--muted)", lineHeight: 1.65 }}>
              <li><LocalizedCopy>{"Data pribadimu dihapus permanen setelah masa tenggang 14 hari."}</LocalizedCopy></li>
              <li><LocalizedCopy>{"Data transaksi tetap disimpan dalam bentuk teranonim."}</LocalizedCopy></li>
              <li><LocalizedCopy>{"Salinan cadangan terenkripsi disimpan hingga 12 bulan."}</LocalizedCopy></li>
              <li><LocalizedCopy>{"Kamu bisa membatalkan penghapusan selama masa tenggang."}</LocalizedCopy></li>
            </ul>
          </>
        )}
        {step === "info" && (
          <footer>
            <LocalizedButton className="secondary-button" onClick={close}><LocalizedCopy>{"Batal"}</LocalizedCopy></LocalizedButton>
            <LocalizedButton className="danger-button" disabled={busy} onClick={sendOtp}>
              <LocalizedCopy>{busy ? "Mengirim…" : "Kirim OTP"}</LocalizedCopy>
            </LocalizedButton>
          </footer>
        )}
        {step === "otp" && (
          <form className="world-form" onSubmit={confirmDeletion}>
            <label>
              <span><LocalizedCopy>{"Kode OTP"}</LocalizedCopy></span>
              <LocalizedInput
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
            <LocalizedButton className="danger-button" disabled={busy || !otp.trim()}>
              <LocalizedCopy>{busy ? "Memproses…" : "Konfirmasi hapus akun"}</LocalizedCopy>
            </LocalizedButton>
          </form>
        )}
        {step === "pending" && (
          <>
            <h2><LocalizedCopy>{"Penghapusan akun dijadwalkan"}</LocalizedCopy></h2>
            <p>
              <LocalizedCopy>{"Akunmu akan dihapus permanen pada "}</LocalizedCopy>
              <b>
                <LocalizedCopy preserve>
                  {graceUntil
                    ? new Date(graceUntil).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
                    : "-"}
                </LocalizedCopy>
              </b>
              <LocalizedCopy>{". Batalkan sebelum tanggal itu jika kamu berubah pikiran."}</LocalizedCopy>
            </p>
            <footer>
              <LocalizedButton className="secondary-button" disabled={busy} onClick={cancelDeletion}>
                <LocalizedCopy>{busy ? "Membatalkan…" : "Batalkan penghapusan"}</LocalizedCopy>
              </LocalizedButton>
            </footer>
          </>
        )}
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
        <LocalizedButton
          className="modal-close service-detail-close"
          onClick={close}
          aria-label="Tutup detail layanan"
        >
          <Icon name="close" />
        </LocalizedButton>
        <header className="service-detail-hero">
          <div className={`service-detail-visual ${service.accent}`}>
            <LocalizedCopy catalogue>{activeServiceImage ? (
              <LocalizedButton
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
              </LocalizedButton>
            ) : (
              <span><LocalizedCopy>{service.emoji}</LocalizedCopy></span>
            )}</LocalizedCopy>
            <em><LocalizedCopy>{service.type}</LocalizedCopy></em>
            <i>
              <LocalizedCopy>{licenseStatus === "verified"
                ? "✓ IZIN TERVERIFIKASI"
                : "MITRA AKTIF"}</LocalizedCopy>
            </i>
            <LocalizedCopy>{serviceImages.length > 1 ? (
              <div className="service-image-pager">
                <LocalizedButton type="button" onClick={() => moveServiceImage(-1)} aria-label="Gambar sebelumnya"><LocalizedCopy>{"‹"}</LocalizedCopy></LocalizedButton>
                <span><LocalizedCopy>{serviceImageIndex + 1}</LocalizedCopy><LocalizedCopy>{"/"}</LocalizedCopy><LocalizedCopy>{serviceImages.length}</LocalizedCopy></span>
                <LocalizedButton type="button" onClick={() => moveServiceImage(1)} aria-label="Gambar berikutnya"><LocalizedCopy>{"›"}</LocalizedCopy></LocalizedButton>
              </div>
            ) : null}</LocalizedCopy>
          </div>
          <div className="service-detail-heading">
            <span className="service-verified-pill">
              <Icon name="shield" size={13} /> <LocalizedCopy>{licenseLabel}</LocalizedCopy>
            </span>
            <h2 id="service-detail-title"><LocalizedCopy catalogue>{service.name}</LocalizedCopy></h2>
            <p>
              <Icon name="map" size={15} />
              <span><LocalizedCopy>{service.address}</LocalizedCopy></span>
            </p>
            <div className="service-detail-live">
              <i />
              <b><LocalizedCopy>{service.status}</LocalizedCopy></b>
              <span><LocalizedCopy>{"·"}</LocalizedCopy></span>
              <span><LocalizedCopy>{service.distance}</LocalizedCopy><LocalizedCopy>{" dari lokasi kamu"}</LocalizedCopy></span>
            </div>
          </div>
        </header>
        <div className="service-detail-body">
          <section className="service-detail-highlight">
            <div>
              <span className="detail-highlight-icon"><LocalizedCopy>{"★"}</LocalizedCopy></span>
              <p>
                <b><LocalizedCopy>{rating}</LocalizedCopy></b>
                <small>
                  <LocalizedCopy>{service.reviews > 0
                    ? `${service.reviews.toLocaleString(petOwnerIntlLocale())} ulasan pet parent`
                    : "Mitra baru"}</LocalizedCopy>
                </small>
              </p>
            </div>
            <div>
              <span className="detail-highlight-icon mint"><LocalizedCopy>{"Rp"}</LocalizedCopy></span>
              <p>
                <LocalizedCopy>{service.originalPrice ? <s className="service-detail-old-price"><LocalizedCopy>{formatRupiah(service.originalPrice)}</LocalizedCopy></s> : null}</LocalizedCopy>
                <b><LocalizedCopy>{service.price}</LocalizedCopy></b>
                <small><LocalizedCopy>{service.discountPercent ? `Promo hemat ${service.discountPercent}%` : "Estimasi biaya layanan"}</LocalizedCopy></small>
              </p>
            </div>
            <div>
              <span className="detail-highlight-icon violet">
                <Icon name="clock" size={17} />
              </span>
              <p>
                <b><LocalizedCopy>{"Siap dipesan"}</LocalizedCopy></b>
                <small><LocalizedCopy>{"Jadwal dipilih saat booking"}</LocalizedCopy></small>
              </p>
        </div>
        <LocalizedCopy catalogue>{serviceViewerOpen && activeServiceImage ? (
          <div
            className="world-image-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`Galeri ${service.name}`}
            onMouseDown={() => setServiceViewerOpen(false)}
          >
            <LocalizedButton type="button" className="world-image-close" onClick={() => setServiceViewerOpen(false)} aria-label="Tutup galeri"><LocalizedCopy>{"×"}</LocalizedCopy></LocalizedButton>
            <div className="world-image-lightbox-frame" onMouseDown={(event) => event.stopPropagation()}>
              <Image src={activeServiceImage} alt={`Gambar ${service.name}`} fill sizes="100vw" unoptimized priority />
            </div>
            <LocalizedCopy>{serviceImages.length > 1 ? (
              <>
                <LocalizedButton type="button" className="world-image-prev" onClick={(event) => { event.stopPropagation(); moveServiceImage(-1); }} aria-label="Gambar sebelumnya"><LocalizedCopy>{"‹"}</LocalizedCopy></LocalizedButton>
                <LocalizedButton type="button" className="world-image-next" onClick={(event) => { event.stopPropagation(); moveServiceImage(1); }} aria-label="Gambar berikutnya"><LocalizedCopy>{"›"}</LocalizedCopy></LocalizedButton>
                <span className="world-image-count"><LocalizedCopy>{serviceImageIndex + 1}</LocalizedCopy><LocalizedCopy>{" / "}</LocalizedCopy><LocalizedCopy>{serviceImages.length}</LocalizedCopy></span>
              </>
            ) : null}</LocalizedCopy>
          </div>
        ) : null}</LocalizedCopy>
      </section>
          <section className="service-detail-section">
            <div className="service-detail-section-title">
              <span><LocalizedCopy>{"INFORMASI LAYANAN"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{"Yang tersedia untuk pet-mu"}</LocalizedCopy></h3>
            </div>
            <div className="service-detail-benefits">
              <LocalizedCopy>{[...new Set([...service.tags, ...inclusions])].map((tag) => (
                <span key={tag}>
                  <i>
                    <Icon name="check" size={12} />
                  </i>
                  <LocalizedCopy>{tag}</LocalizedCopy>
                </span>
              ))}</LocalizedCopy>
            </div>
            <p className="service-detail-description">
              <LocalizedCopy catalogue>{detail?.description ||
                service.description ||
                "Deskripsi rinci belum dicantumkan oleh mitra."}</LocalizedCopy>
            </p>
          </section>
          <LocalizedCopy>{detailLoading && (
            <div className="service-detail-data-state" role="status"><LocalizedCopy>{"Menyinkronkan rincian layanan dari mitra…"}</LocalizedCopy></div>
          )}</LocalizedCopy>
          <LocalizedCopy>{detailError && (
            <div className="service-detail-data-state error" role="alert">
              <LocalizedCopy>{detailError}</LocalizedCopy>
            </div>
          )}</LocalizedCopy>
          <LocalizedCopy>{detail && (
            <section className="service-detail-section service-detail-disclosures">
              <div className="service-detail-section-title">
                <span><LocalizedCopy>{"PERSIAPAN & KEBIJAKAN"}</LocalizedCopy></span>
                <h3><LocalizedCopy>{"Yang perlu diketahui sebelum booking"}</LocalizedCopy></h3>
              </div>
              <div className="service-detail-disclosure-grid">
                <div>
                  <b><LocalizedCopy>{"Pet yang didukung"}</LocalizedCopy></b>
                  <p>
                    <LocalizedCopy>{detail.supported_species.length
                      ? detail.supported_species.join(", ")
                      : "Belum dicantumkan oleh mitra"}</LocalizedCopy>
                  </p>
                </div>
                <div>
                  <b><LocalizedCopy>{"Persiapan"}</LocalizedCopy></b>
                  <p>
                    <LocalizedCopy>{detail.preparation.length
                      ? detail.preparation.join(" · ")
                      : "Tidak ada persiapan khusus yang dicantumkan"}</LocalizedCopy>
                  </p>
                </div>
                <div>
                  <b><LocalizedCopy>{"Perawatan setelah layanan"}</LocalizedCopy></b>
                  <p>
                    <LocalizedCopy>{detail.aftercare.length
                      ? detail.aftercare.join(" · ")
                      : "Belum ada instruksi lanjutan"}</LocalizedCopy>
                  </p>
                </div>
                <div>
                  <b><LocalizedCopy>{"Pembatalan & perubahan jadwal"}</LocalizedCopy></b>
                  <p>
                    <LocalizedCopy>{[detail.cancellation_policy, detail.reschedule_policy]
                      .filter(Boolean)
                      .join(" · ") || "Kebijakan belum dicantumkan oleh mitra"}</LocalizedCopy>
                  </p>
                </div>
              </div>
            </section>
          )}</LocalizedCopy>
          <aside className="service-detail-assurance">
            <span>
              <Icon name="shield" size={20} />
            </span>
            <div>
              <b><LocalizedCopy>{"Booking lebih tenang bersama Slivadoc"}</LocalizedCopy></b>
              <p><LocalizedCopy>{"Informasi mitra, jadwal, aktivitas, dan status layanan tersimpan dalam satu alur yang mudah dipantau."}</LocalizedCopy></p>
            </div>
          </aside>
        </div>
        <footer className="service-detail-actions">
          <LocalizedButton className="secondary-button" type="button" onClick={close}><LocalizedCopy>{"Kembali"}</LocalizedCopy></LocalizedButton>
          <LocalizedButton className="primary-button" type="button" onClick={book}><LocalizedCopy>{"Pilih jadwal & booking "}</LocalizedCopy><Icon name="arrow" size={16} />
          </LocalizedButton>
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
              <LocalizedCopy>{item.items.map((line) => (
                <li key={line.product_id}>
                  <LocalizedCopy>{line.name}</LocalizedCopy><LocalizedCopy>{" × "}</LocalizedCopy><LocalizedCopy>{line.quantity}</LocalizedCopy>
                </li>
              ))}</LocalizedCopy>
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
              <LocalizedCopy>{item.shipments.map((shipment) => (
                <ActivityShipmentCard key={shipment.id} shipment={shipment} />
              ))}</LocalizedCopy>
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
                  <a href={item.online_url} target="_blank" rel="noreferrer"><LocalizedCopy>{"Link kelas online"}</LocalizedCopy></a>
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
                <LocalizedCopy>{join(
                  `${item.progress_percent}%`,
                  item.progress_notes,
                  date(item.last_progress_at),
                )}</LocalizedCopy>
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
              <LocalizedCopy>{item.missing_requirements.map((requirement) => (
                <li key={requirement}><LocalizedCopy>{requirement}</LocalizedCopy></li>
              ))}</LocalizedCopy>
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
            ><LocalizedCopy>{"Unduh dokumen"}</LocalizedCopy></a>
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
      <b><LocalizedCopy>{shipment.shipping_number}</LocalizedCopy></b>
      <small>
        <LocalizedCopy>{[shipment.provider || "Lion Parcel", shipment.service_code]
          .filter(Boolean)
          .join(" · ")}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"· "}</LocalizedCopy><LocalizedCopy>{presentation.label}</LocalizedCopy>
      </small>
      <div className="activity-progress">
        <span style={{ width: `${(presentation.stage / 3) * 100}%` }} />
      </div>
      <small><LocalizedCopy>{"STT / AWB: "}</LocalizedCopy><LocalizedCopy>{shipment.stt_no || "Menunggu scan Lion Parcel"}</LocalizedCopy><LocalizedCopy>{" · Estimasi:"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
        <LocalizedCopy>{shipment.estimated_sla || "Mengikuti rute"}</LocalizedCopy>
      </small>
      <LocalizedCopy>{shipment.events.length > 0 && (
        <ul>
          <LocalizedCopy>{shipment.events.map((event) => (
            <li key={`${event.status_code}-${event.occurred_at}`}>
              <b><LocalizedCopy>{event.description || event.status}</LocalizedCopy></b>
              <small>
                <LocalizedCopy>{[event.location, formatActivityDate(event.occurred_at)]
                  .filter(Boolean)
                  .join(" · ")}</LocalizedCopy>
              </small>
            </li>
          ))}</LocalizedCopy>
        </ul>
      )}</LocalizedCopy>
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
        <LocalizedButton className="modal-close" onClick={close} aria-label="Tutup">
          <Icon name="close" />
        </LocalizedButton>
        <header className="activity-detail-hero">
          <span>
            <Icon name={meta.icon} size={24} />
          </span>
          <div>
            <small><LocalizedCopy>{meta.label.toUpperCase()}</LocalizedCopy></small>
            <h2><LocalizedCopy>{item.title}</LocalizedCopy></h2>
            <em><LocalizedCopy>{activityStatusLabel(item)}</LocalizedCopy></em>
          </div>
        </header>
        <div className="activity-detail-copy">
          <span className="activity-detail-label"><LocalizedCopy>{"RINGKASAN AKTIVITAS"}</LocalizedCopy></span>
          <p><LocalizedCopy>{[item.code, item.subtitle].filter(Boolean).join(" · ")}</LocalizedCopy></p>
        </div>
        <LocalizedCopy>{item.type === "event" &&
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
              <b><LocalizedCopy>{item.qr_token.slice(0, 13).toUpperCase()}</LocalizedCopy></b>
              <small><LocalizedCopy>{"Tunjukkan QR ini ke petugas saat check-in."}</LocalizedCopy></small>
            </div>
          )}</LocalizedCopy>
        <LocalizedCopy>{rows.length > 0 && (
          <dl>
            <LocalizedCopy>{rows.map(([label, value]) => (
              <div key={label}>
                <dt><LocalizedCopy>{label}</LocalizedCopy></dt>
                <dd><LocalizedCopy>{value}</LocalizedCopy></dd>
              </div>
            ))}</LocalizedCopy>
          </dl>
        )}</LocalizedCopy>
        <LocalizedCopy>{item.amount > 0 && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label"><LocalizedCopy>{"Status pembayaran"}</LocalizedCopy></span>
            <p>
              <b>
                <LocalizedCopy>{item.payable
                  ? "Menunggu pembayaran"
                  : activityStatusText(item.payment_status)}</LocalizedCopy>
              </b><LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"· "}</LocalizedCopy><LocalizedCopy>{formatRupiah(item.amount)}</LocalizedCopy>
            </p>
            <LocalizedCopy>{item.payable && !payment && (
              <LocalizedButton
                className="primary-button full"
                type="button"
                disabled={paying}
                onClick={() => void pay()}
              ><LocalizedCopy>{"Bayar sekarang"}</LocalizedCopy></LocalizedButton>
            )}</LocalizedCopy>
            <LocalizedCopy>{payError && <p className="form-message"><LocalizedCopy>{payError}</LocalizedCopy></p>}</LocalizedCopy>
            <LocalizedCopy>{payment && (
              <QrisPaymentPanel payment={payment} onPaid={() => void onPaid()} />
            )}</LocalizedCopy>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{item.type === "booking" &&
          item.source !== "clinic" &&
          item.cancellable_until &&
          (item.status === "requested" || item.status === "confirmed") && (
            <div className="activity-detail-copy">
              <span className="activity-detail-label"><LocalizedCopy>{"Pembatalan"}</LocalizedCopy></span>
              <LocalizedCopy>{canCancel ? (
                <>
                  <p><LocalizedCopy>{"Bisa dibatalkan hingga"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{item.cancellation_cutoff_hours ?? 24}</LocalizedCopy><LocalizedCopy>{" jam sebelum jadwal."}</LocalizedCopy></p>
                  <LocalizedButton
                    className="secondary-button full"
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => setCancelOpen(true)}
                  ><LocalizedCopy>{"Batalkan booking"}</LocalizedCopy></LocalizedButton>
                </>
              ) : (
                <p><LocalizedCopy>{"Batas pembatalan sudah lewat. Hubungi klinik untuk perubahan."}</LocalizedCopy></p>
              )}</LocalizedCopy>
              <LocalizedCopy>{cancelOpen && (
                <div className="form-message" role="alertdialog">
                  <p>
                    <LocalizedCopy>{item.cancellation_policy ||
                      "Booking yang dibatalkan tidak dapat dipulihkan."}</LocalizedCopy>
                  </p>
                  <LocalizedButton
                    className="primary-button"
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => void cancelBooking()}
                  >
                    <LocalizedCopy>{cancelBusy ? "Membatalkan…" : "Ya, batalkan"}</LocalizedCopy>
                  </LocalizedButton><LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedButton
                    className="secondary-button"
                    type="button"
                    disabled={cancelBusy}
                    onClick={() => setCancelOpen(false)}
                  ><LocalizedCopy>{"Tidak jadi"}</LocalizedCopy></LocalizedButton>
                </div>
              )}</LocalizedCopy>
            </div>
          )}</LocalizedCopy>
        <LocalizedCopy>{item.type === "order" && item.cancellable && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label"><LocalizedCopy>{"Pembatalan"}</LocalizedCopy></span>
            <p><LocalizedCopy>{"Pesanan dapat dibatalkan sebelum penjual memprosesnya."}</LocalizedCopy></p>
            <LocalizedButton
              className="secondary-button full"
              type="button"
              disabled={cancelBusy}
              onClick={() => setCancelOpen(true)}
            ><LocalizedCopy>{"Batalkan pesanan"}</LocalizedCopy></LocalizedButton>
            <LocalizedCopy>{cancelOpen && (
              <div className="form-message" role="alertdialog">
                <p><LocalizedCopy>{"Batalkan pesanan ini? Pesanan yang dibatalkan tidak dapat dipulihkan."}</LocalizedCopy></p>
                <LocalizedButton
                  className="primary-button"
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => void cancelOrder()}
                >
                  <LocalizedCopy>{cancelBusy ? "Membatalkan…" : "Ya, batalkan"}</LocalizedCopy>
                </LocalizedButton><LocalizedCopy>{" "}</LocalizedCopy>
                <LocalizedButton
                  className="secondary-button"
                  type="button"
                  disabled={cancelBusy}
                  onClick={() => setCancelOpen(false)}
                ><LocalizedCopy>{"Tidak jadi"}</LocalizedCopy></LocalizedButton>
              </div>
            )}</LocalizedCopy>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{returnRows.length > 0 && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label"><LocalizedCopy>{"Retur"}</LocalizedCopy></span>
            <LocalizedCopy>{returnRows.map((entry) => (
              <div key={entry.id}>
                <p>
                  <b><LocalizedCopy>{entry.business_name}</LocalizedCopy></b>
                  <LocalizedCopy>{entry.return_until && !entry.return_requested
                    ? ` · retur hingga ${formatActivityDate(entry.return_until)}`
                    : ""}</LocalizedCopy>
                </p>
                <LocalizedCopy>{entry.return_requested ? (
                  <p>
                    <b><LocalizedCopy>{"Retur diajukan"}</LocalizedCopy></b>
                  </p>
                ) : returnFor === entry.id ? (
                  <div className="form-message">
                    <label>
                      <span><LocalizedCopy>{"Alasan retur"}</LocalizedCopy></span>
                      <LocalizedTextarea
                        value={returnReason}
                        maxLength={1000}
                        rows={3}
                        disabled={returnBusy}
                        onChange={(event) => setReturnReason(event.target.value)}
                        placeholder="Jelaskan kendala pada barang yang diterima (minimal 10 karakter)"
                      />
                    </label>
                    <LocalizedCopy>{returnError && <p role="alert"><LocalizedCopy>{returnError}</LocalizedCopy></p>}</LocalizedCopy>
                    <LocalizedButton
                      className="primary-button"
                      type="button"
                      disabled={returnBusy}
                      onClick={() => void submitReturn(entry.id)}
                    >
                      <LocalizedCopy>{returnBusy ? "Mengirim…" : "Kirim permintaan retur"}</LocalizedCopy>
                    </LocalizedButton><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedButton
                      className="secondary-button"
                      type="button"
                      disabled={returnBusy}
                      onClick={() => setReturnFor("")}
                    ><LocalizedCopy>{"Batal"}</LocalizedCopy></LocalizedButton>
                  </div>
                ) : (
                  <LocalizedButton
                    className="secondary-button full"
                    type="button"
                    onClick={() => {
                      setReturnFor(entry.id);
                      setReturnError("");
                    }}
                  ><LocalizedCopy>{"Ajukan retur"}</LocalizedCopy></LocalizedButton>
                )}</LocalizedCopy>
              </div>
            ))}</LocalizedCopy>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{item.type === "document" && item.status === "need_revision" && (
          <div className="activity-detail-copy">
            <span className="activity-detail-label"><LocalizedCopy>{"Lengkapi dokumen"}</LocalizedCopy></span>
            <RequirementUploads
              requirements={item.missing_requirements ?? []}
              value={revisionDocs}
              onChange={setRevisionDocs}
              disabled={revisionBusy}
            />
            <LocalizedButton
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
              <LocalizedCopy>{revisionBusy ? "Mengirim…" : "Kirim dokumen"}</LocalizedCopy>
            </LocalizedButton>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{actionMessage && <p className="form-message"><LocalizedCopy>{actionMessage}</LocalizedCopy></p>}</LocalizedCopy>
        <footer>
          <LocalizedCopy>{item.latitude != null && item.longitude != null && (
            <a
              className="secondary-button"
              href={`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}`}
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="map" size={16} /><LocalizedCopy>{" Petunjuk arah"}</LocalizedCopy></a>
          )}</LocalizedCopy>
          <LocalizedCopy>{invoiceReferenceType ? (
            <LocalizedButton
              className="secondary-button"
              type="button"
              disabled={invoiceBusy}
              onClick={() => void openInvoice()}
            >
              <Icon name="download" size={16} />
              <LocalizedCopy>{invoiceBusy ? "Membuka invoice…" : "Buka invoice Slivadoc"}</LocalizedCopy>
            </LocalizedButton>
          ) : null}</LocalizedCopy>
          <LocalizedCopy>{repeatLabel && (
            <LocalizedButton
              className="secondary-button"
              type="button"
              onClick={() => {
                close();
                onRepeat(item);
              }}
            >
              <Icon name="arrow" size={16} /> <LocalizedCopy>{repeatLabel}</LocalizedCopy>
            </LocalizedButton>
          )}</LocalizedCopy>
          <LocalizedButton className="primary-button" type="button" onClick={close}><LocalizedCopy>{"Selesai"}</LocalizedCopy></LocalizedButton>
        </footer>
        <LocalizedCopy>{invoiceError ? (
          <div className="activity-invoice-error" role="alert">
            <LocalizedCopy>{invoiceError}</LocalizedCopy>
          </div>
        ) : null}</LocalizedCopy>
      </section>
      <LocalizedCopy>{invoiceHTML ? (
        <div
          className="activity-invoice-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Invoice Slivadoc"
          onMouseDown={() => setInvoiceHTML("")}
        >
          <header onMouseDown={(event) => event.stopPropagation()}>
            <span><Icon name="download" size={18} /></span>
            <div><small><LocalizedCopy>{"DOKUMEN TRANSAKSI"}</LocalizedCopy></small><b><LocalizedCopy>{item.title}</LocalizedCopy></b></div>
            <LocalizedButton type="button" onClick={() => setInvoiceHTML("")} aria-label="Tutup invoice"><Icon name="close" size={19} /></LocalizedButton>
          </header>
          <iframe
            title={`Invoice ${item.title}`}
            srcDoc={invoiceHTML}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            onMouseDown={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}</LocalizedCopy>
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
        <span><LocalizedCopy>{"♡"}</LocalizedCopy></span>
        <div>
          <h2><LocalizedCopy>{"Koleksi favoritmu"}</LocalizedCopy></h2>
          <p><LocalizedCopy>{"Layanan dan produk favorit tersimpan pada akun di semua perangkat."}</LocalizedCopy></p>
        </div>
      </div>
      <LocalizedCopy catalogue>{services.length > 0 && (
        <>
          <div className="panel-heading">
            <div>
              <span className="section-eyebrow"><LocalizedCopy>{"LAYANAN"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{"Favorit layanan"}</LocalizedCopy></h3>
            </div>
          </div>
          <div className="service-list-grid">
            <LocalizedCopy catalogue>{services.map((service) => (
              <article
                className="service-result-card"
                key={`${service.id}:${service.branchId}`}
              >
                <div className={`service-result-cover ${service.accent}`}>
                  <LocalizedCopy catalogue>{service.imageUrl ? (
                    <Image
                      className="catalog-cover-image"
                      src={service.imageUrl}
                      alt={`Gambar ${service.name}`}
                      fill
                      sizes="(max-width: 620px) 100vw, 155px"
                      unoptimized
                    />
                  ) : (
                    <span><LocalizedCopy>{service.emoji}</LocalizedCopy></span>
                  )}</LocalizedCopy>
                  <em><LocalizedCopy>{service.type}</LocalizedCopy></em>
                  <LocalizedButton
                    className="favorite"
                    onClick={() => void remove("service", service.id)}
                    aria-label={`Hapus ${service.name} dari favorit`}
                  >
                    <Icon name="heart" />
                  </LocalizedButton>
                </div>
                <div className="service-result-body">
                  <h3><LocalizedCopy catalogue>{service.name}</LocalizedCopy></h3>
                  <p><LocalizedCopy>{service.address}</LocalizedCopy></p>
                  <div className="service-result-footer">
                    <b><LocalizedCopy>{service.price}</LocalizedCopy></b>
                    <LocalizedButton
                      className="primary-button small"
                      onClick={() => openBooking(service)}
                    ><LocalizedCopy>{"Booking"}</LocalizedCopy></LocalizedButton>
                  </div>
                </div>
              </article>
            ))}</LocalizedCopy>
          </div>
        </>
      )}</LocalizedCopy>
      <LocalizedCopy catalogue>{products.length > 0 && (
        <>
          <div className="panel-heading favorite-product-heading">
            <div>
              <span className="section-eyebrow"><LocalizedCopy>{"PRODUK"}</LocalizedCopy></span>
              <h3><LocalizedCopy>{"Favorit produk"}</LocalizedCopy></h3>
            </div>
          </div>
          <div className="product-grid">
            <LocalizedCopy catalogue>{products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-visual">
                  <LocalizedCopy catalogue>{product.imageUrl ? (
                    <Image
                      className="catalog-cover-image"
                      src={product.imageUrl}
                      alt={`Gambar ${product.name}`}
                      fill
                      sizes="(max-width: 580px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <span><LocalizedCopy>{product.emoji}</LocalizedCopy></span>
                  )}</LocalizedCopy>
                  <LocalizedButton
                    className="favorite"
                    onClick={() => void remove("product", product.id)}
                    aria-label={`Hapus ${product.name} dari favorit`}
                  >
                    <Icon name="heart" />
                  </LocalizedButton>
                </div>
                <div className="product-body">
                  <small><LocalizedCopy>{product.brand}</LocalizedCopy></small>
                  <h3><LocalizedCopy catalogue>{product.name}</LocalizedCopy></h3>
                  <div className="product-price">
                    <b><LocalizedCopy>{formatRupiah(product.price)}</LocalizedCopy></b>
                    <LocalizedButton onClick={() => addToCart(product.id)}>
                      <Icon name="plus" />
                    </LocalizedButton>
                  </div>
                </div>
              </article>
            ))}</LocalizedCopy>
          </div>
        </>
      )}</LocalizedCopy>
      <LocalizedCopy>{empty && (
        <div className="empty-state">
          <span><LocalizedCopy>{"♡"}</LocalizedCopy></span>
          <h3><LocalizedCopy>{"Belum ada favorit"}</LocalizedCopy></h3>
          <p><LocalizedCopy>{"Tekan ikon hati di Jelajahi atau Pet Shop untuk menyimpan pilihan."}</LocalizedCopy></p>
        </div>
      )}</LocalizedCopy>
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
      <LocalizedButton type="button" className="ghost-text" onClick={onBack}><LocalizedCopy>{"← Kembali ke semua update"}</LocalizedCopy></LocalizedButton>
      <span className="section-eyebrow"><LocalizedCopy>{item.category}</LocalizedCopy><LocalizedCopy>{" · "}</LocalizedCopy><LocalizedCopy>{item.read_at ? "Sudah dibaca" : "Belum dibaca"}</LocalizedCopy></span>
      <h2><LocalizedCopy>{item.title}</LocalizedCopy></h2>
      <p><LocalizedCopy>{item.body}</LocalizedCopy></p>
      <time dateTime={item.created_at}><LocalizedCopy>{new Date(item.created_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy></time>
      <LocalizedCopy>{item.action_route ? <LocalizedButton type="button" className="primary-button full" onClick={onOpen}><LocalizedCopy>{"Buka halaman terkait"}</LocalizedCopy></LocalizedButton> : null}</LocalizedCopy>
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
          <b><LocalizedCopy>{unread}</LocalizedCopy></b>
          <span><LocalizedCopy>{"belum dibaca"}</LocalizedCopy></span>
        </div>
        <LocalizedButton
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
        ><LocalizedCopy>{"Tandai semua dibaca"}</LocalizedCopy></LocalizedButton>
      </div>
      <div className="notification-filter-tabs">
        <LocalizedButton
          className={!category ? "active" : ""}
          onClick={() => setCategory("")}
        ><LocalizedCopy>{"Semua"}</LocalizedCopy></LocalizedButton>
        <LocalizedCopy>{categories.map((value) => (
          <LocalizedButton
            key={value}
            className={category === value ? "active" : ""}
            onClick={() => setCategory(value)}
          >
            <LocalizedCopy>{value}</LocalizedCopy>
          </LocalizedButton>
        ))}</LocalizedCopy>
      </div>
      <section className="panel notification-center-list">
        <LocalizedCopy>{visible.length ? (
          visible.map((item) => (
            <LocalizedButton
              className={!item.read_at ? "unread" : ""}
              key={item.id}
              onClick={() => void open(item)}
            >
              <span>
                <LocalizedCopy>{item.category === "health"
                  ? "🩺"
                  : item.category === "booking"
                    ? "📅"
                    : item.category === "points"
                      ? "✦"
                      : "🔔"}</LocalizedCopy>
              </span>
              <div>
                <small><LocalizedCopy>{item.category.toUpperCase()}</LocalizedCopy></small>
                <b><LocalizedCopy>{item.title}</LocalizedCopy></b>
                <p><LocalizedCopy>{item.body}</LocalizedCopy></p>
                <time><LocalizedCopy>{new Date(item.created_at).toLocaleString(petOwnerIntlLocale())}</LocalizedCopy></time>
              </div>
              <LocalizedCopy>{!item.read_at && <i />}</LocalizedCopy>
            </LocalizedButton>
          ))
        ) : (
          <div className="empty-state compact"><LocalizedCopy>{"Tidak ada notifikasi pada kategori ini."}</LocalizedCopy></div>
        )}</LocalizedCopy>
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
  const moreDialog = useDialogFocus<HTMLElement>(more, () => setMore(false));
  const primaryIds: AppView[] = ["home", "shop", "community", "bookings"];
  const worldIds: AppView[] = worldFeatures.map((item) => item.mode);
  const moreIds: AppView[] = ["messages", "discover", "clinics", "health", "profile"];
  const items = primaryIds
    .map((id) => navItems.find((item) => item.id === id))
    .filter((item): item is (typeof navItems)[number] => Boolean(item));
  const moreActive = more || !primaryIds.includes(activeView);
  return (
    <>
      <nav className="mobile-nav" aria-label="Navigasi utama">
        <LocalizedCopy>{items.map((item) => (
          <LocalizedButton
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
            <small><LocalizedCopy>{t(item.label)}</LocalizedCopy></small>
          </LocalizedButton>
        ))}</LocalizedCopy>
        <LocalizedButton
          type="button"
          className={moreActive ? "active" : ""}
          onClick={() => setMore(true)}
          aria-expanded={more}
        >
          <span>
            <Icon name="more" size={22} />
            <LocalizedCopy>{cartCount > 0 && <i><LocalizedCopy>{cartCount}</LocalizedCopy></i>}</LocalizedCopy>
          </span>
          <small><LocalizedCopy>{t("Lainnya")}</LocalizedCopy></small>
        </LocalizedButton>
      </nav>
      {more && (
        <div
          className="mobile-more-backdrop"
          onMouseDown={() => setMore(false)}
        >
          <section
            className="mobile-more-sheet"
            ref={moreDialog}
            role="dialog"
            aria-modal="true"
            aria-label={t("Semua fitur Slivadoc")}
            tabIndex={-1}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span><LocalizedCopy>{t("Semua fitur Slivadoc").toUpperCase()}</LocalizedCopy></span>
                <h2><LocalizedCopy>{t("Mau ke mana?")}</LocalizedCopy></h2>
              </div>
              <LocalizedButton onClick={() => setMore(false)} aria-label="Tutup">
                <Icon name="close" />
              </LocalizedButton>
            </header>
            <div className="mobile-more-content">
              <section className="mobile-more-group">
                <h3><LocalizedCopy>{t("Akun & perawatan").toUpperCase()}</LocalizedCopy></h3>
                <div className="mobile-more-grid">
              <LocalizedButton
                type="button"
                onClick={() => {
                  setMore(false);
                  onOpenChat();
                }}
              >
                <span>
                  <Icon name="chat" />
                </span>
                <b><LocalizedCopy>{"SlivaCare"}</LocalizedCopy></b>
              </LocalizedButton>
              <LocalizedCopy>{moreIds.map((id) => navItems.find((item) => item.id === id)!)
                .map((item) => (
                  <LocalizedButton
                    key={item.id}
                    onClick={() => {
                      setMore(false);
                      setActiveView(item.id);
                    }}
                  >
                    <span>
                      <Icon name={item.icon} />
                    </span>
                    <b><LocalizedCopy>{t(item.id === "profile" && !authenticated ? "Masuk ke akun" : item.label)}</LocalizedCopy></b>
                    <LocalizedCopy>{item.id === "shop" && cartCount > 0 && (
                      <em><LocalizedCopy>{cartCount}</LocalizedCopy></em>
                    )}</LocalizedCopy>
                  </LocalizedButton>
                ))}</LocalizedCopy>
                </div>
              </section>
              <section className="mobile-more-group mobile-more-world">
                <h3><LocalizedCopy>{"SLIVA WORLD"}</LocalizedCopy></h3>
                <p><LocalizedCopy>{t("Semua fitur komunitas dan gaya hidup pet, langsung sekali tap.")}</LocalizedCopy></p>
                <div className="mobile-more-grid">
                  <LocalizedCopy>{worldIds.map((id) => navItems.find((item) => item.id === id)!).map((item) => (
                    <LocalizedButton
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setMore(false);
                        setActiveView(item.id);
                      }}
                    >
                      <span><Icon name={item.icon} /></span>
                      <b><LocalizedCopy>{t(item.label)}</LocalizedCopy></b>
                    </LocalizedButton>
                  ))}</LocalizedCopy>
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
            <span className="section-eyebrow"><LocalizedCopy>{"UPDATE TERBARU"}</LocalizedCopy></span>
            <h2><LocalizedCopy>{selected ? "Detail notifikasi" : "Notifikasi"}</LocalizedCopy></h2>
          </div>
          <LocalizedButton type="button" aria-label="Tutup notifikasi" onClick={onClose}>
            <Icon name="close" />
          </LocalizedButton>
        </header>
        <LocalizedCopy>{selected ? <NotificationDetail item={selected} onBack={() => setSelectedId("")} onOpen={() => { onClose(); onOpen(selected); }} /> : <>
        <div className="notification-category-chips" role="group" aria-label="Filter notifikasi">
          <LocalizedButton
            type="button"
            className={!category ? "active" : ""}
            aria-pressed={!category}
            onClick={() => setCategory("")}
          ><LocalizedCopy>{"Semua"}</LocalizedCopy></LocalizedButton>
          <LocalizedCopy>{categories.map((value) => (
            <LocalizedButton
              type="button"
              key={value}
              className={category === value ? "active" : ""}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              <LocalizedCopy>{value === "security" ? "Keamanan" : value}</LocalizedCopy>
            </LocalizedButton>
          ))}</LocalizedCopy>
        </div>
        <LocalizedButton
          className="mark-read"
          type="button"
          disabled={!visibleItems.some((item) => !item.read_at)}
          onClick={() => void markAll()}
        ><LocalizedCopy>{"Tandai semua sudah dibaca"}</LocalizedCopy></LocalizedButton>
        <div className="notification-list">
          <LocalizedCopy>{visibleItems.length ? (
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
                time={new Date(item.created_at).toLocaleString(petOwnerIntlLocale())}
                unread={!item.read_at}
                onClick={() => void open(item)}
              />
            ))
          ) : (
            <div className="empty-state compact"><LocalizedCopy>{"Belum ada notifikasi pada kategori ini."}</LocalizedCopy></div>
          )}</LocalizedCopy>
        </div>
        <LocalizedButton className="full-soft-button" type="button" onClick={seeAll}><LocalizedCopy>{"Lihat semua berdasarkan kategori"}</LocalizedCopy></LocalizedButton>
        </>}</LocalizedCopy>
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
    ? new Intl.DateTimeFormat(petOwnerIntlLocale(), {
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
          <LocalizedButton className="modal-close" type="button" onClick={onClose}>
            <Icon name="close" />
          </LocalizedButton>
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
            <span className="section-eyebrow"><LocalizedCopy>{"BOOKING LAYANAN"}</LocalizedCopy></span>
            <h2><LocalizedCopy catalogue>{service.name}</LocalizedCopy></h2>
          </div>
          <LocalizedButton className="modal-close" type="button" onClick={onClose}>
            <Icon name="close" />
          </LocalizedButton>
        </header>
        <div className="stepper">
          <LocalizedCopy>{[1, 2, 3].map((item) => (
            <div key={item} className={step >= item ? "active" : ""}>
              <span>
                <LocalizedCopy>{step > item ? <Icon name="check" size={13} /> : item}</LocalizedCopy>
              </span>
              <small>
                <LocalizedCopy>{item === 1 ? "Layanan" : item === 2 ? "Jadwal" : "Konfirmasi"}</LocalizedCopy>
              </small>
            </div>
          ))}</LocalizedCopy>
        </div>
        <LocalizedCopy catalogue>{step === 1 && (
          <div className="booking-step">
            <div className="booking-step-intro">
              <span><LocalizedCopy>{"1"}</LocalizedCopy></span>
              <div><b><LocalizedCopy>{"Untuk siapa booking ini?"}</LocalizedCopy></b><small><LocalizedCopy>{"Pilih pet supaya kebutuhan dan riwayatnya terhubung ke aktivitas."}</LocalizedCopy></small></div>
            </div>
            <label className="field-label"><LocalizedCopy>{"Pilih hewan"}</LocalizedCopy></label>
            <div className="booking-pet-options">
              <LocalizedCopy>{pets.map((option) => (
                <LocalizedButton
                  className={`selected-pet-box ${option.id === pet?.id ? "selected" : ""}`}
                  type="button"
                  key={option.id}
                  onClick={() => onSelectPet(option.id)}
                >
                  <span><LocalizedCopy>{option.avatar}</LocalizedCopy></span>
                  <div>
                    <b><LocalizedCopy>{option.name}</LocalizedCopy></b>
                    <small><LocalizedCopy>{option.breed}</LocalizedCopy><LocalizedCopy>{" • "}</LocalizedCopy><LocalizedCopy>{option.weight}</LocalizedCopy></small>
                  </div>
                  <i><LocalizedCopy>{option.id === pet?.id ? <Icon name="check" size={15} /> : null}</LocalizedCopy></i>
                </LocalizedButton>
              ))}</LocalizedCopy>
            </div>
            <label className="field-label"><LocalizedCopy>{"Layanan yang dipilih"}</LocalizedCopy></label>
            <div className="service-option selected">
              <span><LocalizedCopy>{service.emoji}</LocalizedCopy></span>
              <div>
                <b><LocalizedCopy catalogue>{service.name}</LocalizedCopy></b>
                <small><LocalizedCopy>{service.tags.join(" · ")}</LocalizedCopy></small>
              </div>
              <strong><LocalizedCopy>{service.price}</LocalizedCopy></strong>
              <i>
                <Icon name="check" size={13} />
              </i>
            </div>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{step === 2 && (
          <div className="booking-step">
            <div className="booking-step-intro">
              <span><LocalizedCopy>{"2"}</LocalizedCopy></span>
              <div><b><LocalizedCopy>{"Pilih slot aktual dari cabang"}</LocalizedCopy></b><small><LocalizedCopy>{"Jadwal dan kapasitas disinkronkan langsung dari sistem mitra."}</LocalizedCopy></small></div>
            </div>
            <label className="field-label"><LocalizedCopy>{"Pilih tanggal"}</LocalizedCopy></label>
            <LocalizedCopy>{availabilityLoading && (
              <div className="booking-availability-state" role="status"><LocalizedCopy>{"Menyinkronkan jadwal cabang…"}</LocalizedCopy></div>
            )}</LocalizedCopy>
            <LocalizedCopy>{availabilityError && !availabilityLoading && (
              <div className="booking-availability-state error" role="alert">
                <span><LocalizedCopy>{availabilityError}</LocalizedCopy></span>
                <LocalizedButton
                  type="button"
                  onClick={() => void refreshAvailability()}
                ><LocalizedCopy>{"Coba lagi"}</LocalizedCopy></LocalizedButton>
              </div>
            )}</LocalizedCopy>
            <div className="date-options">
              <LocalizedCopy>{availability?.data
                .filter((item) => item.slots.length > 0)
                .map((item) => {
                  const localDate = new Date(`${item.date}T12:00:00`);
                  return (
                    <LocalizedButton
                      className={date === item.date ? "selected" : ""}
                      type="button"
                      key={item.date}
                      onClick={() => {
                        setDate(item.date);
                        setStartsAt(item.slots[0]?.starts_at ?? "");
                      }}
                    >
                      <small>
                        <LocalizedCopy>{localDate
                          .toLocaleDateString(petOwnerIntlLocale(), { weekday: "short" })
                          .toUpperCase()}</LocalizedCopy>
                      </small>
                      <b><LocalizedCopy>{localDate.getDate()}</LocalizedCopy></b>
                      <span>
                        <LocalizedCopy>{localDate.toLocaleDateString(petOwnerIntlLocale(), {
                          month: "short",
                        })}</LocalizedCopy>
                      </span>
                    </LocalizedButton>
                  );
                })}</LocalizedCopy>
            </div>
            <label className="field-label"><LocalizedCopy>{"Pilih waktu"}</LocalizedCopy></label>
            <div className="time-options">
              <LocalizedCopy>{selectedDay?.slots.map((slot) => (
                <LocalizedButton
                  type="button"
                  key={slot.starts_at}
                  className={startsAt === slot.starts_at ? "selected" : ""}
                  onClick={() => setStartsAt(slot.starts_at)}
                >
                  <LocalizedCopy>{slot.local_time}</LocalizedCopy>
                  <LocalizedCopy>{slot.remaining_capacity <= 3 && (
                    <small><LocalizedCopy>{"Sisa "}</LocalizedCopy><LocalizedCopy>{slot.remaining_capacity}</LocalizedCopy></small>
                  )}</LocalizedCopy>
                </LocalizedButton>
              ))}</LocalizedCopy>
            </div>
            <label className="field-label"><LocalizedCopy>{"Catatan khusus "}</LocalizedCopy><small><LocalizedCopy>{"(opsional)"}</LocalizedCopy></small>
            </label>
            <LocalizedTextarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={1000}
              placeholder="Ceritakan keluhan atau kebutuhan khusus pet..."
            />
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy catalogue>{step === 3 && (
          <div className="booking-step">
            <div className="booking-step-intro">
              <span><LocalizedCopy>{"3"}</LocalizedCopy></span>
              <div><b><LocalizedCopy>{"Periksa sekali lagi"}</LocalizedCopy></b><small><LocalizedCopy>{"Pastikan pet, jadwal, biaya, dan kebijakan sudah sesuai."}</LocalizedCopy></small></div>
            </div>
            <div className="booking-summary">
              <div className={`summary-service ${service.accent}`}>
                <LocalizedCopy>{service.emoji}</LocalizedCopy>
              </div>
              <div>
                <span className="status-badge confirmed"><LocalizedCopy>{"Slot dikonfirmasi server"}</LocalizedCopy></span>
                <h3><LocalizedCopy catalogue>{service.name}</LocalizedCopy></h3>
                <p><LocalizedCopy>{service.address}</LocalizedCopy></p>
              </div>
            </div>
            <div className="summary-lines">
              <span>
                <small><LocalizedCopy>{"Hewan"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{pet?.avatar ?? "🐾"}</LocalizedCopy> <LocalizedCopy>{pet?.name ?? "Pet"}</LocalizedCopy>
                </b>
              </span>
              <span>
                <small><LocalizedCopy>{"Layanan"}</LocalizedCopy></small>
                <b><LocalizedCopy catalogue>{service.name}</LocalizedCopy></b>
              </span>
              <span>
                <small><LocalizedCopy>{"Jadwal"}</LocalizedCopy></small>
                <b>
                  <LocalizedCopy>{formattedDate}</LocalizedCopy><LocalizedCopy>{" • "}</LocalizedCopy><LocalizedCopy>{selectedSlot?.local_time ?? "-"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
                  <LocalizedCopy>{availability?.timezone ?? ""}</LocalizedCopy>
                </b>
              </span>
              <span className="total">
                <small><LocalizedCopy>{"Total pembayaran"}</LocalizedCopy></small>
                <span className="service-checkout-price">
                  <LocalizedCopy>{service.originalPrice ? <s><LocalizedCopy>{formatRupiah(service.originalPrice)}</LocalizedCopy></s> : null}</LocalizedCopy>
                  <b><LocalizedCopy>{formatRupiah(service.priceValue || 0)}</LocalizedCopy></b>
                  <LocalizedCopy>{service.discountPercent ? <em><LocalizedCopy>{"Hemat "}</LocalizedCopy><LocalizedCopy>{service.discountPercent}</LocalizedCopy><LocalizedCopy>{"%"}</LocalizedCopy></em> : null}</LocalizedCopy>
                </span>
              </span>
            </div>
            <LocalizedCopy>{service.priceValue > 0 && (
              <PaymentMethodPicker
                value={paymentMethod}
                onChange={setPaymentMethod}
                disabled={busy}
              />
            )}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
            <LocalizedCopy>{notes && <p className="booking-note"><LocalizedCopy>{"Catatan: "}</LocalizedCopy><LocalizedCopy>{notes}</LocalizedCopy></p>}</LocalizedCopy>
            <LocalizedCopy>{service.cancellationCutoffHours !== undefined && (
              <p className="booking-note"><LocalizedCopy>{"Bisa dibatalkan hingga "}</LocalizedCopy><LocalizedCopy>{service.cancellationCutoffHours}</LocalizedCopy><LocalizedCopy>{" jam sebelum jadwal"}</LocalizedCopy></p>
            )}</LocalizedCopy>
            <label className="consent">
              <LocalizedInput
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              /><LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"Saya menyetujui kebijakan pembatalan"}</LocalizedCopy><LocalizedCopy>{service.cancellationPolicy
                ? ` (${service.cancellationPolicy})`
                : " yang dicantumkan mitra"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy><LocalizedCopy>{"dan penggunaan data kesehatan."}</LocalizedCopy></label>
          </div>
        )}</LocalizedCopy>
        <LocalizedCopy>{message && <div className="form-message"><LocalizedCopy>{message}</LocalizedCopy></div>}</LocalizedCopy>
        <footer>
          <LocalizedButton
            className="secondary-button"
            type="button"
            disabled={
              busy || (step === 2 && (!startsAt || availabilityLoading))
            }
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          >
            <LocalizedCopy>{step === 1 ? "Batal" : "Kembali"}</LocalizedCopy>
          </LocalizedButton>
          <LocalizedButton
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
            <LocalizedCopy>{busy
              ? "Membuat pembayaran…"
              : step < 3
                ? "Lanjutkan"
                : service.priceValue > 0
                  ? "Lanjut ke pembayaran"
                  : "Konfirmasi booking"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
            <Icon name="arrow" size={16} />
          </LocalizedButton>
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
            <span className="section-eyebrow"><LocalizedCopy>{"SLIVA PET SHOP"}</LocalizedCopy></span>
            <h2>
              <LocalizedCopy>{payment
                ? "Pembayaran"
                : checkoutStep === "shipping"
                  ? "Pengiriman"
                  : "Keranjangmu"}</LocalizedCopy>
            </h2>
          </div>
          <LocalizedButton type="button" onClick={onClose}>
            <Icon name="close" />
          </LocalizedButton>
        </header>
        <LocalizedCopy>{!payment && checkoutStep === "shipping" && (
          <LocalizedButton
            className="cart-back-button"
            type="button"
            onClick={() => setCheckoutStep("cart")}
          ><LocalizedCopy>{"← Kembali ke keranjang"}</LocalizedCopy></LocalizedButton>
        )}</LocalizedCopy>
        <LocalizedCopy>{payment ? (
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
            <span><LocalizedCopy>{"🛒"}</LocalizedCopy></span>
            <h3><LocalizedCopy>{"Keranjang masih kosong"}</LocalizedCopy></h3>
            <p><LocalizedCopy>{"Yuk, pilih kebutuhan terbaik untuk mereka."}</LocalizedCopy></p>
            <LocalizedButton
              className="primary-button small"
              type="button"
              onClick={onClose}
            ><LocalizedCopy>{"Mulai belanja"}</LocalizedCopy></LocalizedButton>
          </div>
        ) : (
          <>
            {checkoutStep === "cart" ? (
              <>
                <div className="cart-bulk-actions">
                  <LocalizedButton
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
                    <LocalizedCopy>{allCartItemsSelected ? "Batalkan pilihan" : "Pilih semua"}</LocalizedCopy>
                  </LocalizedButton>
                  <LocalizedCopy>{selectedCartItems.length > 0 && (
                    <LocalizedButton
                      className="cart-delete-selected"
                      type="button"
                      onClick={deleteSelectedCartItems}
                    ><LocalizedCopy>{"Hapus dipilih ("}</LocalizedCopy><LocalizedCopy>{selectedCartItems.length}</LocalizedCopy><LocalizedCopy>{")"}</LocalizedCopy></LocalizedButton>
                  )}</LocalizedCopy>
                </div>
                <div className="cart-items">
                  <LocalizedCopy>{items.map((item) => {
                    const selected = selectedCartIDs.has(item.id);
                    const productStockError =
                      stockError?.productID === item.id ? stockError : null;
                    return (
                      <div className="cart-item" key={item.id}>
                        <LocalizedButton
                          className={`cart-item-select${selected ? " selected" : ""}`}
                          type="button"
                          aria-label={`${selected ? "Batalkan pilihan" : "Pilih"} ${item.name}`}
                          aria-pressed={selected}
                          onClick={() => toggleCartItem(item.id)}
                        >
                          <span><LocalizedCopy>{item.emoji}</LocalizedCopy></span>
                          <small>
                            <LocalizedCopy>{selected ? (
                              <Icon name="check" size={12} />
                            ) : (
                              "Pilih"
                            )}</LocalizedCopy>
                          </small>
                        </LocalizedButton>
                        <div>
                          <small><LocalizedCopy>{item.brand}</LocalizedCopy></small>
                          <b><LocalizedCopy>{item.name}</LocalizedCopy></b>
                          <strong><LocalizedCopy>{formatRupiah(item.price)}</LocalizedCopy></strong>
                          <LocalizedCopy>{productStockError && (
                            <small
                              className="cart-item-stock-warning"
                              role="status"
                            >
                              <LocalizedCopy>{productStockError.availableStock == null
                                ? "Produk tidak tersedia atau stok berubah. Sesuaikan jumlah atau hapus produk ini."
                                : `Stok tersedia: ${productStockError.availableStock.toLocaleString(petOwnerIntlLocale())}. Sesuaikan jumlah lalu cek ulang pengiriman.`}</LocalizedCopy>
                            </small>
                          )}</LocalizedCopy>
                        </div>
                        <div className="quantity">
                          <LocalizedButton
                            type="button"
                            onClick={() => update(item.id, -1)}
                          ><LocalizedCopy>{"−"}</LocalizedCopy></LocalizedButton>
                          <b><LocalizedCopy>{cart[item.id]}</LocalizedCopy></b>
                          <LocalizedButton
                            type="button"
                            onClick={() => update(item.id, 1)}
                          ><LocalizedCopy>{"+"}</LocalizedCopy></LocalizedButton>
                        </div>
                      </div>
                    );
                  })}</LocalizedCopy>
                </div>
                <div className="cart-summary cart-cart-summary">
                  <span>
                    <small><LocalizedCopy>{"Subtotal "}</LocalizedCopy><LocalizedCopy>{selectedCartItems.length}</LocalizedCopy><LocalizedCopy>{" produk dipilih"}</LocalizedCopy></small>
                    <b><LocalizedCopy>{formatRupiah(cartSubtotal)}</LocalizedCopy></b>
                  </span>
                </div>
                <LocalizedButton
                  className="primary-button full"
                  type="button"
                  disabled={selectedCartItems.length === 0}
                  onClick={() => setCheckoutStep("shipping")}
                >
                  <LocalizedCopy>{selectedCartItems.length === 0
                    ? "Pilih produk untuk checkout"
                    : "Atur pengiriman"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
                  <Icon name="arrow" size={16} />
                </LocalizedButton>
              </>
            ) : (
              <>
                <div className="cart-order-preview">
                  <span>
                    <LocalizedCopy>{selectedCartItems.length}</LocalizedCopy><LocalizedCopy>{" produk dipilih ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{formatRupiah(cartSubtotal)}</LocalizedCopy>
                  </span>
                  <LocalizedButton type="button" onClick={() => setCheckoutStep("cart")}><LocalizedCopy>{"Ubah keranjang"}</LocalizedCopy></LocalizedButton>
                </div>
                {shippingFormVisible && (
                  <section className="cart-shipping">
                    <div className="cart-shipping-heading">
                      <b><LocalizedCopy>{"Alamat pengiriman"}</LocalizedCopy></b>
                      <small><LocalizedCopy>{"Alamat dikelola dari halaman Akun."}</LocalizedCopy></small>
                    </div>
                    <LocalizedCopy>{accountAddressLoading ? (
                      <p className="profile-address-muted"><LocalizedCopy>{"Memuat alamat tersimpan…"}</LocalizedCopy></p>
                    ) : accountShippingAddress ? (
                      <div className="cart-shipping-saved">
                        <div>
                          <b><LocalizedCopy>{accountShippingAddress.recipient_name}</LocalizedCopy></b>
                          <span><LocalizedCopy>{accountShippingAddress.phone}</LocalizedCopy></span>
                          <p><LocalizedCopy>{accountShippingAddress.address}</LocalizedCopy></p>
                          <small>
                            <LocalizedCopy>{accountShippingAddress.village.name}</LocalizedCopy><LocalizedCopy>{","}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                            <LocalizedCopy>{accountShippingAddress.district.name}</LocalizedCopy><LocalizedCopy>{","}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                            <LocalizedCopy>{accountShippingAddress.regency.name}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                            <LocalizedCopy>{accountShippingAddress.post_code}</LocalizedCopy>
                          </small>
                        </div>
                        <LocalizedButton type="button" onClick={onOpenAccount}><LocalizedCopy>{"Ubah di Akun"}</LocalizedCopy></LocalizedButton>
                      </div>
                    ) : (
                      <div className="cart-shipping-empty">
                        <p><LocalizedCopy>{"Belum ada alamat tersimpan untuk checkout."}</LocalizedCopy></p>
                        <LocalizedButton type="button" onClick={onOpenAccount}><LocalizedCopy>{"Tambah alamat di Akun"}</LocalizedCopy></LocalizedButton>
                      </div>
                    )}</LocalizedCopy>
                    <LocalizedCopy>{singleBranchOptions.length > 0 && (
                      <div className="cart-shipping-branches">
                        <small className="cart-shipping-branch-label"><LocalizedCopy>{"PILIH CABANG PENGIRIMAN · DEFAULT TERDEKAT"}</LocalizedCopy></small>
                        <div className="cart-shipping-branch-options">
                          <LocalizedCopy>{singleBranchOptions.map((branch) => {
                            const cheapest = cheapestCartShippingRate(branch);
                            return (
                              <LocalizedButton
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
                                <b><LocalizedCopy>{branch.branch_name}</LocalizedCopy></b>
                                <span><LocalizedCopy>{branch.origin}</LocalizedCopy></span>
                                <LocalizedCopy>{branch.distance_km != null ? (
                                  <small>
                                    <LocalizedCopy>{branch.distance_km.toFixed(1)}</LocalizedCopy><LocalizedCopy>{" km dari alamat"}</LocalizedCopy></small>
                                ) : cheapest ? (
                                  <strong><LocalizedCopy>{formatRupiah(cheapest.fee)}</LocalizedCopy></strong>
                                ) : null}</LocalizedCopy>
                              </LocalizedButton>
                            );
                          })}</LocalizedCopy>
                        </div>
                      </div>
                    )}</LocalizedCopy>
                    <LocalizedCopy>{(singleBranchOptions.length > 0
                      ? quote?.shipping_quotes.filter(
                          (shipment) => shipment.branch_id === shippingBranchID,
                        )
                      : quote?.shipping_quotes
                    )?.map((shipment) => (
                      <div
                        className="cart-shipping-origin"
                        key={shipment.branch_id}
                      >
                        <small><LocalizedCopy>{"DIKIRIM DARI "}</LocalizedCopy><LocalizedCopy>{shipment.branch_name}</LocalizedCopy><LocalizedCopy>{" ·"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                          <LocalizedCopy>{shipment.origin}</LocalizedCopy>
                        </small>
                        <div className="cart-shipping-rates">
                          <LocalizedCopy>{shipment.rates.map((rate) => (
                            <LocalizedButton
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
                              <b><LocalizedCopy>{rate.service_code}</LocalizedCopy></b>
                              <span><LocalizedCopy>{formatRupiah(rate.fee)}</LocalizedCopy></span>
                              <small>
                                <LocalizedCopy>{rate.estimated_sla || "Sesuai rute"}</LocalizedCopy>
                              </small>
                            </LocalizedButton>
                          ))}</LocalizedCopy>
                        </div>
                      </div>
                    ))}</LocalizedCopy>
                  </section>
                )}
                <label className="voucher">
                  <span><LocalizedCopy>{"🎟️"}</LocalizedCopy></span>
                  <LocalizedInput
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
                  <LocalizedButton
                    type="button"
                    disabled={voucherInput.length < 6 || voucherBusy}
                    onClick={() => void applyVoucher()}
                  >
                    <LocalizedCopy>{voucherBusy ? "Memeriksa…" : "Pakai"}</LocalizedCopy>
                  </LocalizedButton>
                </label>
                {appliedVoucher && quote && quote.voucher_discount > 0 && (
                  <small className="voucher-applied"><LocalizedCopy>{"Voucher "}</LocalizedCopy><LocalizedCopy>{appliedVoucher}</LocalizedCopy><LocalizedCopy>{" aktif · potongan"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                    <LocalizedCopy>{formatRupiah(quote.voucher_discount)}</LocalizedCopy>
                    <LocalizedCopy>{quote.voucher_description
                      ? ` · ${quote.voucher_description}`
                      : ""}</LocalizedCopy>
                  </small>
                )}
                {rewardFormula.enabled &&
                  points > 0 &&
                  maximumRedeemable > 0 && (
                    <section className="points-redemption-card">
                      <div>
                        <span><LocalizedCopy>{"✦"}</LocalizedCopy></span>
                        <p>
                          <b><LocalizedCopy>{"Pakai SlivaPoints"}</LocalizedCopy></b>
                          <small><LocalizedCopy>{"Saldo "}</LocalizedCopy><LocalizedCopy>{points.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" · maksimal checkout ini"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                            <LocalizedCopy>{maximumRedeemable.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" poin"}</LocalizedCopy></small>
                        </p>
                      </div>
                      <label>
                        <LocalizedInput
                          type="number"
                          min={minimumRedemption}
                          max={maximumRedeemable}
                          step="1"
                          value={redeemPoints || ""}
                          placeholder={`Min. ${minimumRedemption.toLocaleString(petOwnerIntlLocale())}`}
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
                        <LocalizedButton
                          type="button"
                          onClick={() => setRedeemPoints(maximumRedeemable)}
                        ><LocalizedCopy>{"Maks"}</LocalizedCopy></LocalizedButton>
                      </label>
                      <LocalizedCopy>{redeemPoints > 0 && redeemPoints < minimumRedemption && (
                        <small><LocalizedCopy>{"Minimum penukaran"}</LocalizedCopy><LocalizedCopy>{" "}</LocalizedCopy>
                          <LocalizedCopy>{minimumRedemption.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{" poin."}</LocalizedCopy></small>
                      )}</LocalizedCopy>
                    </section>
                  )}
                {quoteError && <p className="cart-quote-error"><LocalizedCopy>{quoteError}</LocalizedCopy></p>}
                <div className="cart-summary">
                  <span>
                    <small><LocalizedCopy>{"Subtotal"}</LocalizedCopy></small>
                    <b><LocalizedCopy>{quote ? formatRupiah(quote.subtotal) : "…"}</LocalizedCopy></b>
                  </span>
                  <span>
                    <small><LocalizedCopy>{"Pengiriman"}</LocalizedCopy></small>
                    <b><LocalizedCopy>{quote ? formatRupiah(quote.shipping_fee) : "—"}</LocalizedCopy></b>
                  </span>
                  <span>
                    <small><LocalizedCopy>{"Biaya layanan"}</LocalizedCopy></small>
                    <b><LocalizedCopy>{quote ? formatRupiah(quote.platform_fee) : "…"}</LocalizedCopy></b>
                  </span>
                  <LocalizedCopy>{quote && quote.voucher_discount > 0 && (
                    <span>
                      <small><LocalizedCopy>{"Voucher ("}</LocalizedCopy><LocalizedCopy>{quote.voucher_code}</LocalizedCopy><LocalizedCopy>{")"}</LocalizedCopy></small>
                      <b className="good"><LocalizedCopy>{"−"}</LocalizedCopy><LocalizedCopy>{formatRupiah(quote.voucher_discount)}</LocalizedCopy>
                      </b>
                    </span>
                  )}</LocalizedCopy>
                  <LocalizedCopy>{quote && quote.points_discount > 0 && (
                    <span>
                      <small><LocalizedCopy>{"SlivaPoints ("}</LocalizedCopy><LocalizedCopy>{quote.points_redeemed.toLocaleString(petOwnerIntlLocale())}</LocalizedCopy><LocalizedCopy>{")"}</LocalizedCopy></small>
                      <b className="good"><LocalizedCopy>{"−"}</LocalizedCopy><LocalizedCopy>{formatRupiah(quote.points_discount)}</LocalizedCopy>
                      </b>
                    </span>
                  )}</LocalizedCopy>
                  <span className="total">
                    <small><LocalizedCopy>{"Total"}</LocalizedCopy></small>
                    <b>
                      <LocalizedCopy>{quote
                        ? formatRupiah(quote.total_amount)
                        : quoteError
                          ? "Belum tersedia"
                          : "Menghitung…"}</LocalizedCopy>
                    </b>
                  </span>
                </div>
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  disabled={busy}
                />
                <LocalizedButton
                  className="primary-button full"
                  type="button"
                  disabled={busy || !paymentMethod}
                  onClick={() => void checkout()}
                >
                  <LocalizedCopy>{busy ? "Membuat pembayaran…" : "Lanjut ke pembayaran"}<LocalizedCopy></LocalizedCopy>{" "}</LocalizedCopy>
                  <Icon name="arrow" size={16} />
                </LocalizedButton>
              </>
            )}
          </>
        )}</LocalizedCopy>
      </aside>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small><LocalizedCopy>{label}</LocalizedCopy></small>
      <b><LocalizedCopy>{value}</LocalizedCopy></b>
    </div>
  );
}
function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="progress-row">
      <span>
        <small><LocalizedCopy>{label}</LocalizedCopy></small>
        <b><LocalizedCopy>{value}</LocalizedCopy><LocalizedCopy>{"%"}</LocalizedCopy></b>
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
    <LocalizedButton
      type="button"
      className={`notification ${unread ? "unread" : ""}`}
      onClick={onClick}
    >
      <span className={tone}><LocalizedCopy>{icon}</LocalizedCopy></span>
      <p>
        <b><LocalizedCopy>{title}</LocalizedCopy></b>
        <small><LocalizedCopy>{note}</LocalizedCopy></small>
        <em><LocalizedCopy>{time}</LocalizedCopy></em>
      </p>
      <LocalizedCopy>{unread && <i />}</LocalizedCopy>
    </LocalizedButton>
  );
}
