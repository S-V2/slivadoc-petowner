import { Image, StyleSheet, View } from "react-native";
import { colors } from "../theme";

export function BrandLogo({ size = 44 }: { size?: number }) {
  return (
    <View style={[styles.mark, { width: size, height: size }]}>
      <Image
        source={require("../../assets/slivadoc-logo.png")}
        accessibilityLabel="Logo Slivadoc"
        accessible
        resizeMode="contain"
        style={{ width: size - 8, height: size - 8 }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  mark: {
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sky100,
    backgroundColor: colors.white,
  },
});
