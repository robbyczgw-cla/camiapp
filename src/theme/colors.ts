// CamiApp Theme System 🦎
// Ported from OpenCami web with Frost glassmorphism themes

/**
 * Accent Colors - User-selectable accent colors
 * Matches OpenCami's accent color options
 */
export const accentColors = {
  green: { accent: '#22c55e', hover: '#16a34a', light: 'rgba(34, 197, 94, 0.10)' },
  blue: { accent: '#3b82f6', hover: '#2563eb', light: 'rgba(59, 130, 246, 0.10)' },
  purple: { accent: '#8b5cf6', hover: '#7c3aed', light: 'rgba(139, 92, 246, 0.10)' },
  orange: { accent: '#f97316', hover: '#ea580c', light: 'rgba(249, 115, 22, 0.10)' },
  pink: { accent: '#ec4899', hover: '#db2777', light: 'rgba(236, 72, 153, 0.10)' },
  red: { accent: '#ef4444', hover: '#dc2626', light: 'rgba(239, 68, 68, 0.10)' },
  cyan: { accent: '#06b6d4', hover: '#0891b2', light: 'rgba(6, 182, 212, 0.10)' },
} as const;

export type AccentColorName = keyof typeof accentColors;

export const accentColorOptions: { value: AccentColorName; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'pink', label: 'Pink' },
  { value: 'red', label: 'Red' },
  { value: 'cyan', label: 'Cyan' },
];

/**
 * Base color palette
 */
export const colors = {
  // Primary greens (matching OpenCami)
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // Neutrals
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  // Frost colors (blue tint - hue 250 in oklch, converted to hex)
  frost: {
    // Light variant
    light: {
      50: '#f8faff',   // Very light icy blue
      100: '#f0f4ff',  // Light ice
      200: '#e1e8ff',  // Soft ice
      300: '#c7d2ff',  // Ice accent
      400: '#a5b4fc',  // Bright ice
      500: '#818cf8',  // Medium blue
      600: '#6366f1',  // Vivid blue
      700: '#4f46e5',  // Deep blue
      800: '#3730a3',  // Very deep
      900: '#312e81',  // Near black blue
    },
    // Dark variant (Noir)
    dark: {
      50: '#0f0f1a',   // Near black with blue
      100: '#161625',  // Very dark blue
      200: '#1e1e35',  // Dark blue surface
      300: '#2d2d4d',  // Elevated surface
      400: '#3d3d66',  // Borders/dividers
      500: '#5555a0',  // Muted accent
      600: '#7777cc',  // Secondary text
      700: '#9999dd',  // Primary text muted
      800: '#ccccee',  // Primary text
      900: '#e8e8ff',  // Bright text
      950: '#f5f5ff',  // Pure text
    },
  },
  // Semantic
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
} as const;

/**
 * Theme type definition
 */
export type Theme = {
  background: string;
  surface: string;
  surfaceVariant: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryDark: string;
  userBubble: string;
  userBubbleText: string;
  aiBubble: string;
  aiBubbleText: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  // Glass effect colors (for Frost themes)
  glassBackground?: string;
  glassBorder?: string;
};

/**
 * Light Theme (Default)
 */
export const lightTheme: Theme = {
  background: colors.neutral[50],
  surface: colors.neutral[0],
  surfaceVariant: colors.neutral[100],
  surfaceElevated: colors.neutral[0],
  text: colors.neutral[900],
  textSecondary: colors.neutral[500],
  textMuted: colors.neutral[400],
  border: colors.neutral[200],
  primary: colors.primary[500],
  primaryDark: colors.primary[700],
  userBubble: colors.primary[100],
  userBubbleText: colors.neutral[900],
  aiBubble: colors.neutral[0],
  aiBubbleText: colors.neutral[900],
  error: colors.error,
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
};

/**
 * Dark Theme
 */
export const darkTheme: Theme = {
  background: colors.neutral[950],
  surface: colors.neutral[900],
  surfaceVariant: colors.neutral[800],
  surfaceElevated: colors.neutral[800],
  text: colors.neutral[50],
  textSecondary: colors.neutral[400],
  textMuted: colors.neutral[600],
  border: colors.neutral[700],
  primary: colors.primary[500],
  primaryDark: colors.primary[400],
  userBubble: colors.primary[900],
  userBubbleText: colors.neutral[50],
  aiBubble: colors.neutral[800],
  aiBubbleText: colors.neutral[50],
  error: colors.error,
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
};

/**
 * Frost Light Theme (Ice) - Glassmorphism with blue tint
 */
export const frostLightTheme: Theme = {
  background: '#f5f7ff',  // Very subtle blue-white
  surface: 'rgba(255, 255, 255, 0.75)',
  surfaceVariant: 'rgba(241, 245, 255, 0.8)',
  surfaceElevated: 'rgba(255, 255, 255, 0.85)',
  text: colors.frost.light[900],
  textSecondary: colors.frost.light[600],
  textMuted: colors.frost.light[500],
  border: 'rgba(165, 180, 252, 0.25)',
  primary: colors.primary[500],
  primaryDark: colors.primary[700],
  userBubble: 'rgba(34, 197, 94, 0.15)',
  userBubbleText: colors.frost.light[900],
  aiBubble: 'rgba(255, 255, 255, 0.6)',
  aiBubbleText: colors.frost.light[900],
  error: colors.error,
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
  glassBackground: 'rgba(255, 255, 255, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
};

/**
 * Frost Dark Theme (Noir) - Glassmorphism dark mode with blue tint
 */
export const frostDarkTheme: Theme = {
  background: '#0a0a14',  // Very dark blue-black
  surface: 'rgba(22, 22, 37, 0.8)',
  surfaceVariant: 'rgba(30, 30, 53, 0.75)',
  surfaceElevated: 'rgba(45, 45, 77, 0.8)',
  text: colors.frost.dark[950],
  textSecondary: colors.frost.dark[700],
  textMuted: colors.frost.dark[600],
  border: 'rgba(93, 93, 160, 0.25)',
  primary: colors.primary[500],
  primaryDark: colors.primary[400],
  userBubble: 'rgba(34, 197, 94, 0.2)',
  userBubbleText: colors.frost.dark[950],
  aiBubble: 'rgba(30, 30, 53, 0.7)',
  aiBubbleText: colors.frost.dark[950],
  error: colors.error,
  success: colors.success,
  warning: colors.warning,
  info: colors.info,
  glassBackground: 'rgba(22, 22, 37, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.12)',
};

/**
 * Get theme by name with accent color applied
 */
export function getTheme(
  themeName: 'light' | 'dark' | 'frost-light' | 'frost-dark',
  accentColor: AccentColorName = 'green'
): Theme {
  const accent = accentColors[accentColor];
  
  let baseTheme: Theme;
  switch (themeName) {
    case 'dark':
      baseTheme = darkTheme;
      break;
    case 'frost-light':
      baseTheme = frostLightTheme;
      break;
    case 'frost-dark':
      baseTheme = frostDarkTheme;
      break;
    default:
      baseTheme = lightTheme;
  }
  
  // Apply accent color
  return {
    ...baseTheme,
    primary: accent.accent,
    primaryDark: accent.hover,
    userBubble: themeName.includes('frost')
      ? `${accent.accent}20`  // 12.5% opacity for frost
      : themeName === 'dark'
        ? `${accent.accent}33`  // 20% opacity for dark
        : accent.light,
  };
}

/**
 * Theme mode options for settings
 */
export type ThemeMode = 'light' | 'dark' | 'frost-light' | 'frost-dark' | 'system';

export const themeOptions: { value: ThemeMode; label: string; icon: string; description: string }[] = [
  { value: 'light', label: 'Light', icon: '☀️', description: 'Clean & bright' },
  { value: 'dark', label: 'Dark', icon: '🌙', description: 'Easy on the eyes' },
  { value: 'frost-light', label: 'Ice', icon: '❄️', description: 'Frosty glassmorphism' },
  { value: 'frost-dark', label: 'Noir', icon: '🌑', description: 'Dark glass effect' },
  { value: 'system', label: 'Auto', icon: '📱', description: 'Follow system' },
];
