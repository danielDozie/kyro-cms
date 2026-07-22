export { Admin } from "./components/Admin";
export { LoginPage } from "./components/LoginPage";
export { ListView } from "./components/ListView";
export { DetailView } from "./components/DetailView";
export { CreateView } from "./components/CreateView";
export { AutoForm } from "./components/AutoForm";
export {
  ActionBar,
  type ActionBarProps,
  type DocumentStatus,
  type SaveStatus,
} from "./components/ActionBar";
export { BulkActionsBar } from "./components/BulkActionsBar";
export { Badge, CountBadge } from "./components/ui/Badge";
export { PageHeader } from "./components/ui/PageHeader";
export { VersionHistoryPanel } from "./components/VersionHistoryPanel";
export {
  ThemeProvider,
  LightThemeProvider,
  DarkThemeProvider,
  useTheme,
  type ThemeMode,
} from "./components/ThemeProvider";
export * from "./components/layout/Header";
export * from "./components/ui/Button";
export * from "./components/ui/Badge";
export * from "./components/ui/Spinner";
export * from "./components/ui/Toast";
export {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "./components/ui/Dropdown";
export { Modal, ConfirmModal } from "./components/ui/Modal";
export { SlidePanel } from "./components/ui/SlidePanel";

// Extensibility: Theme
export {
  ThemeProvider as ExtThemeProvider,
  LightThemeProvider as ExtLightThemeProvider,
  DarkThemeProvider as ExtDarkThemeProvider,
  useTheme as useExtTheme,
  LIGHT_THEME,
  DARK_THEME,
  mergeThemes,
  type ThemeMode as ExtThemeMode,
  type KyroTheme,
  type ThemeColors,
  type ThemeTypography,
  type ThemeSpacing,
  type ThemeRadius,
  type ThemeShadows,
  type BlockThemeOverrides,
  type FieldThemeOverrides,
} from "./theme/index";

// Extensibility: Hooks
export {
  onAdminReady,
  beforeDeploy,
  afterDeploy,
  emitAdminReady,
  emitBeforeDeploy,
  emitAfterDeploy,
  useKyroQuery,
  useKyroMutation,
  type AdminContext,
  type HookResult,
  type LifecycleHook,
  type AuthUser,
  type TenantInfo,
  type QueryOptions,
  type QueryResult,
  type MutationResult,
} from "./hooks/index.js";

// Extensibility: Plugins
export {
  registerPlugin,
  unregisterPlugin,
  getPlugin,
  getPlugins,
  getPluginsWithHook,
  type KyroPlugin,
} from "./plugins/index.js";

// Extensibility: Blocks
export {
  registerBlock,
  unregisterBlock,
  getBlock,
  getBlocks,
  getBlocksByCategory,
  useBlockRenderer,
  type KyroBlock,
  type BlockRenderProps,
} from "./blocks/index";

// Extensibility: Fields
export {
  registerField,
  unregisterField,
  getField,
  getFields,
  getFieldByType,
  useFieldRenderer,
  type KyroField,
  type FieldEditorProps,
} from "./fields/index";

// Astro Integration
export type { KyroAdminOptions } from "./integration";

// Paths (for users who need direct access)
export {
  adminPath,
  apiPath,
  resolveApi,
  resolveAdmin,
  paths,
} from "./lib/paths";
