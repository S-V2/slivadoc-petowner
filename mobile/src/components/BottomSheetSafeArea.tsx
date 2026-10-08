import { StyleSheet, useWindowDimensions, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

// The sheet paints its safe-area padding so the page never shows below it.
// Top safety comes from the sheet's height bound, not an inset above its header.
export function BottomSheetSafeArea({
  style,
  accessible = false,
  accessibilityViewIsModal = true,
  ...props
}: ViewProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const maxWidth = StyleSheet.flatten([styles.surface, style]).maxWidth;
  const sheetWidth = Math.min(width, typeof maxWidth === "number" ? maxWidth : width);
  const sideSpace = Math.max(0, (width - sheetWidth) / 2);
  return (
    <View
      {...props}
      accessible={accessible}
      accessibilityViewIsModal={accessibilityViewIsModal}
      style={[
        styles.surface,
        style,
        {
          paddingBottom: insets.bottom,
          paddingLeft: Math.max(0, insets.left - sideSpace),
          paddingRight: Math.max(0, insets.right - sideSpace),
        },
      ]}
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
