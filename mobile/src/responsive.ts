import { useWindowDimensions } from "react-native";
import { responsiveLayout } from "../../shared/responsive";
export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  return responsiveLayout(width, height);
}
