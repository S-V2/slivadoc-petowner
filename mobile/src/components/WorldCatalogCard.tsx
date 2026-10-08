import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WorldItem } from "../api";
import { LocalizedText as Text, useI18n } from "../i18n";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { WorldPhoto } from "./WorldPhoto";
import { colors } from "../theme";
import { worldLabel } from "../../../shared/world-presentation";

type Mode = "academy" | "events" | "consult" | "documents";
const icons: Record<Mode, ComponentProps<typeof Ionicons>["name"]> = { academy: "school-outline", events: "calendar-outline", consult: "videocam-outline", documents: "document-text-outline" };
const inks: Record<Mode, string> = { academy: "#087596", events: "#7554A8", consult: "#12816F", documents: "#536CAC" };

export function WorldCatalogCard({ item, mode, width, onOpen }: { item: WorldItem; mode: Mode; width: number; onOpen: () => void }) {
  const { formatCurrency, formatDate, t } = useI18n();
  const title = item.title || item.name || "", photo = item.cover_url || item.banner_url || item.image_urls?.[0];
  const amount = item.total_fee ?? item.price ?? 0;
  const symbol: ComponentProps<typeof Ionicons>["name"] = mode === "consult" ? item.mode === "chat" ? "chatbubbles-outline" : item.mode === "voice" ? "call-outline" : item.mode === "video" ? "videocam-outline" : "medical-outline" : mode === "documents" && item.category?.includes("flight") ? "airplane-outline" : icons[mode];
  const eventDate = item.starts_at ? formatDate(item.starts_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const label = mode === "academy" ? item.academy_name || "Pet Academy" : mode === "events" ? eventDate : mode === "consult" ? `${item.duration_minutes ?? "—"} ${t("menit")}` : `${item.processing_days ?? "—"} ${t("hari kerja")}`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t("Buka detail")} ${title}`} onPress={onOpen} style={[styles.card, { width }]}>
    {(mode === "academy" || mode === "events") ? <View style={styles.photo}>
      <WorldPhoto src={photo} title={title} icon={icons[mode]}/>
      {item.featured && <View style={styles.featured}><Text style={styles.featuredText}>Pilihan</Text></View>}
      {mode === "events" && item.starts_at && <View style={styles.dateBadge}><Text style={styles.dateDay}>{formatDate(item.starts_at, { day: "numeric" })}</Text><Text style={styles.dateMonth}>{formatDate(item.starts_at, { month: "short" })}</Text></View>}
      {mode === "academy" && item.level && <View style={styles.levelBadge}><Text numberOfLines={1} style={styles.featuredText}>{worldLabel(item.level)}</Text></View>}
    </View> : <View style={[styles.symbol, { backgroundColor: mode === "consult" ? "#EDFAF5" : "#F0F4FF" }]}><Ionicons name={symbol} size={27} color={inks[mode]}/></View>}
    <View style={styles.body}>
      <Text numberOfLines={2} style={[styles.kicker, { color: inks[mode] }]}>{label}</Text>
      <Text numberOfLines={2} style={styles.title}>{title}</Text>
      {mode === "academy" ? <><Text numberOfLines={1} style={styles.note}>{item.trainer_name || "Pet trainer"}</Text>{item.session_count != null && <Text style={styles.note}>{item.duration_weeks} {t("minggu")} · {item.session_count} {t("sesi")}</Text>}<View style={styles.fact}><Ionicons name="star" size={11} color="#C58C2B"/><Text numberOfLines={1} style={styles.note}>{(item.review_count ?? 0) > 0 ? `${(item.rating ?? 0).toFixed(1)} · ${item.review_count} ${t("ulasan")}` : "Belum dinilai"}</Text></View></> : mode === "events" ? <><View style={styles.fact}><Ionicons name="location-outline" size={12} color={colors.muted}/><Text numberOfLines={2} style={styles.note}>{item.city || item.venue}</Text></View><Text style={styles.note}>{Math.max(0, (item.capacity ?? 0) - (item.registered_count ?? 0))} {t("slot tersisa")}</Text></> : mode === "consult" ? <><Text numberOfLines={1} style={styles.note}>{item.trainer_name || item.doctor_name || "Provider"}</Text><Text numberOfLines={2} style={styles.note}>{(item.specialties ?? []).join(" · ") || item.description}</Text></> : <><Text numberOfLines={2} style={styles.note}>{item.description}</Text><View style={styles.fact}><Ionicons name="checkmark-circle-outline" size={12} color={inks[mode]}/><Text style={styles.note}>{item.requirements?.length ?? 0} {t("persyaratan")}</Text></View></>}
      <View style={styles.footer}>
        {item.original_price && item.original_price > amount ? <Text style={styles.original}>{formatCurrency(item.original_price)}</Text> : null}
        <Text numberOfLines={1} style={styles.price}>{mode === "events" && !amount ? "Gratis" : formatCurrency(amount)}</Text>
        <View style={styles.action}><Text style={styles.actionText}>{mode === "academy" ? "Lihat kelas" : mode === "events" ? "Lihat event" : mode === "consult" ? "Lihat paket" : "Lihat & ajukan"}</Text><Ionicons name="arrow-forward" size={13} color={colors.sky600}/></View>
      </View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: "hidden", backgroundColor: colors.white },
  photo: { width: "100%", aspectRatio: 1.45, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 },
  featured: { position: "absolute", top: 8, left: 8, padding: 5, borderRadius: 8, backgroundColor: "#FFFFFFED" }, featuredText: { color: colors.sky600, fontSize: 9, fontWeight: "700" },
  levelBadge: { position: "absolute", bottom: 8, left: 8, right: 8, alignSelf: "flex-start", padding: 5, borderRadius: 8, backgroundColor: "#FFFFFFED" },
  dateBadge: { position: "absolute", bottom: 8, left: 8, width: 37, height: 40, borderRadius: 10, backgroundColor: "#FFFFFFF2", justifyContent: "center", alignItems: "center" }, dateDay: { fontSize: 17, fontWeight: "700", color: "#7554A8" }, dateMonth: { fontSize: 9, color: "#7554A8", textTransform: "uppercase" },
  symbol: { width: 48, height: 48, margin: 11, marginBottom: 0, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 10, gap: 7 }, kicker: { fontSize: 10, lineHeight: 14, minHeight: 14, fontWeight: "600" },
  title: { minHeight: 34, fontSize: 13, lineHeight: 17, fontWeight: "700", color: colors.navy },
  note: { color: colors.muted, fontSize: 11, lineHeight: 15, flexShrink: 1 }, fact: { flexDirection: "row", alignItems: "center", gap: 4 },
  footer: { marginTop: "auto", paddingTop: 9, gap: 6, borderTopWidth: 1, borderTopColor: colors.line },
  price: { color: colors.navy, fontSize: 13, fontWeight: "700" }, original: { fontSize: 10, color: colors.muted, textDecorationLine: "line-through" },
  action: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 5, minHeight: 24 }, actionText: { fontSize: 11, color: colors.sky600, fontWeight: "600", flexShrink: 1 },
});
