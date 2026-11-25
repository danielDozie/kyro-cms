export interface ThemeColors {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  surface?: string;
  text?: string;
  textMuted?: string;
  border?: string;
  success?: string;
  error?: string;
  warning?: string;
  info?: string;
}

export interface ThemeTypography {
  fontFamily?: string;
  fontFamilyMono?: string;
  fontSize?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    "2xl"?: string;
    "3xl"?: string;
    "4xl"?: string;
  };
  fontWeight?: {
    normal?: number;
    medium?: number;
    semibold?: number;
    bold?: number;
  };
}

export interface ThemeSpacing {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  "2xl"?: string;
}

export interface ThemeRadius {
  sm?: string;
  md?: string;
  lg?: string;
  full?: string;
}

export interface ThemeShadows {
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
}

export interface BlockThemeOverrides {
  card?: {
    background?: string;
    borderRadius?: string;
    padding?: string;
    shadow?: string;
  };
  hero?: {
    background?: string;
    textAlign?: "left" | "center" | "right";
  };
  gallery?: {
    gridColumns?: number;
    gap?: string;
  };
  code?: {
    fontFamily?: string;
    fontSize?: string;
    background?: string;
  };
}

export interface FieldThemeOverrides {
  input?: {
    background?: string;
    border?: string;
    borderRadius?: string;
    padding?: string;
    focusRing?: string;
  };
  select?: {
    background?: string;
    border?: string;
  };
  textarea?: {
    background?: string;
    minHeight?: string;
  };
  richText?: {
    toolbarBackground?: string;
    buttonActive?: string;
  };
  upload?: {
    dropzoneBackground?: string;
    dropzoneActive?: string;
  };
}

export interface KyroTheme {
  id?: string;
  label?: string;
  colors?: ThemeColors;
  typography?: ThemeTypography;
  spacing?: ThemeSpacing;
  borderRadius?: ThemeRadius;
  shadows?: ThemeShadows;
  blocks?: BlockThemeOverrides;
  fields?: FieldThemeOverrides;
}

export const LIGHT_THEME: KyroTheme = {
  id: "light",
  label: "Light",
  colors: {
    primary: "#ff570a",
    secondary: "#71717a",
    accent: "#ff9b6b",
    background: "#ffffff",
    surface: "#ffffff",
    text: "#262626",
    textMuted: "#60606b",
    border: "#e9e9ec",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#06b6d4",
  },
  typography: {
    fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
    fontFamilyMono: "'Fira Code', 'Cascadia Code', monospace",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "none",
    md: "none",
    lg: "none",
    xl: "none",
  },
};

export const DARK_THEME: KyroTheme = {
  id: "dark",
  label: "Dark",
  colors: {
    primary: "#ff570a",
    secondary: "#a1a1aa",
    accent: "#ff9b6b",
    background: "#0a0a0a",
    surface: "#121212",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    border: "#272727",
    success: "#4ade80",
    error: "#f87171",
    warning: "#fbbf24",
    info: "#22d3ee",
  },
  typography: {
    fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
    fontFamilyMono: "'Fira Code', 'Cascadia Code', monospace",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "9999px",
  },
  shadows: {
    sm: "none",
    md: "none",
    lg: "none",
    xl: "none",
  },
};

export function mergeThemes(
  base: KyroTheme,
  overrides: Partial<KyroTheme>,
): KyroTheme {
  return {
    ...base,
    ...overrides,
    colors: { ...base.colors, ...overrides.colors },
    typography: { ...base.typography, ...overrides.typography },
    spacing: { ...base.spacing, ...overrides.spacing },
    borderRadius: { ...base.borderRadius, ...overrides.borderRadius },
    shadows: { ...base.shadows, ...overrides.shadows },
    blocks: base.blocks
      ? { ...base.blocks, ...overrides.blocks }
      : overrides.blocks,
    fields: base.fields
      ? { ...base.fields, ...overrides.fields }
      : overrides.fields,
  };
}
