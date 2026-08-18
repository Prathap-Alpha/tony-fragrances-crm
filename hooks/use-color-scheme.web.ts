import { useThemeContext } from "@/lib/theme-provider";

// Read the scheme from the ThemeProvider (same source the background layer uses),
// NOT react-native's hook directly. The provider's colorScheme is a React context
// value, so when it flips light->dark on client hydration EVERY consumer re-renders
// together — text and background stay in sync. The old web-only implementation read
// the OS scheme behind a per-component hydration flag, so a screen that never
// re-rendered after mount (React Compiler) stayed on the light palette while the
// background went dark => dark text on a dark background.
export function useColorScheme() {
  return useThemeContext().colorScheme;
}
