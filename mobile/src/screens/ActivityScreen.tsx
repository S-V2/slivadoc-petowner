import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { colors, shadow } from "../theme";
import { Card, Pill, PrimaryButton, Screen, SectionTitle, SoftButton, TopHeader } from "../components/ui";

export function ActivityScreen({ onAction, onBook, onOpenNotifications }: { onAction: (message: string) => void; onBook: () => void; onOpenNotifications: () => void }) {
  const [tab, setTab] = useState("Mendatang");
  return (
    <Screen>
      <TopHeader title="Aktivitas" subtitle="Booking, konsultasi & pesanan" onNotification={onOpenNotifications} />
      <Text style={styles.title}>Semua aktivitasmu</Text><Text style={styles.subtitle}>Pantau setiap kebutuhan Milo dan Luna.</Text>
      <View style={styles.summaryRow}><Summary icon="📅" value="2" label="Booking" color={colors.sky50} /><Summary icon="📦" value="1" label="Pesanan" color={colors.violet50} /><Summary icon="💬" value="3" label="Chat aktif" color={colors.mint50} /></View>
      <View style={styles.tabs}>{["Mendatang", "Berlangsung", "Riwayat"].map((item) => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}><Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text>{item !== "Riwayat" ? <View style={styles.tabCount}><Text>{item === "Mendatang" ? 2 : 1}</Text></View> : null}</Pressable>)}</View>

      {tab === "Mendatang" ? <View style={styles.list}>
        <BookingCard month="SEP" day="04" time="16.00" icon="💉" tone="mint" status="Terkonfirmasi" statusTone="mint" title="Vaksin DHPPi tahunan" place="Pawsitive Vet Kemang • drh. Amanda" pet="🐕 Milo" onAction={onAction} />
        <BookingCard month="SEP" day="12" time="09.30" icon="🛁" tone="violet" status="Menunggu konfirmasi" statusTone="yellow" title="Complete Grooming Package" place="Fluffy House • Antar jemput" pet="🐈 Luna" onAction={onAction} />
        <PrimaryButton label="Buat booking baru" icon="add" onPress={onBook} />
      </View> : null}

      {tab === "Berlangsung" ? <Card style={styles.deliveryCard}>
        <View style={styles.deliveryTop}><View style={[styles.bookingIcon, styles.blue]}><Text style={styles.bookingEmoji}>📦</Text></View><View style={styles.deliveryCopy}><Pill>DALAM PERJALANAN</Pill><Text style={styles.cardTitle}>Pesanan Pet Shop Same Day</Text><Text style={styles.cardNote}>Estimasi tiba 14.35–14.50</Text></View></View>
        <View style={styles.progress}><View style={styles.progressDone} /><View style={styles.progressDone} /><View style={styles.progressActive} /><View /></View>
        <View style={styles.courier}><View style={styles.courierAvatar}><Text>🛵</Text></View><View style={styles.courierCopy}><Text style={styles.courierName}>Arif • Sliva Express</Text><Text style={styles.courierNote}>Menuju alamat rumahmu</Text></View><Pressable style={styles.phone} onPress={() => onAction("Menghubungi kurir")}><Ionicons name="call" size={17} color={colors.sky600} /></Pressable></View>
        <View style={styles.rowButtons}><SoftButton label="Chat kurir" icon="chatbubble-outline" onPress={() => onAction("Chat kurir dibuka")} style={styles.flex} /><PrimaryButton compact label="Lacak pesanan" icon="navigate" onPress={() => onAction("Pelacakan langsung dibuka")} style={styles.flex} /></View>
      </Card> : null}

      {tab === "Riwayat" ? <View style={styles.historyList}>
        <SectionTitle eyebrow="AGUSTUS 2026" title="Selesai" />
        <History icon="🩺" title="General check-up" date="12 Agu • Pawsitive Vet" price="Rp185.000" onPress={() => onAction("Invoice diunduh")} />
        <History icon="🛍️" title="Pet food & supplements" date="4 Agu • Sliva Pet Shop" price="Rp1.544.000" onPress={() => onAction("Pesan lagi ditambahkan")} />
        <History icon="💬" title="Video consultation" date="29 Jul • drh. Amanda" price="Rp75.000" onPress={() => onAction("Ringkasan konsultasi dibuka")} />
      </View> : null}
    </Screen>
  );
}

function Summary({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) { return <View style={styles.summary}><View style={[styles.summaryIcon, { backgroundColor: color }]}><Text>{icon}</Text></View><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>; }

function BookingCard({ month, day, time, icon, tone, status, statusTone, title, place, pet, onAction }: { month: string; day: string; time: string; icon: string; tone: "mint" | "violet"; status: string; statusTone: "mint" | "yellow"; title: string; place: string; pet: string; onAction: (message: string) => void }) {
  return <Card style={styles.bookingCard}><View style={styles.bookingDate}><Text style={styles.month}>{month}</Text><Text style={styles.day}>{day}</Text><Text style={styles.time}>{time}</Text></View><View style={[styles.bookingIcon, tone === "mint" ? styles.mint : styles.violet]}><Text style={styles.bookingEmoji}>{icon}</Text></View><View style={styles.bookingCopy}><Pill tone={statusTone}>{status}</Pill><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardNote}>{place}</Text><Text style={styles.petChip}>{pet}</Text></View><View style={styles.bookingActions}><SoftButton label="Ubah" onPress={() => onAction("Jadwal dapat diubah hingga H-1")} style={styles.flex} /><PrimaryButton compact label="Detail" onPress={() => onAction("Detail booking dibuka")} style={styles.flex} /></View></Card>;
}

function History({ icon, title, date, price, onPress }: { icon: string; title: string; date: string; price: string; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => [styles.history, pressed && { opacity: .7 }]}><View style={styles.historyIcon}><Text>{icon}</Text></View><View style={styles.historyCopy}><Text style={styles.historyTitle}>{title}</Text><Text style={styles.historyDate}>{date}</Text></View><View><Text style={styles.historyPrice}>{price}</Text><Text style={styles.historyStatus}>Selesai</Text></View><Ionicons name="chevron-forward" size={16} color="#A4AFBC" /></Pressable>; }

const styles = StyleSheet.create({
  title: { marginTop: 10, color: colors.navy, fontSize: 25, fontWeight: "900", letterSpacing: -.6 }, subtitle: { marginTop: 5, color: colors.muted, fontSize: 10 },
  summaryRow: { flexDirection: "row", gap: 8, marginTop: 17 }, summary: { flex: 1, padding: 11, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white, ...shadow }, summaryIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" }, summaryValue: { marginTop: 8, color: colors.navy, fontSize: 16, fontWeight: "900" }, summaryLabel: { marginTop: 2, color: colors.muted, fontSize: 7 },
  tabs: { height: 45, flexDirection: "row", gap: 4, marginTop: 18, marginBottom: 12, padding: 4, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.white }, tab: { flex: 1, borderRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, activeTab: { backgroundColor: colors.sky50 }, tabText: { color: colors.muted, fontSize: 8, fontWeight: "700" }, activeTabText: { color: colors.sky600 }, tabCount: { minWidth: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky100 },
  list: { gap: 11 }, bookingCard: { padding: 13, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }, bookingDate: { width: 50, height: 64, borderRadius: 11, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: "#F8FAFC" }, month: { color: colors.sky600, fontSize: 7, fontWeight: "800" }, day: { color: colors.navy, fontSize: 22, lineHeight: 24, fontWeight: "900" }, time: { color: colors.muted, fontSize: 7 }, bookingIcon: { width: 45, height: 45, borderRadius: 13, alignItems: "center", justifyContent: "center" }, bookingEmoji: { fontSize: 23 }, mint: { backgroundColor: colors.mint50 }, violet: { backgroundColor: colors.violet50 }, blue: { backgroundColor: colors.sky50 }, bookingCopy: { flex: 1, minWidth: 190 }, cardTitle: { marginTop: 8, color: colors.navy, fontSize: 11, fontWeight: "900" }, cardNote: { marginTop: 3, color: colors.muted, fontSize: 7 }, petChip: { alignSelf: "flex-start", marginTop: 7, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, overflow: "hidden", color: colors.text, backgroundColor: "#F1F5F7", fontSize: 7 }, bookingActions: { width: "100%", flexDirection: "row", gap: 7, paddingTop: 11, borderTopWidth: 1, borderTopColor: colors.line }, flex: { flex: 1 },
  deliveryCard: { padding: 15 }, deliveryTop: { flexDirection: "row", alignItems: "center", gap: 11 }, deliveryCopy: { flex: 1 }, progress: { flexDirection: "row", gap: 5, marginVertical: 15 }, progressDone: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.sky500 }, progressActive: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.sky400 }, courier: { flexDirection: "row", alignItems: "center", gap: 9, padding: 10, borderRadius: 12, backgroundColor: colors.sky50 }, courierAvatar: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }, courierCopy: { flex: 1 }, courierName: { color: colors.navy, fontSize: 9, fontWeight: "800" }, courierNote: { marginTop: 3, color: colors.muted, fontSize: 7 }, phone: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }, rowButtons: { flexDirection: "row", gap: 7, marginTop: 12 },
  historyList: { gap: 8 }, history: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white }, historyIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#EFF6FA" }, historyCopy: { flex: 1 }, historyTitle: { color: colors.navy, fontSize: 9, fontWeight: "800" }, historyDate: { marginTop: 4, color: colors.muted, fontSize: 7 }, historyPrice: { color: colors.text, fontSize: 8, fontWeight: "800", textAlign: "right" }, historyStatus: { marginTop: 4, color: colors.mint, fontSize: 7, fontWeight: "700", textAlign: "right" },
});
