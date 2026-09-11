import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  LocalizedText as Text,
  LocalizedTextInput as TextInput,
  useI18n,
} from "../i18n";
import { colors, radius, shadow, spacing, typography } from "../theme";

export type RegionOption = {
  id: string;
  code: string;
  name: string;
};

type RegionSelectSheetProps = {
  visible: boolean;
  embedded?: boolean;
  title: string;
  options: readonly RegionOption[];
  loading?: boolean;
  error?: string | null;
  value?: string | null;
  onSelect: (option: RegionOption) => void;
  onClose: () => void;
  onRetry?: () => void;
  placeholder?: string;
};

function normalizeSearchValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("id-ID");
}

export function RegionSelectSheet({
  visible,
  embedded = false,
  title,
  options,
  loading = false,
  error,
  value,
  onSelect,
  onClose,
  onRetry,
  placeholder = "Cari nama atau kode wilayah",
}: RegionSelectSheetProps) {
  const [query, setQuery] = useState("");
  const { t } = useI18n();

  const filteredOptions = useMemo(() => {
    const keyword = normalizeSearchValue(query);
    if (!keyword) return options;

    return options.filter((option) =>
      normalizeSearchValue(`${option.name} ${option.code}`).includes(keyword),
    );
  }, [options, query]);

  const close = () => {
    setQuery("");
    onClose();
  };

  const select = (option: RegionOption) => {
    onSelect(option);
    close();
  };

  if (!visible) return null;

  const content = (
    <View style={[styles.modalRoot, embedded && styles.embeddedRoot]}>
      <Pressable
        accessibilityLabel={t("Tutup pilihan wilayah")}
        accessibilityRole="button"
        onPress={close}
        style={styles.backdrop}
      />

      <KeyboardAvoidingView
        behavior={!embedded && Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
        style={styles.sheetLayer}
      >
        <SafeAreaView
          accessibilityViewIsModal
          edges={["bottom", "left", "right"]}
          style={styles.sheet}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons
                name="location-outline"
                size={20}
                color={colors.sky600}
              />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>PILIH WILAYAH</Text>
              <Text
                accessibilityRole="header"
                numberOfLines={2}
                style={styles.title}
              >
                {title}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("Tutup pilihan wilayah")}
              accessibilityRole="button"
              hitSlop={8}
              onPress={close}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="close" size={21} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.sky600} />
            <TextInput
              accessibilityLabel={placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onChangeText={setQuery}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            {query ? (
              <Pressable
                accessibilityLabel={t("Hapus pencarian")}
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setQuery("")}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="close-circle" size={19} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.stateContainer}
            >
              <View style={styles.stateIcon}>
                <ActivityIndicator color={colors.sky600} size="small" />
              </View>
              <Text style={styles.stateTitle}>Memuat daftar wilayah…</Text>
              <Text style={styles.stateNote}>Mohon tunggu sebentar.</Text>
            </View>
          ) : error ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.stateContainer}
            >
              <View style={[styles.stateIcon, styles.errorIcon]}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={24}
                  color={colors.red}
                />
              </View>
              <Text style={styles.stateTitle}>Wilayah belum dapat dimuat</Text>
              <Text style={styles.stateNote}>{error}</Text>
              {onRetry ? (
                <Pressable
                  accessibilityLabel={t("Coba muat ulang wilayah")}
                  accessibilityRole="button"
                  onPress={onRetry}
                  style={({ pressed }) => [
                    styles.retryButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="refresh" size={16} color={colors.white} />
                  <Text style={styles.retryText}>Coba lagi</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={filteredOptions}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              keyExtractor={(option) => `${option.id}-${option.code}`}
              ListEmptyComponent={
                <View
                  accessibilityLiveRegion="polite"
                  style={styles.stateContainer}
                >
                  <View style={styles.stateIcon}>
                    <Ionicons
                      name="search-outline"
                      size={24}
                      color={colors.sky600}
                    />
                  </View>
                  <Text style={styles.stateTitle}>
                    {query.trim()
                      ? "Wilayah tidak ditemukan"
                      : "Belum ada pilihan wilayah"}
                  </Text>
                  <Text style={styles.stateNote}>
                    {query.trim()
                      ? "Coba gunakan nama atau kode wilayah lain."
                      : "Daftar wilayah akan muncul di sini."}
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const selected = item.id === value || item.code === value;

                return (
                  <Pressable
                    accessibilityLabel={`${t("Pilih")} ${item.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => select(item)}
                    style={({ pressed }) => [
                      styles.option,
                      selected && styles.optionSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.optionMarker,
                        selected && styles.optionMarkerSelected,
                      ]}
                    >
                      <Ionicons
                        name={selected ? "checkmark" : "location-outline"}
                        size={selected ? 16 : 17}
                        color={selected ? colors.white : colors.sky600}
                      />
                    </View>
                    <View style={styles.optionCopy}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.optionName,
                          selected && styles.optionNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.optionCode}>
                        {t("Kode")} {item.code}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={selected ? colors.sky600 : colors.muted}
                    />
                  </Pressable>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );

  if (embedded) return content;

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      onShow={() => setQuery("")}
      statusBarTranslucent
      transparent
      visible
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  embeddedRoot: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(13, 35, 54, 0.42)",
  },
  sheetLayer: {
    flex: 1,
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  sheet: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 620,
    height: "82%",
    maxHeight: 720,
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.sky100,
    backgroundColor: colors.white,
    ...shadow,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    marginTop: 9,
    marginBottom: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: "#D9E7EF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.sky50,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
  },
  eyebrow: {
    color: colors.sky600,
    fontSize: typography.caption,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 2,
    color: colors.navy,
    fontSize: typography.sectionTitle,
    lineHeight: 22,
    fontWeight: "700",
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: 15,
    backgroundColor: colors.white,
  },
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.sky100,
    borderRadius: radius.md,
    backgroundColor: colors.canvas,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    minHeight: 46,
    paddingVertical: 0,
    color: colors.text,
    fontSize: typography.input,
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    flexGrow: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  option: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  optionSelected: {
    borderColor: colors.sky400,
    backgroundColor: colors.sky50,
  },
  optionMarker: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: colors.sky50,
  },
  optionMarkerSelected: {
    backgroundColor: colors.sky600,
  },
  optionCopy: {
    minWidth: 0,
    flex: 1,
  },
  optionName: {
    color: colors.navy,
    fontSize: typography.bodyLarge,
    lineHeight: 19,
    fontWeight: "600",
  },
  optionNameSelected: {
    color: colors.sky600,
  },
  optionCode: {
    marginTop: 2,
    color: colors.muted,
    fontSize: typography.caption,
    lineHeight: 15,
  },
  stateContainer: {
    flex: 1,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 32,
  },
  stateIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: colors.sky50,
  },
  errorIcon: {
    backgroundColor: colors.red50,
  },
  stateTitle: {
    marginTop: spacing.md,
    color: colors.navy,
    fontSize: typography.cardTitle,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  stateNote: {
    maxWidth: 300,
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 19,
    textAlign: "center",
  },
  retryButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    backgroundColor: colors.sky600,
  },
  retryText: {
    color: colors.white,
    fontSize: typography.control,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
