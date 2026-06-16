import { MONSOON_COLORS, MONSOON_RADII, MONSOON_TYPOGRAPHY, MONSOON_BRAND_VALUES } from './monsoonTokens';

export const YASVIK_BRAND_TOKENS = {
  colors: {
    primaryGreen: MONSOON_COLORS.primaryGreen,
    freshGreen: MONSOON_COLORS.freshGreen,
    earthBrown: MONSOON_COLORS.earthBrown,
    deepForest: MONSOON_COLORS.deepForest,
    warmCream: MONSOON_COLORS.warmCream,
    warmOat: MONSOON_COLORS.warmOat,
    softBorder: MONSOON_COLORS.softBorder,
    white: MONSOON_COLORS.white,
    textMuted: MONSOON_COLORS.textMuted,
    textSoft: MONSOON_COLORS.textSoft,
    // Backward-compatible aliases
    alabasterBone: MONSOON_COLORS.warmCream,
    rawOatmeal: MONSOON_COLORS.warmOat,
    ricePaper: MONSOON_COLORS.white,
    deepEspresso: MONSOON_COLORS.deepForest,
    sunDriedClay: MONSOON_COLORS.earthBrown,
    forestSage: MONSOON_COLORS.primaryGreen,
    mossMuted: MONSOON_COLORS.freshGreen,
    kraftPaper: MONSOON_COLORS.softBorder,
  },
  type: {
    display: MONSOON_TYPOGRAPHY.fontDisplay,
    body: MONSOON_TYPOGRAPHY.fontBody,
    headingTracking: MONSOON_TYPOGRAPHY.trackingDisplay,
    utilityTracking: MONSOON_TYPOGRAPHY.trackingEyebrow,
    leadingBody: MONSOON_TYPOGRAPHY.leadingBody,
    leadingHeading: MONSOON_TYPOGRAPHY.leadingHeading,
  },
  radius: {
    pill: MONSOON_RADII.pill,
    card: MONSOON_RADII.lg,
    panel: MONSOON_RADII.xl,
  },
  motion: {
    pageInMs: 450,
    pageOutMs: 250,
    easeOut: [0.22, 1, 0.36, 1],
    easeSpring: [0.175, 0.885, 0.32, 1.275],
  },
  voice: {
    promise: 'Conscious Foods for Modern Living',
    storefront: 'Natural Foods & Everyday Essentials',
    tagline: 'Thoughtfully chosen staples for modern families.',
    values: MONSOON_BRAND_VALUES,
  },
};

export const YASVIK_LOGO_USAGE = {
  headerDesktop: 'horizontal',
  headerMobile: 'horizontal',
  drawerHeader: 'lockup',
  footer: 'tagline',
  heroSeal: 'symbol',
  favicon: 'symbol',
  seoOrganization: 'horizontal',
};

export const YASVIK_HEADER_LAYOUT = {
  announcement: {
    heightDesktopPx: 36,
    heightMobilePx: 34,
  },
  desktop: {
    relaxedHeightPx: 84,
    compactHeightPx: 74,
    navHeightPx: 56,
    logoWidthRelaxedPx: 310,
    logoWidthCompactPx: 286,
    logoScaleMin: 0.9,
    logoScaleMax: 2.0,
  },
  mobile: {
    rowHeightPx: 76,
    logoWidthPx: 230,
  },
};

export const YASVIK_HERO_STANDARDS = {
  headlineTracking: MONSOON_TYPOGRAPHY.trackingDisplay,
  bodyMaxWidthRem: 40,
  desktopAspectHint: '16:9 to 21:9',
  mobileAspectHint: '4:5 to 9:16',
  overlayContrast: 'minimum 4.5:1 against text',
};

export const YASVIK_SURFACE_RULES = {
  publicPages: 'warm cream background with white raised surfaces',
  commerceCards: 'clean white cards, soft border, green CTA, no luxury theatre',
  storytellingPages: 'practical copy, family trust, colony-local context',
  admin: 'plain and reliable, no decorative complexity beyond clear status feedback',
};
