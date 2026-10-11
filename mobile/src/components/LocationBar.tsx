import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentLocation } from "../LocationProvider";
import { DEVICE_LOCATION_LABEL, PIN_LOCATION_LABEL } from "../location";
import { LocalizedText as Text } from "../i18n";
import { colors } from "../theme";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";

export function LocationBar() {
  const { location, ready, openPicker } = useCurrentLocation();
  return <Pressable accessibilityLabel="Pilih lokasi layanan" onPress={openPicker} disabled={!ready} style={styles.bar}>
    <Ionicons name="location-outline" size={18} color={colors.sky600} />
    <Text numberOfLines={1} translate={!location || location.label === DEVICE_LOCATION_LABEL || location.label === PIN_LOCATION_LABEL} style={styles.label}>
      {location?.label ?? (ready ? "Pilih lokasi" : "Memuat lokasi…")}
    </Text>
    <Ionicons name="chevron-down" size={16} color={colors.sky600} />
  </Pressable>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, marginHorizontal: 18, marginTop: 6, marginBottom: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.sky50 },
  label: { flex: 1, minWidth: 0, color: colors.navy, fontSize: 13, fontWeight: "600" },
});
