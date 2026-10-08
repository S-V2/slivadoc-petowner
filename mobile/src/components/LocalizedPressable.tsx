import { Pressable as NativePressable, type PressableProps } from "react-native";
import { useI18n } from "../i18n";
export function LocalizedPressable(props: PressableProps) {
  const {t}=useI18n();
  return <NativePressable {...props} accessibilityRole={props.accessibilityRole ?? "button"} accessibilityLabel={props.accessibilityLabel?t(props.accessibilityLabel):undefined} accessibilityHint={props.accessibilityHint?t(props.accessibilityHint):undefined}/>;
}
