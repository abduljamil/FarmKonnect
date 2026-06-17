// Theme palettes. `COLORS` (the default export / named export) stays the DARK
// palette so screens that haven't been migrated to the theme hooks keep
// working unchanged. Screens migrated to `useColors()` / `useThemedStyles()`
// (see contexts/ThemeContext) get the *active* palette and re-theme live.
//
// Token note: `onPrimary` is text/icon color that sits on the green primary
// (always white in both themes) — distinct from `text` (the body text color,
// which flips dark↔light). Keep them separate when migrating a screen.

const dark = {
  // Brand
  primary: '#16a34a',
  primaryDark: '#14532d',
  primaryLight: '#4ade80',
  accent: '#10b981',
  // Surfaces
  bg: '#0f1a12',
  bgDeep: '#0a110c',
  surface: '#1a2e1f',
  surfaceAlt: 'rgba(26, 46, 29, 0.8)',
  border: '#224026',
  inputBg: '#263a2c',
  inputBorder: '#374151',
  // Text
  text: '#ffffff',
  textMuted: '#a3a3a3',
  textFaint: '#6b7280',
  placeholder: '#6b7280',
  // Status
  danger: '#ef4444',
  warning: '#fbbf24',
  info: '#3b82f6',
  success: '#22c55e',
  // Fixed
  onPrimary: '#ffffff',
  white: '#ffffff',
  black: '#000000',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
};

const light = {
  primary: '#16a34a',
  primaryDark: '#14532d',
  primaryLight: '#15803d',
  accent: '#10b981',
  bg: '#f7f8f9',
  bgDeep: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#ffffff',
  border: '#e5e7eb',
  inputBg: '#ffffff',
  inputBorder: '#d1d5db',
  text: '#111827',
  textMuted: '#4b5563',
  textFaint: '#9ca3af',
  placeholder: '#9ca3af',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
  success: '#16a34a',
  onPrimary: '#ffffff',
  white: '#ffffff',
  black: '#000000',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
};

export const PALETTES = { dark, light };

// Static dark palette — used by not-yet-migrated screens.
export const COLORS = { ...dark };

export default COLORS;
