import { createContext, useContext, type PropsWithChildren, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, spacing, typography } from "../theme";

export type AppIconTone = "sky" | "mint" | "violet" | "peach" | "red" | "neutral";

const iconPalettes: Record<AppIconTone, { backgroundColor: string; color: string }> = {
  sky: { backgroundColor: colors.sky50, color: colors.sky600 },
  mint: { backgroundColor: colors.mint50, color: "#14836E" },
  violet: { backgroundColor: colors.violet50, color: "#6655C7" },
  peach: { backgroundColor: colors.peach50, color: "#C66A32" },
  red: { backgroundColor: colors.red50, color: colors.red },
  neutral: { backgroundColor: colors.canvas, color: colors.text },
};

type AppSurfaceContextValue = {
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
};

const AppSurfaceContext = createContext<AppSurfaceContextValue>({
  bottomInset: 0,
  refreshing: false,
  onRefresh: () => undefined,
});
export function AppSurfaceProvider({ children, bottomInset, refreshing, onRefresh }: PropsWithChildren<AppSurfaceContextValue>) {
  return <AppSurfaceContext.Provider value={{ bottomInset, refreshing, onRefresh }}>{children}</AppSurfaceContext.Provider>;
}

export function useAppSurface() {
  return useContext(AppSurfaceContext);
}

export function Screen({ children, contentStyle }: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle> }>) {
  const { bottomInset, refreshing, onRefresh } = useAppSurface();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, { paddingBottom: bottomInset + 100 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.sky500]} tintColor={colors.sky500} progressBackgroundColor={colors.white} />}
    >
      {children}
    </ScrollView>
  );
}

export function TopHeader({ title, subtitle, onNotification }: { title: string; subtitle: string; onNotification: () => void }) {
  return (
    <View style={styles.topHeader}>
      <View style={styles.locationIcon}><Ionicons name="location" size={17} color={colors.sky600} /></View>
      <View style={styles.topHeaderCopy}>
        <Text style={styles.topKicker}>{subtitle}</Text>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Buka notifikasi" style={styles.iconButton} onPress={onNotification}>
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
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

export function AppIcon({
  name,
  tone = "sky",
  size = 20,
  containerSize = 42,
  inverted = false,
}: {
  name: keyof typeof Ionicons.glyphMap;
  tone?: AppIconTone;
  size?: number;
  containerSize?: number;
  inverted?: boolean;
}) {
  const palette = iconPalettes[tone];
  return (
    <View
      style={[
        styles.appIcon,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: Math.round(containerSize * 0.34),
          backgroundColor: inverted ? palette.color : palette.backgroundColor,
        },
      ]}
    >
      <Ionicons name={name} size={size} color={inverted ? colors.white : palette.color} />
    </View>
  );
}

export function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "mint" | "yellow" | "violet" | "red" }) {
  return <View style={[styles.pill, styles[`${tone}Pill`]]}><Text style={[styles.pillText, styles[`${tone}PillText`]]}>{children}</Text></View>;
}

export function EmptyState({ icon, title, note, action, onAction }: { icon: keyof typeof Ionicons.glyphMap; title: string; note: string; action: string; onAction: () => void }) {
  return <View style={styles.empty}><AppIcon name={icon} size={28} containerSize={58} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyNote}>{note}</Text><PrimaryButton compact label={action} onPress={onAction} /></View>;
}

export function PetRequiredNotice({ onAddPet }: { onAddPet: () => void }) {
  return (
    <View style={styles.petRequiredNotice} accessibilityRole="summary">
      <AppIcon name="lock-closed-outline" tone="violet" size={18} containerSize={40} />
      <View style={styles.petRequiredCopy}>
        <Text style={styles.petRequiredTitle}>Mode lihat saja</Text>
        <Text style={styles.petRequiredText}>
          Tambahkan profil pet untuk bertransaksi dan ikut berinteraksi.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tambah profil pet"
        hitSlop={8}
        onPress={onAddPet}
        style={({ pressed }) => [
          styles.petRequiredAction,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.petRequiredActionText}>Tambah pet</Text>
      </Pressable>
    </View>
  );
}

export function BoundedBottomSheet({
  visible,
  onClose,
  children,
  maxHeight = "86%",
}: PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  maxHeight?: `${number}%` | number;
}>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetRoot}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup panel"
          onPress={onClose}
          style={styles.sheetBackdrop}
        >
          <Pressable
            accessibilityRole="none"
            onPress={(event) => event.stopPropagation()}
            style={[styles.sheet, { maxHeight }]}
          >
            <SafeAreaView edges={["bottom", "left", "right"]} style={styles.sheetSafe}>
              <View style={styles.sheetHandle} />
              {children}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingHorizontal: spacing.lg },
  topHeader: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  locationIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" },
  topHeaderCopy: { flex: 1, gap: 2 },
  topKicker: { color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: "600" },
  topTitle: { color: colors.navy, fontSize: typography.cardTitle, lineHeight: 20, fontWeight: "800" },
  iconButton: { position: "relative", width: 40, height: 40, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  notificationDot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.white, backgroundColor: colors.red },
  sectionTitle: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: spacing.xl, marginBottom: 10 },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1, marginBottom: 3 },
  sectionHeading: { color: colors.navy, fontSize: typography.sectionTitle, lineHeight: 22, fontWeight: "800", letterSpacing: -0.2 },
  sectionAction: { color: colors.sky600, fontSize: 11, fontWeight: "800", paddingBottom: 2 },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, ...shadow },
  primaryButton: { minHeight: 44, paddingHorizontal: 15, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.sky500, ...shadow },
  compactButton: { minHeight: 40, borderRadius: 12, paddingHorizontal: 13 },
  primaryButtonText: { color: colors.white, fontSize: typography.control, fontWeight: "800" },
  lightButton: { backgroundColor: colors.white, shadowOpacity: 0 },
  lightButtonText: { color: colors.sky600 },
  softButton: { minHeight: 40, paddingHorizontal: 13, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.sky50 },
  softButtonText: { color: colors.sky600, fontSize: typography.control, fontWeight: "800" },
  appIcon: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.15 },
  bluePill: { backgroundColor: colors.sky50 }, bluePillText: { color: colors.sky600 },
  mintPill: { backgroundColor: colors.mint50 }, mintPillText: { color: "#14836E" },
  yellowPill: { backgroundColor: colors.yellow50 }, yellowPillText: { color: "#A57315" },
  violetPill: { backgroundColor: colors.violet50 }, violetPillText: { color: "#6655C7" },
  redPill: { backgroundColor: colors.red50 }, redPillText: { color: colors.red },
  empty: { minHeight: 260, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { marginTop: 10, color: colors.navy, fontSize: typography.sectionTitle, lineHeight: 22, fontWeight: "800" },
  emptyNote: { maxWidth: 280, marginTop: 5, marginBottom: 14, color: colors.muted, fontSize: typography.body, lineHeight: 19, textAlign: "center" },
  petRequiredNotice: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, padding: 12, borderWidth: 1, borderColor: "#DDD7FF", borderRadius: radius.lg, backgroundColor: "#F8F6FF" },
  petRequiredCopy: { minWidth: 0, flex: 1 },
  petRequiredTitle: { color: colors.navy, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  petRequiredText: { marginTop: 2, color: colors.muted, fontSize: 10, lineHeight: 14 },
  petRequiredAction: { minHeight: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.white },
  petRequiredActionText: { color: colors.sky600, fontSize: 10, fontWeight: "800" },
  sheetRoot: { flex: 1 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13, 35, 54, .42)",
  },
  sheet: {
    overflow: "hidden",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.white,
  },
  sheetSafe: { minHeight: 120, backgroundColor: colors.white },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 9,
    marginBottom: 4,
    borderRadius: 3,
    backgroundColor: "#D9E7EF",
  },
});
