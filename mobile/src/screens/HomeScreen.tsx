/* eslint-disable @typescript-eslint/no-require-imports */
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { careItems, pets, services, type Service } from "../data";
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
};

export function HomeScreen({ onAction, onBook, onOpenChat, onOpenNotifications, locationTitle, onLocation, onNavigate }: Props) {
  const pet = pets[0];
  const quickActions = [
    { label: "Booking", note: "Klinik", icon: "calendar", emoji: "📅", color: colors.sky50, onPress: () => onBook() },
    { label: "Tanya Dokter", note: "Online", icon: "chatbubble", emoji: "👩🏻‍⚕️", color: colors.mint50, onPress: onOpenChat },
    { label: "Home Care", note: "Ke rumah", icon: "home", emoji: "🏠", color: "#FFF1E8", onPress: () => onBook(services[3]) },
    { label: "Darurat", note: "24 jam", icon: "medkit", emoji: "🚑", color: colors.red50, onPress: () => onAction("Menghubungkan hotline darurat 24/7") },
    { label: "Pet Hotel", note: "Terpercaya", icon: "bed", emoji: "🏡", color: colors.violet50, onPress: () => onBook(services[2]) },
    { label: "Sliva World", note: "Academy & Hub", icon: "planet", emoji: "🌐", color: colors.sky50, onPress: () => onNavigate("world") },
  ];

  return (
    <Screen>
      <Pressable onPress={onLocation}><TopHeader title={locationTitle} subtitle="Lokasi kamu • ketuk untuk perbarui" onNotification={onOpenNotifications} /></Pressable>
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>Selamat siang, Evans! 👋</Text>
          <Text style={styles.greetingNote}>Milo dan Luna baik hari ini.</Text>
        </View>
        <Pressable onPress={() => onAction("Pilih profil hewan")} style={styles.petPicker}>
          <Text style={styles.petPickerEmoji}>{pet.icon}</Text><Text style={styles.petPickerName}>{pet.name}</Text><Ionicons name="chevron-down" size={13} color={colors.muted} />
        </Pressable>
      </View>

      <ImageBackground source={require("../../assets/hero.png")} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={["rgba(7,87,139,.92)", "rgba(14,126,186,.57)", "rgba(32,153,210,.04)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroGradient}>
          <Pill tone="mint">SLIVACARE+ AKTIF</Pill>
          <Text style={styles.heroTitle}>Seluruh kebahagiaan mereka, dalam satu aplikasi.</Text>
          <Text style={styles.heroNote}>Rawat dan dapatkan bantuan profesional kapan pun Milo membutuhkannya.</Text>
          <View style={styles.heroButtons}>
            <PrimaryButton compact label="Buat booking" icon="calendar-outline" onPress={() => onBook()} />
            <Pressable style={styles.heroGhost} onPress={onOpenChat}><Ionicons name="chatbubble-outline" size={15} color={colors.white} /><Text style={styles.heroGhostText}>Tanya dokter</Text></Pressable>
          </View>
        </LinearGradient>
      </ImageBackground>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
        {quickActions.map((item) => (
          <Pressable key={item.label} onPress={item.onPress} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
            <View style={[styles.quickIcon, { backgroundColor: item.color }]}><Text style={styles.quickEmoji}>{item.emoji}</Text></View>
            <Text style={styles.quickLabel}>{item.label}</Text><Text style={styles.quickNote}>{item.note}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle eyebrow="HEALTH SNAPSHOT" title={`Kondisi ${pet.name}`} action="Detail" onAction={() => onNavigate("health")} />
      <Card style={styles.healthCard}>
        <View style={styles.healthTop}>
          <View style={styles.petAvatar}><Text style={styles.petAvatarEmoji}>{pet.icon}</Text><View style={styles.checkDot}><Ionicons name="checkmark" size={10} color={colors.white} /></View></View>
          <View style={styles.healthCopy}><Text style={styles.petName}>{pet.name}</Text><Text style={styles.petMeta}>{pet.breed} • {pet.age}</Text><Text style={styles.updated}>Diperbarui 12 Agu 2026</Text></View>
          <View style={styles.scoreCircle}><Text style={styles.scoreValue}>{pet.score}</Text><Text style={styles.scoreLabel}>Excellent</Text></View>
        </View>
        <View style={styles.metricRow}>
          <View style={styles.metric}><Text style={styles.metricEmoji}>⚖️</Text><Text style={styles.metricLabel}>Berat</Text><Text style={styles.metricValue}>{pet.weight}</Text><Text style={styles.metricGood}>Stabil</Text></View>
          <View style={styles.metric}><Text style={styles.metricEmoji}>💉</Text><Text style={styles.metricLabel}>Vaksin</Text><Text style={styles.metricValue}>4 dari 5</Text><Text style={styles.metricWarn}>1 mendatang</Text></View>
          <View style={styles.metric}><Text style={styles.metricEmoji}>🛡️</Text><Text style={styles.metricLabel}>Proteksi</Text><Text style={styles.metricValue}>Aktif</Text><Text style={styles.metricGood}>Care+</Text></View>
        </View>
        <View style={styles.insight}><Text style={styles.insightIcon}>💡</Text><View style={styles.insightCopy}><Text style={styles.insightTitle}>Insight untuk Milo</Text><Text style={styles.insightText}>Vaksin DHPPi jatuh tempo 4 September.</Text></View><Pressable onPress={() => onBook()}><Text style={styles.insightAction}>Atur</Text></Pressable></View>
      </Card>

      <SectionTitle eyebrow="CARE PLAN" title="Perawatan terdekat" action="Lihat semua" onAction={() => onNavigate("activity")} />
      <Card style={styles.careCard}>
        {careItems.map((item, index) => (
          <Pressable key={item.id} onPress={() => onAction(`Detail ${item.title}`)} style={[styles.careRow, index < careItems.length - 1 && styles.careDivider]}>
            <View style={[styles.careIcon, item.color === "mint" ? styles.mint : item.color === "violet" ? styles.violet : styles.blue]}><Text>{item.icon}</Text></View>
            <View style={styles.careCopy}><Text style={styles.careTime}>{item.time}</Text><Text style={styles.careTitle}>{item.title}</Text><Text style={styles.careNote}>{item.note}</Text></View>
            <Ionicons name="chevron-forward" size={17} color="#A3AFBC" />
          </Pressable>
        ))}
        <SoftButton label="Tambah pengingat" icon="add" onPress={() => onAction("Pengingat baru siap dibuat")} style={styles.reminderButton} />
      </Card>

      <SectionTitle eyebrow="DI SEKITARMU" title="Pilihan untuk Milo" action="Jelajahi" onAction={() => onNavigate("discover")} />
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
  greetingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5, marginBottom: 16 },
  greeting: { color: colors.navy, fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
  greetingNote: { marginTop: 4, color: colors.muted, fontSize: 10 },
  petPicker: { flexDirection: "row", alignItems: "center", gap: 5, padding: 4, paddingRight: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  petPickerEmoji: { width: 31, height: 31, borderRadius: 9, backgroundColor: "#FFF0D8", fontSize: 18, textAlign: "center", lineHeight: 31 },
  petPickerName: { color: colors.text, fontSize: 9, fontWeight: "800" },
  hero: { height: 310, overflow: "hidden", borderRadius: 22, ...shadow },
  heroImage: { borderRadius: 22, resizeMode: "cover" },
  heroGradient: { flex: 1, padding: 22, justifyContent: "center" },
  heroTitle: { maxWidth: "72%", marginTop: 12, color: colors.white, fontSize: 25, lineHeight: 28, fontWeight: "900", letterSpacing: -0.6 },
  heroNote: { maxWidth: "70%", marginTop: 8, color: "rgba(255,255,255,.82)", fontSize: 10, lineHeight: 15 },
  heroButtons: { flexDirection: "row", gap: 8, marginTop: 17 },
  heroGhost: { minHeight: 35, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,.55)", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,.1)" },
  heroGhostText: { color: colors.white },
  quickScroll: { gap: 9, paddingTop: 14, paddingRight: 15 },
  quickCard: { width: 88, minHeight: 91, alignItems: "center", justifyContent: "center", padding: 9, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow },
  quickIcon: { width: 39, height: 39, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  quickEmoji: { fontSize: 20 }, quickLabel: { marginTop: 7, color: colors.navy, fontSize: 9, fontWeight: "800" }, quickNote: { marginTop: 2, color: colors.muted, fontSize: 7 }, pressed: { opacity: .7 },
  healthCard: { padding: 15 },
  healthTop: { flexDirection: "row", alignItems: "center" },
  petAvatar: { position: "relative", width: 62, height: 62, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#FFF0D8" },
  petAvatarEmoji: { fontSize: 38 }, checkDot: { position: "absolute", right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center", backgroundColor: colors.mint },
  healthCopy: { flex: 1, marginLeft: 12, gap: 3 }, petName: { color: colors.navy, fontSize: 17, fontWeight: "900" }, petMeta: { color: colors.text, fontSize: 9 }, updated: { color: colors.muted, fontSize: 7 },
  scoreCircle: { width: 63, height: 63, borderRadius: 32, borderWidth: 6, borderColor: colors.sky500, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }, scoreValue: { color: colors.navy, fontSize: 17, fontWeight: "900" }, scoreLabel: { color: colors.muted, fontSize: 6 },
  metricRow: { flexDirection: "row", gap: 7, marginTop: 14 }, metric: { flex: 1, padding: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.line }, metricEmoji: { fontSize: 16 }, metricLabel: { marginTop: 5, color: colors.muted, fontSize: 7 }, metricValue: { marginTop: 2, color: colors.navy, fontSize: 9, fontWeight: "800" }, metricGood: { marginTop: 2, color: colors.mint, fontSize: 6, fontWeight: "700" }, metricWarn: { marginTop: 2, color: colors.yellow, fontSize: 6, fontWeight: "700" },
  insight: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 10, padding: 10, borderRadius: 11, backgroundColor: colors.sky50 }, insightIcon: { fontSize: 18 }, insightCopy: { flex: 1, gap: 2 }, insightTitle: { color: "#315E7C", fontSize: 8, fontWeight: "800" }, insightText: { color: "#66869A", fontSize: 7 }, insightAction: { color: colors.sky600, fontSize: 8, fontWeight: "800" },
  careCard: { padding: 14 }, careRow: { minHeight: 63, flexDirection: "row", alignItems: "center", gap: 10 }, careDivider: { borderBottomWidth: 1, borderBottomColor: colors.line }, careIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" }, blue: { backgroundColor: colors.sky50 }, mint: { backgroundColor: colors.mint50 }, violet: { backgroundColor: colors.violet50 }, peach: { backgroundColor: "#FFF1E8" }, careCopy: { flex: 1, gap: 2 }, careTime: { color: colors.sky600, fontSize: 7, fontWeight: "800" }, careTitle: { color: colors.navy, fontSize: 10, fontWeight: "800" }, careNote: { color: colors.muted, fontSize: 7 }, reminderButton: { marginTop: 10 },
  serviceScroll: { gap: 10, paddingRight: 16, paddingBottom: 4 }, serviceCard: { width: 210, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow }, serviceVisual: { height: 105, borderRadius: 12, alignItems: "center", justifyContent: "center" }, serviceVisualPill: { position: "absolute" }, serviceEmoji: { fontSize: 48 }, serviceName: { marginTop: 10, color: colors.navy, fontSize: 11, fontWeight: "800" }, serviceMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }, serviceMetaText: { color: colors.muted, fontSize: 7 }, serviceFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }, servicePrice: { color: colors.sky600, fontSize: 8, fontWeight: "800" }, bookCircle: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky500 },
});
