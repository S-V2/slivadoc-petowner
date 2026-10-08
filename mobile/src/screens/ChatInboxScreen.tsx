import { LocalizedPressable as Pressable } from "../components/LocalizedPressable";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator,  StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  getMobileMarketplaceChats,
  type MobileActivityCenterItem,
  type MobileMarketplaceChatThread,
} from "../api";
import { EmptyState, Screen, TopHeader } from "../components/ui";
import { LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "../i18n";
import { colors, shadow, typography } from "../theme";

type ChatCategory = "store" | "veterinarian";

export function ChatInboxScreen({
  activities,
  refreshVersion,
  onOpenNotifications,
  onOpenStore,
  onOpenDoctor,
  onAction,
}: {
  activities: MobileActivityCenterItem[];
  refreshVersion: number;
  onOpenNotifications: () => void;
  onOpenStore: (thread: MobileMarketplaceChatThread) => void;
  onOpenDoctor: (item: MobileActivityCenterItem) => void;
  onAction: (message: string) => void;
}) {
  const { formatDate } = useI18n();
  const [category, setCategory] = useState<ChatCategory>("store");
  const [query, setQuery] = useState("");
  const [threads, setThreads] = useState<MobileMarketplaceChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      void getMobileMarketplaceChats()
        .then((result) => {
          if (active) setThreads(result.data);
        })
        .catch((cause) => {
          if (!active) return;
          const message = cause instanceof Error ? cause.message : "Daftar chat belum dapat dimuat";
          setError(message);
          onAction(message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [onAction, refreshVersion]);

  const normalized = query.trim().toLowerCase();
  const visibleStores = useMemo(
    () => threads.filter((item) => item.business_name.toLowerCase().includes(normalized)),
    [normalized, threads],
  );
  const visibleDoctors = useMemo(
    () =>
      activities
        .filter(
          (item) =>
            item.type === "consultation" &&
            item.provider_type !== "trainer" &&
            (item.provider_name || item.doctor_name || item.title)
              .toLowerCase()
              .includes(normalized),
        )
        .filter(
          (item, index, all) =>
            all.findIndex(
              (candidate) =>
                (candidate.provider_id || candidate.veterinarian_id || candidate.id) ===
                (item.provider_id || item.veterinarian_id || item.id),
            ) === index,
        ),
    [activities, normalized],
  );
  const unreadStores = threads.reduce((total, item) => total + item.unread_count, 0);

  return (
    <Screen contentStyle={styles.content}>
      <TopHeader title="Chat" subtitle="Percakapanmu" onNotification={onOpenNotifications} />
      <View style={styles.tabs} accessibilityRole="tablist">
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: category === "store" }} onPress={() => { setCategory("store"); setQuery(""); }} style={[styles.tab, category === "store" && styles.tabActive]}>
          <Ionicons name="storefront-outline" size={17} color={category === "store" ? colors.white : colors.muted} />
          <Text style={[styles.tabText, category === "store" && styles.tabTextActive]}>Toko</Text>
          {unreadStores > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadStores}</Text></View> : null}
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: category === "veterinarian" }} onPress={() => { setCategory("veterinarian"); setQuery(""); }} style={[styles.tab, category === "veterinarian" && styles.tabActive]}>
          <Ionicons name="medkit-outline" size={17} color={category === "veterinarian" ? colors.white : colors.muted} />
          <Text style={[styles.tabText, category === "veterinarian" && styles.tabTextActive]}>Dokter Hewan</Text>
        </Pressable>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.sky600} />
        <TextInput value={query} onChangeText={setQuery} placeholder={category === "store" ? "Cari nama toko…" : "Cari nama dokter…"} placeholderTextColor={colors.muted} style={styles.searchInput} />
      </View>

      {loading && category === "store" ? (
        <View style={styles.loading} accessibilityRole="progressbar"><ActivityIndicator color={colors.sky600} /><View><Text style={styles.loadingTitle}>Memuat percakapan…</Text><Text style={styles.loadingNote}>Menyinkronkan pesan dan status toko terbaru.</Text></View></View>
      ) : error && category === "store" ? (
        <EmptyState icon="cloud-offline-outline" title="Chat belum dapat dimuat" note={error} action="Coba lagi" onAction={() => onAction("Tarik layar ke bawah untuk memuat ulang")} />
      ) : category === "store" && visibleStores.length ? (
        <View style={styles.list}>{visibleStores.map((thread) => <ChatRow key={thread.id} title={thread.business_name} note={thread.last_message || `Mulai chat tentang ${thread.product_name || "produk toko"}`} meta={thread.last_message_created_at ? formatDate(thread.last_message_created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Baru"} online={thread.store_is_online} unread={thread.unread_count} icon="storefront-outline" onPress={() => onOpenStore(thread)} />)}</View>
      ) : category === "veterinarian" && visibleDoctors.length ? (
        <View style={styles.list}>{visibleDoctors.map((item) => <ChatRow key={item.id} title={item.provider_name || item.doctor_name || item.title} note={`${item.plan_name || item.subtitle} · ${item.pet_name || "Pet-mu"}`} meta={item.status} icon="medkit-outline" onPress={() => onOpenDoctor(item)} />)}</View>
      ) : (
        <EmptyState icon="chatbubbles-outline" title={query ? "Percakapan tidak ditemukan" : "Belum ada percakapan"} note={category === "store" ? "Chat dengan toko akan tersimpan di sini." : "Chat dokter muncul setelah kamu membuat konsultasi."} action="Cari lagi" onAction={() => setQuery("")} />
      )}
    </Screen>
  );
}

function ChatRow({ title, note, meta, online, unread = 0, icon, onPress }: { title: string; note: string; meta: string; online?: boolean; unread?: number; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.avatar}><Ionicons name={icon} size={21} color={colors.sky600} />{online !== undefined ? <View style={[styles.presence, online && styles.presenceOnline]} /> : null}</View><View style={styles.copy}><View style={styles.rowHead}><Text numberOfLines={1} style={styles.title}>{title}</Text><Text style={styles.meta}>{meta}</Text></View><Text numberOfLines={1} style={styles.note}>{note}</Text></View>{unread > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{unread}</Text></View> : <Ionicons name="chevron-forward" size={17} color={colors.muted} />}</Pressable>;
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  tabs: { flexDirection: "row", gap: 7, padding: 5, borderRadius: 16, backgroundColor: colors.sky50 },
  tab: { minHeight: 43, flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12 },
  tabActive: { backgroundColor: colors.sky600, ...shadow },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  tabTextActive: { color: colors.white },
  badge: { minWidth: 19, height: 19, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderRadius: 10, backgroundColor: colors.white },
  badgeText: { color: colors.sky600, fontSize: 8, fontWeight: "700" },
  search: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.sky100, borderRadius: 16, backgroundColor: colors.white },
  searchInput: { minWidth: 0, flex: 1, color: colors.text, fontSize: 14 },
  loading: { minHeight: 170, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, borderWidth: 1, borderColor: colors.sky100, borderRadius: 20, backgroundColor: colors.white },
  loadingTitle: { color: colors.navy, fontSize: typography.body, fontWeight: "700" },
  loadingNote: { marginTop: 3, color: colors.muted, fontSize: typography.caption },
  list: { gap: 8 },
  row: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderWidth: 1, borderColor: colors.sky100, borderRadius: 19, backgroundColor: colors.white, ...shadow },
  pressed: { opacity: .88, transform: [{ scale: .99 }] },
  avatar: { position: "relative", width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.sky50 },
  presence: { position: "absolute", right: -2, bottom: -2, width: 12, height: 12, borderWidth: 3, borderColor: colors.white, borderRadius: 6, backgroundColor: "#ABB9C3" },
  presenceOnline: { backgroundColor: colors.mint },
  copy: { minWidth: 0, flex: 1, gap: 4 },
  rowHead: { minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { minWidth: 0, flex: 1, color: colors.navy, fontSize: 12, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 8 },
  note: { color: colors.muted, fontSize: 10 },
  unread: { minWidth: 24, height: 24, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, borderRadius: 12, backgroundColor: colors.sky600 },
  unreadText: { color: colors.white, fontSize: 9, fontWeight: "700" },
});
