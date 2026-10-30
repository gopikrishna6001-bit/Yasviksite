/**
 * Yasvik retail theme — customer-facing storefront only (not admin).
 * Shop + Product Detail are the source of truth for type and layout.
 */
import { YASVIK_SERVICE_AREA_LABEL } from '@/lib/storeLocation';
import { YASVIK_BRAND } from '@/brand/yasvikManifesto';

export const RETAIL = {
  colors: {
    canvas: '#FAF7EF',
    paper: '#FFFFFF',
    ink: '#1F3D2B',
    inkMuted: 'rgba(31, 61, 43, 0.65)',
    inkSoft: 'rgba(31, 61, 43, 0.45)',
    border: '#E8E1D5',
    accent: '#1F3D2B',
    accentHover: '#2a5239',
    star: '#c9a227',
    badge: '#34C230',
    badgeBg: 'rgba(52, 194, 48, 0.12)',
  },
  /**
   * Fonts (loaded in index.html):
   * - Display / titles: Cormorant Garamond → Tailwind `font-cormorant`
   * - Body / UI / buttons: DM Sans → Tailwind `font-inter` (legacy class name)
   * Never introduce Syne, Inter, Playfair, or system-ui as page fonts.
   */
  fonts: {
    display: 'Cormorant Garamond',
    body: 'DM Sans',
    displayClass: 'font-cormorant',
    bodyClass: 'font-inter',
  },
  radius: {
    card: '0.75rem',
    pill: '9999px',
  },
  layout: {
    /** Match Shop / PDP content width */
    maxWidth: '1400px',
    pagePad: 'px-4 md:px-8',
    narrowMax: '42rem',
  },
  copy: {
    location: YASVIK_SERVICE_AREA_LABEL,
    trustFooter: YASVIK_BRAND.trustFooter,
    heroHeadline: YASVIK_BRAND.heroHeadline.replace(/\n/g, ' '),
    heroSub: YASVIK_BRAND.heroSub,
    tagline: YASVIK_BRAND.tagline,
  },
};

export const RETAIL_TRUST_ITEMS = YASVIK_BRAND.trustItems;

/**
 * Tailwind class bundles — use these on every customer page.
 * Prefer these over one-off font-light / rain-cloud / arbitrary hex.
 */
export const retailClasses = {
  page: 'min-h-screen bg-warm-cream pb-24 text-deep-forest',
  container: 'mx-auto max-w-[1400px] px-4 md:px-8',
  containerNarrow: 'mx-auto max-w-3xl px-4 md:px-8',
  card: 'rounded-xl border border-soft-border bg-white',
  /** Page H1 — shop/PDP weight */
  titlePage: 'font-cormorant text-3xl font-semibold leading-tight tracking-[-0.01em] text-deep-forest md:text-4xl',
  titleLg: 'font-cormorant text-2xl font-semibold leading-tight text-deep-forest md:text-3xl',
  titleMd: 'font-cormorant text-xl font-semibold text-deep-forest',
  titleSm: 'font-cormorant text-lg font-semibold text-deep-forest',
  body: 'font-inter text-sm leading-6 text-deep-forest/70',
  bodyLg: 'font-inter text-base leading-7 text-deep-forest/70',
  label: 'font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-deep-forest/50',
  price: 'font-inter text-2xl font-bold text-deep-forest md:text-3xl',
  btnPrimary:
    'inline-flex items-center justify-center rounded-full bg-deep-forest px-5 py-2.5 font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-warm-cream transition-colors hover:bg-neon-paddy active:scale-[0.98] disabled:opacity-50',
  btnOutline:
    'inline-flex items-center justify-center rounded-full border border-deep-forest bg-white px-5 py-2.5 font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-deep-forest transition-colors hover:bg-warm-cream active:scale-[0.98]',
  btnAdd:
    'rounded-md bg-deep-forest px-4 py-1.5 font-inter text-[10px] font-bold uppercase tracking-wide text-warm-cream disabled:opacity-50',
};
