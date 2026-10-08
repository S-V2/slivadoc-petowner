import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedText as Text, LocalizedTextInput as TextInput } from "../i18n";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { TabRail } from "./TabRail";
import { worldLabel } from "../../../shared/world-presentation";
import { colors } from "../theme";
export function EventDiscovery({ query, onQuery, categories, category, onCategory }: { query: string; onQuery: (value: string) => void; categories: string[]; category: string; onCategory: (value: string) => void }) {
  return <View style={styles.section}>
    <LinearGradient colors={["#DFF6F5", "#EDF7FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.banner}>
      <View style={styles.copy}><Text style={styles.kicker}>SLIVA WORLD · PET EVENT</Text><Text accessibilityRole="header" style={styles.title}>Momen seru, bareng pet-mu.</Text><Text style={styles.note}>Temukan agenda dan pengalaman baru di kotamu.</Text></View>
      <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Ionicons name="ticket-outline" size={43} color={colors.sky600}/><View style={styles.artDot}/></View>
    </LinearGradient>
    <View style={styles.search}><Ionicons name="search-outline" size={17} color={colors.sky600}/><TextInput accessibilityLabel="Cari event atau kota" placeholder="Cari event atau kota…" value={query} onChangeText={onQuery} style={styles.input}/>{query ? <Pressable accessibilityLabel="Hapus pencarian event" onPress={() => onQuery("")} style={styles.clear}><Ionicons name="close" size={17} color={colors.muted}/></Pressable> : null}</View>
    <TabRail activeKey={category} contentContainerStyle={styles.categories}>{["all", ...categories].map(value => <Pressable accessibilityRole="tab" accessibilityState={{ selected: value === category }} key={value} onPress={() => onCategory(value)} style={[styles.chip, category === value && styles.activeChip]}><Text style={[styles.chipText, category === value && styles.activeText]}>{value === "all" ? "Semua" : worldLabel(value)}</Text></Pressable>)}</TabRail>
  </View>;
}
const styles = StyleSheet.create({
  section: { marginTop: 12 }, banner: { borderRadius: 22, padding: 18, paddingBottom: 30, flexDirection: "row", alignItems: "center", gap: 12, overflow: "hidden" }, copy: { flex: 1 }, kicker: { fontSize: 9, fontWeight: "700", letterSpacing: .8, color: colors.sky600 }, title: { fontSize: 24, lineHeight: 28, letterSpacing: -.5, fontWeight: "700", color: colors.navy, marginTop: 9 }, note: { fontSize: 11, lineHeight: 16, color: colors.muted, marginTop: 8 },
  art: { width: 64, height: 80, borderRadius: 18, backgroundColor: "#FFFFFFAA", borderWidth: 1, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-12deg" }] }, artDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#27C2AB", position: "absolute", right: 7, top: 7 },
  search: { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginTop: -18, minHeight: 50, paddingLeft: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.white }, input: { flex: 1, minWidth: 0, fontSize: 13, color: colors.navy, padding: 12 }, clear: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  categories: { gap: 8, paddingTop: 12, paddingBottom: 2 }, chip: { minHeight: 44, justifyContent: "center", paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }, activeChip: { backgroundColor: colors.sky600, borderColor: colors.sky600 }, chipText: { fontSize: 11, fontWeight: "600", color: colors.muted }, activeText: { color: colors.white },
});
