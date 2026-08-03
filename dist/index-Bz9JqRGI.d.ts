type StylingMode = 'css' | 'tailwind' | 'css-in-js' | 'styled-components' | 'vanilla-extract';
interface StylingConfig {
    mode: StylingMode;
    theme?: ThemeConfig;
    customProperties?: Record<string, string>;
}
interface ThemeConfig {
    colors?: ThemeColors;
    fonts?: ThemeFonts;
    spacing?: ThemeSpacing;
    borderRadius?: ThemeBorderRadius;
    shadows?: ThemeShadows;
    breakpoints?: Record<string, string>;
}
interface ThemeColors {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
    textMuted?: string;
    border?: string;
    error?: string;
    warning?: string;
    success?: string;
    info?: string;
}
interface ThemeFonts {
    sans?: string;
    serif?: string;
    mono?: string;
}
interface ThemeSpacing {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
    '3xl'?: string;
    '4xl'?: string;
}
interface ThemeBorderRadius {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    full?: string;
}
interface ThemeShadows {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
}
declare class CSSGenerator {
    private config;
    private css;
    constructor(config: StylingConfig);
    addRule(selector: string, properties: Record<string, string>): this;
    addMediaQuery(breakpoint: string, rules: string[]): this;
    generate(): string;
}
declare function generateTailwindConfig(theme: ThemeConfig): Record<string, any>;
declare const defaultLightTheme: ThemeConfig;
declare const defaultDarkTheme: ThemeConfig;
declare const ecommerce2026Theme: ThemeConfig;
declare function generateCSSVariables(theme: ThemeConfig): string;
interface AdminStylingConfig {
    mode: StylingMode;
    theme?: ThemeConfig;
    customStyles?: string;
    componentOverrides?: Record<string, Record<string, string>>;
}
declare function createAdminStyling(config: AdminStylingConfig): string;
interface FieldStyling {
    wrapper?: Record<string, string>;
    label?: Record<string, string>;
    input?: Record<string, string>;
    error?: Record<string, string>;
    description?: Record<string, string>;
}
declare const defaultFieldStyling: Record<string, FieldStyling>;

export { type AdminStylingConfig as A, CSSGenerator as C, type FieldStyling as F, type StylingConfig as S, type ThemeBorderRadius as T, type StylingMode as a, type ThemeColors as b, type ThemeConfig as c, type ThemeFonts as d, type ThemeShadows as e, type ThemeSpacing as f, createAdminStyling as g, defaultDarkTheme as h, defaultFieldStyling as i, defaultLightTheme as j, ecommerce2026Theme as k, generateCSSVariables as l, generateTailwindConfig as m };
