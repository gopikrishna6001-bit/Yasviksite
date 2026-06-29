/** Brand assets served from Cloudflare Pages — zero Supabase egress. */
export const BRAND_LOGO_HORIZONTAL = '/media/brand/logo-horizontal.png';
export const BRAND_LOGO_SYMBOL = '/media/brand/logo-symbol.png';

/** Legacy Supabase object paths → local static files (15 MB PNG → ~80 KB). */
export const LEGACY_SUPABASE_BRAND_REWRITES = {
  'media-assets/1781516610532-xylu0hqz5a.png': BRAND_LOGO_HORIZONTAL,
  'media-assets/1781518040543-6c7i3giwirb.png': BRAND_LOGO_SYMBOL,
};
