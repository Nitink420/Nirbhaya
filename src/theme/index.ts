/**
 * Nirbhaya design tokens - dark theme.
 */
export const colors = {
  bg: '#0D0D0F',
  bgElevated: '#141418',
  surface: '#18181D',
  surfaceAlt: '#202027',
  border: '#2A2A33',
  borderSoft: '#1F1F26',

  text: '#F5F5F7',
  textMuted: '#A1A1AA',
  textDim: '#6B6B76',

  sos: '#E11D48',
  sosDeep: '#9F1239',
  sosGlow: 'rgba(225, 29, 72, 0.35)',
  sosSoft: 'rgba(225, 29, 72, 0.12)',

  safe: '#10B981',
  safeDeep: '#047857',
  safeSoft: 'rgba(16, 185, 129, 0.14)',

  warn: '#F59E0B',
  warnDeep: '#B45309',
  warnSoft: 'rgba(245, 158, 11, 0.14)',

  accent: '#A78BFA',
  accentSoft: 'rgba(167, 139, 250, 0.14)',

  callBg: '#0B1220',
  callAccept: '#22C55E',
  callDecline: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const font = {
  // System fonts keep the APK small and work fully offline.
  regular: undefined as string | undefined,
  mono: 'monospace',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
    hero: 40,
  },
} as const;

export const theme = {colors, spacing, radius, font};
export type Theme = typeof theme;
