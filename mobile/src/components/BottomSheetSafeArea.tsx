import { StyleSheet } from "react-native";
import { SafeAreaView, type SafeAreaViewProps } from "react-native-safe-area-context";
import { colors } from "../theme";

// The sheet paints its safe-area padding so the page never shows below it.
// Top safety comes from the sheet's height bound, not an inset above its header.
export function BottomSheetSafeArea({
  style,
  ...props
}: Omit<SafeAreaViewProps, "edges">) {
  return (
    <SafeAreaView
      {...props}
      edges={["bottom", "left", "right"]}
      style={[styles.surface, style]}
    />
  );
}

const styles = StyleSheet.create({
  surface: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    flexShrink: 1,
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
  },
});
