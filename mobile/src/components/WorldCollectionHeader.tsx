import type { PropsWithChildren, ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { worldCollections, type WorldCollectionMode } from "../../../shared/world-collections";
import { LocalizedText as Text } from "../i18n";
import { colors } from "../theme";

const tones: Record<WorldCollectionMode, { ink: string; wash: string; icon: ComponentProps<typeof Ionicons>["name"] }> = {
  academy: { ink: "#087596", wash: "#EEF9FF", icon: "school-outline" },
  events: { ink: "#7554A8", wash: "#F4F0FF", icon: "calendar-outline" },
  consult: { ink: "#12816F", wash: "#EDFAF5", icon: "videocam-outline" },
  adoption: { ink: "#AD6475", wash: "#FFF3F2", icon: "heart-outline" },
  documents: { ink: "#536CAC", wash: "#F0F4FF", icon: "shield-checkmark-outline" },
};
export function WorldCollectionHeader({ mode, children }: PropsWithChildren<{ mode: WorldCollectionMode }>) {
  const copy = worldCollections[mode], tone = tones[mode];
  return <View style={[styles.panel, { backgroundColor: tone.wash }]}>
    <View style={styles.heading}><View style={styles.symbol}><Ionicons name={tone.icon} size={23} color={tone.ink}/></View><View style={styles.intro}><Text style={[styles.kicker, { color: tone.ink }]}>{copy.label}</Text><Text accessibilityRole="header" style={styles.title}>{copy.title}</Text></View></View>
    <Text style={styles.note}>{copy.note}</Text>
    {children}
  </View>;
}
const styles = StyleSheet.create({
  panel: { marginTop: 14, padding: 15, gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 20 },
  heading: { flexDirection: "row", gap: 12, alignItems: "center" },
  symbol: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  intro: { flex: 1 }, kicker: { fontSize: 10, fontWeight: "700" },
  title: { marginTop: 4, fontSize: 18, lineHeight: 23, fontWeight: "700", color: colors.navy },
  note: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
