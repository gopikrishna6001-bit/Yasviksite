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
  'Conscious Food',
  'Responsible Sourcing',
  'Honest Quality',
];

/** Single source of truth — hero, Our Roots, Stories pillars, and brand voice */
export const YASVIK_CORE_VALUES = [
  {
    id: 'conscious-food',
    title: 'Conscious Food',
    narrativeFrame: 'what',
    narrativeLead: 'What is the problem?',
    storySlug: 'conscious-food',
    heroLine: 'Everyday choices for modern Indian homes.',
    body: 'The problem is not choosing food — it is choosing the right food. Everyday grains, flours, millets, pulses, and oils shape your health more than anything else, but the right options are hard to find, expensive, or hard to trust.',
    icon: 'leaf',
  },
  {
    id: 'responsible-sourcing',
    title: 'Responsible Sourcing',
    narrativeFrame: 'where',
    narrativeLead: 'Where is the solution?',
    storySlug: 'responsible-sourcing',
    heroLine: 'We go to the source — and verify it.',
    body: 'Good food still exists — with farmers and producers who stick to their values. But their produce often never reaches you: middlemen, weak farm-to-customer links, and missing infrastructure keep it local, small, and invisible.',
    icon: 'map',
  },
  {
    id: 'honest-quality',
    title: 'Honest Quality',
    narrativeFrame: 'why',
    narrativeLead: 'Why Yasvik exists',
    storySlug: 'honest-quality',
    heroLine: 'Clear information. No shortcuts.',
    body: 'Yasvik finds those producers, sources from them, verifies origin and methods, and brings honest food to modern Indian homes — with traceability, consistency, and accountability, not vague marketing claims.',
    icon: 'shield',
  },
];

export const CORE_VALUE_NARRATIVE_FRAMES = {
  what: 'What',
  where: 'Where',
  why: 'Why',
};

export const CORE_VALUE_STORY_SLUGS = YASVIK_CORE_VALUES.map((value) => value.storySlug);

export function getCoreValueByStorySlug(slug = '') {
  const normalized = String(slug || '').trim().toLowerCase();
  return YASVIK_CORE_VALUES.find((value) => value.storySlug === normalized) || null;
}

export function getCoreValueSettingKeys(valueId) {
  const key = String(valueId || '').replace(/-/g, '_');
  return {
    storyId: `core_value_${key}_story_id`,
  };
}

/** Service proof points — complementary to core values, not a repeat of them */
export const TRUST_POINTS = [
  { label: 'Quality Checked', icon: 'shield' },
  { label: 'Home Delivery', icon: 'truck' },
  { label: 'Hyderabad Store', icon: 'pin' },
  { label: 'Shop & WhatsApp', icon: 'basket' },
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
  { label: 'Dals & Pulses', keywords: ['dals', 'pulses', 'dal'] },
  { label: 'Flours & Breakfast', keywords: ['flours', 'breakfast', 'ready mixes'] },
  { label: 'Rice, Millets & Grains', keywords: ['rice', 'millets', 'grains'] },
  { label: 'Spices & Pantry', keywords: ['spices', 'masalas', 'pantry'] },
  { label: 'Dry Fruits & Nuts', keywords: ['dry fruits', 'nuts', 'seeds'] },
  { label: 'Oils, Ghee & Honey', keywords: ['oils', 'ghee', 'honey'] },
  { label: 'Snacks & Sweets', keywords: ['snacks', 'sweets'] },
  { label: 'Natural Care', keywords: ['natural care'] },
  { label: 'Pickles & Condiments', keywords: ['pickles', 'condiments'] },
  { label: 'Jaggery & Sweeteners', keywords: ['jaggery', 'sweeteners'] },
];

export const STORE_GEOGRAPHY = {
  city: 'Hyderabad',
  state: 'Telangana',
  /** Customer-facing delivery reach — broad, not colony-limited */
  deliveryReach: 'across Hyderabad and surrounding areas',
};

export const HERO_COPY = {
  eyebrow: 'Natural Foods & Everyday Essentials',
  headline: 'Good Food.\nFair Prices.\nDelivered Home.',
  subheadline:
    'Carefully chosen staples, millets, flours, cold-pressed oils, spices, honey, jaggery, dry fruits and more — delivered home across Hyderabad.',
  primaryCta: 'Shop Essentials',
  secondaryCta: 'Browse Categories',
  brandChips: [],
};

/** Split hero headline into clean lines (supports `\n` or sentence breaks). */
export function heroHeadlineLines(headline) {
  const raw = String(headline || '').trim();
  if (!raw) return [];
  if (raw.includes('\n')) {
    return raw.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  const sentences = raw.match(/[^.]+\./g);
  if (sentences && sentences.length >= 2) {
    return sentences.map((line) => line.trim()).filter(Boolean);
  }
  const dotBreak = raw.indexOf('. ');
  if (dotBreak > 0) {
    const first = raw.slice(0, dotBreak + 1);
    const second = raw.slice(dotBreak + 2).trim();
    if (second) return [first, second];
  }
  return [raw];
}

/** Tighten legacy hero body copy stored in admin settings. */
export function normalizeHeroSubheadline(text) {
  return String(text || HERO_COPY.subheadline).replace(
    /makers,\s*and trusted origins/g,
    'makers and trusted origins',
  );
}

export const STORY_COPY =
  'We choose foods that make sense for everyday Indian homes — staples, millets, oils, spices, and essentials that are useful, thoughtfully sourced, and quality checked.';

export function getCategoryImageUrl(category = {}) {
  return category.cover_image || '';
}

export function matchCategoryId(categories = [], config) {
  const haystack = categories.map((cat) => ({
    id: cat.id,
    name: String(cat.name || cat.emotional_title || '').toLowerCase(),
    cover_image: getCategoryImageUrl(cat),
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

