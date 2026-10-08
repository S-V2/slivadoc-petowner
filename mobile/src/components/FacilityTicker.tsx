import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, AppState, StyleSheet, View } from "react-native";
import { facilityNames } from "../../../shared/world-presentation";
import { LocalizedText as Text, useI18n } from "../i18n";
import { colors } from "../theme";

export function FacilityTicker({ facilities, compact = false }: { compact?: boolean; facilities: ReadonlyArray<string | { name: string }> }) {
  const { t } = useI18n();
  const names = facilityNames(facilities);
  const identity = names.join("\u0000");
  const [step, setStep] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [arrival] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let active = true, reduced = true, foreground = AppState.currentState === "active";
    const sync = () => { if (active) setEnabled(!reduced && foreground); };
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reduced = value; sync(); }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", value => { reduced = value; sync(); });
    const state = AppState.addEventListener("change", value => { foreground = value === "active"; sync(); });
    return () => { active = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    if (!enabled || names.length < 2) return;
    const timer = setInterval(() => { arrival.setValue(0); setStep(current => current + 1); Animated.timing(arrival, { toValue: 1, duration: 220, useNativeDriver: true }).start(); }, 1_000);
    return () => { clearInterval(timer); arrival.stopAnimation(); arrival.setValue(1); };
  }, [arrival, enabled, identity, names.length]);
  if (!names.length) return null;
  return <View style={[styles.row, compact && styles.compact]} accessible accessibilityLabel={`${t("Fasilitas")}: ${names.map(t).join(", ")}`}>
    <Text style={[styles.label, compact && styles.compactLabel]}>Fasilitas</Text>
    <View style={styles.window}><Animated.Text numberOfLines={1} style={[styles.chip, compact && styles.compactChip, { opacity: arrival, transform: [{ translateY: arrival.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }]}>{t(names[step % names.length]!)}</Animated.Text></View>
    {names.length > 3 && <Text style={styles.more}>3+</Text>}
  </View>;
}
const styles = StyleSheet.create({
  compact: { flexWrap: "wrap", gap: 4, minHeight: 46 }, compactLabel: { width: "100%", fontSize: 9 }, compactChip: { fontSize: 10, lineHeight: 16, paddingHorizontal: 6, paddingVertical: 4 },
  row: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 8 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600" }, window: { flex: 1, minWidth: 0, overflow: "hidden" },
  chip: { alignSelf: "flex-start", maxWidth: "100%", paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.sky100, borderRadius: 9, backgroundColor: colors.sky50, color: colors.navy, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  more: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, color: colors.sky600, backgroundColor: colors.sky50, fontSize: 11, lineHeight: 18, fontWeight: "700" },
});
