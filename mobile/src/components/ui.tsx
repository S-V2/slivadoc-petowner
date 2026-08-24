import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadow } from "../theme";

export function Screen({ children, contentStyle }: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle> }>) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function TopHeader({ title, subtitle, onNotification }: { title: string; subtitle: string; onNotification: () => void }) {
  return (
    <View style={styles.topHeader}>
      <View style={styles.locationIcon}><Ionicons name="location" size={18} color={colors.sky600} /></View>
      <View style={styles.topHeaderCopy}>
        <Text style={styles.topKicker}>{subtitle}</Text>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Buka notifikasi" style={styles.iconButton} onPress={onNotification}>
        <Ionicons name="notifications-outline" size={21} color={colors.text} />
        <View style={styles.notificationDot} />
      </Pressable>
    </View>
  );
}

export function SectionTitle({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionHeading}>{title}</Text>
      </View>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.sectionAction}>{action}  ›</Text></Pressable> : null}
    </View>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ label, icon, onPress, compact, light, style, ...props }: PressableProps & { label: string; icon?: keyof typeof Ionicons.glyphMap; compact?: boolean; light?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, compact && styles.compactButton, light && styles.lightButton, pressed && styles.pressed, style]}
      {...props}
    >
      {icon ? <Ionicons name={icon} size={compact ? 14 : 17} color={light ? colors.sky600 : colors.white} /> : null}
      <Text style={[styles.primaryButtonText, light && styles.lightButtonText]}>{label}</Text>
    </Pressable>
  );
}

export function SoftButton({ label, icon, onPress, style }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.softButton, pressed && styles.pressed, style]}>
      {icon ? <Ionicons name={icon} size={15} color={colors.sky600} /> : null}
      <Text style={styles.softButtonText}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "mint" | "yellow" | "violet" | "red" }) {
  return <View style={[styles.pill, styles[`${tone}Pill`]]}><Text style={[styles.pillText, styles[`${tone}PillText`]]}>{children}</Text></View>;
}

export function EmptyState({ icon, title, note, action, onAction }: { icon: string; title: string; note: string; action: string; onAction: () => void }) {
  return <View style={styles.empty}><Text style={styles.emptyIcon}>{icon}</Text><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyNote}>{note}</Text><PrimaryButton compact label={action} onPress={onAction} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingHorizontal: 16, paddingBottom: 118 },
  topHeader: { height: 66, flexDirection: "row", alignItems: "center", gap: 10 },
  locationIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" },
  topHeaderCopy: { flex: 1, gap: 2 },
  topKicker: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  topTitle: { color: colors.navy, fontSize: 17, fontWeight: "800" },
  iconButton: { position: "relative", width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  notificationDot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.white, backgroundColor: colors.red },
  sectionTitle: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 22, marginBottom: 11 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.1, marginBottom: 3 },
  sectionHeading: { color: colors.navy, fontSize: 22, fontWeight: "800", letterSpacing: -0.35 },
  sectionAction: { color: colors.sky600, fontSize: 14, fontWeight: "700", paddingBottom: 2 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow },
  primaryButton: { minHeight: 43, paddingHorizontal: 16, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.sky500, ...shadow },
  compactButton: { minHeight: 35, borderRadius: 10, paddingHorizontal: 13 },
  primaryButtonText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  lightButton: { backgroundColor: colors.white, shadowOpacity: 0 },
  lightButtonText: { color: colors.sky600 },
  softButton: { minHeight: 37, paddingHorizontal: 13, borderRadius: 11, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.sky50 },
  softButtonText: { color: colors.sky600, fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  pillText: { fontSize: 12, fontWeight: "800" },
  bluePill: { backgroundColor: colors.sky50 }, bluePillText: { color: colors.sky600 },
  mintPill: { backgroundColor: colors.mint50 }, mintPillText: { color: "#14836E" },
  yellowPill: { backgroundColor: colors.yellow50 }, yellowPillText: { color: "#A57315" },
  violetPill: { backgroundColor: colors.violet50 }, violetPillText: { color: "#6655C7" },
  redPill: { backgroundColor: colors.red50 }, redPillText: { color: colors.red },
  empty: { minHeight: 360, alignItems: "center", justifyContent: "center", padding: 28 },
  emptyIcon: { fontSize: 55 },
  emptyTitle: { marginTop: 12, color: colors.navy, fontSize: 21, fontWeight: "800" },
  emptyNote: { maxWidth: 280, marginTop: 5, marginBottom: 16, color: colors.muted, fontSize: 15, lineHeight: 23, textAlign: "center" },
});
