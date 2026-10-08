import { LocalizedPressable as Pressable } from "../components/LocalizedPressable";
import { Image, Modal,  ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DiscountBadge } from "../components/DiscountBadge";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Service } from "../data";
import { colors, shadow } from "../theme";
import { Pill, PrimaryButton, Screen, TopHeader } from "../components/ui";
import { LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "../i18n";
import { useEffect, useMemo, useState } from "react";

function serviceIcon(service: Pick<Service, "category" | "name">): keyof typeof Ionicons.glyphMap {
  const value = `${service.category} ${service.name}`.toLowerCase();
  if (/home|rumah/.test(value)) return "home-outline";
  if (/hotel|boarding|penitipan/.test(value)) return "bed-outline";
  if (/groom|mandi/.test(value)) return "cut-outline";
  if (/vaks|klinik|health|dokter|medis/.test(value)) return "medical-outline";
  return "paw-outline";
}

export function DiscoverScreen({ onBook, onOpenNotifications,services,favorites,onToggleFavorite,intent }: { onBook: (service: Service) => void; onOpenNotifications: () => void;services:Service[];favorites:string[];onToggleFavorite:(id:string)=>void;intent?:{token:number;category?:string;serviceId?:string} }) {
  const { formatCurrency } = useI18n();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [selected, setSelected] = useState<Service>();
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(services.map((item) => item.category)))], [services]);
  const results = useMemo(() => services.filter((service) => (category === "Semua" || service.category === category) && service.name.toLowerCase().includes(query.toLowerCase())), [category, query,services]);
  useEffect(() => {
    if (!intent) return;
    queueMicrotask(() => {
      if (intent.category) {
        const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const wanted = normalize(intent.category);
        const match = categories.find((item) => normalize(item) === wanted || normalize(item).includes(wanted) || wanted.includes(normalize(item)));
        setCategory(match ?? "Semua");
      } else {
        setCategory("Semua");
      }
      if (intent.serviceId) setSelected(services.find((item) => item.id === intent.serviceId));
      else setSelected(undefined);
    });
  }, [categories, intent, services]);

  return (
    <Screen>
      <TopHeader title="Jelajahi Layanan" subtitle="Layanan pet care terverifikasi" onNotification={onOpenNotifications} />
      <Text style={styles.title}>Mau manjain pet-mu dengan apa? ✨</Text>
      <Text style={styles.subtitle}>Temukan layanan terverifikasi di dekatmu.</Text>
      <View style={styles.searchBox}><Ionicons name="search" size={18} color={colors.muted} /><TextInput placeholder="Cari klinik atau layanan" placeholderTextColor={colors.muted} value={query} onChangeText={setQuery} style={styles.searchInput} /></View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, item === category && styles.activeCategory]}><Text style={[styles.categoryText, item === category && styles.activeCategoryText]}>{item}</Text></Pressable>)}
      </ScrollView>

      <View style={styles.resultHeader}><Text style={styles.resultCount}><Text style={styles.resultStrong}>{results.length} layanan</Text> ditemukan</Text></View>
      <View style={styles.results}>
        {results.map((service) => {
          const favorite = favorites.includes(service.id);
          return (
            <Pressable key={service.id} onPress={() => setSelected(service)} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
              <View style={[styles.serviceVisual, service.tone === "mint" ? styles.mint : service.tone === "violet" ? styles.violet : service.tone === "peach" ? styles.peach : styles.blue]}>
                {service.imageUrl ? <Image source={{ uri: service.imageUrl }} alt={`Gambar ${service.name}`} style={styles.serviceImage} resizeMode="cover" /> : <Ionicons name={serviceIcon(service)} size={38} color={service.tone === "mint" ? "#14836E" : service.tone === "violet" ? "#6655C7" : service.tone === "peach" ? "#8B4A20" : colors.sky600} />}<Pill>{service.category}</Pill>
                <DiscountBadge percent={service.discountPercent} />
                <Pressable hitSlop={10} onPress={(event) => { event.stopPropagation();onToggleFavorite(service.id) }} style={styles.favorite}><Ionicons name={favorite ? "heart" : "heart-outline"} size={18} color={favorite ? colors.red : colors.text} /></Pressable>
              </View>
              <View style={styles.serviceBody}>
                <View style={styles.serviceTitleRow}><View style={styles.serviceTitleCopy}><Text catalogue numberOfLines={2} style={styles.serviceName}>{service.name}</Text><Text numberOfLines={2} style={styles.serviceLocation}><Ionicons name="location-outline" size={10} /> {service.distance} • {service.address}</Text></View><View style={styles.rating}><Ionicons name="star" size={10} color={colors.yellow} /><Text style={styles.ratingText}>{service.rating}</Text></View></View>
                <View style={styles.tags}><Text style={styles.tagText}>✓ Terverifikasi</Text><Text style={styles.tagText}>Pet friendly</Text></View>
                <View style={styles.status}><View style={styles.liveDot} /><Text style={styles.statusText}>{service.status}</Text></View>
                <View style={styles.serviceFooter}><View><Text style={styles.priceLabel}>Estimasi harga</Text>{service.originalPrice && service.originalPrice > service.priceValue ? <Text style={styles.oldPrice}>{formatCurrency(service.originalPrice)}</Text> : null}<Text style={styles.price}>{service.price}</Text></View><PrimaryButton compact label="Booking" onPress={() => onBook(service)} /></View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {results.length === 0 ? <View style={styles.empty}><View style={styles.emptyIcon}><Ionicons name="search-outline" size={28} color={colors.sky600} /></View><Text style={styles.emptyTitle}>Belum ditemukan</Text><Text style={styles.emptyNote}>Coba gunakan kategori atau kata kunci lain.</Text><PrimaryButton compact label="Reset pencarian" onPress={() => { setQuery(""); setCategory("Semua"); }} /></View> : null}
      <ServiceDetailSheet service={selected} onClose={() => setSelected(undefined)} onBook={(service) => { setSelected(undefined); onBook(service); }} />
    </Screen>
  );
}

function ServiceDetailSheet({ service, onClose, onBook }: { service?: Service; onClose: () => void; onBook: (service: Service) => void }) {
  const { formatCurrency } = useI18n();
  const [imageIndex, setImageIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const images = useMemo(
    () => Array.from(new Set([...(service?.imageUrls ?? []), service?.imageUrl].filter((value): value is string => Boolean(value)))),
    [service?.imageUrl, service?.imageUrls],
  );
  const serviceId = service?.id;
  useEffect(() => {
    if (!serviceId || images.length < 2) return;
    const timer = setInterval(() => setImageIndex((current) => (current + 1) % images.length), 1_000);
    return () => clearInterval(timer);
  }, [images.length, serviceId]);
  if (!service) return null;
  const activeIndex = images.length ? imageIndex % images.length : 0;
  const activeImage = images[activeIndex];
  return <>
    <Modal supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]} visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <SafeAreaView style={styles.detailSafe} edges={["top", "bottom"]}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <View><Text style={styles.detailEyebrow}>DETAIL LAYANAN</Text><Text catalogue numberOfLines={1} style={styles.detailHeaderTitle}>{service.name}</Text></View>
              <Pressable accessibilityLabel="Tutup detail layanan" onPress={onClose} style={styles.detailClose}><Ionicons name="close" size={21} color={colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailContent}>
              <View style={[styles.detailHero, service.tone === "mint" ? styles.mint : service.tone === "violet" ? styles.violet : service.tone === "peach" ? styles.peach : styles.blue]}>
                {activeImage ? <Pressable onPress={() => setViewerOpen(true)} accessibilityRole="imagebutton" accessibilityLabel={`Perbesar gambar ${service.name}`} style={styles.detailHeroImageButton}><Image source={{ uri: activeImage }} alt={`Foto ${service.name}`} style={styles.detailHeroImage} resizeMode="cover" /></Pressable> : <Ionicons name={serviceIcon(service)} size={58} color={colors.sky600} />}
                <View style={styles.detailCategory}><Text style={styles.detailCategoryText}>{service.category}</Text></View>
                <DiscountBadge percent={service.discountPercent} />
                {images.length > 1 ? <View style={styles.detailPager}><Pressable onPress={() => setImageIndex((activeIndex - 1 + images.length) % images.length)}><Ionicons name="chevron-back" size={18} color={colors.white} /></Pressable><Text style={styles.detailPagerText}>{activeIndex + 1}/{images.length} · otomatis</Text><Pressable onPress={() => setImageIndex((activeIndex + 1) % images.length)}><Ionicons name="chevron-forward" size={18} color={colors.white} /></Pressable></View> : null}
              </View>
              <View style={styles.detailTitleRow}><View style={styles.detailTitleCopy}><Text catalogue style={styles.detailName}>{service.name}</Text><Text style={styles.detailAddress}><Ionicons name="location-outline" size={12} /> {service.address}</Text></View><View style={styles.detailRating}><Ionicons name="star" size={12} color={colors.yellow} /><Text style={styles.detailRatingText}>{service.rating}</Text></View></View>
              <View style={styles.detailHighlights}>
                <View style={styles.detailHighlight}><Ionicons name="shield-checkmark-outline" size={19} color={colors.sky600} /><Text style={styles.detailHighlightTitle}>{service.licenseStatus === "verified" ? "Terverifikasi" : "Mitra aktif"}</Text><Text style={styles.detailHighlightNote}>Status mitra</Text></View>
                <View style={styles.detailHighlight}><Ionicons name="time-outline" size={19} color="#14836E" /><Text style={styles.detailHighlightTitle}>{service.durationMinutes ?? 60} menit</Text><Text style={styles.detailHighlightNote}>Durasi</Text></View>
                <View style={styles.detailHighlight}><Ionicons name="wallet-outline" size={19} color="#6655C7" />{service.originalPrice && service.originalPrice > service.priceValue ? <Text style={styles.detailHighlightOldPrice}>{formatCurrency(service.originalPrice)}</Text> : null}<Text style={styles.detailHighlightTitle}>{service.price}</Text><Text style={styles.detailHighlightNote}>{service.discountPercent ? `Hemat ${Math.round(service.discountPercent)}%` : "Estimasi"}</Text></View>
              </View>
              <Text style={styles.detailSectionTitle}>Tentang layanan</Text>
              <Text catalogue style={styles.detailDescription}>{service.description || "Layanan pet care dari mitra Slivadoc dengan jadwal dan kapasitas yang tersinkron langsung."}</Text>
              {service.inclusions?.length ? <><Text style={styles.detailSectionTitle}>Yang termasuk</Text><View style={styles.detailTags}>{service.inclusions.map((item) => <View key={item} style={styles.detailTag}><Ionicons name="checkmark-circle" size={14} color="#14836E" /><Text style={styles.detailTagText}>{item}</Text></View>)}</View></> : null}
              <View style={styles.detailPolicy}><Ionicons name="information-circle-outline" size={21} color={colors.sky600} /><View><Text style={styles.detailPolicyTitle}>Sebelum booking</Text><Text style={styles.detailPolicyText}>{service.cancellationPolicy || "Jadwal aktual, kapasitas, biaya, dan kebijakan akan ditampilkan sebelum konfirmasi."}</Text>{service.cancellationCutoffHours !== undefined ? <Text style={styles.detailPolicyText}>Bisa dibatalkan hingga {service.cancellationCutoffHours} jam sebelum jadwal</Text> : null}</View></View>
            </ScrollView>
            <View style={styles.detailFooter}><View><Text style={styles.detailFooterLabel}>{service.discountPercent ? `Promo ${Math.round(service.discountPercent)}% · mulai dari` : "Mulai dari"}</Text>{service.originalPrice && service.originalPrice > service.priceValue ? <Text style={styles.detailFooterOldPrice}>{formatCurrency(service.originalPrice)}</Text> : null}<Text style={styles.detailFooterPrice}>{service.price}</Text></View><PrimaryButton label="Pilih jadwal" icon="calendar-outline" onPress={() => onBook(service)} /></View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
    <Modal supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]} visible={viewerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setViewerOpen(false)}>
      <SafeAreaView style={styles.viewer}><Pressable accessibilityRole="button" hitSlop={10} accessibilityLabel="Tutup galeri" onPress={() => setViewerOpen(false)} style={styles.viewerClose}><Ionicons name="close" size={25} color={colors.white} /></Pressable>{activeImage ? <Image source={{ uri: activeImage }} alt={`Foto ${service.name}`} style={styles.viewerImage} resizeMode="contain" /> : null}{images.length > 1 ? <View style={styles.viewerControls}><Pressable onPress={() => setImageIndex((activeIndex - 1 + images.length) % images.length)}><Ionicons name="chevron-back" size={25} color={colors.white} /></Pressable><Text style={styles.viewerCount}>{activeIndex + 1} / {images.length}</Text><Pressable onPress={() => setImageIndex((activeIndex + 1) % images.length)}><Ionicons name="chevron-forward" size={25} color={colors.white} /></Pressable></View> : null}</SafeAreaView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  title: { maxWidth: 310, marginTop: 8, color: colors.navy, fontSize: 22, lineHeight: 27, fontWeight: "700", letterSpacing: -0.35 },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 17 },
  searchBox: { height: 46, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingLeft: 13, paddingRight: 5, borderRadius: 16, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 13 },
  filterButton: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky600 },
  categories: { gap: 6, paddingVertical: 12, paddingRight: 14 },
  category: { minHeight: 32, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  activeCategory: { borderColor: colors.sky600, backgroundColor: colors.sky600 }, categoryText: { color: colors.muted, fontSize: 11, fontWeight: "700" }, activeCategoryText: { color: colors.white },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }, resultCount: { color: colors.muted, fontSize: 11 }, resultStrong: { color: colors.text, fontWeight: "600" }, sort: { color: colors.sky600, fontSize: 11, fontWeight: "700" },
  results: { gap: 12 }, serviceCard: { minHeight: 166, overflow: "hidden", flexDirection: "row", borderRadius: 22, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow }, pressed: { opacity: .9, transform: [{ scale: .985 }] },
  serviceVisual: { position: "relative", width: 105, overflow: "hidden", alignItems: "center", justifyContent: "center" }, serviceImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" }, blue: { backgroundColor: colors.sky100 }, mint: { backgroundColor: colors.mint50 }, violet: { backgroundColor: colors.violet50 }, peach: { backgroundColor: colors.peach50 }, favorite: { position: "absolute", top: 9, right: 9, width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.92)" },
  promoBadge: { position: "absolute", left: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: "#F16F5A" },
  promoBadgeText: { color: colors.white, fontSize: 9, fontWeight: "700" },
  serviceBody: { minWidth: 0, flex: 1, padding: 12 }, serviceTitleRow: { flexDirection: "row", gap: 7 }, serviceTitleCopy: { minWidth: 0, flex: 1 }, serviceName: { color: colors.navy, fontSize: 14, lineHeight: 18, fontWeight: "700" }, serviceLocation: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 14 }, rating: { height: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 7, borderRadius: 9, backgroundColor: colors.yellow50 }, ratingText: { color: colors.yellow, fontSize: 10, fontWeight: "600" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 7 }, tagText: { overflow: "hidden", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, color: colors.sky600, backgroundColor: colors.sky50, fontSize: 8, fontWeight: "600" }, status: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.mint }, statusText: { color: colors.mint, fontSize: 9, fontWeight: "600" },
  serviceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }, priceLabel: { color: colors.muted, fontSize: 8 }, oldPrice: { marginTop: 2, color: colors.muted, fontSize: 8, textDecorationLine: "line-through" }, price: { marginTop: 1, color: colors.navy, fontSize: 11, fontWeight: "700" },
  empty: { minHeight: 230, alignItems: "center", justifyContent: "center" }, emptyIcon: { width: 58, height: 58, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: colors.sky50 }, emptyTitle: { marginTop: 8, color: colors.navy, fontSize: 17, fontWeight: "600" }, emptyNote: { marginTop: 4, marginBottom: 13, color: colors.muted, fontSize: 12 },
  detailBackdrop: { flex: 1, backgroundColor: "rgba(14,32,55,.46)" },
  detailSafe: { flex: 1, justifyContent: "flex-end" },
  detailSheet: {width: "100%", maxWidth: 720, alignSelf: "center",  height: "94%", overflow: "hidden", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white },
  detailHeader: { minHeight: 70, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  detailEyebrow: { color: colors.sky600, fontSize: 9, fontWeight: "700", letterSpacing: .8 },
  detailHeaderTitle: { maxWidth: 260, marginTop: 3, color: colors.navy, fontSize: 15, fontWeight: "700" },
  detailClose: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: colors.sky50 },
  detailContent: { padding: 16, paddingBottom: 30 },
  detailHero: { position: "relative", height: 235, overflow: "hidden", alignItems: "center", justifyContent: "center", borderRadius: 24 },
  detailHeroImageButton: { width: "100%", height: "100%" },
  detailHeroImage: { width: "100%", height: "100%" },
  detailCategory: { position: "absolute", left: 12, top: 12, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: "rgba(255,255,255,.92)" },
  detailCategoryText: { color: colors.sky600, fontSize: 9, fontWeight: "700" },
  detailPager: { position: "absolute", right: 12, bottom: 12, minHeight: 36, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 7, borderRadius: 12, backgroundColor: "rgba(9,30,47,.72)" },
  detailPagerText: { color: colors.white, fontSize: 9, fontWeight: "700" },
  detailTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 15 },
  detailTitleCopy: { minWidth: 0, flex: 1 },
  detailName: { color: colors.navy, fontSize: 20, lineHeight: 25, fontWeight: "700" },
  detailAddress: { marginTop: 5, color: colors.muted, fontSize: 11, lineHeight: 16 },
  detailRating: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.yellow50 },
  detailRatingText: { color: "#9B6B11", fontSize: 10, fontWeight: "700" },
  detailHighlights: { flexDirection: "row", gap: 7, marginTop: 15 },
  detailHighlight: { minWidth: 0, flex: 1, gap: 3, padding: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white },
  detailHighlightTitle: { color: colors.navy, fontSize: 10, fontWeight: "700" },
  detailHighlightOldPrice: { color: colors.muted, fontSize: 8, textDecorationLine: "line-through" },
  detailHighlightNote: { color: colors.muted, fontSize: 8 },
  detailSectionTitle: { marginTop: 19, color: colors.navy, fontSize: 14, fontWeight: "700" },
  detailDescription: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 19 },
  detailTags: { gap: 7, marginTop: 9 },
  detailTag: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.mint50 },
  detailTagText: { flex: 1, color: colors.text, fontSize: 11 },
  detailPolicy: { flexDirection: "row", alignItems: "flex-start", gap: 9, marginTop: 18, padding: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 15, backgroundColor: colors.sky50 },
  detailPolicyTitle: { color: colors.navy, fontSize: 11, fontWeight: "700" },
  detailPolicyText: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 15 },
  detailFooter: { minHeight: 78, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingBottom: 8, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  detailFooterLabel: { color: colors.muted, fontSize: 9 },
  detailFooterPrice: { marginTop: 2, color: colors.sky600, fontSize: 15, fontWeight: "700" },
  detailFooterOldPrice: { marginTop: 2, color: colors.muted, fontSize: 9, textDecorationLine: "line-through" },
  viewer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5,18,29,.96)" },
  viewerClose: { position: "absolute", zIndex: 2, top: 24, right: 24, width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.24)", borderRadius: 17, backgroundColor: "rgba(7,35,57,.72)" },
  viewerImage: { width: "100%", height: "78%" },
  viewerControls: { position: "absolute", bottom: 24, flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "rgba(255,255,255,.12)" },
  viewerCount: { color: colors.white, fontSize: 12, fontWeight: "700" },
});
