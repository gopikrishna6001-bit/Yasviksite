/**
 * Design template registry + default export options.
 * Selection presets live in DB; visual templates live here.
 */

import { FORMAT_PROFILES } from './formats.js';

export const DESIGN_TEMPLATES = {
  classic: {
    id: 'classic',
    key: 'classic-catalogue',
    label: 'Classic Catalogue',
    design_template: 'editorial',
    description: 'Premium grocery catalogue with large cards, MRP, and category heroes.',
    format: 'a4_portrait',
  },
  whatsapp_compact: {
    id: 'whatsapp_compact',
    key: 'whatsapp-compact',
    label: 'WhatsApp Compact',
    design_template: 'compact',
    description: 'Mobile-first pages customers happily forward in family groups.',
    format: 'mobile_whatsapp',
  },
  premium_magazine: {
    id: 'premium_magazine',
    key: 'premium-magazine',
    label: 'Premium Magazine',
    design_template: 'premium_lookbook',
    description: 'Low-density editorial lookbook with large photography.',
    format: 'a4_portrait',
  },
  dealer_price_list: {
    id: 'dealer_price_list',
    key: 'dealer-price-list',
    label: 'Dealer Price List',
    design_template: 'dealer_table',
    description: 'Compact B2B price list. Gated until dealer pricing is configured.',
    format: 'dealer_pdf',
    dealer: true,
  },
  festival_specials: {
    id: 'festival_specials',
    key: 'festival-specials',
    label: 'Festival Specials',
    design_template: 'gifting',
    description: 'Seasonal merchandising with featured badges and hero products.',
    format: 'a4_portrait',
  },
};

const CUSTOMER_CONTENT = {
  product_image: true,
  telugu_name: true,
  short_description: true,
  badges: true,
  variant_prices: true,
  mrp: true,
  savings: true,
  qr_code: true,
  stock_status: true,
  category_hero: true,
  page_chrome: true,
};

export function defaultCatalogueOptions(type = 'customer', designKey = null) {
  const design = designKey
    || (type === 'whatsapp' ? 'whatsapp_compact'
      : type === 'dealer' ? 'dealer_price_list'
        : type === 'gifting' || type === 'lookbook' ? 'premium_magazine'
          : 'classic');

  const base = {
    design,
    design_template: DESIGN_TEMPLATES[design]?.design_template || 'editorial',
    format: DESIGN_TEMPLATES[design]?.format || 'a4_portrait',
    price_mode: 'mrp_and_selling',
    variant_mode: 'group_under_product',
    products_per_page: FORMAT_PROFILES[DESIGN_TEMPLATES[design]?.format || 'a4_portrait']?.productsPerPage || 4,
    sort: 'bestsellers',
    brand_colour: '#1f2a1e',
    cover_image_url: '',
    include_cover: true,
    include_intro: true,
    include_category_heroes: true,
    include_final: true,
    content: { ...CUSTOMER_CONTENT },
    selection: { mode: 'all_eligible', in_stock_only: false },
    dealer_mode: false,
    dealer_pricing_configured: false,
  };

  if (design === 'whatsapp_compact' || type === 'whatsapp') {
    return {
      ...base,
      design: 'whatsapp_compact',
      design_template: 'compact',
      format: 'mobile_whatsapp',
      products_per_page: 6,
      sort: 'bestsellers',
      include_intro: false,
      include_category_heroes: true,
      content: {
        ...CUSTOMER_CONTENT,
        short_description: false,
        stock_status: false,
      },
      selection: { mode: 'hero_categories', in_stock_only: true },
    };
  }

  if (design === 'premium_magazine') {
    return {
      ...base,
      design: 'premium_magazine',
      design_template: 'premium_lookbook',
      format: 'a4_portrait',
      products_per_page: 2,
      sort: 'admin_priority',
      content: {
        ...CUSTOMER_CONTENT,
        short_description: true,
        stock_status: false,
      },
      selection: { mode: 'featured', in_stock_only: false },
    };
  }

  if (design === 'festival_specials') {
    return {
      ...base,
      design: 'festival_specials',
      design_template: 'gifting',
      format: 'a4_portrait',
      products_per_page: 4,
      sort: 'bestsellers',
      content: {
        ...CUSTOMER_CONTENT,
        short_description: true,
      },
      selection: { mode: 'featured', in_stock_only: false },
    };
  }

  if (design === 'dealer_price_list' || type === 'dealer') {
    return {
      ...base,
      design: 'dealer_price_list',
      design_template: 'dealer_table',
      format: 'dealer_pdf',
      products_per_page: 14,
      price_mode: 'dealer',
      sort: 'category_order',
      include_intro: false,
      include_category_heroes: false,
      dealer_mode: true,
      dealer_pricing_configured: false,
      content: {
        product_image: false,
        telugu_name: false,
        short_description: false,
        badges: false,
        variant_prices: true,
        mrp: false,
        savings: false,
        qr_code: false,
        stock_status: false,
        category_hero: false,
        page_chrome: true,
      },
      selection: {
        mode: 'all_eligible',
        in_stock_only: false,
        require_dealer_flag: true,
      },
    };
  }

  // classic
  return base;
}

export function mergeOptions(type, options = {}) {
  const design = options.design
    || (options.design_template === 'compact' ? 'whatsapp_compact'
      : options.design_template === 'premium_lookbook' ? 'premium_magazine'
        : options.design_template === 'dealer_table' ? 'dealer_price_list'
          : options.design_template === 'gifting' ? 'festival_specials'
            : null);
  const base = defaultCatalogueOptions(type, design);
  return {
    ...base,
    ...options,
    content: { ...base.content, ...(options.content || {}) },
    selection: { ...base.selection, ...(options.selection || {}) },
  };
}

/** Curated catalogue selection presets (DB seed uses these keys). */
export const CATALOGUE_PRESETS = [
  {
    key: 'yasvik-complete-customer',
    name: 'Complete Catalogue',
    catalogue_type: 'customer',
    design: 'classic',
    description: 'All public catalogue products, grouped by category.',
    selection: { mode: 'all_eligible', in_stock_only: false },
  },
  {
    key: 'yasvik-snacks',
    name: 'Snacks Catalogue',
    catalogue_type: 'customer',
    design: 'classic',
    description: 'Homemade snacks and traditional sweets.',
    selection: { mode: 'selected_categories', category_slugs: ['snacks'], in_stock_only: false },
  },
  {
    key: 'yasvik-pickles',
    name: 'Pickles Catalogue',
    catalogue_type: 'customer',
    design: 'classic',
    description: 'Homemade pickles.',
    selection: { mode: 'selected_categories', category_slugs: ['pickles'], in_stock_only: false },
  },
  {
    key: 'yasvik-cold-pressed-oils',
    name: 'Cold Pressed Oils Catalogue',
    catalogue_type: 'customer',
    design: 'classic',
    description: 'Cold pressed oils and pantry oils.',
    selection: { mode: 'selected_categories', category_slugs: ['cold-pressed-oils'], in_stock_only: false },
  },
  {
    key: 'yasvik-rice',
    name: 'Rice Catalogue',
    catalogue_type: 'customer',
    design: 'classic',
    description: 'Heritage rice.',
    selection: { mode: 'selected_categories', category_slugs: ['heritage-rice'], in_stock_only: false },
  },
  {
    key: 'yasvik-millets',
    name: 'Millets Catalogue',
    catalogue_type: 'customer',
    design: 'classic',
    description: 'Millets and millet foods.',
    selection: { mode: 'selected_categories', category_slugs: ['millets'], in_stock_only: false },
  },
  {
    key: 'yasvik-organic',
    name: 'Organic Catalogue',
    catalogue_type: 'customer',
    design: 'premium_magazine',
    description: 'Organic-flagged products across categories.',
    selection: { mode: 'organic', in_stock_only: false },
  },
  {
    key: 'yasvik-dry-fruits',
    name: 'Dry Fruits Catalogue',
    catalogue_type: 'customer',
    design: 'classic',
    description: 'Dry fruits, nuts and seeds.',
    selection: { mode: 'selected_categories', category_slugs: ['dry-fruits'], in_stock_only: false },
  },
  {
    key: 'yasvik-dealer',
    name: 'Dealer Catalogue',
    catalogue_type: 'dealer',
    design: 'dealer_price_list',
    description: 'B2B dealer price list. Requires dealer pricing configuration.',
    selection: { mode: 'all_eligible', require_dealer_flag: true, in_stock_only: false },
  },
  {
    key: 'yasvik-corporate-gifting',
    name: 'Corporate Gifting Catalogue',
    catalogue_type: 'gifting',
    design: 'premium_magazine',
    description: 'Products suitable for corporate gifting.',
    selection: { mode: 'gifting', in_stock_only: false },
  },
  {
    key: 'yasvik-festival',
    name: 'Festival Catalogue',
    catalogue_type: 'customer',
    design: 'festival_specials',
    description: 'Featured and seasonal festival favourites.',
    selection: { mode: 'featured', in_stock_only: false },
  },
  {
    key: 'yasvik-whatsapp-compact',
    name: 'WhatsApp Compact Catalogue',
    catalogue_type: 'whatsapp',
    design: 'whatsapp_compact',
    description: 'Compact mobile-friendly price list for WhatsApp sharing.',
    selection: { mode: 'hero_categories', in_stock_only: true },
  },
];
