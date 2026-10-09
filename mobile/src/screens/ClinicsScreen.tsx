import { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { getDiscoveryBranches, type MobileDiscoveryBranch } from "../api";
import { LocationModal } from "../components/LocationModal";
import { LocalizedPressable as Pressable } from "../components/LocalizedPressable";
import { TabRail } from "../components/TabRail";
import { EmptyState, Pill, PrimaryButton, Screen, TopHeader } from "../components/ui";
import {
  RADIUS_OPTIONS_KM,
  branchCountsLabel,
  branchListOptions,
  branchTypeLabel,
  formatDistanceKm,
  type ClinicTypeFilter,
} from "../clinics";
import { useI18n, LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n";
import { DEVICE_LOCATION_LABEL, PIN_LOCATION_LABEL, loadStoredLocation, saveStoredLocation, type StoredLocation } from "../location";
import { colors, shadow } from "../theme";

const PAGE_SIZE = 20;
const TYPE_FILTERS: Array<[ClinicTypeFilter, string]> = [
  ["all", "Semua"],
  ["petclinic", "Klinik"],
  ["petshop", "Petshop"],
];

type Props = {
  authenticated: boolean;
  onRequireLogin: () => void;
  onOpenBranch: (branch: MobileDiscoveryBranch) => void;
  onOpenNotifications: () => void;
};

function SkeletonCard() {
  const [pulse] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || !active) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => {
      active = false;
      loop?.stop();
    };
  }, [pulse]);
  return (
    <Animated.View style={[styles.card, { opacity: pulse }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.logo, styles.skeleton]} />
      <View style={styles.cardBody}>
        <View style={[styles.skeleton, { height: 14, width: "70%" }]} />
        <View style={[styles.skeleton, { height: 11, width: "90%" }]} />
        <View style={[styles.skeleton, { height: 11, width: "50%" }]} />
      </View>
    </Animated.View>
  );
}

function BranchCard({ branch, onPress }: { branch: MobileDiscoveryBranch; onPress: () => void }) {
  const { language, locale, formatNumber } = useI18n();
  const place = [branch.district, branch.city].filter(Boolean).join(", ");
  const open =
    branch.is_open_now === null
      ? { label: "Jam belum diatur", color: colors.muted }
      : branch.is_open_now
        ? { label: "Buka sekarang", color: colors.mint }
        : { label: "Tutup", color: colors.red };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.logo}>
        {branch.logo_url ? (
          <Image source={{ uri: branch.logo_url }} alt={`Logo ${branch.business_name}`} style={styles.logoImage} resizeMode="cover" />
        ) : (
          <Ionicons name={branch.type === "petshop" ? "storefront-outline" : "medkit-outline"} size={26} color={colors.sky600} />
        )}
      </View>
      <View style={styles.cardBody}>
        <Pill tone={branch.type === "petclinic" ? "blue" : branch.type === "petshop" ? "mint" : "violet"}>{branchTypeLabel(branch.type)}</Pill>
        <Text translate={false} numberOfLines={1} style={styles.name}>{branch.business_name}</Text>
        {branch.branch_name && branch.branch_name !== branch.business_name ? (
          <Text translate={false} numberOfLines={1} style={styles.branch}>{branch.branch_name}</Text>
        ) : null}
        <View style={styles.row}>
          <Ionicons name="location-outline" size={12} color={colors.muted} />
          <Text translate={false} numberOfLines={2} style={styles.address}>
            {[branch.distance_km !== null ? formatDistanceKm(branch.distance_km, locale) : "", branch.address || place].filter(Boolean).join(" · ")}
          </Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={12} color={open.color} />
          <Text style={[styles.status, { color: open.color }]}>{open.label}</Text>
          <Text style={styles.dot}>·</Text>
          <Ionicons name="star" size={11} color={colors.yellow} />
          <Text translate={false} numberOfLines={1} style={styles.rating}>
            {language === "en" ? "Store rating" : "Rating toko"}{" "}
            {branch.rating !== null ? `${formatNumber(Math.round(branch.rating * 10) / 10)} (${branch.review_count})` : "-"}
          </Text>
        </View>
        <Text translate={false} style={styles.counts}>{branchCountsLabel(branch.service_count, branch.product_count, language)}</Text>
      </View>
    </Pressable>
  );
}

export function ClinicsScreen({ authenticated, onRequireLogin, onOpenBranch, onOpenNotifications }: Props) {
  const [location, setLocation] = useState<StoredLocation>();
  const [locationReady, setLocationReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [type, setType] = useState<ClinicTypeFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [radiusKm, setRadiusKm] = useState(0);
  const [openNow, setOpenNow] = useState(false);
  const [items, setItems] = useState<MobileDiscoveryBranch[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const request = useRef(0);

  useEffect(() => {
    let active = true;
    void loadStoredLocation().then((stored) => {
      if (!active) return;
      setLocation(stored);
      setLocationReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters = { location, type, search, radiusKm, openNow };
  const filterKey = JSON.stringify(filters);
  useEffect(() => {
    if (!locationReady) return;
    const id = ++request.current;
    queueMicrotask(() => {
      if (id !== request.current) return;
      setLoading(true);
      setError("");
    });
    getDiscoveryBranches(branchListOptions(JSON.parse(filterKey), { limit: PAGE_SIZE, offset: 0 }))
      .then((page) => {
        if (id !== request.current) return;
        setItems(page.data);
        setHasMore(page.has_more);
      })
      .catch((cause) => {
        if (id !== request.current) return;
        setItems([]);
        setHasMore(false);
        setError(cause instanceof Error ? cause.message : "Daftar belum dapat dimuat.");
      })
      .finally(() => {
        if (id === request.current) setLoading(false);
      });
  }, [filterKey, locationReady, attempt]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const id = request.current;
    setLoadingMore(true);
    try {
      const page = await getDiscoveryBranches(branchListOptions(filters, { limit: PAGE_SIZE, offset: items.length }));
      // A filter change meanwhile owns the list; drop this stale page.
      if (id !== request.current) return;
      setItems((current) => [...current, ...page.data.filter((next) => !current.some((item) => item.branch_id === next.branch_id))]);
      setHasMore(page.has_more);
    } catch (cause) {
      if (id === request.current) setError(cause instanceof Error ? cause.message : "Daftar belum dapat dimuat.");
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, hasMore, items.length, loadingMore]);

  const resetFilters = () => {
    setType("all");
    setSearchInput("");
    setSearch("");
    setRadiusKm(0);
    setOpenNow(false);
  };
  const filtered = type !== "all" || search.trim() !== "" || radiusKm > 0 || openNow;

  return (
    <Screen>
      <TopHeader title="Klinik & Petshop" subtitle="Mitra terverifikasi di sekitarmu" onNotification={onOpenNotifications} />

      {location ? (
        <View style={styles.locationBar}>
          <Ionicons name="navigate" size={16} color={colors.sky600} />
          <Text translate={location.label === DEVICE_LOCATION_LABEL || location.label === PIN_LOCATION_LABEL} numberOfLines={1} style={styles.locationLabel}>{location.label}</Text>
          <Pressable accessibilityLabel="Ubah lokasi" onPress={() => setPickerOpen(true)} hitSlop={8}>
            <Text style={styles.locationChange}>Ubah</Text>
          </Pressable>
        </View>
      ) : locationReady ? (
        <View style={styles.banner}>
          <Ionicons name="location-outline" size={20} color={colors.violet} />
          <Text style={styles.bannerText}>Pilih lokasi untuk melihat yang terdekat dan memakai filter radius.</Text>
          <PrimaryButton compact label="Pilih lokasi" onPress={() => setPickerOpen(true)} />
        </View>
      ) : null}

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          accessibilityLabel="Cari klinik atau petshop"
          placeholder="Cari klinik atau petshop"
          value={searchInput}
          onChangeText={setSearchInput}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      <TabRail horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {TYPE_FILTERS.map(([id, label]) => (
          <Pressable key={id} accessibilityState={{ selected: type === id }} onPress={() => setType(id)} style={[styles.chip, type === id && styles.chipActive]}>
            <Text style={[styles.chipText, type === id && styles.chipTextActive]}>{label}</Text>
          </Pressable>
        ))}
        <Pressable accessibilityState={{ selected: openNow }} onPress={() => setOpenNow((value) => !value)} style={[styles.chip, openNow && styles.chipActive]}>
          <Ionicons name="time-outline" size={13} color={openNow ? colors.white : colors.muted} />
          <Text style={[styles.chipText, openNow && styles.chipTextActive]}>Buka sekarang</Text>
        </Pressable>
      </TabRail>

      <Text style={styles.radiusLabel}>{location ? "Radius" : "Radius (pilih lokasi dulu)"}</Text>
      <TabRail horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[0, ...RADIUS_OPTIONS_KM].map((km) => (
          <Pressable
            key={km}
            disabled={!location}
            accessibilityState={{ selected: radiusKm === km, disabled: !location }}
            onPress={() => setRadiusKm(km)}
            style={[styles.chip, radiusKm === km && location && styles.chipActive, !location && styles.chipDisabled]}
          >
            <Text style={[styles.chipText, radiusKm === km && location && styles.chipTextActive]}>{km === 0 ? "Semua" : `${km} km`}</Text>
          </Pressable>
        ))}
      </TabRail>

      <Text style={styles.footnote}>Rating toko dihitung dari semua cabang toko tersebut.</Text>

      {loading ? (
        <View style={styles.list} accessibilityLiveRegion="polite">
          {[0, 1, 2, 3].map((key) => <SkeletonCard key={key} />)}
        </View>
      ) : error && !items.length ? (
        <EmptyState icon="alert-circle-outline" title="Daftar belum dapat dimuat" note={error} action="Coba lagi" onAction={() => setAttempt((value) => value + 1)} />
      ) : !items.length ? (
        <EmptyState
          icon="search-outline"
          title="Belum ada klinik atau petshop"
          note={filtered ? "Coba ubah filter, radius, atau kata kunci." : "Belum ada mitra yang tersedia saat ini."}
          action={filtered ? "Reset filter" : "Muat ulang"}
          onAction={filtered ? resetFilters : () => setAttempt((value) => value + 1)}
        />
      ) : (
        <View style={styles.list}>
          {items.map((branch) => <BranchCard key={branch.branch_id} branch={branch} onPress={() => onOpenBranch(branch)} />)}
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {hasMore ? (
            <Pressable accessibilityLabel="Muat lagi" disabled={loadingMore} onPress={() => void loadMore()} style={styles.more}>
              {loadingMore ? <ActivityIndicator color={colors.sky600} /> : <Text style={styles.moreText}>Muat lagi</Text>}
            </Pressable>
          ) : null}
        </View>
      )}

      <LocationModal
        visible={pickerOpen}
        current={location}
        authenticated={authenticated}
        onRequireLogin={() => {
          setPickerOpen(false);
          onRequireLogin();
        }}
        onSelect={(selected) => {
          setLocation(selected);
          setPickerOpen(false);
          void saveStoredLocation(selected);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  locationBar: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.sky50 },
  locationLabel: { flex: 1, color: colors.navy, fontSize: 13, fontWeight: "600" },
  locationChange: { color: colors.sky600, fontSize: 12, fontWeight: "700" },
  banner: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.violet50 },
  bannerText: { flex: 1, minWidth: 180, color: colors.violet, fontSize: 12, lineHeight: 17, fontWeight: "600" },
  searchBox: { height: 46, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingHorizontal: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 13 },
  chips: { gap: 6, paddingVertical: 10, paddingRight: 14 },
  chip: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  chipActive: { borderColor: colors.sky600, backgroundColor: colors.sky600 },
  chipDisabled: { opacity: 0.5 },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  chipTextActive: { color: colors.white },
  radiusLabel: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  footnote: { marginTop: 2, marginBottom: 10, color: colors.muted, fontSize: 11, lineHeight: 15 },
  list: { gap: 12 },
  card: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  logo: { width: 64, height: 64, borderRadius: 16, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 },
  logoImage: { width: "100%", height: "100%" },
  skeleton: { borderRadius: 8, backgroundColor: colors.sky100 },
  cardBody: { flex: 1, minWidth: 0, gap: 5, alignItems: "flex-start" },
  name: { color: colors.navy, fontSize: 15, lineHeight: 20, fontWeight: "700" },
  branch: { color: colors.text, fontSize: 12, lineHeight: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  address: { flexShrink: 1, color: colors.muted, fontSize: 12, lineHeight: 16 },
  status: { fontSize: 12, fontWeight: "700" },
  dot: { color: colors.muted, fontSize: 12 },
  rating: { flexShrink: 1, color: colors.text, fontSize: 12 },
  counts: { color: colors.sky600, fontSize: 12, fontWeight: "700" },
  error: { color: colors.red, fontSize: 12, textAlign: "center" },
  more: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 1, borderColor: colors.sky200, backgroundColor: colors.white },
  moreText: { color: colors.sky600, fontSize: 13, fontWeight: "700" },
});
