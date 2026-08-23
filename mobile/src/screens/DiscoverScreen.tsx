import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { services, type Service } from "../data";
import { colors, shadow } from "../theme";
import { Pill, PrimaryButton, Screen, TopHeader } from "../components/ui";
import { useMemo, useState } from "react";

export function DiscoverScreen({ onBook, onAction, onOpenNotifications }: { onBook: (service: Service) => void; onAction: (message: string) => void; onOpenNotifications: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [favorites, setFavorites] = useState<string[]>(["clinic"]);
  const categories = ["Semua", "Klinik", "Grooming", "Pet Hotel", "Home Care"];
  const results = useMemo(() => services.filter((service) => (category === "Semua" || service.category === category) && service.name.toLowerCase().includes(query.toLowerCase())), [category, query]);

  return (
    <Screen>
      <TopHeader title="Jelajahi Layanan" subtitle="Jakarta Selatan" onNotification={onOpenNotifications} />
      <Text style={styles.title}>Apa yang dibutuhkan{`\n`}hewanmu hari ini?</Text>
      <Text style={styles.subtitle}>Semua partner telah diverifikasi oleh Slivadoc.</Text>
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
                <Pressable hitSlop={10} onPress={(event) => { event.stopPropagation(); setFavorites((current) => favorite ? current.filter((id) => id !== service.id) : [...current, service.id]); }} style={styles.favorite}><Ionicons name={favorite ? "heart" : "heart-outline"} size={18} color={favorite ? colors.red : colors.text} /></Pressable>
              </View>
              <View style={styles.serviceBody}>
                <View style={styles.serviceTitleRow}><View style={styles.serviceTitleCopy}><Text style={styles.serviceName}>{service.name}</Text><Text style={styles.serviceLocation}><Ionicons name="location-outline" size={10} /> {service.distance} • Jakarta Selatan</Text></View><View style={styles.rating}><Ionicons name="star" size={11} color={colors.yellow} /><Text style={styles.ratingText}>{service.rating}</Text></View></View>
                <View style={styles.tags}><Text>Terpercaya</Text><Text>Pet friendly</Text><Text>Digital record</Text></View>
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
  title: { marginTop: 11, color: colors.navy, fontSize: 27, lineHeight: 31, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { marginTop: 7, color: colors.muted, fontSize: 10 },
  searchBox: { height: 48, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 18, paddingLeft: 14, paddingRight: 6, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow },
  searchInput: { flex: 1, height: "100%", color: colors.text, fontSize: 10 },
  filterButton: { width: 37, height: 37, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky500 },
  categories: { gap: 7, paddingVertical: 15, paddingRight: 16 },
  category: { minHeight: 34, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white },
  activeCategory: { borderColor: colors.sky500, backgroundColor: colors.sky500 }, categoryText: { color: colors.muted, fontSize: 9, fontWeight: "700" }, activeCategoryText: { color: colors.white },
  resultHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }, resultCount: { color: colors.muted, fontSize: 9 }, resultStrong: { color: colors.text, fontWeight: "800" }, sort: { color: colors.sky600, fontSize: 8, fontWeight: "700" },
  results: { gap: 12 }, serviceCard: { overflow: "hidden", borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow }, pressed: { opacity: .8 },
  serviceVisual: { position: "relative", height: 130, alignItems: "center", justifyContent: "center" }, serviceEmoji: { fontSize: 56 }, blue: { backgroundColor: colors.sky100 }, mint: { backgroundColor: colors.mint50 }, violet: { backgroundColor: colors.violet50 }, peach: { backgroundColor: "#FFF0E8" }, favorite: { position: "absolute", top: 11, right: 11, width: 35, height: 35, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.9)" },
  serviceBody: { padding: 15 }, serviceTitleRow: { flexDirection: "row", gap: 10 }, serviceTitleCopy: { flex: 1 }, serviceName: { color: colors.navy, fontSize: 14, fontWeight: "900" }, serviceLocation: { marginTop: 4, color: colors.muted, fontSize: 8 }, rating: { width: 45, height: 32, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, borderRadius: 10, backgroundColor: colors.yellow50 }, ratingText: { color: "#A57417", fontSize: 9, fontWeight: "800" },
  tags: { flexDirection: "row", gap: 5, marginTop: 11 }, status: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 11 }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.mint }, statusText: { color: "#19866F", fontSize: 8, fontWeight: "700" },
  serviceFooter: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line }, priceLabel: { color: colors.muted, fontSize: 7 }, price: { marginTop: 3, color: colors.navy, fontSize: 10, fontWeight: "800" },
  empty: { minHeight: 300, alignItems: "center", justifyContent: "center" }, emptyEmoji: { fontSize: 48 }, emptyTitle: { marginTop: 10, color: colors.navy, fontSize: 17, fontWeight: "800" }, emptyNote: { marginTop: 4, marginBottom: 15, color: colors.muted, fontSize: 10 },
});
