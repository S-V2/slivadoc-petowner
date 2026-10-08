import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Image, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { royalCaninSvg } from "../../../shared/pet-brand-logos";
import { LocalizedText as Text, useI18n } from "../i18n";
import { LocalizedPressable as Pressable } from "./LocalizedPressable";
import perroLogo from "../../assets/pet-brands/perro.png";
import kucingkuLogo from "../../assets/pet-brands/kucingku.png";
import { colors } from "../theme";

export function PetBrandMarquee() {
  const { t } = useI18n();
  const [offset] = useState(() => new Animated.Value(0));
  const phase = useRef(0);
  const [paused, setPaused] = useState(false), [reduced, setReduced] = useState(true), [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); });
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    const state = AppState.addEventListener("change", value => setForeground(value === "active"));
    return () => { alive = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    if (paused || reduced || !foreground) return;
    let active = true;
    const cycle = () => {
      const animation = Animated.timing(offset, { toValue: -384, duration: (384 + phase.current) / 384 * 24000, easing: Easing.linear, useNativeDriver: true });
      animation.start(({ finished }) => {
        if (!finished || !active) return;
        phase.current = 0; offset.setValue(0); cycle();
      });
    };
    cycle();
    return () => { active = false; offset.stopAnimation(value => { phase.current = value; }); };
  }, [offset, paused, reduced, foreground]);
  return <View style={styles.section}>
    <View style={styles.heading}><View><Text style={styles.kicker}>DUNIA BRAND PET</Text><Text style={styles.title}>Kenali brand favoritmu.</Text></View>{!reduced && <Pressable accessibilityLabel={paused ? "Putar animasi brand" : "Jeda animasi brand"} onPress={() => setPaused(value => !value)} style={styles.pause}><Ionicons name={paused ? "play-outline" : "pause-outline"} size={17} color={colors.muted}/></Pressable>}</View>
    <View style={styles.window} accessible accessibilityLabel={`${t("Brand pet")}: Perro, Royal Canin, Kucingku`}>
      <Animated.View style={[styles.track, reduced && { width: "100%" }, { transform: [{ translateX: reduced ? 0 : offset }] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {(reduced ? [0] : [0, 1]).map(copy => <View key={copy} style={[styles.group, reduced && { width: "100%" }]}>
          <View style={[styles.logo, reduced && { width: "33.33%" }]}><Image alt="" source={perroLogo} style={styles.image} resizeMode="contain"/></View>
          <View style={[styles.logo, reduced && { width: "33.33%" }]}><SvgXml xml={royalCaninSvg} width="85%" height={38}/></View>
          <View style={[styles.logo, reduced && { width: "33.33%" }]}><Image alt="" source={kucingkuLogo} style={styles.image} resizeMode="contain"/></View>
        </View>)}
      </Animated.View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  section: { marginVertical: 14 }, heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 },
  kicker: { color: colors.muted, fontSize: 9, fontWeight: "700", letterSpacing: 1 }, title: { marginTop: 4, color: colors.navy, fontSize: 16, fontWeight: "700" },
  pause: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, window: { overflow: "hidden", borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  track: { flexDirection: "row", width: 768 }, group: { flexDirection: "row", width: 384 }, logo: { width: 128, height: 70, alignItems: "center", justifyContent: "center" }, image: { width: 102, maxWidth: "85%", height: 38 },
});
