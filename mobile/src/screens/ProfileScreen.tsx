import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { colors, shadow } from "../theme";
import { Card, Pill, Screen, SectionTitle, SoftButton, TopHeader } from "../components/ui";

export function ProfileScreen({ onAction, onOpenNotifications }: { onAction: (message: string) => void; onOpenNotifications: () => void }) {
  const [careReminder, setCareReminder] = useState(true);
  return <Screen>
    <TopHeader title="Akun & Keluarga" subtitle="Profil pet parent" onNotification={onOpenNotifications} />
    <Card style={styles.profileCard}>
      <LinearGradient colors={[colors.sky500, "#61BDEC", colors.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}><Text style={styles.coverText}>SLIVADOC PET FAMILY</Text></LinearGradient>
      <View style={styles.profileRow}><View style={styles.avatar}><Text style={styles.avatarText}>EM</Text><Pressable onPress={() => onAction("Ubah foto profil")} style={styles.camera}><Ionicons name="camera" size={13} color={colors.white} /></Pressable></View><View style={styles.profileCopy}><Text style={styles.name}>Evans Moris Cheahn</Text><Text style={styles.meta}>Pet Parent sejak April 2026</Text><Pill tone="yellow">✦ GOLD MEMBER</Pill></View><Pressable onPress={() => onAction("Mode edit profil diaktifkan")} style={styles.edit}><Ionicons name="create-outline" size={16} color={colors.sky600} /></Pressable></View>
      <View style={styles.stats}><Stat value="2" label="Hewan" /><Stat value="12" label="Booking" /><Stat value="2.450" label="Points" /><Stat value="Gold" label="Member" /></View>
    </Card>

    <SectionTitle eyebrow="KEANGGOTAAN" title="SlivaCare+ Family" />
    <LinearGradient colors={["#158FD5", "#4AB5EA", "#776DE1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.memberCard}>
      <View style={styles.memberTop}><View style={styles.shield}><Ionicons name="shield-checkmark" size={21} color={colors.white} /></View><View style={styles.memberCopy}><Text style={styles.memberName}>Family Protection</Text><Text style={styles.memberNote}>Milo & Luna terlindungi</Text></View><Pill tone="mint">AKTIF</Pill></View>
      <Text style={styles.price}>Rp149.000<Text style={styles.pricePeriod}>/bulan</Text></Text>
      <View style={styles.benefits}><Benefit text="Konsultasi chat tanpa batas" /><Benefit text="Cashback perawatan hingga 20%" /><Benefit text="Emergency assistance 24/7" /></View>
      <Pressable onPress={() => onAction("Detail benefit SlivaCare+ dibuka")} style={styles.memberButton}><Text style={styles.memberButtonText}>Kelola langganan</Text><Ionicons name="chevron-forward" size={16} color={colors.white} /></Pressable>
    </LinearGradient>

    <SectionTitle eyebrow="PEMBAYARAN" title="Dompet & metode bayar" />
    <Card style={styles.walletSection}>
      <Pressable onPress={() => onAction("Riwayat SlivaPay dibuka")} style={styles.wallet}><View style={styles.walletIcon}><Ionicons name="wallet" size={20} color={colors.white} /></View><View style={styles.walletCopy}><Text style={styles.walletLabel}>Saldo SlivaPay</Text><Text style={styles.walletValue}>Rp425.000</Text></View><Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,.8)" /></Pressable>
      <Payment logo="VISA" name="•••• 8421" note="Kartu utama" onPress={() => onAction("Kelola kartu Visa")} /><Payment logo="GP" name="GoPay" note="Terhubung" onPress={() => onAction("Kelola GoPay")} /><SoftButton label="Tambah metode pembayaran" icon="add" onPress={() => onAction("Tambah metode pembayaran")} />
    </Card>

    <SectionTitle eyebrow="PREFERENSI" title="Pengaturan akun" />
    <Card style={styles.settings}>
      <Setting icon="notifications-outline" title="Pengingat perawatan" note="Vaksin, obat, grooming" right={<Switch value={careReminder} onValueChange={setCareReminder} trackColor={{ false: "#DCE4EA", true: colors.sky100 }} thumbColor={careReminder ? colors.sky500 : colors.white} />} />
      <Setting icon="people-outline" title="Keluarga & akses" note="2 anggota memiliki akses" onPress={() => onAction("Akses keluarga dibuka")} />
      <Setting icon="shield-checkmark-outline" title="Privasi & keamanan" note="PIN, biometrik, sesi aktif" onPress={() => onAction("Keamanan akun dibuka")} />
      <Setting icon="location-outline" title="Alamat tersimpan" note="Rumah, kantor, dan 1 lainnya" onPress={() => onAction("Alamat tersimpan dibuka")} />
      <Setting icon="language-outline" title="Bahasa & tampilan" note="Bahasa Indonesia • Sistem" onPress={() => onAction("Bahasa dan tampilan dibuka")} />
      <Setting icon="cloud-download-outline" title="Data & dokumen" note="Unduh arsip data Slivadoc" onPress={() => onAction("Arsip data disiapkan")} last />
    </Card>

    <View style={styles.footer}><Pressable onPress={() => onAction("Pusat bantuan dibuka")}><Text style={styles.footerLink}>Pusat Bantuan</Text></Pressable><Pressable onPress={() => onAction("Syarat dan privasi dibuka")}><Text style={styles.footerLink}>Syarat & Privasi</Text></Pressable><Pressable onPress={() => onAction("Konfirmasi keluar diperlukan")}><Text style={styles.logout}>Keluar</Text></Pressable><Text style={styles.version}>Slivadoc Pet Owner v0.1.0 • UI Prototype</Text></View>
  </Screen>;
}

function Stat({ value, label }: { value: string; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
function Benefit({ text }: { text: string }) { return <View style={styles.benefit}><View style={styles.benefitCheck}><Ionicons name="checkmark" size={10} color={colors.sky600} /></View><Text style={styles.benefitText}>{text}</Text></View>; }
function Payment({ logo, name, note, onPress }: { logo: string; name: string; note: string; onPress: () => void }) { return <Pressable onPress={onPress} style={styles.payment}><View style={styles.paymentLogo}><Text style={styles.paymentLogoText}>{logo}</Text></View><View style={styles.paymentCopy}><Text style={styles.paymentName}>{name}</Text><Text style={styles.paymentNote}>{note}</Text></View><Ionicons name="chevron-forward" size={16} color="#A2ADBA" /></Pressable>; }
function Setting({ icon, title, note, onPress, right, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string; onPress?: () => void; right?: React.ReactNode; last?: boolean }) { return <Pressable disabled={!onPress} onPress={onPress} style={[styles.setting, last && styles.noBorder]}><View style={styles.settingIcon}><Ionicons name={icon} size={19} color={colors.sky600} /></View><View style={styles.settingCopy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingNote}>{note}</Text></View>{right ?? <Ionicons name="chevron-forward" size={17} color="#A3AFBC" />}</Pressable>; }

const styles = StyleSheet.create({
  profileCard: { marginTop: 10, overflow: "hidden" }, cover: { height: 78, padding: 15 }, coverText: { color: "rgba(255,255,255,.7)", fontSize: 7, fontWeight: "900", letterSpacing: 1.1 }, profileRow: { flexDirection: "row", alignItems: "center", marginTop: -32, paddingHorizontal: 15, paddingBottom: 14 }, avatar: { position: "relative", width: 75, height: 75, borderRadius: 23, borderWidth: 5, borderColor: colors.white, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky100 }, avatarText: { color: colors.sky600, fontSize: 20, fontWeight: "900" }, camera: { position: "absolute", right: -4, bottom: -4, width: 26, height: 26, borderRadius: 9, borderWidth: 3, borderColor: colors.white, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky500 }, profileCopy: { flex: 1, marginLeft: 10, paddingTop: 30, alignItems: "flex-start" }, name: { color: colors.navy, fontSize: 14, fontWeight: "900" }, meta: { marginTop: 3, marginBottom: 6, color: colors.muted, fontSize: 7 }, edit: { marginTop: 30, width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 }, stats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.line }, stat: { flex: 1, paddingVertical: 11, borderRightWidth: 1, borderRightColor: colors.line, alignItems: "center" }, statValue: { color: colors.navy, fontSize: 11, fontWeight: "900" }, statLabel: { marginTop: 3, color: colors.muted, fontSize: 6 },
  memberCard: { padding: 16, borderRadius: 18, ...shadow }, memberTop: { flexDirection: "row", alignItems: "center", gap: 9 }, shield: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.18)" }, memberCopy: { flex: 1 }, memberName: { color: colors.white, fontSize: 11, fontWeight: "900" }, memberNote: { marginTop: 3, color: "rgba(255,255,255,.7)", fontSize: 7 }, price: { marginTop: 15, color: colors.white, fontSize: 20, fontWeight: "900" }, pricePeriod: { fontSize: 8, fontWeight: "500", color: "rgba(255,255,255,.7)" }, benefits: { gap: 7, marginTop: 12 }, benefit: { flexDirection: "row", alignItems: "center", gap: 7 }, benefitCheck: { width: 18, height: 18, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }, benefitText: { color: "rgba(255,255,255,.87)", fontSize: 8 }, memberButton: { minHeight: 38, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingHorizontal: 12, borderRadius: 11, backgroundColor: "rgba(255,255,255,.14)" }, memberButtonText: { color: colors.white, fontSize: 9, fontWeight: "800" },
  walletSection: { padding: 13 }, wallet: { flexDirection: "row", alignItems: "center", gap: 9, padding: 12, borderRadius: 13, backgroundColor: colors.sky500 }, walletIcon: { width: 37, height: 37, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,.15)" }, walletCopy: { flex: 1 }, walletLabel: { color: "rgba(255,255,255,.7)", fontSize: 7 }, walletValue: { marginTop: 3, color: colors.white, fontSize: 14, fontWeight: "900" }, payment: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: 1, borderBottomColor: colors.line }, paymentLogo: { width: 38, height: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }, paymentLogoText: { color: "#405D99", fontSize: 7, fontWeight: "900" }, paymentCopy: { flex: 1 }, paymentName: { color: colors.navy, fontSize: 9, fontWeight: "800" }, paymentNote: { marginTop: 3, color: colors.muted, fontSize: 7 },
  settings: { paddingHorizontal: 13 }, setting: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, noBorder: { borderBottomWidth: 0 }, settingIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: colors.sky50 }, settingCopy: { flex: 1 }, settingTitle: { color: colors.navy, fontSize: 9, fontWeight: "800" }, settingNote: { marginTop: 3, color: colors.muted, fontSize: 7 },
  footer: { flexDirection: "row", flexWrap: "wrap", gap: 15, marginTop: 20, paddingHorizontal: 3 }, footerLink: { color: colors.muted, fontSize: 7 }, logout: { color: colors.red, fontSize: 7 }, version: { width: "100%", color: "#A0ACB9", fontSize: 7 },
});
