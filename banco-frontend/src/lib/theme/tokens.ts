/**
 * BancoDDD Premium Design System - Branding Tokens
 * 
 * Enterprise-grade design tokens inspired by:
 * - BBVA
 * - Bancolombia
 * - Nubank
 * - JPMorgan
 * - Santander Digital
 */

// ── Color Palette ───────────────────────────────────────────────────────────────

export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#E8F4FD',
    100: '#D1E9FC',
    200: '#A6D4F9',
    300: '#6BB8F5',
    400: '#3F9CF1',
    500: '#1A80ED', // Primary brand color
    600: '#0F66D0',
    700: '#0A4FA8',
    800: '#083D82',
    900: '#063269',
    950: '#04244A',
  },

  // Secondary Brand Colors
  secondary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9', // Secondary brand color
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },

  // Accent Colors
  accent: {
    gold: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FBBF24',
      500: '#F59E0B', // Gold accent
      600: '#D97706',
      700: '#B45309',
      800: '#92400E',
      900: '#78350F',
    },
    emerald: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981', // Success green
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },
    rose: {
      50: '#FFF1F2',
      100: '#FFE4E6',
      200: '#FECDD3',
      300: '#FDA4AF',
      400: '#FB7185',
      500: '#F43F5E', // Error red
      600: '#E11D48',
      700: '#BE123C',
      800: '#9F1239',
      900: '#881337',
    },
  },

  // Neutral Colors
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  // Dark Mode Colors
  dark: {
    background: '#0A0A0A',
    surface: '#171717',
    surfaceElevated: '#262626',
    border: '#404040',
    text: '#FAFAFA',
    textSecondary: '#A3A3A3',
  },

  // Light Mode Colors
  light: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceElevated: '#FFFFFF',
    border: '#E5E5E5',
    text: '#171717',
    textSecondary: '#525252',
  },
};

// ── Financial Gradients ─────────────────────────────────────────────────────────

export const gradients = {
  primary: {
    default: 'linear-gradient(135deg, #1A80ED 0%, #0EA5E9 100%)',
    subtle: 'linear-gradient(135deg, #3F9CF1 0%, #38BDF8 100%)',
    dark: 'linear-gradient(135deg, #0F66D0 0%, #0284C7 100%)',
  },
  gold: {
    default: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
    subtle: 'linear-gradient(135deg, #FCD34D 0%, #FDE68A 100%)',
  },
  success: {
    default: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  },
  danger: {
    default: 'linear-gradient(135deg, #F43F5E 0%, #FB7185 100%)',
  },
  glass: {
    light: 'rgba(255, 255, 255, 0.1)',
    medium: 'rgba(255, 255, 255, 0.15)',
    dark: 'rgba(255, 255, 255, 0.2)',
  },
  glassDark: {
    light: 'rgba(0, 0, 0, 0.1)',
    medium: 'rgba(0, 0, 0, 0.15)',
    dark: 'rgba(0, 0, 0, 0.2)',
  },
  mesh: {
    primary: 'radial-gradient(circle at 50% 50%, rgba(26, 128, 237, 0.1) 0%, transparent 50%)',
    gold: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)',
    success: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)',
  },
};

// ── Typography ───────────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
    mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
    '5xl': '3rem',    // 48px
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
};

// ── Spacing ──────────────────────────────────────────────────────────────────────

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  32: '8rem',     // 128px
};

// ── Border Radius ───────────────────────────────────────────────────────────────

export const borderRadius = {
  none: '0',
  sm: '0.25rem',   // 4px
  base: '0.375rem', // 6px
  md: '0.5rem',    // 8px
  lg: '0.75rem',   // 12px
  xl: '1rem',      // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
};

// ── Shadows (Premium Depth System) ───────────────────────────────────────────────────

export const shadows = {
  // Subtle shadows
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  
  // Medium shadows
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  
  // Large shadows
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  
  // Extra large shadows
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  
  // Premium shadows with color
  primary: '0 4px 20px rgba(26, 128, 237, 0.15)',
  gold: '0 4px 20px rgba(245, 158, 11, 0.15)',
  success: '0 4px 20px rgba(16, 185, 129, 0.15)',
  danger: '0 4px 20px rgba(244, 63, 94, 0.15)',
  
  // Glassmorphism shadows
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  glassLight: '0 8px 32px 0 rgba(255, 255, 255, 0.07)',
  
  // Inner shadows
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  innerLight: 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.06)',
};

// ── Glassmorphism ──────────────────────────────────────────────────────────────────

export const glassmorphism = {
  light: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  },
  dark: {
    background: 'rgba(26, 26, 26, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    shadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
  },
  premium: {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    shadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
  },
};

// ── Animation Durations ─────────────────────────────────────────────────────────────

export const animation = {
  duration: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms',
  },
  easing: {
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
};

// ── Transitions ─────────────────────────────────────────────────────────────────

export const transitions = {
  default: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  fast: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'all 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
};

// ── Z-Index Scale ────────────────────────────────────────────────────────────────

export const zIndex = {
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  notification: 80,
  max: 9999,
};

// ── Breakpoints ─────────────────────────────────────────────────────────────────

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
};

// ── Component Specific Tokens ───────────────────────────────────────────────────────

export const components = {
  // Sidebar
  sidebar: {
    width: '280px',
    collapsedWidth: '80px',
    background: colors.dark.background,
    border: colors.dark.border,
  },
  
  // Card
  card: {
    background: colors.dark.surface,
    border: colors.dark.border,
    borderRadius: borderRadius.lg,
    padding: spacing[6],
    shadow: shadows.lg,
  },
  
  // Button
  button: {
    primary: {
      background: gradients.primary.default,
      hover: gradients.primary.dark,
      shadow: shadows.primary,
    },
    secondary: {
      background: 'transparent',
      border: colors.primary[500],
      hover: colors.primary[50],
    },
    ghost: {
      background: 'transparent',
      hover: colors.dark.surfaceElevated,
    },
  },
  
  // Input
  input: {
    background: colors.dark.surface,
    border: colors.dark.border,
    focus: colors.primary[500],
    error: colors.accent.rose[500],
  },
  
  // Table
  table: {
    header: {
      background: colors.dark.surfaceElevated,
      text: colors.dark.textSecondary,
    },
    row: {
      hover: colors.dark.surfaceElevated,
      border: colors.dark.border,
    },
  },
  
  // Chart
  chart: {
    primary: colors.primary[500],
    secondary: colors.secondary[500],
    accent: colors.accent.gold[500],
    grid: colors.dark.border,
    text: colors.dark.textSecondary,
  },
};

// ── Accessibility Tokens ─────────────────────────────────────────────────────────

export const accessibility = {
  focusRing: {
    width: '2px',
    offset: '2px',
    color: colors.primary[500],
    radius: borderRadius.base,
  },
  minimumTouchTarget: '44px',
  reducedMotion: 'prefers-reduced-motion',
};

// ── Export All Tokens ─────────────────────────────────────────────────────────────

export const themeTokens = {
  colors,
  gradients,
  typography,
  spacing,
  borderRadius,
  shadows,
  glassmorphism,
  animation,
  transitions,
  zIndex,
  breakpoints,
  components,
  accessibility,
};
