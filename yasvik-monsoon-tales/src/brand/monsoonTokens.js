/**
 * Yasvik monsoon-natural design tokens
 * Single JS source for colors, typography, spacing, radii, and shadows.
 * Used by components in later phases — not wired to homepage layout yet.
 */

export const MONSOON_COLORS = {
  primaryGreen: '#34C230',
  freshGreen: '#62D75F',
  earthBrown: '#4B2D22',
  deepForest: '#1F3D2B',
  warmCream: '#FAF7EF',
  warmOat: '#F3EDE0',
  softBorder: '#E8E1D5',
  white: '#FFFFFF',
  textPrimary: '#1F3D2B',
  textMuted: '#5C6B58',
  textSoft: '#8A9586',
};

export const MONSOON_TYPOGRAPHY = {
  fontDisplay: 'Cormorant Garamond',
  fontBody: 'DM Sans',
  textXs: '0.75rem',
  textSm: '0.875rem',
  textBase: '1rem',
  textLg: '1.125rem',
  textXl: '1.25rem',
  text2xl: '1.5rem',
  text3xl: '1.875rem',
  text4xl: '2.25rem',
  leadingBody: 1.65,
  leadingHeading: 1.15,
  leadingTight: 1.25,
  trackingEyebrow: '0.18em',
  trackingButton: '0.04em',
  trackingDisplay: '0.02em',
};

export const MONSOON_SPACING = {
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  sectionY: '4rem',
  sectionYMd: '5rem',
  sectionX: '1.25rem',
  sectionXMd: '2rem',
  cardPadding: '1rem',
  cardPaddingMd: '1.25rem',
};

export const MONSOON_RADII = {
  sm: '0.75rem',
  md: '1rem',
  lg: '1.35rem',
  xl: '1.75rem',
  pill: '9999px',
};

export const MONSOON_SHADOWS = {
  card: '0 10px 34px rgba(31, 61, 43, 0.06)',
  cardHover: '0 16px 42px rgba(31, 61, 43, 0.1)',
  button: '0 8px 24px rgba(52, 194, 48, 0.22)',
  buttonHover: '0 12px 32px rgba(52, 194, 48, 0.28)',
  header: '0 1px 0 rgba(31, 61, 43, 0.08)',
};

export const MONSOON_BRAND_VALUES = [
  'Honest Quality',
  'Fair Everyday Pricing',
  'Conscious Food Choices',
  'Rooted Indian Essentials',
  'Family-Level Trust',
];

/** CSS custom property map — mirrors :root in index.css */
export const MONSOON_CSS_VARS = {
  '--ysv-monsoon': MONSOON_COLORS.warmCream,
  '--ysv-paddy': MONSOON_COLORS.primaryGreen,
  '--ysv-fresh': MONSOON_COLORS.freshGreen,
  '--ysv-copper': MONSOON_COLORS.earthBrown,
  '--ysv-silver': MONSOON_COLORS.deepForest,
  '--ysv-forest': MONSOON_COLORS.deepForest,
  '--ysv-color-border': MONSOON_COLORS.softBorder,
  '--ysv-color-alabaster': MONSOON_COLORS.warmCream,
  '--ysv-color-oat': MONSOON_COLORS.warmOat,
  '--ysv-color-rice-paper': MONSOON_COLORS.white,
  '--ysv-color-espresso': MONSOON_COLORS.deepForest,
  '--ysv-color-clay': MONSOON_COLORS.earthBrown,
  '--ysv-color-field': MONSOON_COLORS.primaryGreen,
  '--ysv-color-moss': MONSOON_COLORS.freshGreen,
  '--ysv-color-kraft': MONSOON_COLORS.softBorder,
};

/** Content constants for Phase 2+ components — not used on homepage yet */
export const TRUST_POINTS = [
  { label: 'Quality Checked', icon: 'shield' },
  { label: 'Fair Prices', icon: 'tag' },
  { label: 'Everyday Essentials', icon: 'basket' },
  { label: 'Local Delivery', icon: 'truck' },
  { label: 'Family-Level Trust', icon: 'heart' },
];
