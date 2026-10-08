import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TopHeader } from "./ui";
import { colors } from "../theme";

export function WorldExplorer({ children, onNotification }: PropsWithChildren<{ onNotification: () => void }>) {
  return <View style={styles.panel}>
    <TopHeader compact title="Sliva World" subtitle="Dunia pet, satu destinasi" onNotification={onNotification} brandIcon={<View style={styles.mark}><View style={styles.orbit}/><Ionicons name="paw-outline" size={23} color={colors.sky600}/><View style={styles.dot}/></View>}/>
    {children}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 16, gap: 16, borderWidth: 1, borderColor: colors.sky100, borderRadius: 24, backgroundColor: "#F2FAFF" },
  mark: { width: 44, height: 44, borderRadius: 16, backgroundColor: "#DFF3FF", alignItems: "center", justifyContent: "center" },
  orbit: { position: "absolute", width: 49, height: 36, borderRadius: 30, borderWidth: 1, borderColor: "#69BBD7", transform: [{ rotate: "-28deg" }] },
  dot: { position: "absolute", top: 0, right: 1, width: 9, height: 9, borderRadius: 5, backgroundColor: "#27C2AB", borderWidth: 2, borderColor: colors.white },
});
