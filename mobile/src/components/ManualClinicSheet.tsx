import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDiscoveryBranch, type MobileDiscoveryBranch } from "../api";
import { directionsUrl, openingHoursRows } from "../clinics";
import { LocalizedText as Text } from "../i18n";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { colors } from "../theme";

// Re-fetch on open so a hidden/deleted directory place cannot be opened from a stale card.
export function ManualClinicSheet({ placeID, onClose }: { placeID?: string; onClose: () => void }) {
  const [result, setResult] = useState<{ id: string; branch?: MobileDiscoveryBranch; error?: string }>();
  const [linkError, setLinkError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!placeID) return;
    let active = true;
    getDiscoveryBranch(placeID).then((branch) => { if (active) setResult({ id: placeID, branch }); })
      .catch(() => { if (active) setResult({ id: placeID, error: "Tempat tidak tersedia atau belum dapat dimuat." }); });
    return () => { active = false; };
  }, [placeID, attempt]);
  const branch = result?.id === placeID ? result?.branch : undefined;
  async function open(url: string) { setLinkError(false); try { await Linking.openURL(url); } catch { setLinkError(true); } }
  return <Modal visible={Boolean(placeID)} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.page}>
      <Pressable accessibilityRole="button" accessibilityLabel="Kembali ke direktori" onPress={onClose} style={styles.back}><Text style={styles.link}>← Kembali ke direktori</Text></Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        {!result || result.id !== placeID ? <ActivityIndicator color={colors.sky600} /> : !branch ? <View style={styles.content}><Text accessibilityRole="alert">{result.error}</Text><Pressable accessibilityRole="button" onPress={() => setAttempt((n) => n + 1)}><Text style={styles.link}>Coba lagi</Text></Pressable></View> : <>
          {(branch.banner_url || branch.logo_url) ? <Image source={{ uri: (branch.banner_url || branch.logo_url)! }} style={styles.image} resizeMode="cover" alt={branch.business_name} accessibilityLabel={branch.business_name} /> : null}
          <Text style={styles.title} translate={false}>{branch.business_name}</Text>
          <Text style={styles.badge}>Informasi tempat</Text>
          <Text style={styles.notice}>Informasi tempat ini ditambahkan oleh Slivadoc. Pengelola belum memiliki akun di Slivadoc. Hubungi tempat langsung untuk memastikan layanan dan jam buka.</Text>
          <Text style={styles.body} translate={false}>{[branch.address, branch.district, branch.city].filter(Boolean).join(", ")}</Text>
          {branch.description ? <Text style={styles.body} translate={false}>{branch.description}</Text> : null}
          {branch.rating !== null && branch.review_count > 0 ? <View><Text style={styles.body} translate={false}>★ {branch.rating.toFixed(1)} · {branch.review_count}</Text><Text style={styles.muted}>Rating & ulasan referensi dari data listing</Text></View> : null}
          <Text style={styles.subtitle}>Jam operasional</Text>
          {openingHoursRows(branch.opening_hours).length ? openingHoursRows(branch.opening_hours).map(([day, hours]) => <View key={day} style={styles.hours}><Text>{day}</Text><Text>{hours}</Text></View>) : <Text style={styles.muted}>Konfirmasi jam operasional sebelum berkunjung.</Text>}
          <Pressable accessibilityRole="button" onPress={() => void open(directionsUrl(branch.latitude, branch.longitude))} style={styles.button}><Text style={styles.link}>Petunjuk arah</Text></Pressable>
          {branch.phone ? <Pressable accessibilityRole="button" onPress={() => void open(`tel:${branch.phone!.replace(/[^+0-9]/g, "")}`)} style={styles.button}><Text style={styles.link}>Hubungi tempat</Text></Pressable> : null}
          {/^https?:\/\//.test(branch.website ?? "") ? <Pressable accessibilityRole="button" onPress={() => void open(branch.website!)} style={styles.button}><Text style={styles.link}>Website tempat</Text></Pressable> : null}
          {linkError ? <Text accessibilityRole="alert">Tautan belum dapat dibuka.</Text> : null}
          <Text style={styles.muted} translate={false}>Place ID: {branch.place_id || branch.branch_id}</Text>
        </>}
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.white },
  back: { padding: 20, borderBottomWidth: 1, borderColor: colors.line },
  content: { padding: 20, gap: 16 },
  image: { width: "100%", height: 220, borderRadius: 16 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  subtitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  badge: { alignSelf: "flex-start", color: "#80611c", backgroundColor: "#fff1d6", padding: 8, borderRadius: 12, fontSize: 12 },
  notice: { backgroundColor: "#fff7e9", color: "#77603b", padding: 14, borderRadius: 12, lineHeight: 23 },
  body: { fontSize: 14, lineHeight: 23, color: colors.text },
  muted: { fontSize: 12, lineHeight: 20, color: colors.muted },
  hours: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  button: { padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  link: { color: colors.sky600, fontWeight: "700" },
});
