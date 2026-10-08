/* Native images use accessibilityLabel rather than web alt. */
/* eslint-disable jsx-a11y/alt-text */
import { useState, type ComponentProps } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { useI18n } from "../i18n";

export function WorldPhoto({ src, title, icon = "paw-outline" }: { src?: string; title: string; icon?: ComponentProps<typeof Ionicons>["name"] }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState("");
  return <View style={styles.frame}>
    {src && src !== failed ? <Image accessibilityLabel={`${t("Foto")} ${title}`} source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(src)}/> : <View style={styles.placeholder} accessible accessibilityRole="image" accessibilityLabel={`${title}: ${t("Foto belum tersedia")}`}><Ionicons name={icon} size={30} color={colors.sky600}/></View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.sky50 },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
});
