export const colors = {
  canvas: "#F6FBFF",
  white: "#FFFFFF",
  navy: "#153B5B",
  text: "#2E4A62",
  muted: "#75899B",
  line: "#E2EEF5",
  sky50: "#EBF8FF",
  sky100: "#D8F1FF",
  sky400: "#55C4FA",
  sky500: "#19A7F2",
  sky600: "#0788D1",
  mint: "#26BEA1",
  mint50: "#E8FAF5",
  violet: "#8A75EA",
  violet50: "#F1EEFF",
  red: "#F06477",
  red50: "#FFF0F4",
  yellow: "#F2B440",
  yellow50: "#FFF7DE",
  peach50: "#FFF1E9",
  pink50: "#FFF0F7",
};

export const shadow = {
  shadowColor: "#2879A7",
  shadowOpacity: 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 2,
};

export const typography = {
  display: 24,
  screenTitle: 22,
  sectionTitle: 17,
  cardTitle: 15,
  bodyLarge: 14,
  body: 13,
  control: 13,
  label: 12,
  caption: 10,
  input: 14,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;
