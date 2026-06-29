import { optimizeMediaUrl } from '@/lib/mediaUrl';

export const FOOTER_TRIAL_IMAGE = '/media/footer-home-trial.png';

export const ILLUSTRATION_GROUPS = [
  {
    id: 'home',
    label: 'Homepage',
    description: 'Hero and story atmosphere on the home page.',
    slots: [
      {
        id: 'hero',
        label: 'Hero Section',
        route: '/',
        description: 'Faded farming landscape behind the hero headline and product card.',
        placement: 'Bottom of hero section, full width',
        defaultOpacity: 100,
        legacyUrlKeys: [],
      },
      {
        id: 'story',
        label: 'Story Section',
        route: '/',
        description: 'Field → harvest → home journey line beside the story block.',
        placement: 'Right edge on desktop',
        defaultOpacity: 100,
        legacyUrlKeys: [],
      },
    ],
  },
  {
    id: 'shop',
    label: 'Shop',
    description: 'Atmosphere for the shop and category browsing page.',
    slots: [
      {
        id: 'page_shop',
        label: 'Shop Page',
        route: '/shop',
        description: 'Soft field scene behind product grids and filters.',
        placement: 'Bottom of page, full width',
        defaultOpacity: 70,
        legacyUrlKeys: [],
      },
    ],
  },
  {
    id: 'our-roots',
    label: 'Our Roots',
    description: 'Atmosphere for the philosophy and sourcing story page.',
    slots: [
      {
        id: 'page_our_roots',
        label: 'Our Roots Page',
        route: '/our-roots',
        description: 'Landscape accent behind the roots narrative.',
        placement: 'Bottom of page, full width',
        defaultOpacity: 70,
        legacyUrlKeys: [],
      },
    ],
  },
  {
    id: 'people',
    label: 'Our Farmers',
    description: 'Atmosphere for our farmers page (/farmers).',
    slots: [
      {
        id: 'page_people',
        label: 'Our Farmers Page',
        route: '/farmers',
        description: 'Gentle field scene behind farmer and partner cards.',
        placement: 'Bottom of page, full width',
        defaultOpacity: 70,
        legacyUrlKeys: [],
      },
    ],
  },
  {
    id: 'stories',
    label: 'Stories',
    description: 'Atmosphere for the stories listing page.',
    slots: [
      {
        id: 'page_stories',
        label: 'Stories Page',
        route: '/stories',
        description: 'Faded scene behind editorial story cards.',
        placement: 'Bottom of page, full width',
        defaultOpacity: 70,
        legacyUrlKeys: [],
      },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    description: 'Atmosphere for the contact page.',
    slots: [
      {
        id: 'page_contact',
        label: 'Contact Page',
        route: '/contact',
        description: 'Soft illustration behind contact form and details.',
        placement: 'Bottom of page, full width',
        defaultOpacity: 65,
        legacyUrlKeys: [],
      },
    ],
  },
  {
    id: 'wishlist',
    label: 'Wishlist',
    description: 'Atmosphere for the saved items page.',
    slots: [
      {
        id: 'page_wishlist',
        label: 'Wishlist Page',
        route: '/wishlist',
        description: 'Light field accent behind saved products.',
        placement: 'Bottom of page, full width',
        defaultOpacity: 65,
        legacyUrlKeys: [],
      },
    ],
  },
  {
    id: 'global',
    label: 'Global',
    description: 'Site-wide elements shown on every public page.',
    slots: [
      {
        id: 'footer',
        label: 'Site Footer',
        route: '*',
        description: 'Wide panoramic field scene anchoring the footer.',
        placement: 'Bottom of footer, full width',
        defaultOpacity: 100,
        legacyUrlKeys: ['footer_art_overlay_url', 'footer_background_media_url'],
      },
    ],
  },
];

export const ILLUSTRATION_SLOTS = ILLUSTRATION_GROUPS.flatMap((group) =>
  group.slots.map((slot) => ({ ...slot, groupId: group.id, groupLabel: group.label })),
);

export function findIllustrationSlot(slotId) {
  return ILLUSTRATION_SLOTS.find((slot) => slot.id === slotId) || null;
}

export function safeIllustrationMedia(url = '') {
  const value = String(url || '').trim();
  return value && !/picsum\.photos|source\.unsplash\.com|placehold/i.test(value) ? value : '';
}

export function parseIllustrationBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 1 || value === '1';
}

export function parseIllustrationOpacity(value, fallback = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

/** Bottom fade strength for page header banners (0 = no blur, 100 = full default fade). */
export function parseBottomBlurPercent(value, fallback = 60) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(100, Math.max(0, parsed));
}

export function getIllustrationConfig(settingsMap = {}, slotId) {
  const slot = findIllustrationSlot(slotId);
  if (!slot) {
    return {
      enabled: true,
      mode: 'builtin',
      url: '',
      opacity: 1,
      slot: null,
    };
  }

  const prefix = `illustration_${slot.id}`;
  const enabled = parseIllustrationBool(settingsMap[`${prefix}_enabled`], true);

  let url = safeIllustrationMedia(settingsMap[`${prefix}_url`]);
  if (!url) {
    for (const legacyKey of slot.legacyUrlKeys) {
      url = safeIllustrationMedia(settingsMap[legacyKey]);
      if (url) break;
    }
  }

  let mode = String(settingsMap[`${prefix}_mode`] || 'builtin').toLowerCase() === 'custom' ? 'custom' : 'builtin';

  // Temporary trial artwork — replace via Admin → Illustrations when ready.
  if (slot.id === 'footer' && !url) {
    url = FOOTER_TRIAL_IMAGE;
    mode = 'custom';
  }

  const opacityPercent = parseIllustrationOpacity(settingsMap[`${prefix}_opacity`], slot.defaultOpacity);

  return {
    enabled,
    mode,
    url: url ? optimizeMediaUrl(url, 'banner') : '',
    opacity: opacityPercent / 100,
    opacityPercent,
    slot,
  };
}

export function getIllustrationFieldDefs() {
  return ILLUSTRATION_SLOTS.flatMap((slot) => {
    const prefix = `illustration_${slot.id}`;
    return [
      {
        key: `${prefix}_enabled`,
        slotId: slot.id,
        label: 'Visible',
        type: 'boolean',
        defaultValue: true,
        description: `Show the ${slot.label.toLowerCase()} banner on the public site.`,
      },
      {
        key: `${prefix}_slides`,
        slotId: slot.id,
        label: 'Slides',
        type: 'slides',
        defaultValue: '',
        description: 'JSON array of slide images with focal points.',
      },
      {
        key: `${prefix}_bottom_blur`,
        slotId: slot.id,
        label: 'Bottom fade',
        type: 'number',
        defaultValue: 60,
        description: 'How strongly the banner fades into the page below (0 = none, 100 = full).',
      },
      // Legacy single-url field kept for backward compat
      {
        key: `${prefix}_url`,
        slotId: slot.id,
        label: 'Legacy URL',
        type: 'media',
        defaultValue: '',
        description: 'Single image fallback (legacy).',
      },
    ];
  });
}

export function toPageIllustrationSlot(pageKey = '') {
  const normalized = String(pageKey || '').trim().replace(/^page_/, '');
  return normalized ? `page_${normalized}` : '';
}

// --- Slides / banner helpers ---

/**
 * Parse a JSON slides string into an array of { url, x, y } objects.
 * Falls back to a single-item array from the legacy url field.
 */
export function parseSlides(slidesJson = '', fallbackUrl = '') {
  try {
    const parsed = JSON.parse(slidesJson);
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.filter((s) => s && s.url).map((s) => ({
        url: optimizeMediaUrl(String(s.url), 'banner'),
        x: typeof s.x === 'number' ? Math.min(100, Math.max(0, s.x)) : 50,
        y: typeof s.y === 'number' ? Math.min(100, Math.max(0, s.y)) : 50,
        // Preserve crop rect so admin UI and public display restore it
        ...(s.crop && typeof s.crop === 'object' && s.crop.width > 0 && { crop: s.crop }),
      }));
    }
  } catch (_) { /* fall through */ }

  if (fallbackUrl && !/picsum\.photos|source\.unsplash\.com|placehold/i.test(fallbackUrl)) {
    return [{ url: optimizeMediaUrl(String(fallbackUrl), 'banner'), x: 50, y: 50 }];
  }
  return [];
}

export function serializeSlides(slides = []) {
  return JSON.stringify(slides.filter((s) => s && s.url));
}

/**
 * Get the banner config for a page slot (enabled flag + slides array).
 */
export function getSlidesBannerConfig(settingsMap = {}, slotId) {
  const slot = findIllustrationSlot(slotId);
  if (!slot) return { enabled: false, slides: [] };

  const prefix = `illustration_${slotId}`;
  const enabled = parseIllustrationBool(settingsMap[`${prefix}_enabled`], true);
  if (!enabled) return { enabled: false, slides: [] };

  const slidesJson = String(settingsMap[`${prefix}_slides`] || '');
  const fallbackUrl = safeIllustrationMedia(settingsMap[`${prefix}_url`] || '');
  const slides = parseSlides(slidesJson, fallbackUrl);
  const bottomBlurPercent = parseBottomBlurPercent(settingsMap[`${prefix}_bottom_blur`], 60);

  return { enabled, slides, bottomBlurPercent };
}
