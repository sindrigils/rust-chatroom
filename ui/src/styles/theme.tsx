export const theme = {
  colors: {
    background: "var(--color-background)",
    surface: "var(--color-surface)",
    surfaceElevated: "var(--color-surface-elevated)",
    surfaceHover: "var(--color-surface-hover)",
    border: "var(--color-border)",
    borderFocus: "var(--color-border-focus)",
    focusRing: "var(--color-focus-ring)",
    textPrimary: "var(--color-text-primary)",
    textSecondary: "var(--color-text-secondary)",
    textMuted: "var(--color-text-muted)",
    accent: "var(--color-accent)",
    accentHover: "var(--color-accent-hover)",
    accentPressed: "var(--color-accent-pressed)",
    success: "var(--color-success)",
    error: "var(--color-error)",
    warning: "var(--color-warning)",
  },

  gradients: {
    accent: "var(--gradient-accent)",
    surface: "var(--gradient-surface)",
  },

  effects: {
    glassOverlay: "var(--glass-overlay)",
    glassStroke: "var(--glass-stroke)",
  },

  typography: {
    fontFamilyPrimary: "var(--font-family-primary)",
    fontFamilyMono: "var(--font-family-mono)",
    fontSize: {
      xs: "var(--font-size-xs)",
      sm: "var(--font-size-sm)",
      base: "var(--font-size-base)",
      lg: "var(--font-size-lg)",
      xl: "var(--font-size-xl)",
      "2xl": "var(--font-size-2xl)",
      "3xl": "var(--font-size-3xl)",
      "4xl": "var(--font-size-4xl)",
    },
    fontWeight: {
      normal: "var(--font-weight-normal)",
      medium: "var(--font-weight-medium)",
      semibold: "var(--font-weight-semibold)",
      bold: "var(--font-weight-bold)",
    },
    lineHeight: {
      tight: "var(--line-height-tight)",
      normal: "var(--line-height-normal)",
      relaxed: "var(--line-height-relaxed)",
    },
  },

  spacing: {
    1: "var(--space-1)",
    2: "var(--space-2)",
    3: "var(--space-3)",
    4: "var(--space-4)",
    5: "var(--space-5)",
    6: "var(--space-6)",
    8: "var(--space-8)",
    10: "var(--space-10)",
    12: "var(--space-12)",
    16: "var(--space-16)",
    20: "var(--space-20)",
    24: "var(--space-24)",
  },

  borderRadius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
  },

  boxShadow: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    xl: "var(--shadow-xl)",
  },

  transition: {
    fast: "var(--transition-fast)",
    normal: "var(--transition-normal)",
    slow: "var(--transition-slow)",
  },

  zIndex: {
    dropdown: "var(--z-dropdown)",
    sticky: "var(--z-sticky)",
    fixed: "var(--z-fixed)",
    modalBackdrop: "var(--z-modal-backdrop)",
    modal: "var(--z-modal)",
    popover: "var(--z-popover)",
    tooltip: "var(--z-tooltip)",
  },
} as const;

export type Theme = typeof theme;
