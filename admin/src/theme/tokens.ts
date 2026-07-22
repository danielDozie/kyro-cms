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
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#0f172a",
    textMuted: "#64748b",
    border: "#e2e8f0",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#06b6d4",
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontFamilyMono: "'Fira Code', 'Cascadia Code', monospace",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    md: "0 4px 6px -1px rgba(0,0,0,0.1)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.1)",
    xl: "0 20px 25px -5px rgba(0,0,0,0.1)",
  },
};

export const DARK_THEME: KyroTheme = {
  id: "dark",
  label: "Dark",
  colors: {
    primary: "#60a5fa",
    secondary: "#a78bfa",
    background: "#0b1222",
    surface: "#1e293b",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    border: "#334155",
    success: "#4ade80",
    error: "#f87171",
    warning: "#fbbf24",
    info: "#22d3ee",
  },
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontFamilyMono: "'Fira Code', 'Cascadia Code', monospace",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
  },
  borderRadius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.3)",
    md: "0 4px 6px -1px rgba(0,0,0,0.4)",
    lg: "0 10px 15px -3px rgba(0,0,0,0.4)",
    xl: "0 20px 25px -5px rgba(0,0,0,0.5)",
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
