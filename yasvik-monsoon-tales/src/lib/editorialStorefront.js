import { supabase } from '@/api/supabaseClient';
import { getSellableProductVariants } from '@/lib/variantBulkSavings';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';

import { YASVIK_BRAND } from '@/brand/yasvikManifesto';

export const EDITORIAL_COPY = {
  /** Master line — brand statement under campaign */
  principle: YASVIK_BRAND.principle,
  tagline: YASVIK_BRAND.tagline,
  headline: YASVIK_BRAND.principle,
  support: YASVIK_BRAND.support,
  packagingProof: 'Chosen with care. Packed honestly.',
  /** Actionable strip only — not rotating brand claims */
  trustStrip: [
    'Hyderabad delivery',
    'Secure payments',
    'Carefully packed',
    'Customer reviewed',
  ],
  ticker: [
    'Hyderabad delivery available',
    'Store pickup',
    'WhatsApp ordering',
  ],
};

/** Compact category rail — sales-led priority, not full catalogue. */
export const EDITORIAL_CATEGORY_RAIL = [
  { label: 'Snacks & Sweets', slug: 'snacks' },
  { label: 'Pickles & Podis', slug: 'pickles' },
  { label: 'Oils, Ghee & Honey', slug: 'cold-pressed-oils' },
  { label: 'Dry Fruits & Seeds', slug: 'dry-fruits' },
  { label: 'Rice & Staples', slug: 'heritage-rice' },
  { label: 'Jaggery', slug: 'jaggery' },
  { label: 'Organic & Millet Foods', slug: 'millets' },
];

/** Hard cap — campaign carousel never shows more than three slides. */
export const EDITORIAL_CAMPAIGN_MAX = 3;

/**
 * Campaign definitions. Slides only render when media + copy pass isCampaignLaunchReady.
 * Prefer at most three active campaigns on the homepage.
 */
export const EDITORIAL_CAMPAIGNS = [
  {
    id: 'foods-worth-bringing-home',
    theme: 'Foods worth bringing home',
    headline: 'Foods worth bringing home.',
    ctaLabel: 'Shop Favourites',
    ctaHref: '/shop',
    collectionSlug: 'from-seed-to-oil',
    desktopMediaUrl: '',
    mobileMediaUrl: '',
    posterImageUrl: '',
    textSafePosition: 'bottom-left',
    posterTone: 'from-[#2a3d2e] to-[#5c4a32]',
  },
  {
    id: 'homemade-andhra-foods',
    theme: 'Homemade Andhra favourites',
    headline: 'The taste of a home kitchen, ready when you are.',
    ctaLabel: 'Explore homemade',
    ctaHref: '/shop/pickles',
    collectionSlug: 'homemade-andhra-kitchen',
    desktopMediaUrl: '',
    mobileMediaUrl: '',
    posterImageUrl: '',
    textSafePosition: 'bottom-left',
    posterTone: 'from-[#4a2f24] to-[#8a5a3a]',
  },
  {
    id: 'dry-fruit-seed-combinations',
    theme: 'Dry-fruit and seed combinations',
    headline: 'Better everyday baskets, honestly put together.',
    ctaLabel: 'Explore combos',
    ctaHref: '/shop/dry-fruits',
    collectionSlug: 'heritage-and-natural-everyday-foods',
    desktopMediaUrl: '',
    mobileMediaUrl: '',
    posterImageUrl: '',
    textSafePosition: 'bottom-left',
    posterTone: 'from-[#5a3d1e] to-[#a67c2e]',
  },
];

function hasMediaUrl(value) {
  return Boolean(String(value || '').trim());
}

/** Launch-ready = owner-approved media + headline + CTA. Gradient-only slides stay hidden. */
export function isCampaignLaunchReady(campaign) {
  if (!campaign) return false;
  const approval = String(campaign.mediaApprovalStatus || campaign.media_approval_status || 'pending').toLowerCase();
  if (approval !== 'approved') return false;
  const hasApprovedMedia =
    hasMediaUrl(campaign.posterImageUrl)
    || hasMediaUrl(campaign.desktopMediaUrl)
    || hasMediaUrl(campaign.mobileMediaUrl);
  const hasCopy =
    hasMediaUrl(campaign.headline)
    && hasMediaUrl(campaign.ctaLabel)
    && hasMediaUrl(campaign.ctaHref);
  return hasApprovedMedia && hasCopy;
}

export function getLaunchReadyCampaigns(campaigns = EDITORIAL_CAMPAIGNS) {
  return (campaigns || []).filter(isCampaignLaunchReady).slice(0, EDITORIAL_CAMPAIGN_MAX);
}

/** Bestsellers only when they add products beyond curated Favourites. */
export function filterDistinctBestsellers(bestsellers = [], favourites = [], { minDistinct = 3 } = {}) {
  const favouriteIds = new Set((favourites || []).map((p) => p?.id).filter(Boolean));
  const distinct = (bestsellers || []).filter((p) => p?.id && !favouriteIds.has(p.id));
  if (distinct.length < minDistinct) return [];
  return distinct;
}

export function formatPackSizeLabel(label) {
  const raw = String(label || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^(\d+(?:\.\d+)?)\s*ml$/i, '$1 ml')
    .replace(/^(\d+(?:\.\d+)?)\s*l$/i, '$1 L')
    .replace(/^(\d+(?:\.\d+)?)\s*kg$/i, '$1 kg')
    .replace(/^(\d+(?:\.\d+)?)\s*g$/i, '$1 g');
}

/** Public / published Stories need poster (or video) + core copy. Product pack shots are enough. */
export function isStorefrontStoryPublishReady(story) {
  if (!story) return false;
  const hasMedia = Boolean(
    String(story.poster_image_url || '').trim()
    || String(story.video_url || '').trim(),
  );
  return Boolean(
    String(story.title || '').trim()
    && String(story.short_hook || '').trim()
    && String(story.captions || '').trim()
    && hasMedia
    && String(story.cta_label || '').trim()
    && String(story.cta_destination || '').trim()
    && Number.isFinite(Number(story.display_priority)),
  );
}

/** Collection shells — product membership still loaded from DB when RLS allows. */
export const STORY_WORLD_FALLBACKS = [
  {
    id: 'fallback-from-seed-to-oil',
    slug: 'from-seed-to-oil',
    title: 'From Seed to Oil',
    description: 'Cold-pressed oils followed from seed to bottle — aroma, process and everyday cooking.',
    cover_image_url: 'https://media.yasvik.com/media-assets/products/yasvik-asset-4.webp',
    display_priority: 10,
    is_active: true,
  },
  {
    id: 'fallback-homemade-andhra-kitchen',
    slug: 'homemade-andhra-kitchen',
    title: 'Homemade Andhra Kitchen',
    description: 'Pickles, powders and snacks with the taste of a home kitchen — ready when you are.',
    cover_image_url: 'https://media.yasvik.com/media-assets/products/yasvik-asset-9.webp',
    display_priority: 20,
    is_active: true,
  },
  {
    id: 'fallback-heritage-and-natural-everyday-foods',
    slug: 'heritage-and-natural-everyday-foods',
    title: 'Heritage and Natural Everyday Foods',
    description: 'Heritage grains, jaggery, honey and pantry foods chosen for taste and everyday usefulness.',
    cover_image_url: 'https://media.yasvik.com/media-assets/products/yasvik-organic-kattuyanam-rice-hero.webp',
    display_priority: 30,
    is_active: true,
  },
];

/** Draft Story shells for preview when admin RLS blocks anonymous reads. */
export const STOREFRONT_STORY_DRAFT_FALLBACKS = [
  {
    id: 'draft-why-yasvik-goes-looking',
    title: 'Why Yasvik Goes Looking',
    slug: 'why-yasvik-goes-looking',
    short_hook: 'We go looking for foods worth bringing home.',
    poster_image_url: null,
    captions: 'We Look. We Ask. We Taste. We Choose.',
    duration_seconds: 35,
    cta_label: 'Shop Yasvik Favourites',
    cta_destination: '/shop',
    display_priority: 10,
    show_on_homepage: true,
    status: 'draft',
    video_url: null,
  },
  {
    id: 'draft-following-groundnut-oil',
    title: 'Following Groundnut Oil Back to the Seed',
    slug: 'following-groundnut-oil-back-to-the-seed',
    short_hook: 'Before it is oil, it is seed.',
    poster_image_url: 'https://media.yasvik.com/media-assets/products/chatgpt-image-jun-27_-2026_-02_35_32-pm-mqw4xhgp.webp',
    captions: 'Cold pressed for aroma you can cook with.',
    duration_seconds: 40,
    related_product_id: '486919f8-f0e7-4911-8b8c-8471e6a6d795',
    cta_label: 'Shop Groundnut Oil',
    cta_destination: '/product/cold-pressed-groundnut-oil',
    display_priority: 20,
    show_on_homepage: true,
    status: 'draft',
    video_url: null,
  },
  {
    id: 'draft-inside-avakaya',
    title: 'Inside an Avakaya Batch',
    slug: 'inside-an-avakaya-batch',
    short_hook: 'Avakaya is a batch, not a factory flavour.',
    poster_image_url: 'https://media.yasvik.com/media-assets/products/yasvik-asset-9.webp',
    captions: 'Home-style mango pickle — made to keep.',
    duration_seconds: 40,
    related_product_id: '4c4396d8-c1e4-4359-90fb-778105fd2c3f',
    cta_label: 'Shop Avakaya',
    cta_destination: '/product/mango-pickle-avakaya',
    display_priority: 30,
    show_on_homepage: true,
    status: 'draft',
    video_url: null,
  },
  {
    id: 'draft-sesame-oil',
    title: 'Sesame Oil for Pickles, Podis and Traditional Cooking',
    slug: 'sesame-oil-for-pickles-podis-and-traditional-cooking',
    short_hook: 'Sesame oil is not only for finishing.',
    poster_image_url: 'https://media.yasvik.com/media-assets/products/yasvik-asset-4.webp',
    captions: 'Cold-pressed white sesame for pickles, podis and traditional cooking.',
    duration_seconds: 40,
    related_product_id: '2f47f4cf-2002-4e8a-89ed-0400fc91a618',
    cta_label: 'Shop Sesame Oil',
    cta_destination: '/product/cold-pressed-sesame-oil',
    display_priority: 40,
    show_on_homepage: true,
    status: 'draft',
    video_url: null,
  },
  {
    id: 'draft-kattuyanam',
    title: 'Cooking Kattuyanam for the First Time',
    slug: 'cooking-kattuyanam-for-the-first-time',
    short_hook: 'Heritage rice needs a little patience.',
    poster_image_url: 'https://media.yasvik.com/media-assets/products/yasvik-organic-kattuyanam-rice-hero.webp',
    captions: 'Organic Kattuyanam — cook it once, you will understand the grain.',
    duration_seconds: 40,
    related_product_id: '9153896a-27dd-47b9-a1a1-e608a8ef870a',
    cta_label: 'Shop Kattuyanam',
    cta_destination: '/product/organic-kattuyanam-rice',
    display_priority: 50,
    show_on_homepage: true,
    status: 'draft',
    video_url: null,
  },
  {
    id: 'draft-jaggery',
    title: 'Why Jaggery Does Not Always Look Identical',
    slug: 'why-jaggery-does-not-always-look-identical',
    short_hook: 'Real jaggery is not factory-identical.',
    poster_image_url: 'https://media.yasvik.com/media-assets/products/yasvik-yureka-jaggery-powder-hero.webp',
    captions: 'Colour can shift. The sugarcane story stays.',
    duration_seconds: 35,
    related_product_id: '9bd19447-45d6-4c37-be1a-9849030365d0',
    cta_label: 'Shop Jaggery Powder',
    cta_destination: '/product/yureka-jaggery-powder',
    display_priority: 60,
    show_on_homepage: true,
    status: 'draft',
    video_url: null,
  },
];

const COLLECTION_PRODUCT_SLUGS = {
  'from-seed-to-oil': ['cold-pressed-groundnut-oil', 'cold-pressed-sesame-oil'],
  'homemade-andhra-kitchen': ['mango-pickle-avakaya'],
  'heritage-and-natural-everyday-foods': [
    'yureka-jaggery-powder',
    'multi-floral-honey',
    'organic-kattuyanam-rice',
  ],
};

const PRODUCT_SELECT = `
  id, name, slug, price, discount_price, featured_image_url,
  is_published, sell_online, stock_quantity, shared_stock_kg, stock_measure_type,
  merchandising_tier, merchandising_priority, short_description,
  quick_variants, category_id, subject_to_availability
`.replace(/\s+/g, ' ').trim();

function productHasSharedOrUnitStock(product) {
  const shared = Number(product?.shared_stock_kg);
  if (Number.isFinite(shared) && shared > 0) return true;
  const qty = Number(product?.stock_quantity);
  if (Number.isFinite(qty) && qty > 0) return true;
  const visible = Number(
    product?.quick_variants?.find((v) => Number(v?.visible_stock_units) > 0)?.visible_stock_units,
  );
  if (Number.isFinite(visible) && visible > 0) return true;
  return false;
}

function normalizeVariantStock(variant, product) {
  const raw = variant?.stock;
  if (raw === '' || raw == null) {
    return productHasSharedOrUnitStock(product) || true;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return true;
  if (n > 0) return true;
  // Bulk / shared inventory often keeps pack stock at 0 while source kg remains sellable.
  const sourceKg = Number(variant?.stock_source_kg);
  if (Number.isFinite(sourceKg) && sourceKg > 0) return true;
  const visibleUnits = Number(variant?.visible_stock_units);
  if (Number.isFinite(visibleUnits) && visibleUnits > 0) return true;
  return productHasSharedOrUnitStock(product);
}

export function getHeroPriceSummary(product) {
  const variants = getSellableProductVariants(product).filter((v) => {
    const price = Number(v?.price);
    return Number.isFinite(price) && price > 0 && normalizeVariantStock(v, product);
  });
  if (!variants.length) {
    const fallback = Number(product?.price) || 0;
    return {
      fromPrice: fallback,
      displayPrice: fallback,
      hasMultiplePrices: false,
      inStock: fallback > 0,
      variants: [],
      startingVariant: null,
      packLabel: '',
      priceLine: fallback > 0 ? `₹${Math.round(fallback)}` : '',
    };
  }
  const sorted = [...variants].sort((a, b) => Number(a.price) - Number(b.price));
  const startingVariant = sorted[0];
  const min = Number(startingVariant.price);
  const max = Number(sorted[sorted.length - 1].price);
  const hasMultiplePrices = min !== max;
  const packLabel = formatPackSizeLabel(startingVariant.label);
  const pricePart = hasMultiplePrices ? `From ₹${Math.round(min)}` : `₹${Math.round(min)}`;
  const priceLine = packLabel ? `${pricePart} · ${packLabel}` : pricePart;
  return {
    fromPrice: min,
    displayPrice: min,
    hasMultiplePrices,
    inStock: true,
    variants: sorted,
    startingVariant,
    packLabel,
    priceLine,
  };
}

export function isHeroPurchasable(product) {
  if (!product?.is_published || product?.sell_online === false) return false;
  const summary = getHeroPriceSummary(product);
  return summary.inStock && summary.displayPrice > 0;
}

export async function fetchEditorialHeroProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('merchandising_tier', 'hero')
    .eq('is_published', true)
    .eq('sell_online', true)
    .order('merchandising_priority', { ascending: true });
  if (error) throw error;

  const rows = (data || []).filter(Boolean);
  const inStock = [];
  const outOfStock = [];
  for (const product of rows) {
    const enriched = {
      ...product,
      title: product.title || product.name,
      featured_image_url: productPrimaryImageUrl(product) || product.featured_image_url,
    };
    if (isHeroPurchasable(enriched)) inStock.push(enriched);
    else outOfStock.push(enriched);
  }
  return [...inStock, ...outOfStock.slice(0, 1)];
}

function attachMembershipsFromHeroes(collections, heroes) {
  const bySlug = Object.fromEntries((heroes || []).map((p) => [p.slug, p]));
  return collections.map((collection) => {
    const slugs = COLLECTION_PRODUCT_SLUGS[collection.slug] || [];
    const memberships = slugs
      .map((slug) => bySlug[slug])
      .filter(Boolean)
      .map((product, index) => ({
        collection_id: collection.id,
        product_id: product.id,
        role: 'hero',
        display_priority: (index + 1) * 10,
        product,
      }));
    return {
      ...collection,
      cover_image_url:
        collection.cover_image_url
        || collection.poster_image_url
        || memberships[0]?.product?.featured_image_url
        || '',
      memberships,
      productCount: memberships.length,
    };
  });
}

export async function fetchEditorialStoryWorlds() {
  const heroes = await fetchEditorialHeroProducts();
  const { data: collections, error } = await supabase
    .from('merchandising_collections')
    .select('id, slug, title, description, cover_image_url, poster_image_url, display_priority, is_active')
    .eq('is_active', true)
    .eq('collection_type', 'story_world')
    .order('display_priority', { ascending: true });

  if (!error && collections?.length) {
    const ids = collections.map((c) => c.id);
    const { data: items } = await supabase
      .from('merchandising_collection_items')
      .select('collection_id, product_id, role, display_priority')
      .in('collection_id', ids)
      .order('display_priority', { ascending: true });

    if (items?.length) {
      const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
      const { data: products } = await supabase
        .from('products')
        .select('id, name, slug, featured_image_url, is_published, sell_online, merchandising_tier')
        .in('id', productIds);
      const productsById = Object.fromEntries((products || []).map((p) => [p.id, p]));
      return collections.map((collection) => {
        const memberships = items
          .filter((i) => i.collection_id === collection.id)
          .map((i) => ({ ...i, product: productsById[i.product_id] || null }))
          .filter((i) => i.product?.is_published && i.product?.sell_online !== false);
        return {
          ...collection,
          cover_image_url: collection.cover_image_url || collection.poster_image_url || memberships[0]?.product?.featured_image_url || '',
          memberships,
          productCount: memberships.length,
        };
      });
    }

    return attachMembershipsFromHeroes(collections, heroes);
  }

  return attachMembershipsFromHeroes(STORY_WORLD_FALLBACKS, heroes);
}

export async function fetchStorefrontStories({ includeDrafts = false, homepageOnly = true } = {}) {
  let query = supabase
    .from('storefront_stories')
    .select('*')
    .order('display_priority', { ascending: true });

  if (includeDrafts) {
    query = query.in('status', ['draft', 'published']);
  } else {
    query = query.eq('status', 'published');
  }
  if (homepageOnly) {
    query = query.eq('show_on_homepage', true);
  }

  const { data, error } = await query;
  if (!error && data?.length) {
    if (includeDrafts) return data;
    return data.filter(isStorefrontStoryPublishReady);
  }

  if (includeDrafts) {
    return STOREFRONT_STORY_DRAFT_FALLBACKS.filter((s) => !homepageOnly || s.show_on_homepage);
  }
  return [];
}

export async function fetchEditorialCampaigns({ activeOnly = true } = {}) {
  try {
    let query = supabase
      .from('editorial_campaigns')
      .select('*')
      .order('display_priority', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (!error && data?.length) {
      return data.map((row) => ({
        id: row.id,
        slug: row.slug,
        theme: row.title,
        title: row.title,
        headline: row.headline || '',
        supportingCopy: row.supporting_copy || '',
        desktopMediaUrl: row.desktop_media_url || '',
        mobileMediaUrl: row.mobile_media_url || '',
        posterImageUrl: row.poster_image_url || '',
        mediaType: row.media_type || 'image',
        ctaLabel: row.cta_label || '',
        ctaHref: row.cta_destination || '',
        textSafePosition: row.text_safe_position || 'bottom-left',
        collectionSlug: row.collection_slug || '',
        posterTone: row.poster_tone || '',
        displayPriority: Number(row.display_priority) || 100,
        isActive: row.is_active !== false,
      }));
    }
  } catch {
    // RLS / network — try settings mirror below
  }

  // Public-safe mirror written by admin CMS (avoids has_admin_role RLS evaluation issues for anon)
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'editorial_campaigns_json')
      .maybeSingle();
    const raw = data?.setting_value;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length) {
      const mapped = parsed.map((row) => ({
        id: row.id || row.slug,
        slug: row.slug,
        theme: row.title || row.theme,
        title: row.title || row.theme,
        headline: row.headline || '',
        supportingCopy: row.supportingCopy || row.supporting_copy || '',
        desktopMediaUrl: row.desktopMediaUrl || row.desktop_media_url || '',
        mobileMediaUrl: row.mobileMediaUrl || row.mobile_media_url || '',
        posterImageUrl: row.posterImageUrl || row.poster_image_url || '',
        mediaType: row.mediaType || row.media_type || 'image',
        ctaLabel: row.ctaLabel || row.cta_label || '',
        ctaHref: row.ctaHref || row.cta_destination || '',
        textSafePosition: row.textSafePosition || row.text_safe_position || 'bottom-left',
        collectionSlug: row.collectionSlug || row.collection_slug || '',
        posterTone: row.posterTone || row.poster_tone || '',
        displayPriority: Number(row.displayPriority ?? row.display_priority) || 100,
        isActive: row.isActive !== false && row.is_active !== false,
      }));
      return activeOnly ? mapped.filter((c) => c.isActive) : mapped;
    }
  } catch {
    // ignore
  }

  return EDITORIAL_CAMPAIGNS.map((c) => ({
    ...c,
    isActive: true,
    supportingCopy: '',
    mediaType: 'image',
    displayPriority: 100,
  }));
}

export async function fetchLaunchReadyEditorialCampaigns() {
  const all = await fetchEditorialCampaigns({ activeOnly: true });
  return getLaunchReadyCampaigns(all);
}

export async function isEditorialStorefrontPublicEnabled() {
  const { data } = await supabase
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'editorial_storefront_public')
    .maybeSingle();
  const raw = String(data?.setting_value ?? 'false').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export { isPricingMetaVariant };
