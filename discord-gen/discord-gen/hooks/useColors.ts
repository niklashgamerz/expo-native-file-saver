import colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";

/**
 * Returns design tokens for the current color scheme.
 * Reads from AppContext so the user's dark/light preference
 * overrides the system setting — defaults to dark mode.
 */
export function useColors() {
  const { settings } = useApp();
  const palette = settings.darkMode ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
