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

export const HOMEPAGE_CATEGORIES = [
  { label: 'Millets & Millet Foods', keywords: ['millet'] },
  { label: 'Pulses & Staples', keywords: ['pulse', 'staple', 'dal'] },
  { label: 'Heritage Rice', keywords: ['rice', 'heritage rice'] },
  { label: 'Cold-Pressed Oils', keywords: ['oil', 'cold-pressed', 'wood-pressed'] },
  { label: 'Honey, Ghee & Jaggery', keywords: ['honey', 'ghee', 'jaggery'] },
  { label: 'Spices & Masalas', keywords: ['spice', 'masala'] },
  { label: 'Dry Fruits & Superfoods', keywords: ['dry fruit', 'superfood', 'nut'] },
  { label: 'Healthy Snacks', keywords: ['snack'] },
  { label: 'Pooja Essentials', keywords: ['pooja', 'puja'] },
];

export const HERO_COPY = {
  headline: 'Better Food Choices, Every Day',
  subheadline:
    'Thoughtfully chosen natural foods, staples, millets, oils, spices, and everyday essentials for modern families.',
  primaryCta: 'Shop Now',
  secondaryCta: 'WhatsApp Order',
  deliveryNote: 'Free home delivery above ₹999 within colony and nearby areas.',
};

export const STORY_COPY =
  'We choose foods that make sense for everyday Indian homes — staples, millets, oils, spices, and essentials that are useful, fairly priced, and quality checked.';

export function matchCategoryId(categories = [], config) {
  const haystack = categories.map((cat) => ({
    id: cat.id,
    name: String(cat.name || cat.emotional_title || '').toLowerCase(),
    cover_image: cat.cover_image || cat.image_url || '',
  }));
  for (const keyword of config.keywords) {
    const match = haystack.find((cat) => cat.name.includes(keyword.toLowerCase()));
    if (match) return match;
  }
  return null;
}

export function resolveCategoryLinks(categories = []) {
  return HOMEPAGE_CATEGORIES.map((config) => {
    const match = matchCategoryId(categories, config);
    return {
      ...config,
      categoryId: match?.id || null,
      imageUrl: match?.cover_image || '',
      href: match?.id ? `/shop?category=${match.id}` : '/shop',
    };
  });
}

/** Homepage trust strip labels */
export const TRUST_POINTS = [
  { label: 'Quality Checked', icon: 'shield' },
  { label: 'Fair Prices', icon: 'tag' },
  { label: 'Everyday Essentials', icon: 'basket' },
  { label: 'Local Delivery', icon: 'truck' },
  { label: 'Family-Level Trust', icon: 'heart' },
];
