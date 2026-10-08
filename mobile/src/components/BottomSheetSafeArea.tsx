import { StyleSheet, View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme";

// The sheet paints its safe-area padding so the page never shows below it.
// Top safety comes from the sheet's height bound, not an inset above its header.
export function BottomSheetSafeArea({
  style,
  ...props
}: ViewProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...props}
      style={[
        styles.surface,
        style,
        {
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
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
