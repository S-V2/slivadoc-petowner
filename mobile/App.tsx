import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ExpoLocation from "expo-location";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { HomeScreen } from "./src/screens/HomeScreen";
import { DiscoverScreen } from "./src/screens/DiscoverScreen";
import { MarketplaceScreen } from "./src/screens/MarketplaceScreen";
import { ActivityScreen } from "./src/screens/ActivityScreen";
import { HealthScreen } from "./src/screens/HealthScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { CommunityScreen } from "./src/screens/CommunityScreen";
import { WorldScreen } from "./src/screens/WorldScreen";
import { type PetView, type Service } from "./src/data";
import { colors, shadow, typography } from "./src/theme";
import {
  AppSurfaceProvider,
  Pill,
  PrimaryButton,
  SoftButton,
} from "./src/components/ui";
import {
  clearMobileCache,
  createMobileBooking,
  createMobilePaymentIntent,
  getMobileBootstrap,
  getMobileMedicalRecords,
  getMobileServices,
  hasPlatformSession,
  loginMobile,
  logoutMobile,
  restorePlatformSession,
  readAllMobileNotifications,
  readMobileNotification,
  registerMobileOwner,
  resendMobileRegistrationOTP,
  toggleMobileFavorite,
  verifyMobileRegistrationOTP,
  type MobileBootstrap,
  type MobileActivityOrderItem,
  type MobileMedicalRecord,
  type MobileNotification,
  type MobilePaymentIntent,
  type MobileService,
  type MobileGlobalSearchResult,
} from "./src/api";
import { SlivaCareModal } from "./src/components/SlivaCareModal";
import {
  MobileBatpayModal,
  MobilePaymentMethods,
} from "./src/components/BatpayPayment";
import slivadocLogo from "./assets/slivadoc-logo.png";
import { LanguageProvider, LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "./src/i18n";

type Tab =
  | "home"
  | "marketplace"
  | "discover"
  | "world"
  | "activity"
  | "health"
  | "community"
  | "profile";

type TabItem = {
  id: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const bottomTabs: TabItem[] = [
  { id: "home", label: "Beranda", icon: "home-outline", activeIcon: "home" },
  {
    id: "marketplace",
    label: "Belanja",
    icon: "bag-handle-outline",
    activeIcon: "bag-handle",
  },
  {
    id: "community",
    label: "Komunitas",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    id: "activity",
    label: "Aktivitas",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
];

const moreTabs: TabItem[] = [
  {
    id: "discover",
    label: "Layanan",
    icon: "search-outline",
    activeIcon: "search",
  },
  {
    id: "world",
    label: "Sliva World",
    icon: "planet-outline",
    activeIcon: "planet",
  },
  {
    id: "health",
    label: "Kesehatan",
    icon: "heart-outline",
    activeIcon: "heart",
  },
  {
    id: "profile",
    label: "Akun",
    icon: "person-outline",
    activeIcon: "person",
  },
];

const searchRouteTabs: Record<string, Tab> = {
  home: "home",
  discover: "discover",
  shop: "marketplace",
  marketplace: "marketplace",
  product: "marketplace",
  products: "marketplace",
  favorites: "marketplace",
  bookings: "activity",
  activity: "activity",
  health: "health",
  community: "community",
  profile: "profile",
  pets: "health",
  academy: "world",
  events: "world",
  petspot: "world",
  pethub: "world",
  adoption: "world",
  documents: "world",
  pawdating: "world",
  petship: "world",
  fundraising: "world",
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <MobileApp />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

function MobileApp() {
  const insets = useSafeAreaInsets();
  const { formatCurrency } = useI18n();
  const [tab, setTab] = useState<Tab>("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<"care" | "support">("care");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [selectedService, setSelectedService] = useState<Service>();
  const [bootstrap, setBootstrap] = useState<MobileBootstrap>();
  const [services, setServices] = useState<Service[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [records, setRecords] = useState<MobileMedicalRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [marketplaceIntent, setMarketplaceIntent] = useState<{
    token: number;
    productId?: string;
    items?: Array<{ product_id: string; quantity: number }>;
  }>();
  const [worldIntent, setWorldIntent] = useState<{
    token: number;
    mode: "consult";
    itemId?: string;
  }>();
  const intentTokenRef = useRef(0);
  const tabRef = useRef<Tab>("home");
  const tabHistoryRef = useRef<Tab[]>([]);
  const [screenTransition] = useState(() => new Animated.Value(1));

  const mapService = useCallback(
    (item: MobileService, index: number): Service => ({
      id: item.id,
      branchId: item.branch_id,
      businessId: item.business_id,
      businessName: item.business_name,
      branchName: item.branch_name,
      city: item.city,
      name: item.name,
      category: item.category,
      rating: "Baru",
      distance:
        typeof item.distance_km === "number" &&
        Number.isFinite(item.distance_km)
          ? `${item.distance_km.toFixed(1)} km`
          : item.city,
      price: formatCurrency(item.price),
      status: "Tersedia untuk booking",
      icon: item.category.toLowerCase().includes("groom")
        ? "🛁"
        : item.category.toLowerCase().includes("hotel")
          ? "🏡"
          : item.category.toLowerCase().includes("home")
            ? "🩺"
            : "🏥",
      tone: (["mint", "blue", "violet", "peach"] as const)[index % 4] ?? "blue",
      priceValue: item.price,
      address: `${item.branch_name} · ${item.address}`,
    }),
    [formatCurrency],
  );
  const pets: PetView[] = (bootstrap?.pets ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    breed: item.breed,
    age:
      item.age_months >= 12
        ? `${Math.floor(item.age_months / 12)} tahun ${item.age_months % 12} bulan`
        : `${item.age_months} bulan`,
    weight: `${item.weight_kg || 0} kg`,
    icon:
      item.species.toLowerCase() === "cat"
        ? "🐈"
        : item.species.toLowerCase() === "rabbit"
          ? "🐇"
          : "🐕",
    score: item.health_score,
    allergies: item.allergies,
    lastUpdated: item.last_medical_record_at,
  }));
  const pet = pets[0];
  const petId = pet?.id;
  const hasPet = pets.length > 0;

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!petId) return;
    queueMicrotask(() => {
      setRecordsLoading(true);
      void getMobileMedicalRecords(petId)
        .then((result) => setRecords(result.data))
        .catch((cause) =>
          notify(
            cause instanceof Error
              ? cause.message
              : "Rekam medis belum tersedia",
          ),
        )
        .finally(() => setRecordsLoading(false));
    });
  }, [notify, petId]);

  const refreshAccount = useCallback(async () => {
    const data = await getMobileBootstrap();
    setBootstrap(data);
    setFavorites(data.favorites.map((item) => item.entity_id));
    return data;
  }, []);
  const loadServices = useCallback(async () => {
    let coordinates: { latitude: number; longitude: number } | undefined;
    try {
      const permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status === "granted") {
        const position = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.Balanced,
        });
        coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      }
    } catch {
      coordinates = undefined;
    }
    const result = await getMobileServices(coordinates);
    setServices(result.data.map(mapService));
  }, [mapService]);
  useEffect(() => {
    let mounted = true;
    void restorePlatformSession().then((restored) => {
      if (!mounted) return;
      if (restored) {
        void refreshAccount().catch(() => {});
      }
    });
    return () => {
      mounted = false;
    };
  }, [refreshAccount]);
  const reloadData = async (showFeedback = true) => {
    if (refreshing) return;
    setRefreshing(true);
    clearMobileCache();
    try {
      const tasks: Promise<unknown>[] = [loadServices()];
      if (hasPlatformSession()) tasks.push(refreshAccount());
      if (petId)
        tasks.push(
          getMobileMedicalRecords(petId).then((result) =>
            setRecords(result.data),
          ),
        );
      const results = await Promise.allSettled(tasks);
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length === results.length) {
        const reason =
          failed[0]?.status === "rejected" ? failed[0].reason : undefined;
        throw reason instanceof Error
          ? reason
          : new Error("Data belum dapat diperbarui");
      }
      setRefreshVersion((value) => value + 1);
      if (showFeedback)
        notify(
          failed.length
            ? "Sebagian data berhasil diperbarui"
            : "Data terbaru sudah dimuat",
        );
    } catch (cause) {
      if (showFeedback)
        notify(
          cause instanceof Error
            ? cause.message
            : "Data belum dapat diperbarui",
        );
    } finally {
      setRefreshing(false);
      if (!showFeedback) setInitialLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void reloadData(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateTo = useCallback(
    (next: Tab, resetHistory = false) => {
      const current = tabRef.current;
      if (next === current) return;
      tabHistoryRef.current = resetHistory
        ? []
        : [...tabHistoryRef.current, current].slice(-12);
      tabRef.current = next;
      screenTransition.setValue(0);
      setTab(next);
    },
    [screenTransition],
  );
  const goBack = useCallback(() => {
    const history = [...tabHistoryRef.current];
    const previous = history.pop();
    if (previous) {
      tabHistoryRef.current = history;
      tabRef.current = previous;
      screenTransition.setValue(0);
      setTab(previous);
      return true;
    }
    if (tabRef.current !== "home") {
      tabRef.current = "home";
      screenTransition.setValue(0);
      setTab("home");
      return true;
    }
    return false;
  }, [screenTransition]);

  useEffect(() => {
    Animated.timing(screenTransition, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [screenTransition, tab]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (moreOpen) {
          setMoreOpen(false);
          return true;
        }
        if (notificationsOpen) {
          setNotificationsOpen(false);
          return true;
        }
        if (chatOpen) {
          setChatOpen(false);
          return true;
        }
        if (bookingOpen) {
          setBookingOpen(false);
          return true;
        }
        if (loginOpen) {
          setLoginOpen(false);
          return true;
        }
        return goBack();
      },
    );
    return () => subscription.remove();
  }, [bookingOpen, chatOpen, goBack, loginOpen, moreOpen, notificationsOpen]);

  const requireLogin = () => {
    if (hasPlatformSession()) return true;
    setLoginOpen(true);
    notify("Login diperlukan untuk fitur akun");
    return false;
  };
  const requirePet = () => {
    if (!requireLogin()) return false;
    if (hasPet) return true;
    notify(
      "Tambahkan profil pet terlebih dahulu. Akunmu sedang dalam mode lihat saja.",
    );
    navigateTo("profile");
    return false;
  };
  const openSupportChat = () => {
    if (!requireLogin()) return;
    setChatContext("support");
    setChatOpen(true);
  };
  const openBooking = (service?: Service) => {
    if (!service) {
      navigateTo("discover");
      return;
    }
    if (!requirePet()) return;
    setSelectedService(service);
    setBookingOpen(true);
  };
  const nextIntentToken = () => {
    intentTokenRef.current += 1;
    return intentTokenRef.current;
  };
  const openMarketplace = (productId?: string) => {
    setMarketplaceIntent({ token: nextIntentToken(), productId });
    navigateTo("marketplace");
  };
  const reorderProducts = (items: MobileActivityOrderItem[]) => {
    setMarketplaceIntent({
      token: nextIntentToken(),
      items: items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
    });
    navigateTo("marketplace");
  };
  const openConsultation = (itemId?: string) => {
    setWorldIntent({ token: nextIntentToken(), mode: "consult", itemId });
    navigateTo("world");
  };
  const rebookService = (serviceId?: string) => {
    const service = services.find((item) => item.id === serviceId);
    if (service) {
      openBooking(service);
      return;
    }
    navigateTo("discover");
    notify("Pilih layanan pengganti dari semua partner Slivadoc");
  };
  const openSearchResult = (result: MobileGlobalSearchResult) => {
    if (result.id === "booking") {
      navigateTo("discover");
      return;
    }
    if (result.category === "service") {
      const service = services.find((item) => item.id === result.id);
      if (service) {
        openBooking(service);
        return;
      }
    }
    if (result.route === "consult" || result.category === "veterinarian") {
      openConsultation();
      return;
    }
    navigateTo(searchRouteTabs[result.route] ?? "discover");
    notify(`Membuka ${result.title}`);
  };

  const navigationBottom = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 12 : 8,
  );
  if (initialLoading) {
    return (
      <>
        <StatusBar style="dark" />
        <SafeAreaView
          edges={["top", "bottom", "left", "right"]}
          style={styles.brandLoading}
        >
          <View style={styles.brandLoadingMark}>
            <Image
              alt="Logo Slivadoc"
              accessibilityLabel="Logo Slivadoc"
              source={slivadocLogo}
              style={styles.brandLoadingLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandLoadingTitle}>Menyiapkan Slivadoc</Text>
          <Text style={styles.brandLoadingCopy}>
            Menyinkronkan profil pet, marketplace, dan aktivitas Anda.
          </Text>
          <ActivityIndicator color={colors.sky600} size="small" />
        </SafeAreaView>
      </>
    );
  }
  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <AppSurfaceProvider
          bottomInset={navigationBottom}
          refreshing={refreshing}
          onRefresh={() => void reloadData(true)}
        >
          <View style={styles.app}>
            {tab !== "home" ? (
              <View style={styles.backBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Kembali ke halaman sebelumnya"
                  onPress={() => goBack()}
                  style={({ pressed }) => [
                    styles.backButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.navy} />
                  <Text style={styles.backText}>Kembali</Text>
                </Pressable>
              </View>
            ) : null}
            <Animated.View
              style={[
                styles.screenStage,
                {
                  opacity: screenTransition,
                  transform: [
                    {
                      translateY: screenTransition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {tab === "home" ? (
                <HomeScreen
                  onAction={notify}
                  onBook={openBooking}
                  onOpenConsultation={() => openConsultation()}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  onSearchResult={openSearchResult}
                  onNavigate={navigateTo}
                  ownerName={bootstrap?.user.full_name}
                  pet={pet}
                  services={services}
                  activities={bootstrap?.activities ?? []}
                />
              ) : null}
              {tab === "discover" ? (
                <DiscoverScreen
                  onBook={openBooking}
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  services={services}
                  favorites={favorites}
                  onToggleFavorite={async (id) => {
                    if (!requirePet()) return;
                    try {
                      const result = await toggleMobileFavorite(id);
                      setFavorites((current) =>
                        result.favorite
                          ? [...new Set([...current, id])]
                          : current.filter((item) => item !== id),
                      );
                    } catch (cause) {
                      notify(
                        cause instanceof Error
                          ? cause.message
                          : "Favorit belum dapat diperbarui",
                      );
                    }
                  }}
                />
              ) : null}
              {tab === "marketplace" ? (
                <MarketplaceScreen
                  authenticated={Boolean(bootstrap)}
                  hasPet={hasPet}
                  partners={services}
                  favorites={favorites}
                  refreshVersion={refreshVersion}
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  onRequireLogin={() => {
                    requireLogin();
                  }}
                  onRequirePet={() => {
                    requirePet();
                  }}
                  onToggleFavorite={async (id) => {
                    if (!requirePet()) return;
                    try {
                      const result = await toggleMobileFavorite(id, "product");
                      setFavorites((current) =>
                        result.favorite
                          ? [...new Set([...current, id])]
                          : current.filter((item) => item !== id),
                      );
                    } catch (cause) {
                      notify(
                        cause instanceof Error
                          ? cause.message
                          : "Favorit belum dapat diperbarui",
                      );
                    }
                  }}
                  intent={marketplaceIntent}
                />
              ) : null}
              {tab === "world" ? (
                <WorldScreen
                  refreshVersion={refreshVersion}
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  owner={bootstrap?.user}
                  petName={pet?.name}
                  pet={pet}
                  hasPet={hasPet}
                  onLogin={() => setLoginOpen(true)}
                  onRequirePet={() => {
                    requirePet();
                  }}
                  intent={worldIntent}
                />
              ) : null}
              {tab === "activity" ? (
                <ActivityScreen
                  authenticated={Boolean(bootstrap)}
                  refreshVersion={refreshVersion}
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  onLogin={() => setLoginOpen(true)}
                  hasPet={hasPet}
                  onRequirePet={() => {
                    requirePet();
                  }}
                  onCreateBooking={() => {
                    if (requirePet()) navigateTo("discover");
                  }}
                  onCreateOrder={() => {
                    if (requirePet()) openMarketplace();
                  }}
                  onCreateConsultation={() => {
                    if (requirePet()) openConsultation();
                  }}
                  onRebook={(serviceId) => {
                    if (requirePet()) rebookService(serviceId);
                  }}
                  onReorder={(items) => {
                    if (requirePet()) reorderProducts(items);
                  }}
                  onReconsult={(itemId) => {
                    if (requirePet()) openConsultation(itemId);
                  }}
                  onOpenProduct={openMarketplace}
                />
              ) : null}
              {tab === "health" ? (
                <HealthScreen
                  onAction={notify}
                  onBook={() => openBooking()}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  pet={pet}
                  records={records}
                  loading={recordsLoading}
                />
              ) : null}
              {tab === "community" ? (
                <CommunityScreen
                  refreshVersion={refreshVersion}
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  owner={bootstrap?.user}
                  pet={pet}
                  hasPet={hasPet}
                  onLogin={() => setLoginOpen(true)}
                  onRequirePet={() => {
                    requirePet();
                  }}
                />
              ) : null}
              {tab === "profile" ? (
                <ProfileScreen
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  onOpenSupport={openSupportChat}
                  owner={bootstrap?.user}
                  pets={bootstrap?.pets ?? []}
                  petCount={pets.length}
                  activityCount={bootstrap?.activities.length ?? 0}
                  points={bootstrap?.points.balance ?? 0}
                  rewardFormula={bootstrap?.points.formula}
                  onLogin={() => setLoginOpen(true)}
                  onLogout={async () => {
                    await logoutMobile();
                    setBootstrap(undefined);
                    setRecords([]);
                    navigateTo("home", true);
                    notify("Sesi berhasil diakhiri");
                  }}
                />
              ) : null}
            </Animated.View>

            <View style={[styles.tabBar, { bottom: navigationBottom }]}>
              {bottomTabs.map((item) => {
                const active = item.id === tab;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="tab"
                    accessibilityLabel={item.label}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      setMoreOpen(false);
                      navigateTo(item.id);
                    }}
                    style={({ pressed }) => [
                      styles.tabItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[styles.tabIcon, active && styles.activeTabIcon]}
                    >
                      <Ionicons
                        name={active ? item.activeIcon : item.icon}
                        size={22}
                        color={active ? colors.sky600 : colors.muted}
                      />
                      {item.id === "activity" &&
                      Boolean(bootstrap?.activities.length) ? (
                        <View style={styles.activityDot} />
                      ) : null}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[styles.tabLabel, active && styles.activeTabLabel]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel="Fitur lainnya"
                accessibilityState={{
                  selected:
                    moreOpen || moreTabs.some((item) => item.id === tab),
                }}
                onPress={() => setMoreOpen(true)}
                style={({ pressed }) => [
                  styles.tabItem,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.tabIcon,
                    (moreOpen || moreTabs.some((item) => item.id === tab)) &&
                      styles.activeTabIcon,
                  ]}
                >
                  <Ionicons
                    name={
                      moreOpen || moreTabs.some((item) => item.id === tab)
                        ? "grid"
                        : "grid-outline"
                    }
                    size={22}
                    color={
                      moreOpen || moreTabs.some((item) => item.id === tab)
                        ? colors.sky600
                        : "#8294A5"
                    }
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tabLabel,
                    (moreOpen || moreTabs.some((item) => item.id === tab)) &&
                      styles.activeTabLabel,
                  ]}
                >
                  Lainnya
                </Text>
              </Pressable>
            </View>
          </View>
        </AppSurfaceProvider>
      </SafeAreaView>

      <MoreModal
        visible={moreOpen}
        activeTab={tab}
        authenticated={Boolean(bootstrap)}
        onClose={() => setMoreOpen(false)}
        onSelect={(next) => {
          navigateTo(next);
          setMoreOpen(false);
        }}
      />
      <NotificationModal
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        items={bootstrap?.notifications ?? []}
        onRead={async (item) => {
          if (!bootstrap) return;
          try {
            await readMobileNotification(item.id);
            setBootstrap((current) =>
              current
                ? {
                    ...current,
                    notifications: current.notifications.map((value) =>
                      value.id === item.id
                        ? { ...value, read_at: new Date().toISOString() }
                        : value,
                    ),
                  }
                : current,
            );
          } catch (cause) {
            notify(
              cause instanceof Error
                ? cause.message
                : "Notifikasi belum dapat dibuka",
            );
          }
        }}
        onReadAll={async () => {
          if (!bootstrap) return;
          await readAllMobileNotifications();
          setBootstrap((current) =>
            current
              ? {
                  ...current,
                  notifications: current.notifications.map((item) => ({
                    ...item,
                    read_at: item.read_at || new Date().toISOString(),
                  })),
                }
              : current,
          );
        }}
        onOpenTarget={(item) => {
          const route = (String(item.action_route ?? "")
            .split("?")[0] ?? "")
            .split("/")
            .filter(Boolean)
            .at(-1) ?? "home";
          setNotificationsOpen(false);
          if (route === "consult") {
            openConsultation();
          } else {
            navigateTo(searchRouteTabs[route] ?? "home");
          }
          notify(`Membuka ${item.title}`);
        }}
      />
      <SlivaCareModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        onAction={notify}
        owner={bootstrap?.user}
        pet={pet}
        onLogin={() => setLoginOpen(true)}
        context={chatContext}
      />
      {selectedService && bookingOpen ? (
        <BookingModal
          visible={bookingOpen}
          service={selectedService}
          pet={pet}
          busy={submitting}
          onClose={() => setBookingOpen(false)}
          onDone={async (input) => {
            if (!pet) return;
            setSubmitting(true);
            try {
              const result = await createMobileBooking({
                pet_id: pet.id,
                service_id: selectedService.id,
                branch_id: selectedService.branchId,
                scheduled_at: input.scheduled_at,
                notes: input.notes,
              });
              if (result.amount > 0)
                setPayment(
                  await createMobilePaymentIntent(
                    "petowner_booking",
                    result.id,
                    input.payment_method,
                  ),
                );
              else {
                await refreshAccount();
                navigateTo("activity");
                notify(result.message);
              }
              setBookingOpen(false);
            } catch (cause) {
              notify(
                cause instanceof Error
                  ? cause.message
                  : "Booking atau pembayaran belum dapat dibuat",
              );
            } finally {
              setSubmitting(false);
            }
          }}
        />
      ) : null}
      <MobileBatpayModal
        payment={payment}
        onClose={() => setPayment(undefined)}
        onPaid={() => {
          void refreshAccount().then(() => {
            navigateTo("activity");
            notify("Pembayaran berhasil, booking sudah dikonfirmasi");
          });
        }}
      />
      <LoginModal
        visible={loginOpen}
        busy={submitting}
        onClose={() => setLoginOpen(false)}
        onSubmit={async (email, password) => {
          setSubmitting(true);
          try {
            await loginMobile(email, password);
            await refreshAccount();
            setLoginOpen(false);
            notify("Login berhasil");
          } catch (cause) {
            notify(cause instanceof Error ? cause.message : "Login gagal");
          } finally {
            setSubmitting(false);
          }
        }}
        onRegister={async (input) => {
          setSubmitting(true);
          try {
            const result = await registerMobileOwner(input);
            notify(
              "OTP dikirim ke email. Masukkan kode untuk mengaktifkan akun.",
            );
            return result;
          } catch (cause) {
            notify(cause instanceof Error ? cause.message : "Registrasi gagal");
            throw cause;
          } finally {
            setSubmitting(false);
          }
        }}
        onVerify={async (email, otp) => {
          setSubmitting(true);
          try {
            const result = await verifyMobileRegistrationOTP(email, otp);
            notify(result.message);
            return result;
          } catch (cause) {
            notify(cause instanceof Error ? cause.message : "OTP tidak valid");
            throw cause;
          } finally {
            setSubmitting(false);
          }
        }}
        onResend={async (email) => {
          setSubmitting(true);
          try {
            const result = await resendMobileRegistrationOTP(email);
            notify(result.message);
            return result;
          } catch (cause) {
            notify(cause instanceof Error ? cause.message : "OTP belum terkirim");
            throw cause;
          } finally {
            setSubmitting(false);
          }
        }}
      />
      {toast ? (
        <View style={[styles.toast, { bottom: navigationBottom + 88 }]}>
          <View style={styles.toastCheck}>
            <Ionicons name="checkmark" size={13} color={colors.white} />
          </View>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </>
  );
}

function SheetHeader({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
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
        hitSlop={6}
        onPress={onClose}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={21} color={colors.text} />
      </Pressable>
    </View>
  );
}

function notificationCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    health: "Kesehatan",
    booking: "Booking",
    event: "Event",
    community: "Komunitas",
    points: "Points",
  };
  return labels[category] ?? category;
}

function notificationVisual(category: string): {
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  color: string;
} {
  if (category === "health") {
    return { icon: "pulse-outline", backgroundColor: colors.mint50, color: colors.mint };
  }
  if (category === "booking") {
    return { icon: "calendar-outline", backgroundColor: colors.sky50, color: colors.sky600 };
  }
  if (category === "event") {
    return { icon: "ticket-outline", backgroundColor: colors.violet50, color: "#6757C9" };
  }
  if (category === "community") {
    return { icon: "chatbubble-ellipses-outline", backgroundColor: colors.pink50, color: "#A52C65" };
  }
  if (category === "points") {
    return { icon: "sparkles", backgroundColor: colors.yellow50, color: colors.yellow };
  }
  return { icon: "notifications-outline", backgroundColor: colors.sky50, color: colors.sky600 };
}

function formatNotificationTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MoreModal({
  visible,
  activeTab,
  authenticated,
  onClose,
  onSelect,
}: {
  visible: boolean;
  activeTab: Tab;
  authenticated: boolean;
  onClose: () => void;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <SafeAreaView style={styles.moreSheetWrap}>
          <Pressable
            style={styles.moreSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <SheetHeader
              eyebrow="SEMUA FITUR SLIVADOC"
              title="Mau ke mana?"
              onClose={onClose}
            />
            <View style={styles.moreGrid}>
              {moreTabs.map((item) => {
                const active = item.id === activeTab;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => onSelect(item.id)}
                    style={({ pressed }) => [
                      styles.moreCard,
                      active && styles.moreCardActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.moreCardIcon,
                        active && styles.moreCardIconActive,
                      ]}
                    >
                      <Ionicons
                        name={active ? item.activeIcon : item.icon}
                        size={25}
                        color={active ? colors.white : colors.sky600}
                      />
                    </View>
                    <Text
                      style={[
                        styles.moreCardLabel,
                        active && styles.moreCardLabelActive,
                      ]}
                    >
                      {item.id === "profile" && !authenticated ? "Masuk" : ""}
                      {item.id === "profile" && !authenticated
                        ? " ke akun"
                        : item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

function NotificationModal({
  visible,
  onClose,
  items,
  onRead,
  onReadAll,
  onOpenTarget,
}: {
  visible: boolean;
  onClose: () => void;
  items: MobileNotification[];
  onRead: (item: MobileNotification) => void | Promise<void>;
  onReadAll: () => void | Promise<void>;
  onOpenTarget: (item: MobileNotification) => void;
}) {
  const { locale } = useI18n();
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const categories = [...new Set(items.map((item) => item.category))];
  const visibleItems = category
    ? items.filter((item) => item.category === category)
    : items;
  const unreadCount = visibleItems.filter((item) => !item.read_at).length;
  const selected = items.find((item) => item.id === selectedId);
  const close = () => {
    setSelectedId("");
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable style={styles.modalBackdrop} onPress={close}>
        <SafeAreaView edges={["bottom", "left", "right"]} style={styles.notificationSheetWrap}>
          <Pressable
            style={styles.notificationSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <SheetHeader
              eyebrow={selected ? "DETAIL UPDATE" : "UPDATE TERBARU"}
              title={selected ? "Detail notifikasi" : "Notifikasi"}
              onClose={close}
            />
            {selected ? (
              <ScrollView style={styles.notificationDetailScroll} contentContainerStyle={styles.notificationDetailContent} showsVerticalScrollIndicator={false}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedId("")}
                  style={({ pressed }) => [styles.notificationBack, pressed && styles.pressed]}
                >
                  <Ionicons name="arrow-back" size={15} color={colors.sky600}/>
                  <Text style={styles.notificationBackText}>Kembali ke semua update</Text>
                </Pressable>
                {(() => {
                  const visual = notificationVisual(selected.category);
                  return <View style={styles.notificationDetailCard}>
                    <View style={styles.notificationDetailTop}>
                      <View style={[styles.notificationDetailIcon, { backgroundColor: visual.backgroundColor }]}><Ionicons name={visual.icon} size={24} color={visual.color}/></View>
                      <View style={styles.notificationDetailTopCopy}><Text style={styles.notificationDetailCategory}>{notificationCategoryLabel(selected.category)}</Text><View style={styles.notificationDetailStatus}><Ionicons name="checkmark-done" size={12} color="#13856F"/><Text style={styles.notificationDetailStatusText}>{selected.read_at ? "Sudah dibaca" : "Menandai dibaca…"}</Text></View></View>
                    </View>
                    <Text style={styles.notificationDetailTitle}>{selected.title}</Text>
                    <Text style={styles.notificationDetailBody}>{selected.body}</Text>
                    <View style={styles.notificationDetailMeta}><View style={styles.notificationDetailMetaRow}><Ionicons name="time-outline" size={15} color={colors.muted}/><View><Text style={styles.notificationDetailMetaLabel}>Diterima</Text><Text style={styles.notificationDetailMetaValue}>{formatNotificationTime(selected.created_at, locale)}</Text></View></View><View style={styles.notificationDetailMetaRow}><Ionicons name="pricetag-outline" size={15} color={colors.muted}/><View><Text style={styles.notificationDetailMetaLabel}>Kategori</Text><Text style={styles.notificationDetailMetaValue}>{notificationCategoryLabel(selected.category)}</Text></View></View></View>
                    {selected.action_route ? <Pressable accessibilityRole="button" onPress={() => onOpenTarget(selected)} style={({ pressed }) => [styles.notificationDetailAction, pressed && styles.pressed]}><Text style={styles.notificationDetailActionText}>Buka halaman terkait</Text><Ionicons name="arrow-forward" size={16} color={colors.white}/></Pressable> : null}
                  </View>;
                })()}
                <View style={styles.notificationDetailInfo}><Ionicons name="shield-checkmark-outline" size={16} color={colors.sky600}/><Text style={styles.notificationDetailInfoText}>Update ini tersimpan di pusat notifikasi akunmu dan dapat dibuka lagi kapan saja.</Text></View>
              </ScrollView>
            ) : (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.notificationFilters} contentContainerStyle={styles.notificationFiltersContent}>
                  <Pressable accessibilityRole="button" onPress={() => setCategory("")} style={({ pressed }) => [styles.notificationFilter, !category && styles.notificationFilterActive, pressed && styles.pressed]}><Text style={[styles.notificationFilterText, !category && styles.notificationFilterTextActive]}>Semua</Text></Pressable>
                  {categories.map((value) => <Pressable accessibilityRole="button" key={value} onPress={() => setCategory(value)} style={({ pressed }) => [styles.notificationFilter, category === value && styles.notificationFilterActive, pressed && styles.pressed]}><Text style={[styles.notificationFilterText, category === value && styles.notificationFilterTextActive]}>{notificationCategoryLabel(value)}</Text></Pressable>)}
                </ScrollView>
                <View style={styles.notificationToolbar}>
                  <View style={styles.notificationSummary}><View style={styles.notificationSummaryIcon}><Ionicons name="mail-unread-outline" size={14} color={colors.sky600}/></View><View><Text style={styles.notificationSummaryTitle}>{visibleItems.length} update</Text><Text style={styles.notificationSummaryNote}>{unreadCount} belum dibaca</Text></View></View>
                  <Pressable accessibilityRole="button" disabled={!items.some((item) => !item.read_at)} onPress={() => void onReadAll()} style={({ pressed }) => [styles.markReadButton, !items.some((item) => !item.read_at) && styles.markReadButtonDisabled, pressed && styles.pressed]}><Ionicons name="checkmark-done" size={14} color={colors.sky600}/><Text style={styles.markRead}>Tandai dibaca</Text></Pressable>
                </View>
                <ScrollView style={styles.notificationList} contentContainerStyle={styles.notificationListContent} showsVerticalScrollIndicator={false}>
                  {visibleItems.length ? visibleItems.map((item) => {
                    const visual = notificationVisual(item.category);
                    return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        void onRead(item);
                        setSelectedId(item.id);
                      }}
                      style={({ pressed }) => [styles.notification, !item.read_at && styles.notificationUnread, pressed && styles.pressed]}
                    >
                      <View style={[styles.notificationIcon, { backgroundColor: visual.backgroundColor }]}>
                        <Ionicons name={visual.icon} size={19} color={visual.color} />
                      </View>
                      <View style={styles.notificationCopy}>
                        <View style={styles.notificationHeadline}>
                          <Text numberOfLines={2} style={styles.notificationTitle}>{item.title}</Text>
                          {!item.read_at ? <View style={styles.unreadDot} /> : null}
                        </View>
                        <Text numberOfLines={3} style={styles.notificationNote}>{item.body}</Text>
                        <View style={styles.notificationTimeRow}><Ionicons name="time-outline" size={11} color={colors.muted}/><Text style={styles.notificationTime}>{formatNotificationTime(item.created_at, locale)}</Text><Text style={styles.notificationDetailHint}>Lihat detail</Text><Ionicons name="chevron-forward" size={12} color={colors.sky600}/></View>
                      </View>
                    </Pressable>
                  );
                  }) : <View style={styles.notificationEmpty}><View style={styles.notificationEmptyIcon}><Ionicons name="notifications-off-outline" size={24} color={colors.sky600}/></View><Text style={styles.notificationEmptyTitle}>Belum ada update</Text><Text style={styles.notificationEmptyNote}>Notifikasi pada kategori ini akan muncul di sini.</Text></View>}
                </ScrollView>
              </>
            )}
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

function LoginModal({
  visible,
  busy,
  onClose,
  onSubmit,
  onRegister,
  onVerify,
  onResend,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (email: string, password: string) => void | Promise<void>;
  onRegister: (input: {
    full_name: string;
    phone: string;
    email: string;
    password: string;
  }) => Promise<{ development_otp?: string }>;
  onVerify: (email: string, otp: string) => Promise<{ message: string }>;
  onResend: (
    email: string,
  ) => Promise<{ message: string; development_otp?: string }>;
}) {
  const [mode, setMode] = useState<"login" | "register" | "verify">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOTP] = useState("");
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [policy, setPolicy] = useState<"terms" | "privacy" | null>(null);
  const passwordValid = /(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}/.test(
    password,
  );
  const registrationValid =
    name.trim().length >= 3 && /^0[0-9]{8,15}$/.test(phone) && terms && privacy;
  const canSubmit =
    !busy &&
    email.includes("@") &&
    (mode === "verify"
      ? otp.length === 6
      : passwordValid && (mode === "login" || registrationValid));
  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <SafeAreaView style={styles.loginSheetWrap}>
            <Pressable
              style={styles.loginSheet}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.sheetHandle} />
              <SheetHeader
                eyebrow="SLIVADOC · PET OWNER"
                title={
                  mode === "login"
                    ? "Senang melihatmu kembali"
                    : mode === "register"
                      ? "Mulai perjalanan pet parent"
                      : "Verifikasi email kamu"
                }
                onClose={onClose}
              />
              <View style={styles.loginTabs}>
                <Pressable
                  onPress={() => setMode("login")}
                  style={[
                    styles.loginTab,
                    mode === "login" && styles.loginTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.loginTabText,
                      mode === "login" && styles.loginTabTextActive,
                    ]}
                  >
                    Masuk
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode("register")}
                  style={[
                    styles.loginTab,
                    mode === "register" && styles.loginTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.loginTabText,
                      mode === "register" && styles.loginTabTextActive,
                    ]}
                  >
                    Daftar
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {mode === "verify" ? (
                  <>
                    <Text style={styles.loginHint}>
                      Masukkan 6 digit OTP yang dikirim ke {email.trim()}.
                    </Text>
                    <Text style={styles.fieldLabel}>Kode OTP</Text>
                    <TextInput
                      autoFocus
                      autoComplete="sms-otp"
                      keyboardType="number-pad"
                      value={otp}
                      onChangeText={(value) =>
                        setOTP(value.replace(/\D/g, "").slice(0, 6))
                      }
                      maxLength={6}
                      style={styles.loginInput}
                      placeholder="000000"
                    />
                  </>
                ) : (
                  <>
                    {mode === "register" ? (
                      <>
                        <Text style={styles.fieldLabel}>Nama lengkap</Text>
                        <TextInput
                          value={name}
                          onChangeText={setName}
                          style={styles.loginInput}
                          placeholder="Nama sesuai identitas"
                        />
                        <Text style={styles.fieldLabel}>WhatsApp</Text>
                        <TextInput
                          keyboardType="phone-pad"
                          value={phone}
                          onChangeText={(value) =>
                            setPhone(value.replace(/\D/g, "").slice(0, 16))
                          }
                          maxLength={16}
                          style={styles.loginInput}
                          placeholder="08xxxxxxxxxx"
                        />
                        <Text style={styles.loginHint}>
                          Harus diawali angka 0, tanpa spasi atau simbol.
                        </Text>
                      </>
                    ) : null}
                    <Text style={styles.fieldLabel}>Email</Text>
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      style={styles.loginInput}
                      placeholder="petparent@email.com"
                    />
                    <Text style={styles.fieldLabel}>Password</Text>
                    <View style={styles.loginPassword}>
                      <TextInput
                        secureTextEntry={!show}
                        value={password}
                        onChangeText={setPassword}
                        style={styles.loginPasswordInput}
                        placeholder="Minimal 8 karakter"
                      />
                      <Pressable
                        onPress={() => setShow((value) => !value)}
                        style={styles.attach}
                      >
                        <Ionicons
                          name={show ? "eye-off-outline" : "eye-outline"}
                          size={19}
                          color={colors.sky600}
                        />
                      </Pressable>
                    </View>
                    <Text style={styles.loginHint}>
                      Gunakan kombinasi huruf, angka, dan simbol.
                    </Text>
                    {mode === "register" ? (
                      <View style={styles.mobileConsents}>
                        <Pressable
                          onPress={() => setTerms((value) => !value)}
                          style={styles.mobileConsent}
                        >
                          <Ionicons
                            name={terms ? "checkbox" : "square-outline"}
                            size={22}
                            color={terms ? colors.sky600 : colors.muted}
                          />
                          <Text style={styles.mobileConsentText}>
                            Saya menyetujui{" "}
                            <Text
                              onPress={() => setPolicy("terms")}
                              style={styles.legalLink}
                            >
                              Syarat dan Ketentuan
                            </Text>
                            .
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setPrivacy((value) => !value)}
                          style={styles.mobileConsent}
                        >
                          <Ionicons
                            name={privacy ? "checkbox" : "square-outline"}
                            size={22}
                            color={privacy ? colors.sky600 : colors.muted}
                          />
                          <Text style={styles.mobileConsentText}>
                            Saya menyetujui{" "}
                            <Text
                              onPress={() => setPolicy("privacy")}
                              style={styles.legalLink}
                            >
                              Kebijakan Privasi
                            </Text>
                            .
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                )}
                <PrimaryButton
                  label={
                    busy
                      ? "Memproses…"
                      : mode === "login"
                        ? "Masuk ke Slivadoc"
                        : mode === "verify"
                          ? "Verifikasi & aktifkan akun"
                          : "Daftar & kirim OTP"
                  }
                  icon={
                    mode === "login"
                      ? "log-in-outline"
                      : mode === "verify"
                        ? "checkmark-circle-outline"
                        : "person-add-outline"
                  }
                  onPress={() => {
                    if (!canSubmit) return;
                    if (mode === "login") void onSubmit(email.trim(), password);
                    else if (mode === "verify")
                      void onVerify(email.trim(), otp)
                        .then(() => {
                          setMode("login");
                          setOTP("");
                          setPassword("");
                        })
                        .catch(() => undefined);
                    else
                      void onRegister({
                        full_name: name.trim(),
                        phone,
                        email: email.trim(),
                        password,
                      })
                        .then((result) => {
                          setOTP(result.development_otp ?? "");
                          setMode("verify");
                        })
                        .catch(() => undefined);
                  }}
                  style={{ marginTop: 18, opacity: canSubmit ? 1 : 0.48 }}
                />
                {mode === "verify" ? (
                  <Pressable
                    disabled={busy}
                    onPress={() =>
                      void onResend(email.trim())
                        .then((result) => {
                          if (result.development_otp)
                            setOTP(result.development_otp);
                        })
                        .catch(() => undefined)
                    }
                  >
                    <Text style={styles.markRead}>Kirim ulang OTP</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
      {policy ? (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setPolicy(null)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setPolicy(null)}
          >
            <SafeAreaView style={styles.legalSheetWrap}>
              <Pressable
                style={styles.legalSheet}
                onPress={(event) => event.stopPropagation()}
              >
                <View style={styles.sheetHandle} />
                <SheetHeader
                  eyebrow="LEGAL · SLIVADOC"
                  title={
                    policy === "terms"
                      ? "Syarat dan Ketentuan"
                      : "Kebijakan Privasi"
                  }
                  onClose={() => setPolicy(null)}
                />
                <ScrollView>
                  <Text style={styles.legalBody}>
                    {policy === "terms"
                      ? "Slivadoc membantu pet parent mengelola profil pet, booking, transaksi, komunitas, Petship, dan layanan mitra. Data wajib benar; penggunaan yang membahayakan hewan, menipu, atau melanggar privasi dapat dimoderasi. Informasi kesehatan tidak menggantikan pemeriksaan dokter hewan. Detail biaya dan pembatalan ditampilkan sebelum konfirmasi."
                      : "Slivadoc memproses identitas akun, profil pet, catatan layanan, preferensi, dan data perangkat untuk autentikasi, personalisasi, transaksi, keamanan, serta dukungan. Petship hanya membagikan lokasi tempat, bukan koordinat personal. Akses data dibatasi berdasarkan peran dan aktivitas penting dicatat untuk audit."}
                  </Text>
                </ScrollView>
                <PrimaryButton
                  label="Saya mengerti"
                  icon="checkmark-circle-outline"
                  onPress={() => setPolicy(null)}
                />
              </Pressable>
            </SafeAreaView>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

function BookingModal({
  visible,
  service,
  pet,
  busy,
  onClose,
  onDone,
}: {
  visible: boolean;
  service: Service;
  pet?: PetView;
  busy: boolean;
  onClose: () => void;
  onDone: (input: {
    scheduled_at: string;
    notes: string;
    payment_method: string;
  }) => void | Promise<void>;
}) {
  const { formatDate } = useI18n();
  const [step, setStep] = useState(1);
  const toDate = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const dates = Array.from({ length: 5 }, (_, index) => {
    const value = new Date();
    value.setDate(value.getDate() + index + 1);
    return value;
  });
  const [date, setDate] = useState(() => toDate(dates[0] ?? new Date()));
  const [time, setTime] = useState("16.00");
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [notes, setNotes] = useState("");
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.bookingWrap}>
          <View style={styles.bookingSheet}>
            <View style={styles.sheetHandle} />
            <SheetHeader
              eyebrow="BOOKING LAYANAN"
              title={service.name}
              onClose={onClose}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.bookingContent}
            >
              <View style={styles.stepper}>
                {[1, 2, 3].map((item) => (
                  <View key={item} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        step >= item && styles.activeStep,
                      ]}
                    >
                      {step > item ? (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={colors.white}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.stepNumber,
                            step >= item && styles.activeStepNumber,
                          ]}
                        >
                          {item}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        step >= item && styles.activeStepLabel,
                      ]}
                    >
                      {item === 1
                        ? "Layanan"
                        : item === 2
                          ? "Jadwal"
                          : "Konfirmasi"}
                    </Text>
                  </View>
                ))}
              </View>
              {step === 1 ? (
                <View>
                  <Text style={styles.fieldLabel}>Pilih hewan</Text>
                  <View style={styles.selectedPet}>
                    <Text style={styles.selectedPetEmoji}>
                      {pet?.icon || "🐾"}
                    </Text>
                    <View style={styles.selectedPetCopy}>
                      <Text style={styles.selectedPetName}>
                        {pet?.name || "Pet"}
                      </Text>
                      <Text style={styles.selectedPetMeta}>
                        {pet?.breed || "Profil pet"} • {pet?.weight || "—"}
                      </Text>
                    </View>
                    <View style={styles.selectedCheck}>
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.white}
                      />
                    </View>
                  </View>
                  <Text style={styles.fieldLabel}>Layanan yang dipilih</Text>
                  <View style={styles.selectedService}>
                    <Text style={styles.serviceOptionEmoji}>
                      {service.icon}
                    </Text>
                    <View style={styles.serviceOptionCopy}>
                      <Text style={styles.serviceOptionName}>
                        {service.name}
                      </Text>
                      <Text style={styles.serviceOptionNote}>
                        {service.address}
                      </Text>
                    </View>
                    <Text style={styles.serviceOptionPrice}>
                      {service.price}
                    </Text>
                  </View>
                </View>
              ) : null}
              {step === 2 ? (
                <View>
                  <Text style={styles.fieldLabel}>Pilih tanggal</Text>
                  <View style={styles.dateRow}>
                    {dates.map((item) => {
                      const value = toDate(item);
                      return (
                        <Pressable
                          key={value}
                          onPress={() => setDate(value)}
                          style={[
                            styles.dateOption,
                            date === value && styles.activeDate,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dateDay,
                              date === value && styles.activeDateText,
                            ]}
                          >
                            {formatDate(item, { weekday: "short" }).toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              styles.dateNumber,
                              date === value && styles.activeDateText,
                            ]}
                          >
                            {item.getDate()}
                          </Text>
                          <Text
                            style={[
                              styles.dateMonth,
                              date === value && styles.activeDateText,
                            ]}
                          >
                            {formatDate(item, { month: "short" })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text style={styles.fieldLabel}>Pilih waktu</Text>
                  <View style={styles.timeGrid}>
                    {["09.00", "10.30", "13.00", "14.30", "16.00", "17.30"].map(
                      (item) => (
                        <Pressable
                          key={item}
                          onPress={() => setTime(item)}
                          style={[
                            styles.timeOption,
                            time === item && styles.activeTime,
                          ]}
                        >
                          <Text
                            style={[
                              styles.timeText,
                              time === item && styles.activeTimeText,
                            ]}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                  <Text style={styles.fieldLabel}>Catatan khusus</Text>
                  <TextInput
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                    maxLength={1000}
                    placeholder="Ceritakan keluhan atau hal penting..."
                    placeholderTextColor={colors.muted}
                    style={styles.notes}
                  />
                </View>
              ) : null}
              {step === 3 ? (
                <View>
                  <View style={styles.bookingSummary}>
                    <View style={styles.summaryIcon}>
                      <Text>{service.icon}</Text>
                    </View>
                    <View style={styles.summaryCopy}>
                      <Pill tone="mint">TERSEDIA UNTUK BOOKING</Pill>
                      <Text style={styles.summaryName}>{service.name}</Text>
                      <Text style={styles.summaryAddress}>
                        {service.address}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summaryLines}>
                    <SummaryLine
                      label="Hewan"
                      value={`${pet?.icon || "🐾"} ${pet?.name || "Pet"}`}
                    />
                    <SummaryLine label="Layanan" value={service.name} />
                    <SummaryLine
                      label="Jadwal"
                      value={`${formatDate(new Date(`${date}T12:00:00`))} • ${time} WIB`}
                    />
                    <SummaryLine
                      label="Total pembayaran"
                      value={service.price}
                      total
                    />
                  </View>
                  {service.priceValue > 0 ? (
                    <MobilePaymentMethods
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      disabled={busy}
                    />
                  ) : null}
                </View>
              ) : null}
              <View style={styles.bookingFooter}>
                <SoftButton
                  label={step === 1 ? "Batal" : "Kembali"}
                  onPress={() =>
                    busy
                      ? undefined
                      : step === 1
                        ? onClose()
                        : setStep(step - 1)
                  }
                  style={styles.footerButton}
                />
                <PrimaryButton
                  label={
                    busy
                      ? "Memproses…"
                      : step < 3
                        ? "Lanjutkan"
                        : service.priceValue > 0
                          ? "Lanjut bayar"
                          : "Konfirmasi booking"
                  }
                  icon="arrow-forward"
                  onPress={() => {
                    if (busy) return;
                    if (step < 3) {
                      setStep(step + 1);
                      return;
                    }
                    const [hour, minute] = time.split(".");
                    void onDone({
                      scheduled_at: new Date(
                        `${date}T${hour}:${minute}:00`,
                      ).toISOString(),
                      notes,
                      payment_method: paymentMethod,
                    });
                  }}
                  style={[styles.footerButton, { opacity: busy ? 0.65 : 1 }]}
                />
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function SummaryLine({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <View style={[styles.summaryLine, total && styles.summaryTotal]}>
      <Text style={styles.summaryLineLabel}>{label}</Text>
      <Text
        style={[styles.summaryLineValue, total && styles.summaryTotalValue]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brandLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 28,
    backgroundColor: colors.canvas,
  },
  brandLoadingMark: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 32,
    backgroundColor: colors.white,
    ...shadow,
  },
  brandLoadingLogo: { width: 88, height: 88 },
  brandLoadingTitle: {
    marginTop: 8,
    color: colors.navy,
    fontSize: typography.sectionTitle,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  brandLoadingCopy: {
    maxWidth: 310,
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 23,
    textAlign: "center",
  },
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  app: { flex: 1, backgroundColor: colors.canvas },
  screenStage: { flex: 1 },
  backBar: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.canvas,
  },
  backButton: {
    minWidth: 96,
    minHeight: 40,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 7,
    borderRadius: 12,
  },
  backText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  tabBar: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#DCEAF2",
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.98)",
    ...shadow,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 16,
  },
  tabIcon: {
    position: "relative",
    width: 36,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  activeTabIcon: { backgroundColor: colors.sky50 },
  tabLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  activeTabLabel: { color: colors.sky600, fontWeight: "900" },
  activityDot: {
    position: "absolute",
    right: 6,
    top: 2,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.white,
    backgroundColor: colors.red,
  },
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    ...shadow,
  },
  toastCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint,
  },
  toastText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(14,32,55,.42)",
  },
  sheetWrap: { maxHeight: "88%" },
  sheet: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  notificationSheetWrap: {
    height: "86%",
    overflow: "hidden",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
    shadowColor: "#173C57",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -5 },
    elevation: 8,
  },
  notificationSheet: { flex: 1, paddingHorizontal: 16, paddingBottom: 4 },
  moreSheetWrap: { maxHeight: "84%" },
  moreSheet: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  moreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 14 },
  moreCard: {
    width: "31%",
    minHeight: 94,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: "#FBFDFE",
  },
  moreCardActive: { borderColor: colors.sky400, backgroundColor: colors.sky50 },
  moreCardIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.sky50,
  },
  moreCardIconActive: { backgroundColor: colors.sky600 },
  moreCardLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
    textAlign: "center",
  },
  moreCardLabelActive: { color: colors.sky600 },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 9,
    marginBottom: 10,
    borderRadius: 3,
    backgroundColor: "#DCE5EB",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetHeaderCopy: { minWidth: 0, flex: 1 },
  sheetEyebrow: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sheetTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "900",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  notificationFilters: { flexGrow: 0, marginTop: 11 },
  notificationFiltersContent: { gap: 7, paddingBottom: 4 },
  notificationFilter: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    backgroundColor: "#FAFCFE",
  },
  notificationFilterActive: { borderColor: "#BCEBDD", backgroundColor: colors.mint50 },
  notificationFilterText: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  notificationFilterTextActive: { color: "#13856F", fontWeight: "900" },
  notificationToolbar: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 7,
    marginBottom: 8,
  },
  notificationSummary: { minWidth: 0, flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  notificationSummaryIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.sky50 },
  notificationSummaryTitle: { color: colors.navy, fontSize: 11, fontWeight: "900" },
  notificationSummaryNote: { marginTop: 1, color: colors.muted, fontSize: 9 },
  markReadButton: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.sky50 },
  markReadButtonDisabled: { opacity: 0.45 },
  markRead: { color: colors.sky600, fontSize: 10, fontWeight: "900" },
  notificationList: { flex: 1 },
  notificationListContent: { gap: 8, paddingBottom: 12 },
  notification: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    backgroundColor: "#FCFEFF",
  },
  notificationUnread: { borderColor: colors.sky100, backgroundColor: "#F6FBFF" },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: { minWidth: 0, flex: 1 },
  notificationHeadline: { minWidth: 0, flexDirection: "row", alignItems: "flex-start", gap: 7 },
  notificationTitle: { minWidth: 0, flex: 1, color: colors.navy, fontSize: 12, lineHeight: 16, fontWeight: "900" },
  notificationNote: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  notificationTimeRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  notificationTime: { color: colors.muted, fontSize: 9 },
  notificationDetailHint: { flex: 1, color: colors.sky600, fontSize: 9, fontWeight: "800", textAlign: "right" },
  unreadDot: {
    marginTop: 4,
    width: 7,
    height: 7,
    flexShrink: 0,
    borderRadius: 4,
    backgroundColor: colors.sky600,
  },
  notificationEmpty: { minHeight: 260, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  notificationEmptyIcon: { width: 54, height: 54, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.sky50 },
  notificationEmptyTitle: { marginTop: 10, color: colors.navy, fontSize: typography.cardTitle, fontWeight: "900" },
  notificationEmptyNote: { maxWidth: 260, marginTop: 4, color: colors.muted, fontSize: typography.caption, lineHeight: 15, textAlign: "center" },
  notificationDetailScroll: { flex: 1 },
  notificationDetailContent: { paddingTop: 12, paddingBottom: 18 },
  notificationBack: { alignSelf: "flex-start", minHeight: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.sky50 },
  notificationBackText: { color: colors.sky600, fontSize: 10, fontWeight: "900" },
  notificationDetailCard: { marginTop: 12, padding: 15, borderWidth: 1, borderColor: colors.sky100, borderRadius: 20, backgroundColor: "#FCFEFF", ...shadow },
  notificationDetailTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  notificationDetailIcon: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 17 },
  notificationDetailTopCopy: { minWidth: 0, flex: 1, alignItems: "flex-start" },
  notificationDetailCategory: { color: colors.sky600, fontSize: 9, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  notificationDetailStatus: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.mint50 },
  notificationDetailStatusText: { color: "#13856F", fontSize: 8, fontWeight: "900" },
  notificationDetailTitle: { marginTop: 16, color: colors.navy, fontSize: 17, lineHeight: 23, fontWeight: "900" },
  notificationDetailBody: { marginTop: 8, color: colors.text, fontSize: 12, lineHeight: 19 },
  notificationDetailMeta: { gap: 10, marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line },
  notificationDetailMetaRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  notificationDetailMetaLabel: { color: colors.muted, fontSize: 8, fontWeight: "700" },
  notificationDetailMetaValue: { marginTop: 2, color: colors.navy, fontSize: 10, fontWeight: "800" },
  notificationDetailAction: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 18, borderRadius: 13, backgroundColor: colors.sky600 },
  notificationDetailActionText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  notificationDetailInfo: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 10, padding: 11, borderRadius: 13, backgroundColor: colors.sky50 },
  notificationDetailInfoText: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 14 },
  loginSheetWrap: { maxHeight: "88%" },
  loginSheet: {
    maxHeight: "100%",
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  loginTabs: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    marginBottom: 2,
    padding: 4,
    borderRadius: 14,
    backgroundColor: "#F0F5F8",
  },
  loginTab: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  loginTabActive: { backgroundColor: colors.white, ...shadow },
  loginTabText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  loginTabTextActive: { color: colors.sky600, fontWeight: "900" },
  loginInput: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    color: colors.text,
    backgroundColor: "#FBFDFE",
    fontSize: 14,
  },
  loginHint: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  loginPassword: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: "#FBFDFE",
  },
  loginPasswordInput: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 14,
  },
  mobileConsents: {
    gap: 11,
    marginTop: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: colors.sky50,
  },
  mobileConsent: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  mobileConsentText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    lineHeight: 19,
  },
  legalLink: {
    color: colors.sky600,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  legalSheetWrap: { maxHeight: "82%" },
  legalSheet: {
    maxHeight: "100%",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  legalBody: { color: colors.text, fontSize: 13, lineHeight: 20 },
  chatPage: { flex: 1, backgroundColor: colors.white },
  chatKeyboard: { flex: 1 },
  chatHeader: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  doctorAvatar: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint50,
  },
  onlineDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.white,
    backgroundColor: colors.mint,
  },
  chatHeaderCopy: { flex: 1 },
  chatName: { color: colors.navy, fontSize: 14, fontWeight: "900" },
  chatStatus: { marginTop: 2, color: colors.mint, fontSize: 10 },
  videoButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky50,
  },
  petContext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F7FBFD",
  },
  petContextEmoji: {
    width: 38,
    height: 38,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#FFF0D8",
    fontSize: 26,
    textAlign: "center",
    lineHeight: 38,
  },
  petContextCopy: { flex: 1 },
  petContextLabel: { color: colors.muted, fontSize: 11, fontWeight: "900" },
  petContextName: {
    marginTop: 3,
    color: colors.navy,
    fontSize: 13,
    fontWeight: "800",
  },
  changePet: { color: colors.sky600, fontSize: 13, fontWeight: "800" },
  messages: { flex: 1, padding: 14, backgroundColor: colors.canvas },
  today: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
    borderRadius: 8,
    color: colors.muted,
    backgroundColor: "#EAF0F4",
    fontSize: 11,
  },
  doctorMessageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    marginTop: 18,
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.mint50,
    textAlign: "center",
    lineHeight: 28,
  },
  doctorMessage: {
    maxWidth: "84%",
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.white,
  },
  messageText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  messageTime: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 11,
    textAlign: "right",
  },
  quickReplies: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
    paddingLeft: 34,
  },
  quickReply: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#D6E8F3",
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  quickReplyText: { color: "#4C6E88", fontSize: 12 },
  sentMessage: {
    alignSelf: "flex-end",
    maxWidth: "84%",
    marginTop: 10,
    padding: 12,
    borderRadius: 15,
    borderTopRightRadius: 4,
    backgroundColor: colors.sky600,
  },
  sentText: { color: colors.white, fontSize: 13 },
  sentTime: {
    marginTop: 5,
    color: "rgba(255,255,255,.9)",
    fontSize: 11,
    textAlign: "right",
  },
  composer: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  attach: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF4F7",
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    color: colors.text,
    fontSize: 14,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky600,
  },
  bookingWrap: { maxHeight: "88%" },
  bookingSheet: {
    maxHeight: "100%",
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.white,
  },
  bookingContent: { paddingBottom: 8 },
  stepper: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 14,
  },
  stepItem: { alignItems: "center", gap: 6 },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  activeStep: { borderColor: colors.sky600, backgroundColor: colors.sky600 },
  stepNumber: { color: colors.muted, fontSize: 13, fontWeight: "900" },
  activeStepNumber: { color: colors.white },
  stepLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  activeStepLabel: { color: colors.sky600 },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 6,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  selectedPet: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.sky400,
    borderRadius: 15,
    backgroundColor: colors.sky50,
  },
  selectedPetEmoji: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFF0D8",
    fontSize: 25,
    textAlign: "center",
    lineHeight: 40,
  },
  selectedPetCopy: { flex: 1 },
  selectedPetName: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  selectedPetMeta: { marginTop: 2, color: colors.muted, fontSize: 10 },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky600,
  },
  selectedService: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.sky400,
    borderRadius: 14,
    backgroundColor: "#F9FDFF",
  },
  serviceOption: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  serviceOptionEmoji: {
    width: 38,
    height: 38,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#EFF6FA",
    fontSize: 22,
    textAlign: "center",
    lineHeight: 38,
  },
  serviceOptionCopy: { minWidth: 0, flex: 1 },
  serviceOptionName: { color: colors.navy, fontSize: 12, fontWeight: "900" },
  serviceOptionNote: { marginTop: 2, color: colors.muted, fontSize: 10 },
  serviceOptionPrice: {
    maxWidth: "30%",
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
  },
  dateRow: { flexDirection: "row", gap: 6 },
  dateOption: {
    flex: 1,
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  activeDate: { borderColor: colors.sky600, backgroundColor: colors.sky600 },
  dateDay: { color: colors.muted, fontSize: 9 },
  dateNumber: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 17,
    fontWeight: "900",
  },
  dateMonth: { color: colors.muted, fontSize: 10 },
  activeDateText: { color: colors.white },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  timeOption: {
    width: "31.5%",
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTime: { borderColor: colors.sky500, backgroundColor: colors.sky50 },
  timeText: { color: colors.text, fontSize: 11 },
  activeTimeText: { color: colors.sky600, fontWeight: "900" },
  notes: {
    minHeight: 76,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: "top",
  },
  bookingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint50,
  },
  summaryCopy: { minWidth: 0, flex: 1, alignItems: "flex-start" },
  summaryName: {
    marginTop: 5,
    color: colors.navy,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryAddress: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
  },
  summaryLines: {
    marginTop: 10,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
  },
  summaryLine: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryLineLabel: { flexShrink: 1, color: colors.muted, fontSize: 11 },
  summaryLineValue: {
    flexShrink: 1,
    maxWidth: "62%",
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
    textAlign: "right",
  },
  summaryTotal: { minHeight: 48, borderBottomWidth: 0 },
  summaryTotalValue: { color: colors.sky600, fontSize: 15 },
  bookingFooter: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
    marginHorizontal: -16,
    padding: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: "#FBFCFD",
  },
  footerButton: { flex: 1 },
});
