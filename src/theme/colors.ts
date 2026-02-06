// CamiApp Chameleon Theme 🦎
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
  // Accent colors
  accent: {
    lime: '#84cc16',
    emerald: '#10b981',
    teal: '#14b8a6',
    cyan: '#06b6d4',
    orange: '#f97316',
    yellow: '#eab308',
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
  // Semantic
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#22c55e',
  info: '#3b82f6',
} as const;

export const lightTheme = {
  background: colors.primary[50],
  surface: colors.neutral[0],
  surfaceVariant: colors.primary[100],
  text: colors.neutral[900],
  textSecondary: colors.neutral[500],
  textMuted: colors.neutral[400],
  border: colors.primary[200],
  primary: colors.primary[500],
  primaryDark: colors.primary[700],
  userBubble: colors.primary[100],
  aiBubble: colors.neutral[0],
};

export const darkTheme = {
  background: colors.neutral[950],
  surface: colors.neutral[900],
  surfaceVariant: colors.neutral[800],
  text: colors.neutral[50],
  textSecondary: colors.neutral[400],
  textMuted: colors.neutral[600],
  border: colors.neutral[700],
  primary: colors.primary[500],
  primaryDark: colors.primary[400],
  userBubble: colors.primary[900],
  aiBubble: colors.neutral[800],
};
