import { StyleSheet } from "react-native";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { LocalizedText as Text, useI18n } from "../i18n";
import { colors } from "../theme";
export function ScheduleSlot({ startsAt, timezone, minutes, selected, onPress }: { startsAt: string; timezone: string; minutes: number; selected: boolean; onPress: () => void }) {
  const { formatDate, t } = useI18n();
  const date = formatDate(startsAt, { day: "numeric", month: "short", year: "numeric", timeZone: timezone });
  const time = formatDate(startsAt, { hour: "2-digit", minute: "2-digit", timeZone: timezone });
  return <Pressable accessibilityRole="button" accessibilityLabel={`${date}, ${time}, ${minutes} ${t("menit")}`} accessibilityState={{ selected }} onPress={onPress} style={[styles.slot, selected && styles.selected]}>
    <Text style={[styles.date, selected && styles.active]}>{date}</Text>
    <Text style={[styles.time, selected && styles.active]}>{time} · {minutes} {t("menit")}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ slot: { width: "48%", flexGrow: 1, minHeight: 66, padding: 12, gap: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.white }, selected: { borderColor: colors.sky400, backgroundColor: colors.sky50 }, date: { fontSize: 11, color: colors.muted, fontWeight: "600" }, time: { fontSize: 13, color: colors.navy, fontWeight: "700" }, active: { color: colors.sky600 } });
