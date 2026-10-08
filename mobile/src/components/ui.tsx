import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { useResponsiveLayout } from "../responsive";
import { createContext, useContext, type PropsWithChildren, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,

  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedText as Text } from "../i18n";
import { colors, radius, shadow, spacing, typography } from "../theme";

export type AppIconTone = "sky" | "mint" | "violet" | "peach" | "red" | "neutral";

const iconPalettes: Record<AppIconTone, { backgroundColor: string; color: string }> = {
  sky: { backgroundColor: colors.sky50, color: colors.sky600 },
  mint: { backgroundColor: colors.mint50, color: "#14836E" },
  violet: { backgroundColor: colors.violet50, color: "#6655C7" },
  peach: { backgroundColor: colors.peach50, color: "#8B4A20" },
  red: { backgroundColor: colors.red50, color: colors.red },
  neutral: { backgroundColor: colors.canvas, color: colors.text },
};

type AppSurfaceContextValue = {
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
  unreadNotifications: number;
  chatUnread: number;
  openChatInbox: () => void;
};

const AppSurfaceContext = createContext<AppSurfaceContextValue>({
  bottomInset: 0,
  refreshing: false,
  onRefresh: () => undefined,
  unreadNotifications: 0,
  chatUnread: 0,
  openChatInbox: () => undefined,
});
export function AppSurfaceProvider({ children, bottomInset, refreshing, onRefresh, unreadNotifications, chatUnread, openChatInbox }: PropsWithChildren<AppSurfaceContextValue>) {
  return <AppSurfaceContext.Provider value={{ bottomInset, refreshing, onRefresh, unreadNotifications, chatUnread, openChatInbox }}>{children}</AppSurfaceContext.Provider>;
}

// Store-chat unread total on the header chat button; hidden at 0.
export function ChatUnreadBadge() {
  const { chatUnread } = useAppSurface();
  if (chatUnread <= 0) return null;
  return <View style={styles.chatBadge} accessibilityLabel={`${chatUnread} chat belum dibaca`}><Text style={styles.chatBadgeText}>{chatUnread > 99 ? "99+" : chatUnread}</Text></View>;
}

export function useAppSurface() {
  return useContext(AppSurfaceContext);
}

export function Screen({ children, contentStyle }: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle> }>) {
  const { bottomInset, refreshing, onRefresh } = useAppSurface();
  const layout = useResponsiveLayout();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.screenContent, { width: "100%", maxWidth: layout.contentWidth, alignSelf: "center", paddingHorizontal: layout.gutter, paddingBottom: bottomInset + 108 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.sky500]} tintColor={colors.sky500} progressBackgroundColor={colors.white} />}
    >
      {children}
    </ScrollView>
  );
}

export function TopHeader({ title, subtitle, onNotification }: { title: string; subtitle: string; onNotification: () => void }) {
  const { unreadNotifications, openChatInbox } = useAppSurface();
  return (
    <View style={styles.topHeader}>
      <View style={styles.brandIcon}><Ionicons name="sparkles" size={18} color={colors.white} /></View>
      <View style={styles.topHeaderCopy}>
        <Text style={styles.topKicker}>{subtitle}</Text>
        <Text style={styles.topTitle} numberOfLines={1}>{title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Buka daftar chat" style={styles.iconButton} onPress={() => openChatInbox()}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
        <ChatUnreadBadge />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Buka notifikasi" style={styles.iconButton} onPress={() => onNotification()}>
        <Ionicons name="notifications-outline" size={20} color={colors.text} />
        {unreadNotifications > 0 ? <View style={styles.notificationDot} /> : null}
      </Pressable>
    </View>
  );
}

export function SectionTitle({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={{flex:1,minWidth:0}}>
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
  return <View style={[styles.pill, styles[`${tone}Pill`]]}><Text numberOfLines={2} style={[styles.pillText, styles[`${tone}PillText`]]}>{children}</Text></View>;
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
  const layout = useResponsiveLayout();
  return (
    <Modal supportedOrientations={["portrait", "portrait-upside-down", "landscape-left", "landscape-right"]}
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
        <View style={styles.sheetBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup panel"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <View accessible={false} accessibilityViewIsModal style={[styles.sheet, { maxHeight, width: "100%", maxWidth: layout.sheetWidth, alignSelf: "center" }]}>
            <SafeAreaView edges={["bottom", "left", "right"]} style={styles.sheetSafe}>
              <View style={styles.sheetHandle} />
              {children}
            </SafeAreaView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingHorizontal: spacing.lg },
  topHeader: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  brandIcon: { width: 44, height: 44, borderRadius: 17, borderBottomLeftRadius: 8, borderWidth: 1, borderColor: colors.sky300, backgroundColor: colors.sky600, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-4deg" }], ...shadow },
  topHeaderCopy: { flex: 1, gap: 2 },
  topKicker: { color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: "600" },
  topTitle: { color: colors.inkStrong, fontSize: typography.cardTitle, lineHeight: 20, fontWeight: "700" },
  iconButton: { position: "relative", width: 44, height: 44, borderRadius: 17, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...shadow },
  notificationDot: { position: "absolute", right: 8, top: 7, width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.white, backgroundColor: colors.red },
  chatBadge: { position: "absolute", right: 3, top: 3, minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, borderWidth: 1.5, borderColor: colors.white, backgroundColor: colors.red, alignItems: "center", justifyContent: "center" },
  chatBadgeText: { color: colors.white, fontSize: 9, lineHeight: 12, fontWeight: "700" },
  sectionTitle: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginTop: 26, marginBottom: 12 },
  eyebrow: { color: colors.muted, fontSize: 9, fontWeight: "600", letterSpacing: 1, marginBottom: 3 },
  sectionHeading: { color: colors.inkStrong, fontSize: typography.sectionTitle, lineHeight: 22, fontWeight: "600", letterSpacing: -0.3 },
  sectionAction: { color: colors.sky600, fontSize: 11, fontWeight: "600", paddingBottom: 2 },
  card: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.sky100, backgroundColor: colors.white, ...shadow },
  primaryButton: { minHeight: 48, paddingHorizontal: 17, borderRadius: radius.md, borderBottomLeftRadius: 9, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.sky600, ...shadow },
  compactButton: { minHeight: 42, borderRadius: 14, paddingHorizontal: 14 },
  primaryButtonText: { flexShrink: 1, textAlign: "center", color: colors.white, fontSize: typography.control, fontWeight: "600" },
  lightButton: { backgroundColor: colors.white, shadowOpacity: 0 },
  lightButtonText: { color: colors.sky600 },
  softButton: { minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.sky200, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.sky50 },
  softButtonText: { flexShrink: 1, textAlign: "center", color: colors.sky600, fontSize: typography.control, fontWeight: "600" },
  appIcon: { alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  pill: { maxWidth: "52%", flexShrink: 0, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill },
  pillText: { fontSize: 9, lineHeight: 12, fontWeight: "600", letterSpacing: 0.15, textAlign: "center" },
  bluePill: { backgroundColor: colors.sky50 }, bluePillText: { color: colors.sky600 },
  mintPill: { backgroundColor: colors.mint50 }, mintPillText: { color: "#14836E" },
  yellowPill: { backgroundColor: colors.yellow50 }, yellowPillText: { color: colors.yellow },
  violetPill: { backgroundColor: colors.violet50 }, violetPillText: { color: "#6655C7" },
  redPill: { backgroundColor: colors.red50 }, redPillText: { color: colors.red },
  empty: { minHeight: 280, alignItems: "center", justifyContent: "center", padding: 26 },
  emptyTitle: { marginTop: 10, color: colors.navy, fontSize: typography.sectionTitle, lineHeight: 22, fontWeight: "600" },
  emptyNote: { maxWidth: 280, marginTop: 5, marginBottom: 14, color: colors.muted, fontSize: typography.body, lineHeight: 19, textAlign: "center" },
  petRequiredNotice: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, padding: 13, borderWidth: 1, borderColor: "#DDD7FF", borderRadius: radius.lg, backgroundColor: colors.lavender50 },
  petRequiredCopy: { minWidth: 0, flex: 1 },
  petRequiredTitle: { color: colors.navy, fontSize: 12, lineHeight: 16, fontWeight: "600" },
  petRequiredText: { marginTop: 2, color: colors.muted, fontSize: 10, lineHeight: 14 },
  petRequiredAction: { minHeight: 34, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, borderRadius: 11, backgroundColor: colors.white },
  petRequiredActionText: { color: colors.sky600, fontSize: 10, fontWeight: "600" },
  sheetRoot: { flex: 1 },
  sheetBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13, 35, 54, .42)",
  },
  sheet: {
    overflow: "hidden",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.sky100,
    backgroundColor: colors.sky25,
  },
  sheetSafe: { minHeight: 120, flexShrink: 1, backgroundColor: colors.white },
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
