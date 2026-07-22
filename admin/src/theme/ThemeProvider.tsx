import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { KyroTheme } from "./tokens.js";
import { LIGHT_THEME, DARK_THEME, mergeThemes } from "./tokens.js";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  theme: KyroTheme;
  lightTheme: KyroTheme;
  darkTheme: KyroTheme;
  setMode: (mode: ThemeMode) => void;
  updateTheme: (overrides: Partial<KyroTheme>) => void;
  getCssVar: (key: string) => string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      mode: "light" as ThemeMode,
      theme: LIGHT_THEME,
      lightTheme: LIGHT_THEME,
      darkTheme: DARK_THEME,
      setMode: () => {},
      updateTheme: () => {},
      getCssVar: (key: string) => `var(--kyro-${key})`,
    };
  }
  return context;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
  light?: Partial<KyroTheme>;
  dark?: Partial<KyroTheme>;
}

function applyThemeToDOM(config: KyroTheme) {
  const root = document.documentElement;
  if (!root) return;

  // Apply colors
  if (config.colors) {
    Object.entries(config.colors).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(`--kyro-${key}`, value);
        root.style.setProperty(
          `--kyro-${key}-light`,
          adjustBrightness(value, 0.9),
        );
        root.style.setProperty(
          `--kyro-${key}-dark`,
          adjustBrightness(value, 0.8),
        );
      }
    });
  }

  // Apply typography
  if (config.typography) {
    if (config.typography.fontFamily) {
      root.style.setProperty(
        "--kyro-font-family",
        config.typography.fontFamily,
      );
    }
    if (config.typography.fontFamilyMono) {
      root.style.setProperty(
        "--kyro-font-mono",
        config.typography.fontFamilyMono,
      );
    }
  }

  // Apply spacing
  if (config.spacing) {
    Object.entries(config.spacing).forEach(([key, value]) => {
      if (value) root.style.setProperty(`--kyro-spacing-${key}`, value);
    });
  }

  // Apply border radius
  if (config.borderRadius) {
    Object.entries(config.borderRadius).forEach(([key, value]) => {
      if (value) root.style.setProperty(`--kyro-radius-${key}`, value);
    });
  }

  // Apply shadows
  if (config.shadows) {
    Object.entries(config.shadows).forEach(([key, value]) => {
      if (value) root.style.setProperty(`--kyro-shadow-${key}`, value);
    });
  }

  // Apply block theme overrides
  if (config.blocks) {
    if (config.blocks.card) {
      Object.entries(config.blocks.card).forEach(([key, value]) => {
        if (value) root.style.setProperty(`--kyro-block-card-${key}`, value);
      });
    }
    if (config.blocks.hero?.background) {
      root.style.setProperty(
        "--kyro-block-hero-bg",
        config.blocks.hero.background,
      );
    }
    if (config.blocks.code) {
      Object.entries(config.blocks.code).forEach(([key, value]) => {
        if (value) root.style.setProperty(`--kyro-block-code-${key}`, value);
      });
    }
  }

  // Apply field theme overrides
  if (config.fields) {
    if (config.fields.input) {
      Object.entries(config.fields.input).forEach(([key, value]) => {
        if (value) root.style.setProperty(`--kyro-field-input-${key}`, value);
      });
    }
    if (config.fields.upload) {
      if (config.fields.upload.dropzoneBackground) {
        root.style.setProperty(
          "--kyro-field-upload-dropzone-bg",
          config.fields.upload.dropzoneBackground,
        );
      }
    }
  }
}

function adjustBrightness(hex: string, factor: number): string {
  if (!hex.startsWith("#")) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const adjust = (c: number) =>
    Math.round(c * factor)
      .toString(16)
      .padStart(2, "0");
  return `#${adjust(r)}${adjust(g)}${adjust(b)}`;
}

export function ThemeProvider({
  children,
  defaultMode = "light",
  light: lightOverrides,
  dark: darkOverrides,
}: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [baseLight, setBaseLight] = useState<Partial<KyroTheme>>(
    lightOverrides || {},
  );
  const [baseDark, setBaseDark] = useState<Partial<KyroTheme>>(
    darkOverrides || {},
  );

  const lightTheme = mergeThemes(LIGHT_THEME, baseLight);
  const darkTheme = mergeThemes(DARK_THEME, baseDark);

  const getResolvedTheme = useCallback((): KyroTheme => {
    if (mode === "system") {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? darkTheme
          : lightTheme;
      }
      return lightTheme;
    }
    return mode === "dark" ? darkTheme : lightTheme;
  }, [mode, lightTheme, darkTheme]);

  const [theme, setTheme] = useState<KyroTheme>(getResolvedTheme());

  // Apply theme on mode/customization change
  useEffect(() => {
    const resolved = getResolvedTheme();
    setTheme(resolved);
    applyThemeToDOM(resolved);
  }, [getResolvedTheme]);

  // Handle system theme changes
  useEffect(() => {
    if (mode !== "system") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getResolvedTheme();
      setTheme(resolved);
      applyThemeToDOM(resolved);
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [mode, getResolvedTheme]);

  const updateTheme = useCallback((overrides: Partial<KyroTheme>) => {
    setBaseLight((prev) => ({ ...prev, ...overrides }));
    setBaseDark((prev) => ({ ...prev, ...overrides }));
  }, []);

  const getCssVar = useCallback((key: string) => `var(--kyro-${key})`, []);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        theme,
        lightTheme,
        darkTheme,
        setMode,
        updateTheme,
        getCssVar,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const LightThemeProvider = (
  props: Omit<ThemeProviderProps, "defaultMode">,
) => <ThemeProvider defaultMode="light" {...props} />;

export const DarkThemeProvider = (
  props: Omit<ThemeProviderProps, "defaultMode">,
) => <ThemeProvider defaultMode="dark" {...props} />;
