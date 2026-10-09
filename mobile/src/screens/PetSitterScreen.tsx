import { sitterPackageRate, sitterDiscountPercent } from "../../../shared/pet-sitter";
import { useEffect, useRef, useState } from "react";
import {
  useWindowDimensions,
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  RefreshControl,
  Keyboard,
  StyleSheet,
  View,
} from "react-native";
import { LocalizedText as Text, LocalizedTextInput as Input } from "../i18n";
import { LocalizedPressable as Pressable } from "../components/LocalizedPressable";
import { SlivaDatePicker } from "../components/SlivaDatePicker";
import { SlivaOptionPicker } from "../components/SlivaOptionPicker";
import { MobileQrisModal } from "../components/QrisPayment";
import {
  mobileSitterClient as api,
  createMobilePaymentIntent,
  type MobilePaymentIntent,
} from "../api";
import {
  sitterModes,
  sittingCancellationMessage,
  sittingStatuses,
  sittingEndDate,
  sittingToday,
  type PetSitter,
  type SitterDetail,
  type SittingBooking,
  type SittingUpdate,
  type SittingInput,
  type SittingQuote,
} from "../../../shared/pet-sitter";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAppSurface } from "../components/ui";
import { BrandLogo } from "../components/BrandLogo";
import {
  sitterGridColumns,
  sitterDistanceLabel,
  sitterInitials,
  sitterPalette,
  sitterPetOptions,
  sittingDateLabel,
  sittingProgressIndex,
  sittingProgressSteps,
} from "../../../shared/pet-sitter-presentation";
import { colors } from "../theme";
const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
const requestKey = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const n = Math.floor(Math.random() * 16);
    return (c === "x" ? n : (n & 3) | 8).toString(16);
  });
function Action({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        secondary && s.secondary,
        disabled && s.disabled,
        pressed && s.pressed,
      ]}
    >
      <Text style={[s.actionText, secondary && s.secondaryText]}>{title}</Text>
    </Pressable>
  );
}
function Field({
  label,
  value,
  onChange,
  multiline = false,
  phone = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  phone?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Input
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={phone ? "phone-pad" : "default"}
        style={[s.input, multiline && s.textarea]}
      />
    </View>
  );
}
function Disclosure({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.disclosure}>
      <Pressable
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        style={s.disclosureHeader}
        onPress={() => setOpen(!open)}
      >
        <Text style={s.label}>{title}</Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          color="#5d8195"
        />
      </Pressable>
      {open && <View style={s.disclosureContent}>{children}</View>}
    </View>
  );
}
export function PetSitterScreen({
  pets,
  authenticated,
  onLogin,
  initialBookingId,
}: {
  pets: Array<{ id: string; name: string; shared?: boolean }>;
  authenticated: boolean;
  initialBookingId?: string;
  onLogin: () => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const columns = sitterGridColumns(width);
  const cardWidth = (Math.min(width, 1500) - 36 - 10 * (columns - 1)) / columns;
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  }>();
  const [radius, setRadius] = useState(25);
  const [locating, setLocating] = useState(false);
  const { bottomInset } = useAppSurface();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const formTop = useRef(0);
  const chooseFormStep = (step: number) => {
    setFormStep(step);
    scroll.current?.scrollTo({
      y: Math.max(0, formTop.current - 16),
      animated: true,
    });
  };
  const top = () => scroll.current?.scrollTo({ y: 0, animated: true });
  const [tab, setTab] = useState<"find" | "bookings">("find");
  const [city, setCity] = useState("");
  const [species, setSpecies] = useState("");
  const [mode, setMode] = useState("");
  const [list, setList] = useState<PetSitter[]>([]);
  const [detail, setDetail] = useState<SitterDetail>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bookings, setBookings] = useState<SittingBooking[]>([]);
  const [current, setCurrent] = useState<SittingBooking>();
  const [updates, setUpdates] = useState<SittingUpdate[]>([]);
  const [payment, setPayment] = useState<MobilePaymentIntent>();
  const [message, setMessage] = useState("");
  const [review, setReview] = useState("");
  const [rating, setRating] = useState("5");
  const [cancel, setCancel] = useState("");
  const [days, setDays] = useState(1);
  const [quote, setQuote] = useState<SittingQuote>();
  const [input, setInput] = useState<
    Omit<SittingInput, "sitter_id" | "ends_on" | "request_key" | "pet_count">
  >({
    pet_ids: [],
    package: "daily",
    service_mode: "home_visit",
    starts_on: sittingToday(),
    preferred_time: "09:00",
    address: "",
    emergency_phone: "",
    care_notes: "",
  });
  useEffect(() => {
    if (!authenticated || !initialBookingId) return;
    let active = true;
    Promise.all([api.bookings(), api.booking(initialBookingId)])
      .then(([list, detail]) => {
        if (!active) return;
        setBookings(list.data);
        setCurrent(detail.booking);
        setUpdates(detail.updates);
        setTab("bookings");
        setDetail(undefined);
        setPayment(undefined);
      })
      .catch((e: unknown) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Pemesanan belum dapat dimuat",
          );
      });
    return () => {
      active = false;
    };
  }, [authenticated, initialBookingId]);
  const key = useRef("");
  const generation = useRef(0);
  const searchGeneration = useRef(0);
  const change = (q: Partial<typeof input>) => {
    generation.current++;
    setInput((v) => ({ ...v, ...q }));
    setQuote(undefined);
    key.current = "";
  };
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coba lagi sebentar");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let active = true;
    const request = ++searchGeneration.current;
    api
      .list()
      .then((r) => {
        if (active && request === searchGeneration.current) setList(r.data);
      })
      .catch((e) => {
        if (active && request === searchGeneration.current) setError(e.message);
      })
      .finally(() => {
        if (active && request === searchGeneration.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const showBookings = () => {
    if (!authenticated) {
      onLogin();
      return;
    }
    void act(async () => {
      setBookings((await api.bookings()).data);
      setTab("bookings");
      setDetail(undefined);
      top();
    });
  };
  const openBooking = async (id: string) => {
    if (id !== current?.id) setPayment(undefined);
    const r = await api.booking(id);
    setCurrent(r.booking);
    setUpdates(r.updates);
    setMessage("");
    top();
  };
  const payload = (): SittingInput => ({
    ...input,
    sitter_id: detail!.sitter.id,
    ends_on: sittingEndDate(input.starts_on, days),
    pet_count: input.pet_ids.length || 1,
    request_key: key.current || (key.current = requestKey()),
    expected_amount: quote?.total_amount,
  });
  const findSitters = async (
    petType = species,
    position:
      { latitude: number; longitude: number } | null | undefined = location,
    distance = radius,
    area = city,
    service = mode,
  ) => {
    Keyboard.dismiss();
    const request = ++searchGeneration.current;
    setLoading(true);
    setError("");
    try {
      const result = await api.list({
        city: area,
        species: petType,
        mode: service,
        ...(position ? { ...position, max_distance_km: distance } : {}),
      });
      if (request === searchGeneration.current) setList(result.data);
    } catch (error) {
      if (request === searchGeneration.current)
        setError(
          error instanceof Error ? error.message : "Pencarian belum tersedia",
        );
    } finally {
      if (request === searchGeneration.current) setLoading(false);
    }
  };
  const locateSitters = async () => {
    setLocating(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Izinkan akses lokasi atau cari berdasarkan kota.");
        return;
      }
      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const point = {
        latitude: result.coords.latitude,
        longitude: result.coords.longitude,
      };
      setLocation(point);
      setCity("");
      await findSitters(species, point, radius, "");
    } catch {
      setError(
        "Lokasi belum dapat ditemukan. Coba lagi atau cari berdasarkan kota.",
      );
    } finally {
      setLocating(false);
    }
  };
  return (
    <ScrollView
      ref={scroll}
      style={s.scroll}
      contentContainerStyle={[s.screen, { paddingBottom: bottomInset + 120 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        <RefreshControl
          refreshing={tab === "find" ? loading : busy}
          tintColor="#05689f"
          onRefresh={() => {
            if (tab === "find") findSitters();
            else showBookings();
          }}
        />
      }
    >
      <View style={s.pageHeader}>
        <View style={s.brandMark}>
          <BrandLogo size={42} />
        </View>
        <View style={s.flex}>
          <Text style={s.pageTitle}>Pet Sitter</Text>
          <Text style={s.small}>Sedikit bantuan, sepenuh perhatian.</Text>
        </View>
        <View style={s.headerHeart}>
          <Ionicons name="heart-outline" size={20} color="#AF795F" />
        </View>
      </View>
      <View style={s.tabs}>
        <Pressable
          accessibilityLabel="Cari sitter"
          accessibilityState={{ selected: tab === "find" }}
          onPress={() => {
            setTab("find");
            setCurrent(undefined);
            setDetail(undefined);
            top();
          }}
          style={[s.tab, tab === "find" && s.tabActive]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={tab === "find" ? "#05689f" : "#60869a"}
          />
          <Text style={[s.tabText, tab === "find" && s.tabTextActive]}>
            Cari sitter
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Perawatan saya"
          accessibilityState={{ selected: tab === "bookings" }}
          onPress={showBookings}
          style={[s.tab, tab === "bookings" && s.tabActive]}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={tab === "bookings" ? "#05689f" : "#60869a"}
          />
          <Text style={[s.tabText, tab === "bookings" && s.tabTextActive]}>
            Perawatan saya
          </Text>
        </Pressable>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityRole="alert" style={s.notice}>
          {notice}
        </Text>
      ) : null}
      {busy && <ActivityIndicator color={colors.sky600} />}
      {tab === "find" && !detail && (
        <>
          <View style={s.hero}>
            <View style={s.heroCopy}>
              <Text style={s.eyebrow}>TEMAN UNTUK SI KECIL</Text>
              <Text style={s.heroTitle}>Kamu tenang. Mereka senang.</Text>
              <Text style={s.heroDescription}>
                Ditemani sepenuh hati, harian atau mingguan.
              </Text>
            </View>
            <Image
              source={require("../../assets/pet-sitter-companions-cutout.png")}
              style={s.heroImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              accessible={false}
            />
          </View>
          <View style={s.searchRow}>
            <View style={s.searchField}>
              <Ionicons name="location-outline" size={18} color="#5d8195" />
              <Input
                accessibilityLabel="Kota atau kecamatan"
                placeholder="Cari kota atau kecamatan"
                placeholderTextColor="#60869a"
                value={city}
                onChangeText={(value) => {
                  setCity(value);
                  setLocation(undefined);
                }}
                onSubmitEditing={() => findSitters()}
                returnKeyType="search"
                style={s.searchInput}
              />
              <Pressable
                accessibilityLabel="Temukan sitter"
                onPress={() => findSitters()}
                disabled={busy}
                style={s.searchSubmit}
              >
                <Ionicons name="search" size={20} color="#05689f" />
              </Pressable>
            </View>
            <Pressable
              accessibilityLabel="Filter perawatan"
              accessibilityState={{ expanded: filtersOpen }}
              onPress={() => setFiltersOpen(!filtersOpen)}
              style={[
                s.filterButton,
                (filtersOpen || !!mode) && s.filterActive,
              ]}
            >
              <Ionicons name="options-outline" size={21} color="#05689f" />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {sitterPetOptions.map((option) => (
              <Pressable
                key={option.value}
                accessibilityLabel={option.label}
                accessibilityState={{ selected: species === option.value }}
                onPress={() => {
                  setSpecies(option.value);
                  findSitters(option.value);
                }}
                style={[s.chip, species === option.value && s.chipActive]}
              >
                {!option.value && (
                  <Ionicons
                    name="paw-outline"
                    size={13}
                    color={species === "" ? "white" : "#5d8195"}
                  />
                )}
                <Text
                  style={[
                    s.chipText,
                    species === option.value && s.chipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.nearbyRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sitter terdekat"
              disabled={locating || loading}
              accessibilityState={{ selected: !!location }}
              style={[s.nearbyButton, location && s.chipActive]}
              onPress={() => void locateSitters()}
            >
              <Ionicons
                name="navigate-outline"
                size={15}
                color={location ? "white" : colors.sky600}
              />
              <Text style={[s.chipText, location && s.chipTextActive]}>
                {locating ? "Mencari lokasi…" : "Sitter terdekat"}
              </Text>
            </Pressable>
            {(city || species || mode || location) && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset filter"
                style={s.nearbyButton}
                onPress={() => {
                  setCity("");
                  setSpecies("");
                  setMode("");
                  setLocation(undefined);
                  void findSitters("", null, radius, "", "");
                }}
              >
                <Text style={s.chipText}>Reset filter</Text>
              </Pressable>
            )}
          </View>
          {location && (
            <Text style={s.small}>
              Terdekat dalam {radius} km · sesuai jangkauan sitter
            </Text>
          )}
          {filtersOpen && (
            <View style={s.filterPanel}>
              <SlivaOptionPicker
                label="Radius pencarian"
                value={String(radius)}
                onChange={(value) => {
                  setRadius(Number(value));
                  if (location)
                    void findSitters(species, location, Number(value));
                }}
                options={[5, 10, 25, 50, 100].map((km) => ({
                  value: String(km),
                  label: `${km} km`,
                }))}
              />
              <Text style={s.label}>Jenis perawatan</Text>
              <SlivaOptionPicker
                label="Jenis perawatan"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "", label: "Semua layanan" },
                  ...sitterModes,
                ]}
              />
              <Action
                title="Terapkan filter"
                disabled={busy}
                onPress={() => {
                  findSitters();
                  setFiltersOpen(false);
                }}
              />
            </View>
          )}
          <View style={s.sectionHeader}>
            <View style={s.flex}>
              <Text style={s.heading}>Kenalan dengan sitter</Text>
              <Text style={s.small}>
                Temukan teman yang cocok untuk pet-mu.
              </Text>
            </View>
            <Text style={s.count}>{list.length} sitter</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.sky600} />
          ) : list.length === 0 ? (
            <View style={s.panel}>
              <Text style={s.heading}>
                Teman yang tepat sedang kami siapkan
              </Text>
              <Text style={s.copy}>
                Belum ada sitter terverifikasi untuk filter ini. Coba kota atau
                jenis pet lain.
              </Text>
            </View>
          ) : (
            <View style={s.catalogGrid}>
              {list.map((p) => {
                const palette = sitterPalette(p.display_name);
                const savings = p.daily_rate * 7 - sitterPackageRate(p, true);
                return (
                  <View
                    key={p.id}
                    style={[s.sitterCard, { width: cardWidth }]}
                    accessibilityLabel={`Kartu sitter ${p.display_name}`}
                  >
                    <View
                      style={[s.cardBanner, { backgroundColor: palette.soft }]}
                    >
                      <View
                        style={[
                          s.avatar,
                          s.initials,
                          { backgroundColor: palette.background },
                        ]}
                      >
                        {p.photo_url ? (
                          <Image
                            source={{ uri: p.photo_url }}
                            style={s.avatar}
                          />
                        ) : (
                          <Text
                            style={[
                              s.avatarText,
                              { color: palette.foreground },
                            ]}
                          >
                            {sitterInitials(p.display_name)}
                          </Text>
                        )}
                      </View>
                      <View style={s.identity}>
                        <Text style={s.sitterName} numberOfLines={2}>
                          {p.display_name}
                        </Text>
                        <View style={s.inline}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color="#60869a"
                          />
                          <Text
                            style={[s.small, { flexShrink: 1 }]}
                            numberOfLines={2}
                          >
                            {p.city}
                          </Text>
                        </View>
                        <View style={s.inline}>
                          <Ionicons
                            name={
                              p.is_local_profile
                                ? "person-circle-outline"
                                : "shield-checkmark"
                            }
                            size={12}
                            color="#30769c"
                          />
                          <Text style={s.verifiedText}>
                            {p.is_local_profile
                              ? "Akun lokal"
                              : "Terverifikasi"}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        style={{ position: "absolute", right: 10, top: 12 }}
                        name="paw-outline"
                        size={26}
                        color={palette.background}
                      />
                    </View>
                    <View style={s.cardBody}>
                      {p.distance_km != null && (
                        <Text style={s.distance}>
                          {sitterDistanceLabel(p.distance_km)} dari lokasimu
                        </Text>
                      )}
                      <View style={s.cardMeta}>
                        <Text style={s.rating}>
                          <Ionicons name="star" size={11} color="#C18D43" />{" "}
                          {p.review_count
                            ? `${p.rating} (${p.review_count} ulasan)`
                            : "Baru bergabung"}
                        </Text>
                        <Text style={s.small}>
                          {p.experience_years} th pengalaman
                        </Text>
                      </View>
                      <Text style={s.cardCopy} numberOfLines={2}>
                        {p.bio}
                      </Text>
                      <View style={s.tags}>
                        {p.service_modes.map((m) => (
                          <Text style={s.serviceTag} key={m}>
                            {sitterModes.find((v) => v.value === m)?.label}
                          </Text>
                        ))}
                      </View>
                      <View style={s.priceStrip}>
                        <View style={s.flex}>
                          <Text style={s.small}>Mulai dari</Text>
                          <Text style={s.cardPrice}>
                            {money(sitterPackageRate(p))}
                            <Text style={s.priceSuffix}> / hari</Text>
                          </Text>
                        </View>
                        <View style={s.weeklyPrice}>
                          <Text style={s.small}>Paket 7 hari</Text>
                          <Text style={s.weeklyAmount}>
                            {money(sitterPackageRate(p, true))}
                          </Text>
                          {sitterDiscountPercent(p) > 0 && <Text style={s.saving}>Diskon {sitterDiscountPercent(p)}% · dari {money(p.weekly_rate)}</Text>}
                          {savings > 0 && (
                            <Text style={s.saving}>Hemat {money(savings)}</Text>
                          )}
                        </View>
                      </View>
                      <Pressable
                        accessibilityLabel={`Kenalan & cek jadwal ${p.display_name}`}
                        disabled={busy}
                        style={({ pressed }) => [
                          s.cardCta,
                          pressed && s.pressed,
                        ]}
                        onPress={() =>
                          void act(async () => {
                            const d = await api.detail(p.id);
                            setDetail(d);
                            setFormStep(1);
                            change({ service_mode: d.sitter.service_modes[0] });
                            top();
                          })
                        }
                      >
                        <Text style={s.cardCtaText}>Lihat & pesan</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={18}
                          color="#05689f"
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <View style={s.careNote}>
            <View style={s.noteIcon}>
              <Ionicons name="heart-outline" size={20} color="#AF795F" />
            </View>
            <View style={s.flex}>
              <Text style={s.label}>Dekat, meski sedang berjauhan.</Text>
              <Text style={s.small}>
                Kabar makan, main, dan istirahat hadir di jurnal perawatan
                setiap hari.
              </Text>
            </View>
          </View>
          <Action
            title="Jadi Pet Sitter ↗"
            secondary
            onPress={() =>
              void Linking.openURL(
                "https://partners.slivadoc.com/kemitraan/pet-sitter",
              )
            }
          />
        </>
      )}
      {tab === "find" && detail && (
        <>
          <Action
            title="← Semua sitter"
            secondary
            onPress={() => {
              setDetail(undefined);
              top();
            }}
          />
          <View style={s.panel}>
            <View style={s.profileHeader}>
              <View
                style={[
                  s.avatar,
                  s.initials,
                  {
                    backgroundColor: sitterPalette(detail.sitter.display_name)
                      .background,
                  },
                ]}
              >
                {detail.sitter.photo_url ? (
                  <Image
                    source={{ uri: detail.sitter.photo_url }}
                    style={s.avatar}
                  />
                ) : (
                  <Text style={s.avatarText}>
                    {sitterInitials(detail.sitter.display_name)}
                  </Text>
                )}
              </View>
              <View style={[s.identity, { flex: 1, width: "auto" }]}>
                <Text style={[s.sitterName, { fontSize: 18 }]}>
                  {detail.sitter.display_name}
                </Text>
                <Text style={s.small}>{detail.sitter.city}</Text>
                <Text style={s.verifiedText}>
                  {detail.sitter.is_local_profile
                    ? "Akun lokal · belum verifikasi identitas"
                    : "✓ Identitas & keselamatan ditinjau"}
                </Text>
              </View>
            </View>
            <Text style={s.copy}>{detail.sitter.bio}</Text>
            <Text style={s.heading}>Termasuk dalam perawatan</Text>
            <Text style={s.copy}>{detail.sitter.inclusions}</Text>
            <Text style={s.small}>
              {detail.sitter.visit_minutes} menit setiap hari ·{" "}
              {detail.sitter.city} · jadwal WIB
            </Text>
            <Disclosure title="Ketersediaan & pembatalan">
              <Text style={s.label}>Tanggal tidak tersedia</Text>
              <Text style={s.copy}>
                {detail.unavailable_dates
                  .map((d) => sittingDateLabel(d.day))
                  .join(" · ") || "Belum ada tanggal diblokir"}
              </Text>
              <Text style={s.label}>Kebijakan pembatalan</Text>
              <Text style={s.copy}>{detail.sitter.cancellation_policy}</Text>
            </Disclosure>
            {detail.reviews.map((r, i) => (
              <View key={i} style={s.journal}>
                <Text style={s.label}>
                  ★ {r.rating} · {r.owner_name}
                </Text>
                <Text style={s.copy}>{r.body}</Text>
              </View>
            ))}
          </View>
          <View
            style={s.panel}
            onLayout={(event) => {
              formTop.current = event.nativeEvent.layout.y;
            }}
          >
            <Text style={s.eyebrow}>RENCANA PERAWATAN</Text>
            <Text style={s.heading}>Sesuai ritme si kecil.</Text>
            <View style={s.formSteps}>
              {["Jadwal", "Kebutuhan pet"].map((label, i) => (
                <Pressable
                  key={label}
                  accessibilityLabel={label}
                  accessibilityState={{ selected: formStep === i + 1 }}
                  onPress={() => chooseFormStep(i + 1)}
                  style={[s.formStep, formStep === i + 1 && s.formStepActive]}
                >
                  <Text
                    style={[
                      s.formStepText,
                      formStep === i + 1 && s.tabTextActive,
                    ]}
                  >
                    {i + 1}. {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {formStep === 1 ? (
              <>
                <View style={s.row}>
                  {(["daily", "weekly"] as const).map((packageType) => (
                    <Pressable
                      key={packageType}
                      accessibilityLabel={
                        packageType === "daily" ? "Harian" : "Mingguan"
                      }
                      accessibilityState={{
                        selected: input.package === packageType,
                      }}
                      onPress={() => {
                        change({ package: packageType });
                        setDays(packageType === "weekly" ? 7 : 1);
                      }}
                      style={[
                        s.packageCard,
                        input.package === packageType && s.packageCardActive,
                      ]}
                    >
                      <View style={s.packageHeading}>
                        <Text style={s.label}>
                          {packageType === "daily" ? "Harian" : "Mingguan"}
                        </Text>
                        <Ionicons
                          name={
                            input.package === packageType
                              ? "checkmark-circle"
                              : "ellipse-outline"
                          }
                          size={17}
                          color="#60869a"
                        />
                      </View>
                      <Text style={s.packagePrice}>
                        {money(
                          packageType === "daily"
                            ? sitterPackageRate(detail.sitter)
                            : sitterPackageRate(detail.sitter, true),
                        )}
                      </Text>
                      <Text style={s.small}>
                        {packageType === "daily" ? "per hari" : "per 7 hari"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <SlivaOptionPicker
                  label="Layanan"
                  value={input.service_mode}
                  options={sitterModes.filter((m) =>
                    detail.sitter.service_modes.includes(m.value),
                  )}
                  onChange={(v) =>
                    change({ service_mode: v as SittingInput["service_mode"] })
                  }
                />
                <Text style={s.label}>Tanggal mulai</Text>
                <SlivaDatePicker
                  min={sittingToday()}
                  value={input.starts_on}
                  onChangeText={(v) => change({ starts_on: v })}
                />
                <SlivaOptionPicker
                  label="Durasi"
                  value={String(days)}
                  options={(input.package === "weekly"
                    ? [7, 14, 21, 28]
                    : Array.from({ length: 28 }, (_, i) => i + 1)
                  ).map((d) => ({ value: String(d), label: `${d} hari` }))}
                  onChange={(v) => {
                    setDays(Number(v));
                    change({});
                  }}
                />
                <Text style={s.small}>
                  Sampai{" "}
                  {sittingDateLabel(sittingEndDate(input.starts_on, days))} ·
                  satu sesi per hari
                </Text>
                <Text style={s.label}>Jam mulai (WIB)</Text>
                <SlivaDatePicker
                  kind="time"
                  value={input.preferred_time}
                  onChangeText={(v) => change({ preferred_time: v })}
                />
                <View style={s.careNote}>
                  <Ionicons name="time-outline" size={18} color="#05689f" />
                  <Text style={[s.small, { flex: 1 }]}>
                    {detail.sitter.visit_minutes} menit per hari. Pilih durasi
                    dan jam yang sesuai rutinitas pet-mu.
                  </Text>
                </View>
                <Action
                  title="Lanjut · kebutuhan pet"
                  onPress={() => chooseFormStep(2)}
                />
              </>
            ) : (
              <>
                <Text style={s.label}>Siapa yang akan ditemani?</Text>
                {pets
                  .filter((p) => !p.shared)
                  .map((p) => (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={p.name}
                      accessibilityState={{
                        checked: input.pet_ids.includes(p.id),
                      }}
                      key={p.id}
                      style={[
                        s.pet,
                        input.pet_ids.includes(p.id) && s.petSelected,
                      ]}
                      onPress={() =>
                        change({
                          pet_ids: input.pet_ids.includes(p.id)
                            ? input.pet_ids.filter((id) => id !== p.id)
                            : [...input.pet_ids, p.id],
                        })
                      }
                    >
                      <Text style={s.copy}>
                        {input.pet_ids.includes(p.id) ? "☑" : "○"} {p.name}
                      </Text>
                    </Pressable>
                  ))}
                {!pets.length && (
                  <Text style={s.copy}>
                    Masuk dan tambahkan profil pet untuk memesan.
                  </Text>
                )}
                <Field
                  label="Alamat kunjungan lengkap"
                  value={input.address}
                  onChange={(v) => change({ address: v })}
                  multiline
                />
                <Field
                  label="Telepon kontak darurat"
                  value={input.emergency_phone}
                  onChange={(v) => change({ emergency_phone: v })}
                  phone
                />
                <Field
                  label="Rutinitas, alergi & kebutuhan khusus"
                  value={input.care_notes}
                  onChange={(v) => change({ care_notes: v })}
                  multiline
                />
                <Action
                  title="Cek jadwal & biaya"
                  disabled={busy || !input.pet_ids.length}
                  secondary
                  onPress={() =>
                    void act(async () => {
                      const g = generation.current;
                      const r = await api.quote(detail.sitter.id, payload());
                      if (g !== generation.current) return;
                      if (!r.available)
                        throw new Error(
                          "Tanggal sudah terisi. Pilih tanggal lain.",
                        );
                      setQuote(r.quote);
                    })
                  }
                />
                {quote && (
                  <View style={s.quote}>
                    <Text style={s.copy}>
                      Perawatan {quote.days} hari: {money(quote.base_amount)}
                    </Text>
                    <Text style={s.copy}>
                      Pet tambahan: {money(quote.extra_pet_amount)}
                    </Text>
                    {(quote.discount_amount ?? 0) > 0 && <Text style={s.tag}>Diskon sitter {quote.discount_percent}%: −{money(quote.discount_amount!)}</Text>}
                    {quote.savings > 0 && (
                      <Text style={s.tag}>Hemat {money(quote.savings)}</Text>
                    )}
                    <Text style={s.heading}>
                      Total {money(quote.total_amount)}
                    </Text>
                    <Text style={s.small}>
                      Belum ditagih. Bayar setelah sitter menerima, maksimal 30
                      menit setelah disetujui.
                    </Text>
                    <Action
                      title="Kirim permintaan"
                      disabled={busy}
                      onPress={() => {
                        if (!authenticated) {
                          onLogin();
                          return;
                        }
                        void act(async () => {
                          const r = await api.book(payload());
                          setNotice(r.message);
                          setDetail(undefined);
                          setQuote(undefined);
                          setTab("bookings");
                          setBookings((await api.bookings()).data);
                          await openBooking(r.id);
                        });
                      }}
                    />
                  </View>
                )}
                {!authenticated && (
                  <Action title="Masuk untuk memesan" onPress={onLogin} />
                )}
              </>
            )}
          </View>
        </>
      )}
      {tab === "bookings" && (
        <>
          <Action
            title="↻ Perbarui perawatan"
            secondary
            onPress={() =>
              void act(async () => {
                setBookings((await api.bookings()).data);
                if (current) await openBooking(current.id);
              })
            }
          />
          {!current ? (
            bookings.length ? (
              bookings.map((b) => (
                <Pressable
                  key={b.id}
                  style={s.panel}
                  accessibilityRole="button"
                  onPress={() => void act(() => openBooking(b.id))}
                >
                  <Text style={s.tag}>{sittingStatuses[b.display_status]}</Text>
                  <Text style={s.heading}>{b.sitter_name}</Text>
                  <Text style={s.copy}>
                    {sittingDateLabel(b.starts_on)} →{" "}
                    {sittingDateLabel(b.ends_on)}
                  </Text>
                  <Text style={s.price}>{money(b.amount)}</Text>
                </Pressable>
              ))
            ) : (
              <View style={s.panel}>
                <Text style={s.heading}>
                  Perawatan pertamamu dimulai di sini
                </Text>
                <Text style={s.copy}>
                  Pilih sitter dan tanggal untuk menyusun rutinitas pet-mu.
                </Text>
              </View>
            )
          ) : (
            <>
              <Action
                title="← Semua perawatan"
                secondary
                onPress={() => setCurrent(undefined)}
              />
              <View style={s.panel}>
                <Text style={s.eyebrow}>{current.booking_number}</Text>
                <Text style={s.title}>{current.sitter_name}</Text>
                <Text style={s.tag}>
                  {sittingStatuses[current.display_status]}
                </Text>
                <Text style={s.copy}>
                  {current.pets.map((p) => p.name).join(", ")}
                </Text>
                <Text style={s.copy}>
                  {sittingDateLabel(current.starts_on)} —{" "}
                  {sittingDateLabel(current.ends_on)} · {current.preferred_time}{" "}
                  WIB
                </Text>
                <Text style={s.copy}>{current.address}</Text>
                <Text style={s.price}>{money(current.amount)}</Text>
                {sittingProgressIndex(current.display_status) >= 0 && (
                  <View style={s.progress}>
                    {sittingProgressSteps.map((label, index) => (
                      <View key={label} style={s.progressItem}>
                        <View
                          style={[
                            s.progressDot,
                            index <=
                              sittingProgressIndex(current.display_status) &&
                              s.progressDotActive,
                          ]}
                        >
                          <Text style={s.progressNumber}>
                            {index <
                            sittingProgressIndex(current.display_status)
                              ? "✓"
                              : index + 1}
                          </Text>
                        </View>
                        <Text style={s.progressLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {sittingCancellationMessage(current) && (
                  <Text style={s.notice}>
                    {sittingCancellationMessage(current)}
                  </Text>
                )}
                {current.display_status === "awaiting_payment" && (
                  <Action
                    title="Bayar dengan QRIS"
                    disabled={busy}
                    onPress={() =>
                      void act(async () =>
                        setPayment(
                          await createMobilePaymentIntent(
                            "pet_sitter_booking",
                            current.id,
                            "qris",
                          ),
                        ),
                      )
                    }
                  />
                )}
                <Text style={s.heading}>Care journal & percakapan</Text>
                {updates.length ? (
                  updates.map((u) => (
                    <View key={u.id} style={s.journal}>
                      <Text style={s.small}>
                        {u.author_name} ·{" "}
                        {new Date(u.created_at).toLocaleString("id-ID")}
                      </Text>
                      <Text style={s.tag}>{u.kind}</Text>
                      <Text style={s.copy}>{u.body}</Text>
                      {u.photo_url && (
                        <Image source={{ uri: u.photo_url }} style={s.photo} />
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={s.copy}>
                    Kabar perawatan akan muncul di sini.
                  </Text>
                )}
                {!["cancelled", "declined", "expired"].includes(
                  current.display_status,
                ) && (
                  <>
                    <Field
                      label="Pesan untuk sitter"
                      value={message}
                      onChange={setMessage}
                      multiline
                    />
                    <Action
                      title="Kirim pesan"
                      disabled={busy || !message.trim()}
                      secondary
                      onPress={() =>
                        void act(async () => {
                          await api.message(current.id, message);
                          await openBooking(current.id);
                        })
                      }
                    />
                  </>
                )}
                {current.display_status === "completed" &&
                  !current.review_rating && (
                    <>
                      <SlivaOptionPicker
                        label="Rating"
                        value={rating}
                        onChange={setRating}
                        options={[5, 4, 3, 2, 1].map((n) => ({
                          value: String(n),
                          label: `${n} bintang`,
                        }))}
                      />
                      <Field
                        label="Ceritakan pengalamanmu"
                        value={review}
                        onChange={setReview}
                        multiline
                      />
                      <Action
                        title="Kirim ulasan"
                        disabled={busy || review.trim().length < 10}
                        onPress={() =>
                          void act(async () => {
                            await api.review(
                              current.id,
                              Number(rating),
                              review,
                            );
                            await openBooking(current.id);
                          })
                        }
                      />
                    </>
                  )}
                {[
                  "requested",
                  "awaiting_payment",
                  "confirmed",
                  "in_progress",
                ].includes(current.display_status) &&
                  !current.cancellation_requested && (
                    <>
                      <Field
                        label="Alasan pembatalan (jika diperlukan)"
                        value={cancel}
                        onChange={setCancel}
                        multiline
                      />
                      <Action
                        title={
                          current.payment_status === "paid"
                            ? "Ajukan pembatalan"
                            : "Batalkan permintaan"
                        }
                        secondary
                        disabled={busy || cancel.trim().length < 10}
                        onPress={() =>
                          void act(async () => {
                            await api.change(current.id, "cancel", cancel);
                            await openBooking(current.id);
                            setBookings((await api.bookings()).data);
                          })
                        }
                      />
                    </>
                  )}
              </View>
            </>
          )}
        </>
      )}
      <MobileQrisModal
        payment={payment}
        onClose={() => setPayment(undefined)}
        onPaid={() => {
          setPayment(undefined);
          if (current) void act(() => openBooking(current.id));
        }}
      />
    </ScrollView>
  );
}
const s = StyleSheet.create({
  catalogGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "stretch",
  },
  cardCopy: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.muted,
    minHeight: 34,
  },
  cardPrice: { fontSize: 15, fontWeight: "800", color: colors.sky600 },
  distance: { fontSize: 10, fontWeight: "700", color: colors.sky600 },
  nearbyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  nearbyButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 13,
    backgroundColor: "white",
  },
  scroll: { flex: 1, backgroundColor: "#f6fbff" },
  screen: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 16,
    width: "100%",
    maxWidth: 1500,
    alignSelf: "center",
  },
  pageHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#def1fb",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: "#153b5b",
  },
  headerHeart: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e4f4fc",
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 6,
    borderRadius: 11,
  },
  tabActive: { backgroundColor: "#FFFFFF", boxShadow: "0 2px 5px #193d500A" },
  tabText: { fontSize: 12, fontWeight: "600", color: "#60869a", flexShrink: 1 },
  tabTextActive: { color: "#05689f", fontWeight: "700" },
  hero: {
    backgroundColor: "#ebf8ff",
    borderRadius: 24,
    padding: 18,
    minHeight: 166,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
  },
  heroCopy: { width: "65%", zIndex: 1, gap: 8 },
  heroTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: "#153b5b",
    letterSpacing: -0.9,
  },
  heroDescription: { fontSize: 12, lineHeight: 18, color: "#608599" },
  heroImage: {
    position: "absolute",
    right: -18,
    bottom: 0,
    width: "49%",
    height: "100%",
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.1,
    color: "#5f8498",
  },
  title: {
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "800",
    color: "#153b5b",
    letterSpacing: -0.6,
  },
  heading: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: "#153b5b",
    letterSpacing: -0.4,
  },
  copy: { fontSize: 13, lineHeight: 21, color: "#547587" },
  small: { fontSize: 11, lineHeight: 17, color: "#60869a" },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  flex: { flex: 1, minWidth: 0, gap: 4 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#05689f",
    backgroundColor: "#e8f5fc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  panel: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#dcf0fb",
    borderRadius: 22,
    padding: 20,
    gap: 16,
  },
  avatar: { width: 62, height: 62, borderRadius: 20 },
  avatarText: { fontSize: 22, fontWeight: "700", color: "#2e7296" },
  initials: {
    backgroundColor: "#ddf1fb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  action: {
    backgroundColor: "#05689f",
    minHeight: 48,
    padding: 13,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  secondary: {
    backgroundColor: "#e9f6fd",
    borderWidth: 1,
    borderColor: "#cdeaf9",
  },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  secondaryText: { color: "#05689f" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: "700", color: "#153b5b" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d1ecfa",
    borderRadius: 12,
    padding: 13,
    fontSize: 14,
    color: "#153b5b",
    backgroundColor: "#f8fcfe",
  },
  textarea: { minHeight: 100, textAlignVertical: "top" },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#153b5b",
    letterSpacing: -0.5,
  },
  pet: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f7fcfe",
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#d5edfa",
  },
  petSelected: { backgroundColor: "#ddf1fb", borderColor: "#60869a" },
  quote: { padding: 18, borderRadius: 18, backgroundColor: "#e6f4fc", gap: 12 },
  error: {
    color: "#A34532",
    backgroundColor: "#FFF1ED",
    padding: 16,
    borderRadius: 14,
    fontSize: 13,
  },
  notice: {
    color: "#05689f",
    backgroundColor: "#e4f4fc",
    padding: 16,
    borderRadius: 14,
    fontSize: 13,
    lineHeight: 20,
  },
  journal: {
    borderLeftWidth: 2,
    borderLeftColor: "#c6e7f9",
    padding: 14,
    gap: 8,
    backgroundColor: "#f8fcfe",
    borderRadius: 12,
  },
  photo: { width: "100%", height: 220, borderRadius: 14 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  searchField: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#d3ecfa",
    borderRadius: 15,
    paddingLeft: 12,
    minHeight: 50,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    color: "#153b5b",
    paddingVertical: 12,
  },
  searchSubmit: {
    minWidth: 44,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#d3ecfa",
    alignItems: "center",
    justifyContent: "center",
  },
  filterActive: { backgroundColor: "#ddf1fb", borderColor: "#60869a" },
  filterPanel: {
    borderRadius: 18,
    backgroundColor: "#e9f6fd",
    padding: 16,
    gap: 12,
  },
  chips: { gap: 8, paddingBottom: 2 },
  chip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#d7eefb",
  },
  chipActive: { backgroundColor: "#05689f", borderColor: "#05689f" },
  chipText: { fontSize: 11, fontWeight: "600", color: "#5f8397" },
  chipTextActive: { color: "white" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  count: {
    fontSize: 10,
    fontWeight: "600",
    color: "#5b7f92",
    backgroundColor: "#e2f3fc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    overflow: "hidden",
  },
  sitterCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#d3ecfa",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 20px #193d5006",
  },
  cardBanner: {
    alignItems: "flex-start",
    padding: 11,
    gap: 9,
  },
  identity: { gap: 5, minWidth: 0, width: "100%" },
  sitterName: {
    minHeight: 36,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: "#153b5b",
    letterSpacing: -0.4,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedText: { fontSize: 10, fontWeight: "600", color: "#30769c" },
  cardBody: { padding: 11, gap: 9, flex: 1 },
  cardMeta: {
    alignItems: "flex-start",
    gap: 4,
    flexWrap: "wrap",
  },
  rating: { fontSize: 11, color: "#5c8093", fontWeight: "600" },
  serviceTag: {
    fontSize: 10,
    color: "#60869a",
    backgroundColor: "#eef8fd",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 7,
    overflow: "hidden",
  },
  priceStrip: {
    alignItems: "stretch",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#e1f2fc",
    paddingTop: 10,
    marginTop: "auto",
  },
  priceSuffix: {
    fontSize: 10,
    fontWeight: "400",
    color: "#60869a",
    letterSpacing: 0,
  },
  weeklyPrice: {
    padding: 8,
    backgroundColor: colors.sky50,
    borderRadius: 10,
    borderLeftWidth: 0,
    borderLeftColor: "#d5edfa",
    gap: 3,
  },
  weeklyAmount: { fontSize: 13, fontWeight: "700", color: "#2b698b" },
  saving: { fontSize: 9, color: "#60869a", fontWeight: "600" },
  cardCta: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#e7f5fc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    marginTop: 2,
  },
  cardCtaText: { fontSize: 11, fontWeight: "700", color: "#05689f" },
  careNote: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#e9f6fd",
  },
  noteIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F3E7D6",
  },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  disclosure: { borderTopWidth: 1, borderTopColor: "#daeffb" },
  disclosureHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  disclosureContent: { gap: 12, paddingTop: 6, paddingBottom: 10 },
  packageCard: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d0ebfa",
    borderRadius: 15,
    gap: 7,
    backgroundColor: "#f8fcfe",
  },
  packageCardActive: { borderColor: "#60869a", backgroundColor: "#e5f4fc" },
  packageHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
  },
  packagePrice: { fontSize: 17, fontWeight: "700", color: "#2b698b" },
  formSteps: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    backgroundColor: "#e9f6fd",
    borderRadius: 12,
  },
  formStep: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  formStepActive: { backgroundColor: "white" },
  formStepText: { fontSize: 11, fontWeight: "600", color: "#60869a" },
  progress: {
    flexDirection: "row",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#d5edfa",
    gap: 3,
  },
  progressItem: { flex: 1, alignItems: "center", gap: 7 },
  progressDot: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#60869a",
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: { backgroundColor: "#2f759b" },
  progressNumber: { color: "white", fontSize: 10, fontWeight: "700" },
  progressLabel: { fontSize: 8, color: "#5d8194", textAlign: "center" },
});
