import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getMobileGlobalSearch,
  getMobileVeterinarians,
  type MobileActivityCenterItem,
  type MobileActivityType,
  type MobileGlobalSearchResult,
  type WorldItem,
} from "../api";
import type { PetView, Service } from "../data";
import { getActivityTypePresentation } from "../activity";
import { colors, radius, shadow, spacing, typography } from "../theme";
import { ChatUnreadBadge, Pill, Screen, useAppSurface } from "../components/ui";
import { LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "../i18n";

type Props = {
  onExploreService: (category?: string, serviceId?: string) => void;
  onOpenPartner: (businessId: string) => void;
  onOpenConsultation: (doctorId?: string) => void;
  onOpenNotifications: () => void;
  onSearchResult: (result: MobileGlobalSearchResult) => void;
  onNavigate: (tab: "discover" | "world" | "activity" | "health") => void;
  ownerName?: string;
  pet?: PetView;
  pets: PetView[];
  onSelectPet: (petId: string) => void;
  services: Service[];
  activities: MobileActivityCenterItem[];
  onOpenActivity: (type: MobileActivityType, id: string) => void;
};

const searchCategories = [
  { value: "", label: "Semua" },
  { value: "feature", label: "Fitur" },
  { value: "service", label: "Layanan" },
  { value: "product", label: "Produk" },
  { value: "petspot", label: "PetSpot" },
  { value: "event", label: "Event" },
  { value: "academy", label: "Academy" },
  { value: "veterinarian", label: "Dokter" },
] as const;

const searchSuggestions = [
  "Dokter hewan",
  "Grooming",
  "Vaksin",
  "Pet hotel",
];

const featureSearchItems: MobileGlobalSearchResult[] = [
  { category: "feature", id: "booking", title: "Buat Booking", subtitle: "Jadwalkan layanan untuk pet", route: "discover" },
  { category: "feature", id: "consult", title: "Tanya Dokter", subtitle: "Konsultasi kesehatan hewan", route: "consult" },
  { category: "feature", id: "health", title: "Kesehatan Pet", subtitle: "Lihat health score dan rekam medis", route: "health" },
  { category: "feature", id: "activity", title: "Aktivitas", subtitle: "Booking, transaksi, dan jadwal pet", route: "bookings" },
  { category: "feature", id: "community", title: "Komunitas", subtitle: "Cerita dan diskusi pet parent", route: "community" },
  { category: "feature", id: "academy", title: "Pet Academy", subtitle: "Kelas dan trainer terverifikasi", route: "academy" },
  { category: "feature", id: "events", title: "Pet Event", subtitle: "Event dan aktivitas di kotamu", route: "events" },
  { category: "feature", id: "petspot", title: "PetSpot", subtitle: "Tempat seru yang pet friendly", route: "petspot" },
  { category: "feature", id: "adoption", title: "Adopsi", subtitle: "Temukan keluarga baru yang tepat", route: "adoption" },
];

function searchIcon(category: string): keyof typeof Ionicons.glyphMap {
  if (category === "service") return "medical-outline";
  if (category === "product") return "bag-handle-outline";
  if (category === "petspot") return "map-outline";
  if (category === "event") return "ticket-outline";
  if (category === "academy") return "school-outline";
  if (category === "veterinarian") return "medkit-outline";
  return "sparkles-outline";
}

function serviceGradient(tone: Service["tone"]): [string, string] {
  if (tone === "mint") return ["#DDFBF3", "#F4FFFC"];
  if (tone === "violet") return ["#ECE7FF", "#F8F6FF"];
  if (tone === "peach") return ["#FFF0E5", "#FFF9F4"];
  return ["#DDF3FF", "#F3FBFF"];
}

function HomeSectionHeader({
  icon,
  eyebrow,
  title,
  note,
  action,
  onAction,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  eyebrow: string;
  title: string;
  note: string;
  action: string;
  onAction: () => void;
  tone: "blue" | "mint" | "violet";
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionHeaderIcon, styles[`${tone}SectionIcon`]]}>
        <Ionicons name={icon} size={17} color={tone === "blue" ? colors.sky600 : tone === "mint" ? colors.mint : "#6757C9"} />
      </View>
      <View style={styles.sectionHeaderCopy}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text numberOfLines={1} style={styles.sectionHeading}>{title}</Text>
        <Text numberOfLines={1} style={styles.sectionNote}>{note}</Text>
      </View>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} style={styles.sectionAction}>
        <Text style={styles.sectionActionText}>{action}</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.sky600} />
      </Pressable>
    </View>
  );
}

function HomeSearchModal({
  visible,
  onClose,
  onChoose,
}: {
  visible: boolean;
  onClose: () => void;
  onChoose: (result: MobileGlobalSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<MobileGlobalSearchResult[]>([]);
  const [resolvedSearchKey, setResolvedSearchKey] = useState("");
  const [failed, setFailed] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const canSearch = normalizedQuery.length >= 2;
  const searchKey = `${category}:${normalizedQuery}`;

  useEffect(() => {
    if (!visible || !canSearch) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const localResults =
        category === "" || category === "feature"
          ? featureSearchItems.filter((item) =>
              `${item.title} ${item.subtitle}`.toLowerCase().includes(normalizedQuery),
            )
          : [];
      if (category === "feature") {
        setResults(localResults);
        setFailed(false);
        setResolvedSearchKey(searchKey);
        return;
      }
      void getMobileGlobalSearch(query.trim(), category === "feature" ? "" : category)
        .then((response) => {
          if (cancelled) return;
          const combined = [...localResults, ...response.data];
          setResults(
            Array.from(
              new Map(combined.map((item) => [`${item.category}-${item.id}`, item])).values(),
            ),
          );
          setFailed(false);
        })
        .catch(() => {
          if (cancelled) return;
          setResults(localResults);
          setFailed(localResults.length === 0);
        })
        .finally(() => {
          if (!cancelled) setResolvedSearchKey(searchKey);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canSearch, category, normalizedQuery, query, searchKey, visible]);

  const searching = canSearch && resolvedSearchKey !== searchKey;
  const visibleResults = canSearch && !searching ? results : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.searchBackdrop} onPress={onClose}>
        <Pressable style={styles.searchSheet} onPress={(event) => event.stopPropagation()}>
          <SafeAreaView edges={["bottom", "left", "right"]} style={styles.searchSheetSafe}>
            <View style={styles.searchHandle} />
        <View style={styles.searchHeader}>
          <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke beranda" onPress={onClose} style={styles.searchBack}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={colors.sky600} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Cari apa saja di Slivadoc"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
            />
            {query ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Hapus pencarian" hitSlop={8} onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchCategories}>
          {searchCategories.map((item) => (
            <Pressable
              key={item.value || "all"}
              onPress={() => setCategory(item.value)}
              style={[styles.searchCategory, category === item.value && styles.searchCategoryActive]}
            >
              <Text style={[styles.searchCategoryText, category === item.value && styles.searchCategoryTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView style={styles.searchBody} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.searchContent}>
          {!canSearch ? (
            <View>
              <Text style={styles.searchEyebrow}>PENCARIAN POPULER</Text>
              <Text style={styles.searchTitle}>Lagi cari apa hari ini?</Text>
              <View style={styles.suggestionWrap}>
                {searchSuggestions.map((item) => (
                  <Pressable key={item} onPress={() => setQuery(item)} style={styles.suggestion}>
                    <Ionicons name="trending-up" size={14} color={colors.sky600} />
                    <Text style={styles.suggestionText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.searchHint}>
                <View style={styles.searchHintIcon}><Ionicons name="sparkles" size={17} color={colors.sky600} /></View>
                <Text style={styles.searchHintText}>Cari fitur, dokter, layanan, produk, tempat, event, dan academy dalam satu pencarian.</Text>
              </View>
            </View>
          ) : searching ? (
            <View style={styles.searchState}>
              <ActivityIndicator color={colors.sky600} />
              <Text style={styles.searchStateText}>Mencari yang paling cocok…</Text>
            </View>
          ) : visibleResults.length ? (
            <View style={styles.searchResults}>
              <Text style={styles.searchEyebrow}>{visibleResults.length} HASIL DITEMUKAN</Text>
              {visibleResults.map((item) => (
                <Pressable
                  key={`${item.category}-${item.id}`}
                  onPress={() => {
                    onChoose(item);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.searchResult, pressed && styles.pressed]}
                >
                  <View style={styles.searchResultIcon}><Ionicons name={searchIcon(item.category)} size={18} color={colors.sky600} /></View>
                  <View style={styles.searchResultCopy}>
                    <Text numberOfLines={1} style={styles.searchResultTitle}>{item.title}</Text>
                    <Text numberOfLines={2} style={styles.searchResultMeta}>{item.category} · {item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.searchState}>
              <View style={styles.searchEmptyIcon}><Ionicons name={failed ? "cloud-offline-outline" : "search-outline"} size={28} color={colors.sky600} /></View>
              <Text style={styles.searchStateTitle}>{failed ? "Pencarian belum tersambung" : "Belum ada yang cocok"}</Text>
              <Text style={styles.searchStateText}>{failed ? "Coba lagi sebentar atau gunakan fitur populer." : "Coba kata kunci atau kategori lain."}</Text>
            </View>
          )}
        </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function HomeScreen({
  onExploreService,
  onOpenPartner,
  onOpenConsultation,
  onOpenActivity,
  onOpenNotifications,
  onSearchResult,
  onNavigate,
  ownerName,
  pet,
  pets,
  onSelectPet,
  services,
  activities,
}: Props) {
  const { formatDate } = useI18n();
  const { unreadNotifications, openChatInbox } = useAppSurface();
  const [searchOpen, setSearchOpen] = useState(false);
  const [petPickerOpen, setPetPickerOpen] = useState(false);
  const [veterinarians, setVeterinarians] = useState<WorldItem[]>([]);
  useEffect(() => {
    void getMobileVeterinarians()
      .then((result) => setVeterinarians(result.data))
      .catch(() => setVeterinarians([]));
  }, []);
  const petView = pet ?? { id: "", name: "pet kamu", breed: "Login untuk melihat profil", age: "—", weight: "—", icon: "", score: 0, allergies: "" };
  const featuredActivities = activities
    .filter((item) => item.state !== "history")
    .sort((left, right) => Date.parse(left.scheduled_at ?? left.occurred_at) - Date.parse(right.scheduled_at ?? right.occurred_at))
    .slice(0, 3);
  const healthStatus = petView.score >= 80 ? "Kondisi prima" : petView.score >= 60 ? "Tetap terpantau" : pet ? "Lengkapi datanya" : "Mulai profil pet";
  const nearestPartners = Array.from(
    services
      .filter((item) => /clinic|klinik|pet shop|petshop/i.test(item.category))
      .reduce((partners, service) => {
        const id = service.businessId || service.branchId;
        const current = partners.get(id);
        const distance = Number.parseFloat(service.distance) || Number.MAX_SAFE_INTEGER;
        if (!current) {
          partners.set(id, {
            id,
            name: service.businessName || service.branchName || service.name,
            address: service.address || service.city || "Terdekat dari kamu",
            distance,
            distanceLabel: service.distance,
            rating: service.rating,
            imageUrl: service.imageUrl,
            tone: service.tone,
            categories: new Set([service.category]),
            serviceCount: 1,
          });
          return partners;
        }
        current.serviceCount += 1;
        current.categories.add(service.category);
        if (distance < current.distance) {
          current.distance = distance;
          current.distanceLabel = service.distance;
        }
        return partners;
      }, new Map<string, {
        id: string;
        name: string;
        address: string;
        distance: number;
        distanceLabel: string;
        rating: string;
        imageUrl?: string;
        tone: Service["tone"];
        categories: Set<string>;
        serviceCount: number;
      }>())
      .values(),
  )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
  const recommendedDoctors = [...veterinarians]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.consultation_count ?? 0) - (a.consultation_count ?? 0))
    .slice(0, 5);
  const firstName = ownerName?.trim().split(" ")[0];
  const primaryQuickActions = [
    { label: "Booking", note: "Pilih layanan & jadwal", icon: "calendar-outline" as const, gradient: [colors.sky600, "#0A6F9C"] as const, onPress: () => onExploreService() },
    { label: "Tanya Dokter", note: "Pilih dokter & paket", icon: "chatbubbles-outline" as const, gradient: [colors.mint, "#0D7664"] as const, onPress: () => onOpenConsultation() },
  ];
  const secondaryQuickActions = [
    { label: "Home Care", note: "Pilih dulu", icon: "home-outline" as const, color: colors.peach50, iconColor: "#8B4A20", onPress: () => onExploreService("Home Care") },
    { label: "Darurat", note: "Cari klinik", icon: "medical-outline" as const, color: colors.red50, iconColor: colors.red, onPress: () => onExploreService("Clinic") },
    { label: "Pet Hotel", note: "Pilih dulu", icon: "bed-outline" as const, color: colors.violet50, iconColor: "#6655C7", onPress: () => onExploreService("Pet Hotel") },
    { label: "Sliva World", note: "Eksplorasi", icon: "planet-outline" as const, color: colors.sky50, iconColor: colors.sky600, onPress: () => onNavigate("world") },
  ];

  return (
    <>
      <Screen contentStyle={styles.screenContent}>
        <View style={styles.homeHeader}>
          <Pressable accessibilityRole="search" accessibilityLabel="Cari di seluruh Slivadoc" onPress={() => setSearchOpen(true)} style={({ pressed }) => [styles.searchLauncher, pressed && styles.pressed]}>
            <Ionicons name="search" size={18} color={colors.sky600} />
            <TextInput editable={false} pointerEvents="none" placeholder="Cari dokter, layanan, produk…" placeholderTextColor={colors.muted} style={styles.searchLauncherInput} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Buka daftar chat" onPress={() => openChatInbox()} style={styles.notificationButton}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
            <ChatUnreadBadge />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Buka notifikasi" onPress={() => onOpenNotifications()} style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {unreadNotifications > 0 ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        </View>

        <View style={styles.greetingRow}>
          <View style={styles.greetingCopy}>
            <Text style={styles.greeting}>{firstName ? `Hai, ${firstName}!` : "Hai, Pet Parent!"}</Text>
            <Text numberOfLines={2} style={styles.greetingNote}>{firstName ? "Yuk, bikin hari pet-mu makin sehat dan happy." : "Semua momen sehat dan happy, ada di sini."}</Text>
          </View>
          <View style={styles.greetingSparkle}><Ionicons name="sparkles" size={18} color={colors.white} /></View>
        </View>

        <View style={styles.quickPanel}>
          <View style={styles.quickHeading}>
            <View>
              <Text style={styles.quickTitle}>Layanan cepat</Text>
              <Text style={styles.quickSubtitle}>Semua yang pet-mu butuhkan, sekali tap</Text>
            </View>
            <View style={styles.quickBadge}><Ionicons name="flash" size={12} color={colors.sky600} /><Text style={styles.quickBadgeText}>6 pilihan</Text></View>
          </View>
          <View style={styles.quickFeatureRow}>
            {primaryQuickActions.map((item) => (
              <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.quickFeaturePressable, pressed && styles.pressed]}>
                <LinearGradient colors={item.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickFeatureCard}>
                  <View style={styles.quickFeatureTop}><View style={styles.quickFeatureIcon}><Ionicons name={item.icon} size={20} color={colors.sky600} /></View><View style={styles.quickFeatureArrow}><Ionicons name="arrow-up" size={13} color={colors.white} /></View></View>
                  <Text style={styles.quickFeatureLabel}>{item.label}</Text>
                  <Text style={styles.quickFeatureNote}>{item.note}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
          <View style={styles.quickMiniRow}>
            {secondaryQuickActions.map((item) => (
              <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.quickMiniCard, pressed && styles.pressed]}>
                <View style={[styles.quickMiniIcon, { backgroundColor: item.color }]}><Ionicons name={item.icon} size={20} color={item.iconColor} /></View>
                <Text numberOfLines={2} style={styles.quickMiniLabel}>{item.label}</Text>
                <Text numberOfLines={1} style={styles.quickMiniNote}>{item.note}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <HomeSectionHeader icon="heart" eyebrow="HEALTH SNAPSHOT" title={`Kondisi ${petView.name}`} note="Pantau kesehatan tanpa ribet" action="Detail" onAction={() => onNavigate("health")} tone="blue" />
          <LinearGradient colors={["#075F91", colors.sky600, "#0A6F9C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.healthCard}>
            <View style={styles.healthGlowLarge} />
            <View style={styles.healthGlowSmall} />
            <View style={styles.healthTop}>
              <View style={styles.petAvatar}><Ionicons name="paw" size={26} color={colors.sky600} /><View style={styles.checkDot}><Ionicons name="checkmark" size={10} color={colors.white} /></View></View>
              <View style={styles.healthCopy}>
                <View style={styles.activePetLabel}><View style={styles.activePetPulse} /><Text style={styles.activePetLabelText}>PET AKTIF</Text>{petView.shared ? <><Ionicons name="people" size={9} color={colors.white} /><Text style={styles.activePetLabelText}>Dibagikan</Text></> : null}</View>
                <Text numberOfLines={1} style={styles.petName}>{petView.name}</Text>
                <Text numberOfLines={1} style={styles.petMeta}>{petView.breed} • {petView.age}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Ganti profil pet aktif, saat ini ${petView.name}`} onPress={() => pets.length > 1 ? setPetPickerOpen(true) : onNavigate("health")} style={({ pressed }) => [styles.petSwitchButton, pressed && styles.pressed]}>
                <Ionicons name="swap-horizontal" size={13} color={colors.white} />
                <Text style={styles.petSwitchText}>Ganti</Text>
              </Pressable>
            </View>
            <View style={styles.healthOverview}>
              <View style={styles.healthScoreWrap}>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreValue}>{petView.score}</Text>
                  <Text style={styles.scoreLabel}>/ 100</Text>
                </View>
                <Text style={styles.healthStatus}>{healthStatus}</Text>
                <Text numberOfLines={1} style={styles.updated}>{petView.lastUpdated ? `Update ${formatDate(petView.lastUpdated)}` : "Belum ada rekam medis"}</Text>
              </View>
              <View style={styles.metricStack}>
                <View style={styles.metric}>
                  <View style={[styles.metricIcon, styles.metricIconMint]}><Ionicons name="scale-outline" size={14} color="#13856F" /></View>
                  <View style={styles.metricCopy}><Text style={styles.metricLabel}>Berat badan</Text><Text style={styles.metricValue}>{petView.weight}</Text></View>
                </View>
                <View style={styles.metric}>
                  <View style={[styles.metricIcon, styles.metricIconViolet]}><Ionicons name="pulse-outline" size={14} color="#6655C7" /></View>
                  <View style={styles.metricCopy}><Text style={styles.metricLabel}>Aktivitas</Text><Text style={styles.metricValue}>{activities.length} catatan</Text></View>
                </View>
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={() => onNavigate("activity")} style={({ pressed }) => [styles.insight, pressed && styles.pressed]}>
              <View style={styles.insightIcon}><Ionicons name="sparkles" size={16} color={colors.sky600} /></View>
              <View style={styles.insightCopy}><Text style={styles.insightTitle}>Insight untuk {petView.name}</Text><Text numberOfLines={2} style={styles.insightText}>{featuredActivities[0]?.subtitle || "Belum ada aktivitas kesehatan terjadwal."}</Text></View>
              <View style={styles.insightArrow}><Ionicons name="arrow-forward" size={14} color={colors.white} /></View>
            </Pressable>
          </LinearGradient>
        </View>

        <View style={styles.sectionBlock}>
          <HomeSectionHeader icon="calendar" eyebrow="CARE PLAN" title="Perawatan terdekat" note="Biar jadwal nggak kelewat" action="Semua" onAction={() => onNavigate("activity")} tone="mint" />
          <LinearGradient colors={["#F2FFFB", "#FFFFFF", "#F2FAFF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.careCard}>
            <View style={styles.careGlow} />
            {featuredActivities.map((item, index) => {
              const presentation = getActivityTypePresentation(item.type);
              return (
              <Pressable key={`${item.type}-${item.id}`} onPress={() => onOpenActivity(item.type, item.id)} style={[styles.careRow, index < featuredActivities.length - 1 && styles.careDivider]}>
                <View style={styles.careTimeline}>
                  <View style={[styles.careIcon, { backgroundColor: presentation.surface }]}><Ionicons name={presentation.icon} size={19} color={presentation.color} /></View>
                  {index < featuredActivities.length - 1 ? <View style={styles.careLine} /> : null}
                </View>
                <View style={styles.careCopy}>
                  <View style={styles.careTimePill}><Ionicons name="time-outline" size={11} color="#14836E" /><Text style={styles.careTime}>{formatDate(item.scheduled_at || item.occurred_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text></View>
                  <Text numberOfLines={1} style={styles.careTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.careNote}>{item.subtitle}</Text>
                </View>
                <View style={styles.careArrow}><Ionicons name="chevron-forward" size={14} color={colors.sky600} /></View>
              </Pressable>
              );
            })}
            {featuredActivities.length === 0 ? (
              <View style={styles.emptyCare}>
                <View style={styles.emptyCareVisual}>
                  <View style={styles.emptyCareOrbit} />
                  <View style={styles.emptyCareIcon}><Ionicons name="calendar" size={25} color={colors.mint} /></View>
                  <View style={styles.emptyCareSpark}><Ionicons name="sparkles" size={11} color="#6757C9" /></View>
                </View>
                <View style={styles.emptyCareCopy}>
                  <View style={styles.emptyCareBadge}><Text style={styles.emptyCareBadgeText}>MULAI DARI SINI ✨</Text></View>
                  <Text style={styles.emptyCareTitle}>Jadwal masih santai</Text>
                  <Text style={styles.careNote}>Booking perawatan pertama dan kami bantu ingatkan.</Text>
                </View>
              </View>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => featuredActivities.length ? onNavigate("activity") : onExploreService()} style={({ pressed }) => [styles.careCta, pressed && styles.pressed]}>
              <View style={styles.careCtaIcon}><Ionicons name="calendar-outline" size={16} color={colors.sky600} /></View>
              <View style={styles.careCtaCopy}><Text style={styles.careCtaTitle}>{featuredActivities.length ? "Lihat semua aktivitas" : "Buat care plan pertama"}</Text><Text style={styles.careCtaNote}>Semua jadwal pet dalam satu tempat</Text></View>
              <View style={styles.careCtaArrow}><Ionicons name="arrow-forward" size={14} color={colors.white} /></View>
            </Pressable>
          </LinearGradient>
        </View>

        <View style={styles.sectionBlock}>
          <HomeSectionHeader icon="location" eyebrow="TERDEKAT" title="Pet clinic & petshop" note="Diurutkan dari titik lokasi kamu" action="Jelajahi" onAction={() => onExploreService()} tone="violet" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceScroll}>
            {nearestPartners.map((partner) => (
              <Pressable key={partner.id} onPress={() => onOpenPartner(partner.id)} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
                <LinearGradient colors={serviceGradient(partner.tone)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.serviceVisual}>
                  {partner.imageUrl ? <Image source={{ uri: partner.imageUrl }} alt={`Gambar ${partner.name}`} style={styles.serviceImage} resizeMode="cover" /> : null}
                  <View style={styles.serviceShine} />
                  <View style={styles.serviceVisualTop}><Pill tone={partner.tone === "peach" ? "yellow" : partner.tone}>{[...partner.categories][0]}</Pill><View style={styles.serviceFavorite}><Ionicons name="storefront-outline" size={14} color={colors.navy} /></View></View>
                  {!partner.imageUrl ? <View style={styles.serviceEmojiWrap}><Ionicons name="storefront-outline" size={34} color={partner.tone === "mint" ? "#14836E" : partner.tone === "violet" ? "#6655C7" : partner.tone === "peach" ? "#8B4A20" : colors.sky600} /></View> : null}
                  <View style={styles.topPick}><Ionicons name="sparkles" size={10} color="#6757C9" /><Text style={styles.topPickText}>TOP PICK</Text></View>
                </LinearGradient>
                <View style={styles.serviceCardBody}>
                  <Text numberOfLines={1} style={styles.serviceName}>{partner.name}</Text>
                  <View style={styles.serviceLocation}><Ionicons name="location-outline" size={11} color={colors.muted} /><Text numberOfLines={1} style={styles.serviceLocationText}>{partner.address}</Text></View>
                  <View style={styles.serviceMeta}>
                    <View style={styles.ratingPill}><Ionicons name="star" size={10} color={colors.yellow} /><Text style={styles.ratingText}>{partner.rating}</Text></View>
                    <Text style={styles.serviceMetaDot}>•</Text>
                    <Text numberOfLines={1} style={styles.serviceMetaText}>{partner.distanceLabel}</Text>
                  </View>
                  <View style={styles.serviceFooter}><Text numberOfLines={1} style={styles.servicePrice}>{partner.serviceCount} layanan</Text><View style={styles.bookPill}><Text style={styles.bookPillText}>Profil</Text><Ionicons name="arrow-forward" size={12} color={colors.white} /></View></View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionBlock}>
          <HomeSectionHeader icon="medkit" eyebrow="DOKTER TERBAIK" title={`Untuk ${petView.name}`} note="Terverifikasi, berpengalaman, dan ber-rating tinggi" action="Semua" onAction={() => onOpenConsultation()} tone="mint" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doctorScroll}>
            {recommendedDoctors.map((doctor) => (
              <Pressable key={doctor.id} onPress={() => onOpenConsultation(doctor.id)} style={({ pressed }) => [styles.doctorCard, pressed && styles.pressed]}>
                <View style={styles.doctorTop}>
                  <View style={styles.doctorAvatar}>
                    {doctor.photo_url ? <Image source={{ uri: doctor.photo_url }} alt={doctor.full_name ?? "Dokter hewan"} style={styles.doctorImage} /> : <Ionicons name="medkit-outline" size={24} color={colors.sky600} />}
                    <View style={styles.doctorOnline} />
                  </View>
                  <View style={styles.doctorRating}><Ionicons name="star" size={11} color={colors.yellow} /><Text style={styles.doctorRatingText}>{(doctor.rating ?? 0).toFixed(1)}</Text></View>
                </View>
                <Text numberOfLines={1} style={styles.doctorName}>{doctor.full_name ?? doctor.doctor_name ?? "Dokter hewan"}</Text>
                <Text numberOfLines={2} style={styles.doctorSpecialty}>{doctor.specialties?.join(" · ") || "Dokter hewan umum"}</Text>
                <Text style={styles.doctorMeta}>{doctor.experience_years ?? 0} th pengalaman · {doctor.consultation_count ?? 0} konsultasi</Text>
                <View style={styles.doctorAction}><Text style={styles.doctorActionText}>Konsultasi</Text><Ionicons name="arrow-forward" size={13} color={colors.white} /></View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Screen>
      <HomeSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} onChoose={onSearchResult} />
      <Modal visible={petPickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPetPickerOpen(false)}>
        <Pressable style={styles.petPickerBackdrop} onPress={() => setPetPickerOpen(false)}>
          <SafeAreaView style={styles.petPickerSafe}>
            <Pressable style={styles.petPickerSheet} onPress={(event) => event.stopPropagation()}>
              <View style={styles.petPickerHandle} />
              <Text style={styles.petPickerEyebrow}>PET AKTIF</Text>
              <Text style={styles.petPickerTitle}>Pilih temanmu</Text>
              <Text style={styles.petPickerNote}>Rekomendasi, kesehatan, dan booking akan mengikuti pet yang dipilih.</Text>
              {pets.map((item) => {
                const active = item.id === pet?.id;
                return <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { onSelectPet(item.id); setPetPickerOpen(false); }} style={[styles.petPickerItem, active && styles.petPickerItemActive]}>
                  <View style={styles.petPickerAvatar}><Text style={styles.petPickerEmoji}>{item.icon}</Text></View>
                  <View style={styles.petPickerCopy}><Text style={styles.petPickerName}>{item.name}</Text><Text style={styles.petPickerMeta}>{item.breed} · {item.age}</Text>{item.shared ? <View style={{ alignSelf: "flex-start", marginTop: 4 }}><Pill tone="violet">Dibagikan</Pill></View> : null}</View>
                  <Ionicons name={active ? "checkmark-circle" : "chevron-forward"} size={20} color={active ? colors.sky600 : colors.muted} />
                </Pressable>;
              })}
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: spacing.sm },
  homeHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10 },
  searchLauncher: { minWidth: 0, flex: 1, height: 46, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.sky100, borderRadius: radius.md, backgroundColor: colors.white, ...shadow },
  searchLauncherInput: { minWidth: 0, flex: 1, height: 40, padding: 0, color: colors.text, fontSize: typography.body },
  notificationButton: { position: "relative", width: 46, height: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.sky100, borderRadius: radius.md, backgroundColor: colors.white, ...shadow },
  notificationDot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.white, backgroundColor: colors.red },
  greetingRow: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 12 },
  greetingCopy: { minWidth: 0, flex: 1 },
  greeting: { color: colors.inkStrong, fontSize: 20, lineHeight: 25, fontWeight: "700", letterSpacing: -0.35 },
  greetingNote: { marginTop: 2, color: colors.muted, fontSize: typography.label, lineHeight: 17 },
  greetingSparkle: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 16, borderBottomLeftRadius: 8, backgroundColor: colors.sky600, transform: [{ rotate: "6deg" }], ...shadow },
  hero: { position: "relative", minHeight: 220, overflow: "hidden", justifyContent: "center", borderRadius: 28, borderBottomLeftRadius: 15, ...shadow },
  memberCard: { position: "relative", minHeight: 230, overflow: "hidden", padding: 19, borderRadius: 28, borderBottomLeftRadius: 15, ...shadow },
  memberTop: { zIndex: 2, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  memberBrand: { color: colors.white, fontSize: 18, lineHeight: 21, fontWeight: "700", letterSpacing: 1.7 },
  memberProduct: { marginTop: 1, color: "rgba(255,255,255,.84)", fontSize: 8, fontWeight: "700", letterSpacing: 1.3 },
  memberLevel: { maxWidth: "48%", paddingHorizontal: 9, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,.34)", borderRadius: 10, backgroundColor: "rgba(255,255,255,.14)" },
  memberLevelText: { color: colors.white, fontSize: 8, fontWeight: "700", textAlign: "center", letterSpacing: .45 },
  memberIdentity: { zIndex: 2, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 },
  memberChip: { width: 48, height: 38, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.42)", borderRadius: 12, backgroundColor: "rgba(255,255,255,.16)" },
  memberIdentityCopy: { minWidth: 0, flex: 1 },
  memberLabel: { color: "rgba(255,255,255,.82)", fontSize: 7, fontWeight: "700", letterSpacing: 1 },
  memberNumber: { marginTop: 2, color: colors.white, fontSize: 16, lineHeight: 20, fontWeight: "700", letterSpacing: 1 },
  memberHolder: { marginTop: 2, color: "rgba(255,255,255,.9)", fontSize: 10, fontWeight: "600" },
  memberSeal: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "rgba(255,255,255,.15)" },
  memberBottom: { zIndex: 2, flexDirection: "row", alignItems: "flex-end", gap: 18, marginTop: 17, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.22)" },
  memberPet: { minWidth: 0, flex: 1 },
  memberMetaValue: { marginTop: 2, color: colors.white, fontSize: 10, fontWeight: "700" },
  memberTagline: { zIndex: 2, marginTop: 12, color: "rgba(255,255,255,.84)", fontSize: 8, fontWeight: "600", letterSpacing: .35 },
  heroContent: { zIndex: 2, width: "75%", padding: 20 },
  heroTitle: { maxWidth: 230, marginTop: 10, color: colors.white, fontSize: typography.screenTitle, lineHeight: 26, fontWeight: "700", letterSpacing: -0.4 },
  heroNote: { maxWidth: 230, marginTop: 6, color: "rgba(255,255,255,.88)", fontSize: typography.label, lineHeight: 17 },
  heroMoment: { maxWidth: 222, minHeight: 50, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 8, borderWidth: 1, borderColor: "rgba(255,255,255,.42)", borderRadius: 15, backgroundColor: "rgba(255,255,255,.2)" },
  heroMomentIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: "rgba(255,255,255,.92)" },
  heroMomentCopy: { minWidth: 0, flex: 1 },
  heroMomentEyebrow: { color: "rgba(255,255,255,.9)", fontSize: 7, fontWeight: "600", letterSpacing: 0.6 },
  heroMomentText: { marginTop: 2, color: colors.white, fontSize: 10, fontWeight: "600" },
  heroMomentEmoji: { fontSize: 15 },
  heroOrbLarge: { position: "absolute", right: -62, top: -88, width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,.14)" },
  heroOrbSmall: { position: "absolute", right: 48, bottom: -62, width: 125, height: 125, borderRadius: 63, backgroundColor: "rgba(255,255,255,.1)" },
  petBubble: { position: "absolute", zIndex: 1, right: 12, bottom: 18, width: 98, height: 108, borderWidth: 1, borderColor: "rgba(255,255,255,.42)", borderRadius: 44, backgroundColor: "rgba(255,255,255,.22)", transform: [{ rotate: "5deg" }] },
  petBubbleDog: { position: "absolute", left: 10, bottom: 15, width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: "rgba(255,255,255,.18)" },
  petBubbleCat: { position: "absolute", right: 8, top: 20, width: 39, height: 39, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(255,255,255,.18)" },
  petBubbleSparkle: { position: "absolute", right: 9, top: 12, color: colors.white, fontSize: 19, fontWeight: "700" },
  quickPanel: { marginTop: 16, padding: 13, overflow: "hidden", borderWidth: 1, borderColor: colors.sky100, borderRadius: 26, borderBottomLeftRadius: 14, backgroundColor: colors.sky25, ...shadow },
  quickHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  quickTitle: { color: colors.navy, fontSize: typography.cardTitle, lineHeight: 19, fontWeight: "600" },
  quickSubtitle: { marginTop: 1, color: colors.muted, fontSize: typography.caption },
  quickBadge: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, borderRadius: radius.sm, backgroundColor: colors.sky50 },
  quickBadgeText: { color: colors.sky600, fontSize: 9, fontWeight: "600" },
  quickFeatureRow: { flexDirection: "row", gap: 8, marginTop: 11 },
  quickFeaturePressable: { minWidth: 0, flex: 1 },
  quickFeatureCard: { minHeight: 104, justifyContent: "flex-end", overflow: "hidden", padding: 13, borderRadius: 23, borderBottomLeftRadius: 11 },
  quickFeatureTop: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickFeatureIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.92)" },
  quickFeatureEmoji: { fontSize: 21 },
  quickFeatureArrow: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.18)", transform: [{ rotate: "45deg" }] },
  quickFeatureLabel: { color: colors.white, fontSize: typography.body, fontWeight: "700" },
  quickFeatureNote: { marginTop: 2, color: "rgba(255,255,255,.9)", fontSize: 9 },
  quickMiniRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  quickMiniCard: { minWidth: 0, flex: 1, minHeight: 88, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderWidth: 1, borderColor: colors.sky100, borderRadius: 20, borderBottomLeftRadius: 9, backgroundColor: colors.white },
  quickMiniIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  quickMiniEmoji: { fontSize: 20 },
  quickMiniLabel: { minHeight: 25, marginTop: 5, color: colors.navy, fontSize: 9, lineHeight: 11, fontWeight: "600", textAlign: "center" },
  quickMiniNote: { color: colors.muted, fontSize: 8, textAlign: "center" },
  sectionBlock: { marginTop: 24 },
  sectionHeader: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  sectionHeaderIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  blueSectionIcon: { backgroundColor: colors.sky50 },
  mintSectionIcon: { backgroundColor: colors.mint50 },
  violetSectionIcon: { backgroundColor: colors.violet50 },
  sectionHeaderCopy: { minWidth: 0, flex: 1 },
  sectionEyebrow: { color: colors.muted, fontSize: 8, fontWeight: "600", letterSpacing: 0.9 },
  sectionHeading: { marginTop: 1, color: colors.navy, fontSize: typography.sectionTitle, lineHeight: 20, fontWeight: "700", letterSpacing: -0.2 },
  sectionNote: { marginTop: 1, color: colors.muted, fontSize: 9 },
  sectionAction: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, borderRadius: 11, backgroundColor: colors.sky50 },
  sectionActionText: { color: colors.sky600, fontSize: 10, fontWeight: "600" },
  healthCard: { position: "relative", overflow: "hidden", padding: 14, borderRadius: 28, borderBottomLeftRadius: 15, shadowColor: "#087FC7", shadowOpacity: 0.18, shadowRadius: 17, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  healthGlowLarge: { position: "absolute", right: -55, top: -78, width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(255,255,255,.15)" },
  healthGlowSmall: { position: "absolute", left: -35, bottom: 36, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,.08)" },
  healthTop: { zIndex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  petAvatar: { position: "relative", width: 52, height: 52, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.68)", borderRadius: 18, backgroundColor: "rgba(255,255,255,.94)" },
  petAvatarEmoji: { fontSize: 28 },
  checkDot: { position: "absolute", right: -3, bottom: -3, width: 18, height: 18, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.white, borderRadius: 9, backgroundColor: colors.mint },
  healthCopy: { minWidth: 0, flex: 1, gap: 2 },
  activePetLabel: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: "rgba(255,255,255,.2)" },
  activePetPulse: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#BFFFEF" },
  activePetLabelText: { color: colors.white, fontSize: 8, fontWeight: "600", letterSpacing: 0.5 },
  petName: { color: colors.white, fontSize: 16, lineHeight: 20, fontWeight: "700" },
  petMeta: { color: "rgba(255,255,255,.9)", fontSize: 10 },
  petSwitchButton: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, borderWidth: 1, borderColor: "rgba(255,255,255,.38)", borderRadius: 11, backgroundColor: "rgba(255,255,255,.14)" },
  petSwitchText: { color: colors.white, fontSize: 10, fontWeight: "600" },
  healthOverview: { zIndex: 1, minWidth: 0, flexDirection: "row", gap: 8, marginTop: 12 },
  healthScoreWrap: { width: 112, alignItems: "center", justifyContent: "center", padding: 9, borderWidth: 1, borderColor: "rgba(255,255,255,.28)", borderRadius: 17, backgroundColor: "rgba(255,255,255,.14)" },
  scoreCircle: { width: 60, height: 60, flexDirection: "row", alignItems: "baseline", justifyContent: "center", paddingTop: 14, borderWidth: 5, borderColor: "rgba(255,255,255,.52)", borderRadius: 30, backgroundColor: colors.white },
  scoreValue: { color: colors.navy, fontSize: 18, lineHeight: 22, fontWeight: "700" },
  scoreLabel: { color: colors.muted, fontSize: 8, fontWeight: "600" },
  healthStatus: { marginTop: 5, color: colors.white, fontSize: 10, fontWeight: "600" },
  updated: { marginTop: 1, color: "rgba(255,255,255,.9)", fontSize: 8 },
  metricStack: { minWidth: 0, flex: 1, gap: 7 },
  metric: { minHeight: 55, flexDirection: "row", alignItems: "center", gap: 9, padding: 9, borderWidth: 1, borderColor: "rgba(255,255,255,.62)", borderRadius: 15, backgroundColor: "rgba(255,255,255,.93)" },
  metricIcon: { width: 33, height: 33, alignItems: "center", justifyContent: "center", borderRadius: 11 },
  metricIconMint: { backgroundColor: colors.mint50 },
  metricIconViolet: { backgroundColor: colors.violet50 },
  metricCopy: { minWidth: 0, flex: 1 },
  metricLabel: { color: colors.muted, fontSize: 9 },
  metricValue: { marginTop: 1, color: colors.navy, fontSize: 11, fontWeight: "700" },
  insight: { zIndex: 1, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9, padding: 10, borderRadius: 14, backgroundColor: "rgba(255,255,255,.96)" },
  insightIcon: { width: 32, height: 32, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.sky50 },
  insightCopy: { minWidth: 0, flex: 1, gap: 2 },
  insightTitle: { color: "#315E7C", fontSize: 11, fontWeight: "600" },
  insightText: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  insightArrow: { width: 26, height: 26, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.sky600 },
  careCard: { position: "relative", overflow: "hidden", padding: 14, borderWidth: 1, borderColor: "#D5F3EB", borderRadius: 28, borderBottomLeftRadius: 15, shadowColor: "#238A7A", shadowOpacity: 0.1, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  careGlow: { position: "absolute", right: -42, top: -58, width: 135, height: 135, borderRadius: 68, backgroundColor: "rgba(38,190,161,.08)" },
  careRow: { zIndex: 1, minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  careDivider: { borderBottomWidth: 1, borderBottomColor: "rgba(120,177,170,.16)" },
  careTimeline: { alignSelf: "stretch", alignItems: "center", justifyContent: "center" },
  careIcon: { zIndex: 1, width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  careEmoji: { fontSize: 19 },
  careLine: { position: "absolute", top: "72%", bottom: -18, width: 2, backgroundColor: "#D9F2EB" },
  careCopy: { minWidth: 0, flex: 1, gap: 2 },
  careTimePill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: colors.mint50 },
  careTime: { color: "#14836E", fontSize: 9, fontWeight: "600" },
  careTitle: { color: colors.navy, fontSize: typography.body, fontWeight: "600" },
  careNote: { color: colors.muted, fontSize: typography.caption, lineHeight: 14 },
  careArrow: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.sky50 },
  emptyCare: { zIndex: 1, minHeight: 112, flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 3, paddingVertical: 8 },
  emptyCareVisual: { position: "relative", width: 78, height: 78, alignItems: "center", justifyContent: "center" },
  emptyCareOrbit: { position: "absolute", width: 72, height: 72, borderWidth: 1, borderColor: "#BDEADF", borderStyle: "dashed", borderRadius: 36 },
  emptyCareIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: colors.mint50, transform: [{ rotate: "-5deg" }] },
  emptyCareSpark: { position: "absolute", right: 1, top: 4, width: 23, height: 23, alignItems: "center", justifyContent: "center", borderRadius: 9, backgroundColor: colors.violet50 },
  emptyCareCopy: { minWidth: 0, flex: 1 },
  emptyCareBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, backgroundColor: colors.yellow50 },
  emptyCareBadgeText: { color: "#9A6B13", fontSize: 8, fontWeight: "600", letterSpacing: 0.3 },
  emptyCareTitle: { marginTop: 6, color: colors.navy, fontSize: typography.cardTitle, fontWeight: "700" },
  careCta: { zIndex: 1, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 6, padding: 8, borderWidth: 1, borderColor: colors.sky100, borderRadius: 15, backgroundColor: "rgba(255,255,255,.92)" },
  careCtaIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.sky50 },
  careCtaCopy: { minWidth: 0, flex: 1 },
  careCtaTitle: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  careCtaNote: { marginTop: 1, color: colors.muted, fontSize: 9 },
  careCtaArrow: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.sky600 },
  serviceScroll: { gap: 11, paddingRight: 16, paddingBottom: 7 },
  serviceCard: { width: 188, overflow: "hidden", borderWidth: 1, borderColor: colors.sky100, borderRadius: 25, borderBottomLeftRadius: 13, backgroundColor: colors.white, shadowColor: "#396E91", shadowOpacity: 0.11, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  serviceVisual: { position: "relative", height: 112, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  serviceImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" },
  serviceVisualTop: { position: "absolute", zIndex: 2, left: 9, right: 9, top: 9, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  serviceFavorite: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.72)", borderRadius: 10, backgroundColor: "rgba(255,255,255,.76)" },
  serviceShine: { position: "absolute", right: -24, top: -34, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,.62)" },
  serviceEmojiWrap: { width: 62, height: 62, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.72)", borderRadius: 23, backgroundColor: "rgba(255,255,255,.66)", transform: [{ rotate: "-4deg" }] },
  serviceEmoji: { fontSize: 37 },
  topPick: { position: "absolute", right: 9, bottom: 8, flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 7, backgroundColor: "rgba(255,255,255,.8)" },
  topPickText: { color: "#6757C9", fontSize: 7, fontWeight: "600", letterSpacing: 0.3 },
  serviceCardBody: { padding: 10 },
  serviceName: { color: colors.navy, fontSize: typography.body, fontWeight: "700" },
  serviceLocation: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  serviceLocationText: { minWidth: 0, flex: 1, color: colors.muted, fontSize: 9 },
  serviceMeta: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 4, marginTop: 7 },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: colors.yellow50 },
  ratingText: { color: "#9B6B11", fontSize: 9, fontWeight: "600" },
  serviceMetaDot: { color: colors.muted, fontSize: 9 },
  serviceMetaText: { flexShrink: 1, color: colors.muted, fontSize: 9 },
  serviceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 5, marginTop: 8 },
  servicePrice: { minWidth: 0, flex: 1, color: colors.sky600, fontSize: 11, fontWeight: "700" },
  bookPill: { minHeight: 29, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, borderRadius: 10, backgroundColor: colors.sky600 },
  bookPillText: { color: colors.white, fontSize: 9, fontWeight: "600" },
  doctorScroll: { gap: 11, paddingRight: 16, paddingBottom: 7 },
  doctorCard: { width: 220, padding: 13, borderWidth: 1, borderColor: colors.sky100, borderRadius: 23, borderBottomLeftRadius: 11, backgroundColor: colors.white, ...shadow },
  doctorTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  doctorAvatar: { position: "relative", width: 54, height: 54, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 18, borderBottomLeftRadius: 8, backgroundColor: colors.sky50 },
  doctorImage: { width: "100%", height: "100%" },
  doctorOnline: { position: "absolute", right: 3, bottom: 3, width: 10, height: 10, borderWidth: 2, borderColor: colors.white, borderRadius: 5, backgroundColor: colors.mint },
  doctorRating: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.yellow50 },
  doctorRatingText: { color: "#9B6B11", fontSize: 9, fontWeight: "700" },
  doctorName: { marginTop: 10, color: colors.navy, fontSize: 13, fontWeight: "700" },
  doctorSpecialty: { minHeight: 30, marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 15 },
  doctorMeta: { marginTop: 6, color: "#55778E", fontSize: 9 },
  doctorAction: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10, borderRadius: 12, backgroundColor: colors.sky600 },
  doctorActionText: { color: colors.white, fontSize: 10, fontWeight: "700" },
  petPickerBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14,32,55,.46)" },
  petPickerSafe: { justifyContent: "flex-end" },
  petPickerSheet: { gap: 8, paddingHorizontal: 16, paddingTop: 9, paddingBottom: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white },
  petPickerHandle: { width: 42, height: 5, alignSelf: "center", marginBottom: 6, borderRadius: 3, backgroundColor: colors.line },
  petPickerEyebrow: { color: colors.sky600, fontSize: 9, fontWeight: "700", letterSpacing: .8 },
  petPickerTitle: { color: colors.navy, fontSize: 20, fontWeight: "700" },
  petPickerNote: { marginBottom: 6, color: colors.muted, fontSize: 11, lineHeight: 17 },
  petPickerItem: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, padding: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: colors.white },
  petPickerItemActive: { borderColor: colors.sky600, backgroundColor: colors.sky50 },
  petPickerAvatar: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.peach50 },
  petPickerEmoji: { fontSize: 23 },
  petPickerCopy: { minWidth: 0, flex: 1 },
  petPickerName: { color: colors.navy, fontSize: 13, fontWeight: "700" },
  petPickerMeta: { marginTop: 2, color: colors.muted, fontSize: 10 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  searchBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(14,32,55,.42)" },
  searchSheet: { width: "100%", height: "86%", overflow: "hidden", borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: colors.canvas },
  searchSheetSafe: { flex: 1 },
  searchHandle: { alignSelf: "center", width: 42, height: 5, marginTop: 9, marginBottom: 5, borderRadius: 3, backgroundColor: "#D7E3EA" },
  searchHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  searchBack: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.sky50 },
  searchInputWrap: { minWidth: 0, flex: 1, height: 42, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: radius.md, backgroundColor: colors.canvas },
  searchInput: { minWidth: 0, flex: 1, height: 40, padding: 0, color: colors.text, fontSize: typography.input },
  searchCategories: { gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 10, backgroundColor: colors.white },
  searchCategory: { height: 32, alignItems: "center", justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white },
  searchCategoryActive: { borderColor: colors.sky600, backgroundColor: colors.sky600 },
  searchCategoryText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  searchCategoryTextActive: { color: colors.white },
  searchBody: { flex: 1 },
  searchContent: { flexGrow: 1, padding: spacing.lg, paddingBottom: 40 },
  searchEyebrow: { color: colors.muted, fontSize: 9, fontWeight: "600", letterSpacing: 0.9 },
  searchTitle: { marginTop: 4, color: colors.navy, fontSize: typography.sectionTitle, fontWeight: "600" },
  suggestionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  suggestion: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, borderRadius: 12, backgroundColor: colors.white, ...shadow },
  suggestionText: { color: colors.text, fontSize: typography.label, fontWeight: "700" },
  searchHint: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22, padding: 12, borderRadius: radius.md, backgroundColor: colors.sky50 },
  searchHintIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.white },
  searchHintText: { flex: 1, color: "#55778E", fontSize: 11, lineHeight: 16 },
  searchState: { flex: 1, minHeight: 310, alignItems: "center", justifyContent: "center", gap: 8 },
  searchStateTitle: { color: colors.navy, fontSize: typography.cardTitle, fontWeight: "600" },
  searchStateText: { maxWidth: 270, color: colors.muted, fontSize: typography.label, lineHeight: 17, textAlign: "center" },
  searchEmptyIcon: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.sky50 },
  searchResults: { gap: 8 },
  searchResult: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.white, ...shadow },
  searchResultIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.sky50 },
  searchResultCopy: { minWidth: 0, flex: 1 },
  searchResultTitle: { color: colors.navy, fontSize: typography.body, fontWeight: "600" },
  searchResultMeta: { marginTop: 3, color: colors.muted, fontSize: typography.caption, lineHeight: 14, textTransform: "capitalize" },
});
