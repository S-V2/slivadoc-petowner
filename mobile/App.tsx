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
  Text,
  TextInput,
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
  readAllMobileNotifications,
  readMobileNotification,
  registerMobileOwner,
  resendMobileRegistrationOTP,
  reverseGeocode,
  toggleMobileFavorite,
  verifyMobileRegistrationOTP,
  type MobileBootstrap,
  type MobileMedicalRecord,
  type MobileNotification,
  type MobilePaymentIntent,
  type MobileService,
} from "./src/api";
import { SlivaCareModal } from "./src/components/SlivaCareModal";
import {
  MobileBatpayModal,
  MobilePaymentMethods,
} from "./src/components/BatpayPayment";
import slivadocLogo from "./assets/slivadoc-logo.png";

type Tab =
  | "home"
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
    id: "discover",
    label: "Jelajahi",
    icon: "search-outline",
    activeIcon: "search",
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

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileApp />
    </SafeAreaProvider>
  );
}

function MobileApp() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [selectedService, setSelectedService] = useState<Service>();
  const [locationTitle, setLocationTitle] = useState("Pilih lokasi spesifik");
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
  const tabRef = useRef<Tab>("home");
  const tabHistoryRef = useRef<Tab[]>([]);
  const [screenTransition] = useState(() => new Animated.Value(1));

  const mapService = useCallback(
    (item: MobileService, index: number): Service => ({
      id: item.id,
      branchId: item.branch_id,
      name: item.name,
      category: item.category,
      rating: "Baru",
      distance:
        typeof item.distance_km === "number" &&
        Number.isFinite(item.distance_km)
          ? `${item.distance_km.toFixed(1)} km`
          : item.city,
      price: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(item.price),
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
    [],
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
    const result = await getMobileServices();
    setServices(result.data.map(mapService));
  }, [mapService]);
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
  const openBooking = (service?: Service) => {
    if (!requireLogin()) return;
    const selected = service ?? services[0];
    if (!selected) return notify("Belum ada layanan yang tersedia");
    setSelectedService(selected);
    setBookingOpen(true);
  };
  const updateLocation = async () => {
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        return notify("Izin lokasi diperlukan untuk mencari layanan terdekat");
      notify("Mendeteksi lokasi perangkat...");
      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const result = await reverseGeocode(
        position.coords.latitude,
        position.coords.longitude,
      );
      setLocationTitle(result.label.split(",").slice(0, 3).join(", "));
      const nearby = await getMobileServices({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setServices(nearby.data.map(mapService));
      notify("Lokasi layanan berhasil diperbarui");
    } catch (cause) {
      notify(
        cause instanceof Error ? cause.message : "Lokasi belum dapat ditemukan",
      );
    }
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
            Menyinkronkan profil pet, layanan, dan aktivitas Anda.
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
                  onOpenChat={() => setChatOpen(true)}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  locationTitle={locationTitle}
                  onLocation={updateLocation}
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
                  locationTitle={locationTitle}
                  onToggleFavorite={async (id) => {
                    if (!requireLogin()) return;
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
              {tab === "world" ? (
                <WorldScreen
                  refreshVersion={refreshVersion}
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  owner={bootstrap?.user}
                  petName={pet?.name}
                  onLogin={() => setLoginOpen(true)}
                />
              ) : null}
              {tab === "activity" ? (
                <ActivityScreen
                  onAction={notify}
                  onBook={() => openBooking()}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  activities={bootstrap?.activities ?? []}
                  petNames={Object.fromEntries(
                    pets.map((item) => [item.id, item.name]),
                  )}
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
                  onLogin={() => setLoginOpen(true)}
                />
              ) : null}
              {tab === "profile" ? (
                <ProfileScreen
                  onAction={notify}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                  owner={bootstrap?.user}
                  petCount={pets.length}
                  activityCount={bootstrap?.activities.length ?? 0}
                  points={bootstrap?.points.balance ?? 0}
                  onLogin={() => setLoginOpen(true)}
                  onLogout={() => {
                    logoutMobile();
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
                        color={active ? colors.sky600 : "#8294A5"}
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
        onAction={notify}
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
      />
      <SlivaCareModal
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        onAction={notify}
        owner={bootstrap?.user}
        pet={pet}
        onLogin={() => setLoginOpen(true)}
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
            setPayment(undefined);
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
  onAction,
  items,
  onRead,
  onReadAll,
}: {
  visible: boolean;
  onClose: () => void;
  onAction: (message: string) => void;
  items: MobileNotification[];
  onRead: (item: MobileNotification) => void | Promise<void>;
  onReadAll: () => void | Promise<void>;
}) {
  const [category, setCategory] = useState("");
  const categories = [...new Set(items.map((item) => item.category))];
  const visibleItems = category
    ? items.filter((item) => item.category === category)
    : items;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <SafeAreaView style={styles.sheetWrap}>
          <Pressable
            style={styles.sheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <SheetHeader
              eyebrow="UPDATE TERBARU"
              title="Notifikasi"
              onClose={onClose}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 8 }}
            >
              <Pressable onPress={() => setCategory("")}>
                <Pill tone={!category ? "mint" : undefined}>Semua</Pill>
              </Pressable>
              {categories.map((value) => (
                <Pressable key={value} onPress={() => setCategory(value)}>
                  <Pill tone={category === value ? "mint" : undefined}>
                    {value}
                  </Pill>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              disabled={!items.some((item) => !item.read_at)}
              onPress={() => void onReadAll()}
            >
              <Text style={styles.markRead}>Tandai semua sudah dibaca</Text>
            </Pressable>
            <ScrollView>
              {visibleItems.length ? (
                visibleItems.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void onRead(item);
                      onAction(item.title);
                    }}
                    style={styles.notification}
                  >
                    <View
                      style={[
                        styles.notificationIcon,
                        {
                          backgroundColor:
                            item.category === "health"
                              ? colors.mint50
                              : item.category === "points"
                                ? colors.yellow50
                                : colors.sky50,
                        },
                      ]}
                    >
                      <Text>
                        {item.category === "health"
                          ? "🩺"
                          : item.category === "booking"
                            ? "📅"
                            : item.category === "points"
                              ? "✦"
                              : "🔔"}
                      </Text>
                    </View>
                    <View style={styles.notificationCopy}>
                      <Text style={styles.notificationTitle}>{item.title}</Text>
                      <Text style={styles.notificationNote}>{item.body}</Text>
                      <Text style={styles.notificationTime}>
                        {new Date(item.created_at).toLocaleString("id-ID")}
                      </Text>
                    </View>
                    {!item.read_at ? <View style={styles.unreadDot} /> : null}
                  </Pressable>
                ))
              ) : (
                <Text style={styles.notificationNote}>
                  Belum ada notifikasi pada kategori ini.
                </Text>
              )}
            </ScrollView>
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
                            {item
                              .toLocaleDateString("id-ID", { weekday: "short" })
                              .toUpperCase()}
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
                            {item.toLocaleDateString("id-ID", {
                              month: "short",
                            })}
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
                    placeholderTextColor="#9CA8B6"
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
                      value={`${new Date(`${date}T12:00:00`).toLocaleDateString("id-ID")} • ${time} WIB`}
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
  pressed: { opacity: 0.68, transform: [{ scale: 0.98 }] },
  tabBar: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: "#DCEAF2",
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,.98)",
    ...shadow,
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 18,
  },
  tabIcon: {
    position: "relative",
    width: 40,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  activeTabIcon: { backgroundColor: colors.sky50 },
  tabLabel: { color: "#8294A5", fontSize: 12, fontWeight: "700" },
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
    left: 24,
    right: 24,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 15,
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
  sheetWrap: { maxHeight: "92%" },
  sheet: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
  },
  moreSheetWrap: { maxHeight: "84%" },
  moreSheet: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  moreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 18 },
  moreCard: {
    width: "31%",
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: "#FBFDFE",
  },
  moreCardActive: { borderColor: colors.sky400, backgroundColor: colors.sky50 },
  moreCardIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.sky50,
  },
  moreCardIconActive: { backgroundColor: colors.sky500 },
  moreCardLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  moreCardLabelActive: { color: colors.sky600 },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 9,
    marginBottom: 12,
    borderRadius: 3,
    backgroundColor: "#DCE5EB",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  sheetHeaderCopy: { minWidth: 0, flex: 1 },
  sheetEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sheetTitle: {
    marginTop: 4,
    color: colors.navy,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  markRead: {
    minHeight: 44,
    paddingVertical: 12,
    color: colors.sky600,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  notification: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCopy: { flex: 1 },
  notificationTitle: { color: colors.navy, fontSize: 13, fontWeight: "900" },
  notificationNote: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  notificationTime: { marginTop: 4, color: "#8999A9", fontSize: 10 },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.sky500,
  },
  loginSheetWrap: { maxHeight: "94%" },
  loginSheet: {
    maxHeight: "100%",
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
  },
  loginTabActive: { backgroundColor: colors.white, ...shadow },
  loginTabText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  loginTabTextActive: { color: colors.sky600, fontWeight: "900" },
  loginInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    color: colors.text,
    backgroundColor: "#FBFDFE",
    fontSize: 16,
  },
  loginHint: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  loginPassword: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    backgroundColor: "#FBFDFE",
  },
  loginPasswordInput: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 16,
  },
  mobileConsents: {
    gap: 11,
    marginTop: 18,
    padding: 14,
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
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
  legalBody: { color: colors.text, fontSize: 14, lineHeight: 23 },
  chatPage: { flex: 1, backgroundColor: colors.white },
  chatKeyboard: { flex: 1 },
  chatHeader: {
    minHeight: 68,
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
  chatName: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  chatStatus: { marginTop: 3, color: colors.mint, fontSize: 12 },
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
  messages: { flex: 1, padding: 18, backgroundColor: colors.canvas },
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
  messageText: { color: colors.text, fontSize: 14, lineHeight: 21 },
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
    backgroundColor: colors.sky500,
  },
  sentText: { color: colors.white, fontSize: 14 },
  sentTime: {
    marginTop: 5,
    color: "rgba(255,255,255,.76)",
    fontSize: 11,
    textAlign: "right",
  },
  composer: {
    minHeight: 72,
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
    backgroundColor: colors.sky500,
  },
  bookingWrap: { maxHeight: "95%" },
  bookingSheet: {
    maxHeight: "100%",
    paddingHorizontal: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
  },
  bookingContent: { paddingBottom: 8 },
  stepper: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 18,
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
  activeStep: { borderColor: colors.sky500, backgroundColor: colors.sky500 },
  stepNumber: { color: colors.muted, fontSize: 13, fontWeight: "900" },
  activeStepNumber: { color: colors.white },
  stepLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  activeStepLabel: { color: colors.sky600 },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  selectedPet: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.sky400,
    borderRadius: 15,
    backgroundColor: colors.sky50,
  },
  selectedPetEmoji: {
    width: 44,
    height: 44,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: "#FFF0D8",
    fontSize: 29,
    textAlign: "center",
    lineHeight: 44,
  },
  selectedPetCopy: { flex: 1 },
  selectedPetName: { color: colors.navy, fontSize: 15, fontWeight: "900" },
  selectedPetMeta: { marginTop: 3, color: colors.muted, fontSize: 12 },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.sky500,
  },
  selectedService: {
    minHeight: 68,
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
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
  },
  serviceOptionEmoji: {
    width: 42,
    height: 42,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#EFF6FA",
    fontSize: 26,
    textAlign: "center",
    lineHeight: 42,
  },
  serviceOptionCopy: { minWidth: 0, flex: 1 },
  serviceOptionName: { color: colors.navy, fontSize: 14, fontWeight: "900" },
  serviceOptionNote: { marginTop: 3, color: colors.muted, fontSize: 12 },
  serviceOptionPrice: {
    maxWidth: "30%",
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right",
  },
  dateRow: { flexDirection: "row", gap: 6 },
  dateOption: {
    flex: 1,
    minHeight: 68,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  activeDate: { borderColor: colors.sky500, backgroundColor: colors.sky500 },
  dateDay: { color: colors.muted, fontSize: 11 },
  dateNumber: {
    marginTop: 2,
    color: colors.navy,
    fontSize: 20,
    fontWeight: "900",
  },
  dateMonth: { color: colors.muted, fontSize: 12 },
  activeDateText: { color: colors.white },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  timeOption: {
    width: "31.5%",
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeTime: { borderColor: colors.sky500, backgroundColor: colors.sky50 },
  timeText: { color: colors.text, fontSize: 13 },
  activeTimeText: { color: colors.sky600, fontWeight: "900" },
  notes: {
    minHeight: 84,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  bookingSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
  },
  summaryIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mint50,
  },
  summaryCopy: { minWidth: 0, flex: 1, alignItems: "flex-start" },
  summaryName: {
    marginTop: 7,
    color: colors.navy,
    fontSize: 15,
    fontWeight: "900",
  },
  summaryAddress: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  summaryLines: {
    marginTop: 12,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
  },
  summaryLine: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  summaryLineLabel: { flexShrink: 1, color: colors.muted, fontSize: 13 },
  summaryLineValue: {
    flexShrink: 1,
    maxWidth: "62%",
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    textAlign: "right",
  },
  summaryTotal: { minHeight: 52, borderBottomWidth: 0 },
  summaryTotalValue: { color: colors.sky600, fontSize: 17 },
  bookingFooter: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
    marginHorizontal: -18,
    padding: 14,
    paddingHorizontal: 18,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: "#FBFCFD",
  },
  footerButton: { flex: 1 },
});
