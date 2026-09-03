import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { PetView, Service } from "../data";
import type { MobileActivity } from "../api";
import { colors, shadow } from "../theme";
import { Card, Pill, PrimaryButton, Screen, SectionTitle, SoftButton, TopHeader } from "../components/ui";

type Props = {
  onAction: (message: string) => void;
  onBook: (service?: Service) => void;
  onOpenChat: () => void;
  onOpenNotifications: () => void;
  locationTitle: string;
  onLocation: () => void;
  onNavigate: (tab: "discover" | "world" | "activity" | "health") => void;
  ownerName?:string;
  pet?:PetView;
  services:Service[];
  activities:MobileActivity[];
};

export function HomeScreen({ onAction, onBook, onOpenChat, onOpenNotifications, locationTitle, onLocation, onNavigate,ownerName,pet,services,activities }: Props) {
  const petView=pet??{id:"",name:"pet kamu",breed:"Login untuk melihat profil",age:"—",weight:"—",icon:"🐾",score:0,allergies:""};
  const homeCare=services.find(item=>item.category.toLowerCase().includes("home"));
  const hotel=services.find(item=>item.category.toLowerCase().includes("hotel"));
  const quickActions = [
    { label: "Booking", note: "Klinik", icon: "calendar", emoji: "📅", color: colors.sky50, onPress: () => onBook() },
    { label: "Tanya Dokter", note: "Online", icon: "chatbubble", emoji: "👩🏻‍⚕️", color: colors.mint50, onPress: onOpenChat },
    { label: "Home Care", note: "Ke rumah", icon: "home", emoji: "🏠", color: "#FFF1E8", onPress: () => homeCare?onBook(homeCare):onNavigate("discover") },
    { label: "Darurat", note: "24 jam", icon: "medkit", emoji: "🚑", color: colors.red50, onPress: () => onAction("Menghubungkan hotline darurat 24/7") },
    { label: "Pet Hotel", note: "Terpercaya", icon: "bed", emoji: "🏡", color: colors.violet50, onPress: () => hotel?onBook(hotel):onNavigate("discover") },
    { label: "Sliva World", note: "Academy & Hub", icon: "planet", emoji: "🌐", color: colors.sky50, onPress: () => onNavigate("world") },
  ];

  return (
    <Screen>
      <Pressable onPress={onLocation}><TopHeader title={locationTitle} subtitle="Lokasi kamu • ketuk untuk perbarui" onNotification={onOpenNotifications} /></Pressable>
      <View style={styles.greetingRow}>
        <View style={styles.greetingCopy}>
          <Text style={styles.greeting}>{ownerName?`Halo, ${ownerName.split(" ")[0]}! 👋`:"Selamat datang! 👋"}</Text>
          <Text numberOfLines={2} style={styles.greetingNote}>{ownerName?"Semua kabar pet-mu sudah tersinkron.":"Masuk untuk melihat akun dan kesehatan pet."}</Text>
        </View>
        <Pressable onPress={() => onAction("Pilih profil hewan")} style={styles.petPicker}>
          <Text style={styles.petPickerEmoji}>{petView.icon}</Text><Text numberOfLines={1} style={styles.petPickerName}>{petView.name}</Text><Ionicons name="chevron-down" size={12} color={colors.muted} />
        </Pressable>
      </View>

      <LinearGradient colors={["#087FC8", "#20AEF1", "#7BD8FA"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroOrbLarge} />
        <View style={styles.heroOrbSmall} />
        <View style={styles.petBubble}>
          <Text style={styles.petBubbleEmoji}>🐕</Text>
          <Text style={[styles.petBubbleEmoji, styles.petBubbleCat]}>🐈</Text>
          <Text style={styles.petBubbleSparkle}>✦</Text>
        </View>
        <View style={styles.heroContent}>
          <Pill tone="mint">ALL-IN-ONE PET CARE</Pill>
          <Text style={styles.heroTitle}>Semua kebutuhan pet, satu aplikasi.</Text>
          <Text style={styles.heroNote}>Booking, konsultasi, dan kesehatan {petView.name} jadi lebih gampang.</Text>
          <View style={styles.heroButtons}>
            <PrimaryButton compact label="Buat booking" icon="calendar-outline" onPress={() => onBook()} />
            <Pressable style={styles.heroGhost} onPress={onOpenChat}><Ionicons name="chatbubble-outline" size={15} color={colors.white} /><Text style={styles.heroGhostText}>Tanya dokter</Text></Pressable>
          </View>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
        {quickActions.map((item) => (
          <Pressable key={item.label} onPress={item.onPress} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
            <View style={[styles.quickIcon, { backgroundColor: item.color }]}><Text style={styles.quickEmoji}>{item.emoji}</Text></View>
            <Text numberOfLines={2} style={styles.quickLabel}>{item.label}</Text><Text numberOfLines={1} style={styles.quickNote}>{item.note}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle eyebrow="HEALTH SNAPSHOT" title={`Kondisi ${petView.name}`} action="Detail" onAction={() => onNavigate("health")} />
      <Card style={styles.healthCard}>
        <View style={styles.healthTop}>
          <View style={styles.petAvatar}><Text style={styles.petAvatarEmoji}>{petView.icon}</Text><View style={styles.checkDot}><Ionicons name="checkmark" size={10} color={colors.white} /></View></View>
          <View style={styles.healthCopy}><Text style={styles.petName}>{petView.name}</Text><Text style={styles.petMeta}>{petView.breed} • {petView.age}</Text><Text style={styles.updated}>{petView.lastUpdated?`Diperbarui ${new Date(petView.lastUpdated).toLocaleDateString("id-ID")}`:"Belum ada rekam medis"}</Text></View>
          <View style={styles.scoreCircle}><Text style={styles.scoreValue}>{petView.score}</Text><Text style={styles.scoreLabel}>Health</Text></View>
        </View>
        <View style={styles.metricRow}>
          <View style={styles.metric}><Text style={styles.metricEmoji}>⚖️</Text><Text style={styles.metricLabel}>Berat</Text><Text style={styles.metricValue}>{petView.weight}</Text><Text style={styles.metricGood}>Data profil</Text></View>
          <View style={styles.metric}><Text style={styles.metricEmoji}>📋</Text><Text style={styles.metricLabel}>Aktivitas</Text><Text style={styles.metricValue}>{activities.length}</Text><Text style={styles.metricWarn}>Terbaru</Text></View>
          <View style={styles.metric}><Text style={styles.metricEmoji}>🛡️</Text><Text style={styles.metricLabel}>Health score</Text><Text style={styles.metricValue}>{petView.score}/100</Text><Text style={styles.metricGood}>Tersinkron</Text></View>
        </View>
        <View style={styles.insight}><Text style={styles.insightIcon}>💡</Text><View style={styles.insightCopy}><Text style={styles.insightTitle}>Insight untuk {petView.name}</Text><Text style={styles.insightText}>{activities[0]?.description||"Belum ada aktivitas kesehatan terjadwal."}</Text></View><Pressable onPress={() => onNavigate("activity")}><Text style={styles.insightAction}>Lihat</Text></Pressable></View>
      </Card>

      <SectionTitle eyebrow="CARE PLAN" title="Perawatan terdekat" action="Lihat semua" onAction={() => onNavigate("activity")} />
      <Card style={styles.careCard}>
        {activities.slice(0,3).map((item, index) => (
          <Pressable key={item.id} onPress={() => onAction(`Detail ${item.title}`)} style={[styles.careRow, index < activities.slice(0,3).length - 1 && styles.careDivider]}>
            <View style={[styles.careIcon, item.category==="health" ? styles.mint : item.category==="booking" ? styles.violet : styles.blue]}><Text>{item.category==="health"?"🩺":item.category==="booking"?"📅":"📋"}</Text></View>
            <View style={styles.careCopy}><Text style={styles.careTime}>{new Date(item.starts_at||item.occurred_at).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</Text><Text style={styles.careTitle}>{item.title}</Text><Text style={styles.careNote}>{item.description}</Text></View>
            <Ionicons name="chevron-forward" size={17} color="#A3AFBC" />
          </Pressable>
        ))}
        {activities.length===0?<Text style={styles.careNote}>Belum ada aktivitas pada akun ini.</Text>:null}
        <SoftButton label="Lihat semua aktivitas" icon="arrow-forward" onPress={() => onNavigate("activity")} style={styles.reminderButton} />
      </Card>

      <SectionTitle eyebrow="DI SEKITARMU" title={`Pilihan untuk ${petView.name}`} action="Jelajahi" onAction={() => onNavigate("discover")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceScroll}>
        {services.map((service) => (
          <Pressable key={service.id} onPress={() => onBook(service)} style={styles.serviceCard}>
            <View style={[styles.serviceVisual, service.tone === "mint" ? styles.mint : service.tone === "violet" ? styles.violet : service.tone === "peach" ? styles.peach : styles.blue]}>
              <Text style={styles.serviceEmoji}>{service.icon}</Text><Pill>{service.category}</Pill>
            </View>
            <Text numberOfLines={1} style={styles.serviceName}>{service.name}</Text>
            <View style={styles.serviceMeta}><Ionicons name="star" size={11} color={colors.yellow} /><Text>{service.rating}</Text><Text>•</Text><Text>{service.distance}</Text></View>
            <View style={styles.serviceFooter}><Text style={styles.servicePrice}>{service.price}</Text><View style={styles.bookCircle}><Ionicons name="arrow-forward" size={15} color={colors.white} /></View></View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greetingRow: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4, marginBottom: 12 },
  greetingCopy: { minWidth: 0, flex: 1 },
  greeting: { color: colors.navy, fontSize: 21, lineHeight: 26, fontWeight: "800", letterSpacing: -0.25 },
  greetingNote: { marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 17 },
  petPicker: { maxWidth: 126, flexDirection: "row", alignItems: "center", gap: 5, padding: 4, paddingRight: 8, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  petPickerEmoji: { width: 30, height: 30, borderRadius: 10, overflow: "hidden", backgroundColor: colors.yellow50, fontSize: 20, textAlign: "center", lineHeight: 30 },
  petPickerName: { minWidth: 0, flexShrink: 1, color: colors.text, fontSize: 11, fontWeight: "800" },
  hero: { position: "relative", minHeight: 232, overflow: "hidden", justifyContent: "center", borderRadius: 20, ...shadow },
  heroContent: { zIndex: 2, width: "72%", padding: 18 },
  heroTitle: { marginTop: 10, color: colors.white, fontSize: 23, lineHeight: 27, fontWeight: "900", letterSpacing: -0.45 },
  heroNote: { maxWidth: 250, marginTop: 6, color: "rgba(255,255,255,.88)", fontSize: 12, lineHeight: 18 },
  heroButtons: { flexDirection: "row", gap: 7, marginTop: 14 },
  heroGhost: { minHeight: 40, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,.55)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "rgba(255,255,255,.12)" },
  heroGhostText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  heroOrbLarge: { position: "absolute", right: -62, top: -76, width: 230, height: 230, borderRadius: 115, backgroundColor: "rgba(255,255,255,.14)" },
  heroOrbSmall: { position: "absolute", right: 52, bottom: -55, width: 115, height: 115, borderRadius: 58, backgroundColor: "rgba(255,255,255,.1)" },
  petBubble: { position: "absolute", zIndex: 1, right: 14, bottom: 20, width: 102, height: 116, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,.4)", borderRadius: 48, backgroundColor: "rgba(255,255,255,.25)", transform: [{ rotate: "5deg" }] },
  petBubbleEmoji: { position: "absolute", left: 13, bottom: 18, fontSize: 46 },
  petBubbleCat: { left: 48, bottom: 39, fontSize: 39 },
  petBubbleSparkle: { position: "absolute", right: 10, top: 13, color: colors.white, fontSize: 20, fontWeight: "900" },
  quickScroll: { gap: 4, paddingTop: 12, paddingRight: 8 },
  quickCard: { width: 69, minHeight: 80, alignItems: "center", justifyContent: "flex-start", paddingTop: 5 },
  quickIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 15, borderWidth: 1, borderColor: "rgba(255,255,255,.85)" },
  quickEmoji: { fontSize: 23 }, quickLabel: { minHeight: 28, marginTop: 5, color: colors.navy, fontSize: 11, lineHeight: 13, fontWeight: "800", textAlign: "center" }, quickNote: { marginTop: 1, color: colors.muted, fontSize: 9, textAlign: "center" }, pressed: { opacity: .68, transform: [{ scale: .97 }] },
  healthCard: { padding: 13 },
  healthTop: { flexDirection: "row", alignItems: "center" },
  petAvatar: { position: "relative", width: 52, height: 52, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: colors.yellow50 },
  petAvatarEmoji: { fontSize: 31 }, checkDot: { position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint },
  healthCopy: { flex: 1, marginLeft: 10, gap: 2 }, petName: { color: colors.navy, fontSize: 17, fontWeight: "900" }, petMeta: { color: colors.text, fontSize: 11 }, updated: { color: colors.muted, fontSize: 9 },
  scoreCircle: { width: 53, height: 53, borderRadius: 27, borderWidth: 5, borderColor: colors.sky500, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }, scoreValue: { color: colors.navy, fontSize: 17, fontWeight: "900" }, scoreLabel: { color: colors.muted, fontSize: 8 },
  metricRow: { flexDirection: "row", gap: 6, marginTop: 11 }, metric: { flex: 1, padding: 8, borderRadius: 12, backgroundColor: colors.canvas }, metricEmoji: { fontSize: 17 }, metricLabel: { marginTop: 4, color: colors.muted, fontSize: 9 }, metricValue: { marginTop: 1, color: colors.navy, fontSize: 11, fontWeight: "800" }, metricGood: { marginTop: 1, color: colors.mint, fontSize: 8, fontWeight: "700" }, metricWarn: { marginTop: 1, color: colors.yellow, fontSize: 8, fontWeight: "700" },
  insight: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 10, padding: 10, borderRadius: 11, backgroundColor: colors.sky50 }, insightIcon: { fontSize: 22 }, insightCopy: { flex: 1, gap: 2 }, insightTitle: { color: "#315E7C", fontSize: 12, fontWeight: "800" }, insightText: { color: "#66869A", fontSize: 11 }, insightAction: { color: colors.sky600, fontSize: 12, fontWeight: "800" },
  careCard: { padding: 14 }, careRow: { minHeight: 63, flexDirection: "row", alignItems: "center", gap: 10 }, careDivider: { borderBottomWidth: 1, borderBottomColor: colors.line }, careIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" }, blue: { backgroundColor: colors.sky50 }, mint: { backgroundColor: colors.mint50 }, violet: { backgroundColor: colors.violet50 }, peach: { backgroundColor: "#FFF1E8" }, careCopy: { flex: 1, gap: 2 }, careTime: { color: colors.sky600, fontSize: 11, fontWeight: "800" }, careTitle: { color: colors.navy, fontSize: 14, fontWeight: "800" }, careNote: { color: colors.muted, fontSize: 11 }, reminderButton: { marginTop: 10 },
  serviceScroll: { gap: 9, paddingRight: 12, paddingBottom: 4 }, serviceCard: { width: 176, padding: 9, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow }, serviceVisual: { height: 82, borderRadius: 13, alignItems: "center", justifyContent: "center" }, serviceVisualPill: { position: "absolute" }, serviceEmoji: { fontSize: 38 }, serviceName: { marginTop: 8, color: colors.navy, fontSize: 13, fontWeight: "800" }, serviceMeta: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 }, serviceMetaText: { color: colors.muted, fontSize: 9 }, serviceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }, servicePrice: { color: colors.sky600, fontSize: 11, fontWeight: "800" }, bookCircle: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky500 },
});
