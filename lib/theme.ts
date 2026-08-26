import { useColorScheme } from "react-native";

export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  safe: string;
  caution: string;
  avoid: string;
  danger: string;
}

const light: Theme = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  cardAlt: "#EFF2F6",
  border: "#E2E5EA",
  text: "#14181F",
  textMuted: "#6B7280",
  primary: "#1F8A5E",
  primaryText: "#FFFFFF",
  safe: "#1F8A5E",
  caution: "#B7791F",
  avoid: "#C0392B",
  danger: "#C0392B",
};

const dark: Theme = {
  bg: "#0E1420",
  card: "#171F2E",
  cardAlt: "#1E2839",
  border: "#2A3547",
  text: "#F2F4F7",
  textMuted: "#9AA5B4",
  primary: "#34C48A",
  primaryText: "#06120C",
  safe: "#34C48A",
  caution: "#E0A93B",
  avoid: "#E5695C",
  danger: "#E5695C",
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? dark : light;
}
