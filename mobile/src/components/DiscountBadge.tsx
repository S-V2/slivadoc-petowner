import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocalizedText as Text } from "../i18n";
export function DiscountBadge({ percent }: { percent?: number }) {
  const value = Math.min(100, Math.max(0, Math.round(percent || 0)));
  if (!value) return null;
  return (
    <View
      style={styles.ticket}
      pointerEvents="none"
      accessibilityLabel={`Hemat ${value}%`}
    >
      <View style={styles.top}>
        <Ionicons name="sparkles" size={10} color="#fff" />
        <Text style={styles.label}>HEMAT</Text>
      </View>
      <Text style={styles.value}>{value}%</Text>
      <View style={styles.perforation} />
    </View>
  );
}
const styles = StyleSheet.create({
  ticket: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 6,
    minWidth: 54,
    paddingHorizontal: 9,
    paddingTop: 5,
    paddingBottom: 8,
    borderRadius: 10,
    borderBottomRightRadius: 2,
    backgroundColor: "#F16F5A",
    transform: [{ rotate: "4deg" }],
    borderWidth: 1,
    borderColor: "#ffbdb2",
    shadowColor: "#913e38",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
  top: { flexDirection: "row", gap: 3, alignItems: "center" },
  label: { color: "#fff", fontSize: 8, fontWeight: "700", letterSpacing: 0.4 },
  value: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
  },
  perforation: {
    borderTopWidth: 1,
    borderColor: "#ffcfca",
    borderStyle: "dashed",
    marginTop: 3,
  },
});
