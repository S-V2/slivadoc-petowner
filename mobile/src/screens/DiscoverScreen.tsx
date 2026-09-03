import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Service } from "../data";
import { colors, shadow } from "../theme";
import { Pill, PrimaryButton, Screen, TopHeader } from "../components/ui";
import { useMemo, useState } from "react";

export function DiscoverScreen({ onBook, onAction, onOpenNotifications,services,favorites,onToggleFavorite }: { onBook: (service: Service) => void; onAction: (message: string) => void; onOpenNotifications: () => void;services:Service[];favorites:string[];onToggleFavorite:(id:string)=>void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const categories = useMemo(() => ["Semua", ...Array.from(new Set(services.map((item) => item.category)))], [services]);
  const results = useMemo(() => services.filter((service) => (category === "Semua" || service.category === category) && service.name.toLowerCase().includes(query.toLowerCase())), [category, query,services]);

  return (
    <Screen>
      <TopHeader title="Jelajahi Layanan" subtitle="Layanan pet care terverifikasi" onNotification={onOpenNotifications} />
      <Text style={styles.title}>Mau manjain pet-mu dengan apa? ✨</Text>
      <Text style={styles.subtitle}>Temukan layanan terverifikasi di dekatmu.</Text>
      <View style={styles.searchBox}><Ionicons name="search" size={18} color={colors.muted} /><TextInput placeholder="Cari klinik atau layanan" placeholderTextColor="#9AA7B6" value={query} onChangeText={setQuery} style={styles.searchInput} /><Pressable onPress={() => onAction(`Mencari “${query || "semua layanan"}”`)} style={styles.filterButton}><Ionicons name="options" size={17} color={colors.white} /></Pressable></View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.category, item === category && styles.activeCategory]}><Text style={[styles.categoryText, item === category && styles.activeCategoryText]}>{item}</Text></Pressable>)}
      </ScrollView>

      <View style={styles.resultHeader}><Text style={styles.resultCount}><Text style={styles.resultStrong}>{results.length} layanan</Text> ditemukan</Text><Pressable onPress={() => onAction("Urutan layanan diubah")}><Text style={styles.sort}>Rekomendasi  ⌄</Text></Pressable></View>
      <View style={styles.results}>
        {results.map((service) => {
          const favorite = favorites.includes(service.id);
          return (
            <Pressable key={service.id} onPress={() => onBook(service)} style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
              <View style={[styles.serviceVisual, service.tone === "mint" ? styles.mint : service.tone === "violet" ? styles.violet : service.tone === "peach" ? styles.peach : styles.blue]}>
                <Text style={styles.serviceEmoji}>{service.icon}</Text><Pill>{service.category}</Pill>
                <Pressable hitSlop={10} onPress={(event) => { event.stopPropagation();onToggleFavorite(service.id) }} style={styles.favorite}><Ionicons name={favorite ? "heart" : "heart-outline"} size={18} color={favorite ? colors.red : colors.text} /></Pressable>
              </View>
              <View style={styles.serviceBody}>
                <View style={styles.serviceTitleRow}><View style={styles.serviceTitleCopy}><Text numberOfLines={2} style={styles.serviceName}>{service.name}</Text><Text numberOfLines={2} style={styles.serviceLocation}><Ionicons name="location-outline" size={10} /> {service.distance} • {service.address}</Text></View><View style={styles.rating}><Ionicons name="star" size={10} color={colors.yellow} /><Text style={styles.ratingText}>{service.rating}</Text></View></View>
                <View style={styles.tags}><Text style={styles.tagText}>✓ Terverifikasi</Text><Text style={styles.tagText}>Pet friendly</Text></View>
                <View style={styles.status}><View style={styles.liveDot} /><Text style={styles.statusText}>{service.status}</Text></View>
                <View style={styles.serviceFooter}><View><Text style={styles.priceLabel}>Estimasi harga</Text><Text style={styles.price}>{service.price}</Text></View><PrimaryButton compact label="Booking" onPress={() => onBook(service)} /></View>
              </View>
            </Pressable>
          );
        })}
      </View>
      {results.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>🔎</Text><Text style={styles.emptyTitle}>Belum ditemukan</Text><Text style={styles.emptyNote}>Coba gunakan kategori atau kata kunci lain.</Text><PrimaryButton compact label="Reset pencarian" onPress={() => { setQuery(""); setCategory("Semua"); }} /></View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { maxWidth: 310, marginTop: 8, color: colors.navy, fontSize: 22, lineHeight: 27, fontWeight: "900", letterSpacing: -0.35 },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 17 },
  searchBox: { height: 44, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingLeft: 13, paddingRight: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 13 },
  filterButton: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky500 },
  categories: { gap: 6, paddingVertical: 12, paddingRight: 14 },
  category: { minHeight: 32, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  activeCategory: { borderColor: colors.sky500, backgroundColor: colors.sky500 }, categoryText: { color: colors.muted, fontSize: 11, fontWeight: "700" }, activeCategoryText: { color: colors.white },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }, resultCount: { color: colors.muted, fontSize: 11 }, resultStrong: { color: colors.text, fontWeight: "800" }, sort: { color: colors.sky600, fontSize: 11, fontWeight: "700" },
  results: { gap: 10 }, serviceCard: { minHeight: 166, overflow: "hidden", flexDirection: "row", borderRadius: 17, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow }, pressed: { opacity: .75, transform: [{ scale: .99 }] },
  serviceVisual: { position: "relative", width: 105, alignItems: "center", justifyContent: "center" }, serviceEmoji: { fontSize: 43 }, blue: { backgroundColor: colors.sky100 }, mint: { backgroundColor: colors.mint50 }, violet: { backgroundColor: colors.violet50 }, peach: { backgroundColor: colors.peach50 }, favorite: { position: "absolute", top: 9, right: 9, width: 31, height: 31, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.92)" },
  serviceBody: { minWidth: 0, flex: 1, padding: 12 }, serviceTitleRow: { flexDirection: "row", gap: 7 }, serviceTitleCopy: { minWidth: 0, flex: 1 }, serviceName: { color: colors.navy, fontSize: 14, lineHeight: 18, fontWeight: "900" }, serviceLocation: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 14 }, rating: { height: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 7, borderRadius: 9, backgroundColor: colors.yellow50 }, ratingText: { color: "#A57417", fontSize: 10, fontWeight: "800" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 7 }, tagText: { overflow: "hidden", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, color: colors.sky600, backgroundColor: colors.sky50, fontSize: 8, fontWeight: "700" }, status: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 7 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.mint }, statusText: { color: "#19866F", fontSize: 9, fontWeight: "700" },
  serviceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }, priceLabel: { color: colors.muted, fontSize: 8 }, price: { marginTop: 2, color: colors.navy, fontSize: 11, fontWeight: "800" },
  empty: { minHeight: 230, alignItems: "center", justifyContent: "center" }, emptyEmoji: { fontSize: 40 }, emptyTitle: { marginTop: 8, color: colors.navy, fontSize: 17, fontWeight: "800" }, emptyNote: { marginTop: 4, marginBottom: 13, color: colors.muted, fontSize: 12 },
});
