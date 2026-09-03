import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getMobileGlobalSearch,
  type MobileActivity,
  type MobileGlobalSearchResult,
} from "../api";
import type { PetView, Service } from "../data";
import { colors, radius, shadow, spacing, typography } from "../theme";
import {
  Card,
  Pill,
  PrimaryButton,
  Screen,
  SoftButton,
} from "../components/ui";

type Props = {
  onAction: (message: string) => void;
  onBook: (service?: Service) => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  onSearchResult: (result: MobileGlobalSearchResult) => void;
  onNavigate: (tab: "discover" | "world" | "activity" | "health") => void;
  ownerName?: string;
  pet?: PetView;
  services: Service[];
  activities: MobileActivity[];
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
        <Ionicons name={icon} size={17} color={tone === "blue" ? colors.sky600 : tone === "mint" ? "#168773" : "#6757C9"} />
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
              placeholderTextColor="#8CA0B0"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {query ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Hapus pencarian" hitSlop={8} onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color="#A4B2BD" />
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
                  <Ionicons name="chevron-forward" size={17} color="#A1AFBA" />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.searchState}>
              <Text style={styles.searchEmptyEmoji}>{failed ? "📡" : "🔎"}</Text>
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
  onAction,
  onBook,
  onOpenChat,
  onOpenNotifications,
  onSearchResult,
  onNavigate,
  ownerName,
  pet,
  services,
  activities,
}: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const petView = pet ?? { id: "", name: "pet kamu", breed: "Login untuk melihat profil", age: "—", weight: "—", icon: "🐾", score: 0, allergies: "" };
  const featuredActivities = activities.slice(0, 3);
  const homeCare = services.find((item) => item.category.toLowerCase().includes("home"));
  const hotel = services.find((item) => item.category.toLowerCase().includes("hotel"));
  const firstName = ownerName?.trim().split(" ")[0];
  const primaryQuickActions = [
    { label: "Booking", note: "Atur jadwal klinik", emoji: "📅", gradient: ["#0588D4", "#43C2F7"] as const, onPress: () => onBook() },
    { label: "Tanya Dokter", note: "Konsultasi online", emoji: "👩🏻‍⚕️", gradient: ["#16A98E", "#62D9C3"] as const, onPress: onOpenChat },
  ];
  const secondaryQuickActions = [
    { label: "Home Care", note: "Ke rumah", emoji: "🏠", color: colors.peach50, onPress: () => homeCare ? onBook(homeCare) : onNavigate("discover") },
    { label: "Darurat", note: "24 jam", emoji: "🚑", color: colors.red50, onPress: () => onAction("Menghubungkan hotline darurat 24/7") },
    { label: "Pet Hotel", note: "Terpercaya", emoji: "🏡", color: colors.violet50, onPress: () => hotel ? onBook(hotel) : onNavigate("discover") },
    { label: "Sliva World", note: "Eksplorasi", emoji: "🌐", color: colors.sky50, onPress: () => onNavigate("world") },
  ];

  return (
    <>
      <Screen contentStyle={styles.screenContent}>
        <View style={styles.homeHeader}>
          <Pressable accessibilityRole="search" accessibilityLabel="Cari di seluruh Slivadoc" onPress={() => setSearchOpen(true)} style={({ pressed }) => [styles.searchLauncher, pressed && styles.pressed]}>
            <Ionicons name="search" size={18} color={colors.sky600} />
            <TextInput editable={false} pointerEvents="none" placeholder="Cari dokter, layanan, produk…" placeholderTextColor="#8398A9" style={styles.searchLauncherInput} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Buka notifikasi" onPress={onOpenNotifications} style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        <View style={styles.greetingRow}>
          <View style={styles.greetingCopy}>
            <Text style={styles.greeting}>{firstName ? `Hai, ${firstName}! 👋` : "Hai, Pet Parent! 👋"}</Text>
            <Text numberOfLines={2} style={styles.greetingNote}>{firstName ? "Yuk, cek kebutuhan pet-mu hari ini." : "Semua kebutuhan pet jadi lebih gampang."}</Text>
          </View>
          <View style={styles.greetingSparkle}><Ionicons name="sparkles" size={17} color={colors.sky600} /></View>
        </View>

        <LinearGradient colors={["#078DD8", "#23B2F3", "#8ADDF9"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroOrbLarge} />
          <View style={styles.heroOrbSmall} />
          <View style={styles.petBubble}>
            <Text style={styles.petBubbleDog}>🐕</Text>
            <Text style={styles.petBubbleCat}>🐈</Text>
            <Text style={styles.petBubbleSparkle}>✦</Text>
          </View>
          <View style={styles.heroContent}>
            <Pill tone="mint">PET CARE, MADE EASY</Pill>
            <Text style={styles.heroTitle}>Rawat mereka tanpa ribet.</Text>
            <Text style={styles.heroNote}>Booking dan konsultasi untuk {petView.name}, langsung dari satu tempat.</Text>
            <View style={styles.heroButtons}>
              <PrimaryButton compact light label="Buat booking" icon="calendar-outline" onPress={() => onBook()} />
              <Pressable accessibilityRole="button" onPress={onOpenChat} style={styles.heroGhost}>
                <Ionicons name="chatbubble-outline" size={14} color={colors.white} />
                <Text style={styles.heroGhostText}>Tanya dokter</Text>
              </Pressable>
            </View>
          </View>
        </LinearGradient>

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
                  <View style={styles.quickFeatureTop}><View style={styles.quickFeatureIcon}><Text style={styles.quickFeatureEmoji}>{item.emoji}</Text></View><View style={styles.quickFeatureArrow}><Ionicons name="arrow-up" size={13} color={colors.white} /></View></View>
                  <Text style={styles.quickFeatureLabel}>{item.label}</Text>
                  <Text style={styles.quickFeatureNote}>{item.note}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
          <View style={styles.quickMiniRow}>
            {secondaryQuickActions.map((item) => (
              <Pressable key={item.label} accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.quickMiniCard, pressed && styles.pressed]}>
                <View style={[styles.quickMiniIcon, { backgroundColor: item.color }]}><Text style={styles.quickMiniEmoji}>{item.emoji}</Text></View>
                <Text numberOfLines={2} style={styles.quickMiniLabel}>{item.label}</Text>
                <Text numberOfLines={1} style={styles.quickMiniNote}>{item.note}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <HomeSectionHeader icon="heart" eyebrow="HEALTH SNAPSHOT" title={`Kondisi ${petView.name}`} note="Pantau kesehatan tanpa ribet" action="Detail" onAction={() => onNavigate("health")} tone="blue" />
          <LinearGradient colors={["#FFFFFF", "#EFF9FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.healthCard}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Ganti profil pet aktif, saat ini ${petView.name}`} onPress={() => onAction("Pilih profil hewan")} style={({ pressed }) => [styles.healthTop, pressed && styles.pressed]}>
              <View style={styles.petAvatar}><Text style={styles.petAvatarEmoji}>{petView.icon}</Text><View style={styles.checkDot}><Ionicons name="checkmark" size={10} color={colors.white} /></View></View>
              <View style={styles.healthCopy}>
                <View style={styles.activePetLabel}><Text style={styles.activePetLabelText}>PET AKTIF</Text><Ionicons name="swap-horizontal" size={11} color={colors.sky600} /></View>
                <Text numberOfLines={1} style={styles.petName}>{petView.name}</Text>
                <Text numberOfLines={1} style={styles.petMeta}>{petView.breed} • {petView.age}</Text>
                <Text style={styles.updated}>{petView.lastUpdated ? `Update ${new Date(petView.lastUpdated).toLocaleDateString("id-ID")}` : "Belum ada rekam medis"}</Text>
              </View>
              <View style={styles.healthScoreWrap}><View style={styles.scoreCircle}><Text style={styles.scoreValue}>{petView.score}</Text><Text style={styles.scoreLabel}>Health</Text></View><Ionicons name="chevron-down" size={13} color={colors.sky600} /></View>
            </Pressable>
            <View style={styles.metricRow}>
              <View style={[styles.metric, styles.metricBlue]}><Text style={styles.metricEmoji}>⚖️</Text><Text style={styles.metricLabel}>Berat</Text><Text style={styles.metricValue}>{petView.weight}</Text></View>
              <View style={[styles.metric, styles.metricMint]}><Text style={styles.metricEmoji}>📋</Text><Text style={styles.metricLabel}>Aktivitas</Text><Text style={styles.metricValue}>{activities.length} terbaru</Text></View>
              <View style={[styles.metric, styles.metricViolet]}><Text style={styles.metricEmoji}>🛡️</Text><Text style={styles.metricLabel}>Health score</Text><Text style={styles.metricValue}>{petView.score}/100</Text></View>
            </View>
            <View style={styles.insight}>
              <View style={styles.insightIcon}><Ionicons name="bulb-outline" size={17} color={colors.sky600} /></View>
              <View style={styles.insightCopy}><Text style={styles.insightTitle}>Insight untuk {petView.name}</Text><Text numberOfLines={2} style={styles.insightText}>{activities[0]?.description || "Belum ada aktivitas kesehatan terjadwal."}</Text></View>
              <Pressable hitSlop={8} onPress={() => onNavigate("activity")}><Ionicons name="arrow-forward" size={16} color={colors.sky600} /></Pressable>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.sectionBlock}>
          <HomeSectionHeader icon="calendar" eyebrow="CARE PLAN" title="Perawatan terdekat" note="Biar jadwal nggak kelewat" action="Semua" onAction={() => onNavigate("activity")} tone="mint" />
          <Card style={styles.careCard}>
            {featuredActivities.map((item, index) => (
              <Pressable key={item.id} onPress={() => onAction(`Detail ${item.title}`)} style={[styles.careRow, index < featuredActivities.length - 1 && styles.careDivider]}>
                <View style={[styles.careIcon, item.category === "health" ? styles.mint : item.category === "booking" ? styles.violet : styles.blue]}><Text>{item.category === "health" ? "🩺" : item.category === "booking" ? "📅" : "📋"}</Text></View>
                <View style={styles.careCopy}>
                  <Text style={styles.careTime}>{new Date(item.starts_at || item.occurred_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                  <Text numberOfLines={1} style={styles.careTitle}>{item.title}</Text>
                  <Text numberOfLines={2} style={styles.careNote}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#A3AFBC" />
              </Pressable>
            ))}
            {featuredActivities.length === 0 ? <View style={styles.emptyCare}><Text style={styles.emptyCareEmoji}>🗓️</Text><View><Text style={styles.emptyCareTitle}>Jadwal masih kosong</Text><Text style={styles.careNote}>Booking pertama kamu akan muncul di sini.</Text></View></View> : null}
            <SoftButton label="Lihat semua aktivitas" icon="arrow-forward" onPress={() => onNavigate("activity")} style={styles.reminderButton} />
          </Card>
        </View>

        <View style={styles.sectionBlock}>
          <HomeSectionHeader icon="sparkles" eyebrow="REKOMENDASI" title={`Pilihan untuk ${petView.name}`} note="Favorit pet parent di sekitarmu" action="Jelajahi" onAction={() => onNavigate("discover")} tone="violet" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceScroll}>
            {services.map((service) => (
              <Pressable key={service.id} onPress={() => onBook(service)} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
                <View style={[styles.serviceVisual, service.tone === "mint" ? styles.mint : service.tone === "violet" ? styles.violet : service.tone === "peach" ? styles.peach : styles.blue]}>
                  <View style={styles.serviceShine} />
                  <Text style={styles.serviceEmoji}>{service.icon}</Text>
                  <Pill>{service.category}</Pill>
                </View>
                <Text numberOfLines={1} style={styles.serviceName}>{service.name}</Text>
                <View style={styles.serviceMeta}>
                  <Ionicons name="star" size={10} color={colors.yellow} />
                  <Text style={styles.serviceMetaText}>{service.rating}</Text>
                  <Text style={styles.serviceMetaText}>•</Text>
                  <Text numberOfLines={1} style={styles.serviceMetaText}>{service.distance}</Text>
                </View>
                <View style={styles.serviceFooter}><Text numberOfLines={1} style={styles.servicePrice}>{service.price}</Text><View style={styles.bookCircle}><Ionicons name="arrow-forward" size={14} color={colors.white} /></View></View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Screen>
      <HomeSearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} onChoose={onSearchResult} />
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingTop: spacing.xs },
  homeHeader: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 9 },
  searchLauncher: { minWidth: 0, flex: 1, height: 42, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, ...shadow },
  searchLauncherInput: { minWidth: 0, flex: 1, height: 40, padding: 0, color: colors.text, fontSize: typography.body },
  notificationButton: { position: "relative", width: 42, height: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white },
  notificationDot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.white, backgroundColor: colors.red },
  greetingRow: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 12 },
  greetingCopy: { minWidth: 0, flex: 1 },
  greeting: { color: colors.navy, fontSize: 18, lineHeight: 23, fontWeight: "800", letterSpacing: -0.2 },
  greetingNote: { marginTop: 2, color: colors.muted, fontSize: typography.label, lineHeight: 17 },
  greetingSparkle: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.sky50, transform: [{ rotate: "-6deg" }] },
  hero: { position: "relative", minHeight: 208, overflow: "hidden", justifyContent: "center", borderRadius: 22, ...shadow },
  heroContent: { zIndex: 2, width: "73%", padding: 17 },
  heroTitle: { maxWidth: 230, marginTop: 10, color: colors.white, fontSize: typography.screenTitle, lineHeight: 26, fontWeight: "900", letterSpacing: -0.4 },
  heroNote: { maxWidth: 230, marginTop: 6, color: "rgba(255,255,255,.88)", fontSize: typography.label, lineHeight: 17 },
  heroButtons: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 13 },
  heroGhost: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(255,255,255,.5)", borderRadius: 12, backgroundColor: "rgba(255,255,255,.12)" },
  heroGhostText: { color: colors.white, fontSize: 11, fontWeight: "700" },
  heroOrbLarge: { position: "absolute", right: -62, top: -88, width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,.14)" },
  heroOrbSmall: { position: "absolute", right: 48, bottom: -62, width: 125, height: 125, borderRadius: 63, backgroundColor: "rgba(255,255,255,.1)" },
  petBubble: { position: "absolute", zIndex: 1, right: 12, bottom: 18, width: 98, height: 108, borderWidth: 1, borderColor: "rgba(255,255,255,.42)", borderRadius: 44, backgroundColor: "rgba(255,255,255,.22)", transform: [{ rotate: "5deg" }] },
  petBubbleDog: { position: "absolute", left: 11, bottom: 16, fontSize: 44 },
  petBubbleCat: { position: "absolute", left: 45, bottom: 37, fontSize: 37 },
  petBubbleSparkle: { position: "absolute", right: 9, top: 12, color: colors.white, fontSize: 19, fontWeight: "900" },
  quickPanel: { marginTop: 14, padding: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.sky100, borderRadius: 22, backgroundColor: "#F9FDFF", ...shadow },
  quickHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  quickTitle: { color: colors.navy, fontSize: typography.cardTitle, lineHeight: 19, fontWeight: "800" },
  quickSubtitle: { marginTop: 1, color: colors.muted, fontSize: typography.caption },
  quickBadge: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, borderRadius: radius.sm, backgroundColor: colors.sky50 },
  quickBadgeText: { color: colors.sky600, fontSize: 9, fontWeight: "800" },
  quickFeatureRow: { flexDirection: "row", gap: 8, marginTop: 11 },
  quickFeaturePressable: { minWidth: 0, flex: 1 },
  quickFeatureCard: { minHeight: 104, justifyContent: "flex-end", overflow: "hidden", padding: 11, borderRadius: 17 },
  quickFeatureTop: { position: "absolute", top: 10, left: 10, right: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickFeatureIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.92)" },
  quickFeatureEmoji: { fontSize: 21 },
  quickFeatureArrow: { width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(255,255,255,.18)", transform: [{ rotate: "45deg" }] },
  quickFeatureLabel: { color: colors.white, fontSize: typography.body, fontWeight: "900" },
  quickFeatureNote: { marginTop: 2, color: "rgba(255,255,255,.78)", fontSize: 9 },
  quickMiniRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  quickMiniCard: { minWidth: 0, flex: 1, minHeight: 88, alignItems: "center", justifyContent: "center", paddingHorizontal: 3, borderRadius: 14, backgroundColor: colors.white },
  quickMiniIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  quickMiniEmoji: { fontSize: 20 },
  quickMiniLabel: { minHeight: 25, marginTop: 5, color: colors.navy, fontSize: 9, lineHeight: 11, fontWeight: "800", textAlign: "center" },
  quickMiniNote: { color: colors.muted, fontSize: 8, textAlign: "center" },
  sectionBlock: { marginTop: 25 },
  sectionHeader: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 10 },
  sectionHeaderIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13 },
  blueSectionIcon: { backgroundColor: colors.sky50 },
  mintSectionIcon: { backgroundColor: colors.mint50 },
  violetSectionIcon: { backgroundColor: colors.violet50 },
  sectionHeaderCopy: { minWidth: 0, flex: 1 },
  sectionEyebrow: { color: colors.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.9 },
  sectionHeading: { marginTop: 1, color: colors.navy, fontSize: typography.sectionTitle, lineHeight: 20, fontWeight: "900", letterSpacing: -0.2 },
  sectionNote: { marginTop: 1, color: colors.muted, fontSize: 9 },
  sectionAction: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, borderRadius: 11, backgroundColor: colors.sky50 },
  sectionActionText: { color: colors.sky600, fontSize: 10, fontWeight: "800" },
  healthCard: { overflow: "hidden", padding: 13, borderWidth: 1, borderColor: colors.sky100, borderRadius: 20, ...shadow },
  healthTop: { flexDirection: "row", alignItems: "center", paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: "rgba(85,196,250,.18)" },
  petAvatar: { position: "relative", width: 50, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.yellow50 },
  petAvatarEmoji: { fontSize: 29 },
  checkDot: { position: "absolute", right: -3, bottom: -3, width: 18, height: 18, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.white, borderRadius: 9, backgroundColor: colors.mint },
  healthCopy: { minWidth: 0, flex: 1, gap: 2, marginLeft: 10 },
  activePetLabel: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: colors.sky50 },
  activePetLabelText: { color: colors.sky600, fontSize: 8, fontWeight: "900", letterSpacing: 0.4 },
  petName: { color: colors.navy, fontSize: typography.cardTitle, fontWeight: "900" },
  petMeta: { color: colors.text, fontSize: 11 },
  updated: { color: colors.muted, fontSize: 9 },
  healthScoreWrap: { flexDirection: "row", alignItems: "center", gap: 4 },
  scoreCircle: { width: 50, height: 50, alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: colors.sky400, borderRadius: 25, backgroundColor: colors.white },
  scoreValue: { color: colors.navy, fontSize: typography.cardTitle, fontWeight: "900" },
  scoreLabel: { color: colors.muted, fontSize: 8 },
  metricRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  metric: { flex: 1, minHeight: 66, padding: 8, borderRadius: 12 },
  metricBlue: { backgroundColor: colors.sky50 },
  metricMint: { backgroundColor: colors.mint50 },
  metricViolet: { backgroundColor: colors.violet50 },
  metricEmoji: { fontSize: 16 },
  metricLabel: { marginTop: 3, color: colors.muted, fontSize: 9 },
  metricValue: { marginTop: 1, color: colors.navy, fontSize: 11, fontWeight: "800" },
  insight: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: "#F4FAFE" },
  insightIcon: { width: 31, height: 31, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.white },
  insightCopy: { minWidth: 0, flex: 1, gap: 2 },
  insightTitle: { color: "#315E7C", fontSize: 11, fontWeight: "800" },
  insightText: { color: "#66869A", fontSize: 10, lineHeight: 14 },
  careCard: { padding: 13, borderWidth: 1, borderColor: "#DDF5EF", backgroundColor: "#FCFFFE" },
  careRow: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10 },
  careDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  careIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  blue: { backgroundColor: colors.sky50 },
  mint: { backgroundColor: colors.mint50 },
  violet: { backgroundColor: colors.violet50 },
  peach: { backgroundColor: colors.peach50 },
  careCopy: { minWidth: 0, flex: 1, gap: 2 },
  careTime: { color: colors.sky600, fontSize: 10, fontWeight: "800" },
  careTitle: { color: colors.navy, fontSize: typography.body, fontWeight: "800" },
  careNote: { color: colors.muted, fontSize: typography.caption, lineHeight: 14 },
  emptyCare: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10 },
  emptyCareEmoji: { fontSize: 25 },
  emptyCareTitle: { color: colors.navy, fontSize: typography.body, fontWeight: "800" },
  reminderButton: { marginTop: 10 },
  serviceScroll: { gap: 10, paddingRight: 12, paddingBottom: 5 },
  serviceCard: { width: 174, padding: 9, borderRadius: 17, backgroundColor: colors.white, ...shadow },
  serviceVisual: { position: "relative", height: 78, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 13 },
  serviceShine: { position: "absolute", right: -18, top: -24, width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,.72)" },
  serviceEmoji: { fontSize: 35 },
  serviceName: { marginTop: 8, color: colors.navy, fontSize: typography.body, fontWeight: "800" },
  serviceMeta: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  serviceMetaText: { flexShrink: 1, color: colors.muted, fontSize: 9 },
  serviceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 5, marginTop: 8 },
  servicePrice: { minWidth: 0, flex: 1, color: colors.sky600, fontSize: 11, fontWeight: "800" },
  bookCircle: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.sky500 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
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
  searchCategoryActive: { borderColor: colors.sky500, backgroundColor: colors.sky500 },
  searchCategoryText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  searchCategoryTextActive: { color: colors.white },
  searchBody: { flex: 1 },
  searchContent: { flexGrow: 1, padding: spacing.lg, paddingBottom: 40 },
  searchEyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 0.9 },
  searchTitle: { marginTop: 4, color: colors.navy, fontSize: typography.sectionTitle, fontWeight: "800" },
  suggestionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  suggestion: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, borderRadius: 12, backgroundColor: colors.white, ...shadow },
  suggestionText: { color: colors.text, fontSize: typography.label, fontWeight: "700" },
  searchHint: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22, padding: 12, borderRadius: radius.md, backgroundColor: colors.sky50 },
  searchHintIcon: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: colors.white },
  searchHintText: { flex: 1, color: "#55778E", fontSize: 11, lineHeight: 16 },
  searchState: { flex: 1, minHeight: 310, alignItems: "center", justifyContent: "center", gap: 8 },
  searchStateTitle: { color: colors.navy, fontSize: typography.cardTitle, fontWeight: "800" },
  searchStateText: { maxWidth: 270, color: colors.muted, fontSize: typography.label, lineHeight: 17, textAlign: "center" },
  searchEmptyEmoji: { fontSize: 35 },
  searchResults: { gap: 8 },
  searchResult: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.white, ...shadow },
  searchResultIcon: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: colors.sky50 },
  searchResultCopy: { minWidth: 0, flex: 1 },
  searchResultTitle: { color: colors.navy, fontSize: typography.body, fontWeight: "800" },
  searchResultMeta: { marginTop: 3, color: colors.muted, fontSize: typography.caption, lineHeight: 14, textTransform: "capitalize" },
});
