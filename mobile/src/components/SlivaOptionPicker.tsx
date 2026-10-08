import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedText as Text, LocalizedTextInput as TextInput, useI18n } from "../i18n";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import { BoundedBottomSheet } from "./ui";
import { colors } from "../theme";

export function SlivaOptionPicker({ label, value, options, onChange, loading = false, error = "", onRetry, disabled = false }: {
  label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void;
  loading?: boolean; error?: string; onRetry?: () => void; disabled?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.value === value);
  const filtered = useMemo(() => options.filter((item) => `${item.label} ${t(item.label)}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [options, query, t]);
  const close = () => { setOpen(false); setQuery(""); };
  return <>
    <Pressable accessibilityLabel={label} accessibilityValue={{ text: selected ? t(selected.label) : "" }} disabled={disabled} onPress={() => { Keyboard.dismiss(); setOpen(true); }} style={styles.field}>
      <Text style={styles.value}>{selected?.label ?? label}</Text><Ionicons name="chevron-down" size={18} color={colors.sky600}/>
    </Pressable>
    <BoundedBottomSheet visible={open} onClose={close} maxHeight="86%">
      <View style={styles.content}>
        <View style={styles.header}><Text style={styles.title}>{label}</Text><Pressable accessibilityLabel="Tutup" onPress={close} style={styles.close}><Ionicons name="close" size={22} color={colors.navy}/></Pressable></View>
        <TextInput accessibilityLabel="Cari pilihan" placeholder="Cari pilihan" value={query} onChangeText={setQuery} autoCorrect={false} style={styles.search}/>
        {loading ? <ActivityIndicator accessibilityLabel={t("Memuat informasi terbaru…")} color={colors.sky600}/> : error ? <View style={styles.state}><Text accessibilityRole="alert">{error}</Text>{onRetry && <Pressable onPress={onRetry} style={styles.close}><Text>Coba lagi</Text></Pressable>}</View> : <FlatList
          style={styles.list} data={filtered} keyExtractor={(item) => item.value} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>Pilihan tidak ditemukan.</Text>}
          renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: item.value === value }} onPress={() => { onChange(item.value); close(); }} style={[styles.option, item.value === value && styles.active]}><Text style={styles.value}>{item.label}</Text><Ionicons name={item.value === value ? "checkmark-circle" : "ellipse-outline"} size={20} color={colors.sky600}/></Pressable>}
        />}
      </View>
    </BoundedBottomSheet>
  </>;
}
const styles = StyleSheet.create({
  field: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 14, backgroundColor: colors.white },
  value: { flex: 1, flexShrink: 1, color: colors.navy, fontSize: 14 },
  content: { flexShrink: 1, minHeight: 0, padding: 18, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { flex: 1, color: colors.navy, fontSize: 20, fontWeight: "700" },
  close: { minWidth: 44, minHeight: 44, padding: 10, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.sky50 },
  search: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.sky100, borderRadius: 14, color: colors.navy, backgroundColor: colors.white },
  list: { flexShrink: 1, minHeight: 0 },
  option: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: 6, borderRadius: 14 },
  active: { backgroundColor: colors.sky50 },
  state: { gap: 12, alignItems: "center", padding: 18 },
  empty: { color: colors.muted, padding: 18, textAlign: "center" },
});
