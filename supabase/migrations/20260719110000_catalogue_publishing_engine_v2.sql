-- Catalogue Publishing Engine v2: design templates + curated presets.
-- Replaces earlier MVP template seeds with the full template pack.

-- Allow festival/gifting design aliases already covered by CHECK on design_template.
-- Existing CHECK: editorial, compact, price_list, premium_lookbook, dealer_table, gifting

INSERT INTO public.catalogue_templates (key, name, catalogue_type, description, design_template, default_options, is_system, sort_order)
VALUES
(
  'classic-catalogue',
  'Classic Catalogue',
  'customer',
  'Premium grocery catalogue with large cards, MRP, savings, category heroes and page chrome.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true,
      "telugu_name": true,
      "short_description": true,
      "badges": true,
      "variant_prices": true,
      "mrp": true,
      "savings": true,
      "qr_code": true,
      "stock_status": true,
      "category_hero": true,
      "page_chrome": true
    },
    "selection": { "mode": "all_eligible", "in_stock_only": false }
  }'::jsonb,
  true,
  10
),
(
  'whatsapp-compact',
  'WhatsApp Compact',
  'whatsapp',
  'Mobile-first pages customers happily forward in family groups.',
  'compact',
  '{
    "design": "whatsapp_compact",
    "format": "mobile_whatsapp",
    "price_mode": "mrp_and_selling",
    "products_per_page": 6,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": false,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true,
      "telugu_name": true,
      "short_description": false,
      "badges": true,
      "variant_prices": true,
      "mrp": true,
      "savings": true,
      "qr_code": true,
      "stock_status": false,
      "category_hero": true,
      "page_chrome": true
    },
    "selection": { "mode": "hero_categories", "in_stock_only": true }
  }'::jsonb,
  true,
  20
),
(
  'premium-magazine',
  'Premium Magazine',
  'lookbook',
  'Low-density editorial lookbook with large photography.',
  'premium_lookbook',
  '{
    "design": "premium_magazine",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 2,
    "sort": "admin_priority",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true,
      "telugu_name": true,
      "short_description": true,
      "badges": true,
      "variant_prices": true,
      "mrp": true,
      "savings": true,
      "qr_code": true,
      "stock_status": false,
      "category_hero": true,
      "page_chrome": true
    },
    "selection": { "mode": "featured", "in_stock_only": false }
  }'::jsonb,
  true,
  30
),
(
  'dealer-price-list',
  'Dealer Price List',
  'dealer',
  'Compact B2B price list. Gated until dealer pricing is configured.',
  'dealer_table',
  '{
    "design": "dealer_price_list",
    "format": "dealer_pdf",
    "price_mode": "dealer",
    "products_per_page": 14,
    "sort": "category_order",
    "dealer_mode": true,
    "dealer_pricing_configured": false,
    "include_cover": true,
    "include_intro": false,
    "include_category_heroes": false,
    "include_final": true,
    "content": {
      "product_image": false,
      "telugu_name": false,
      "short_description": false,
      "badges": false,
      "variant_prices": true,
      "mrp": false,
      "savings": false,
      "qr_code": false,
      "stock_status": false,
      "category_hero": false,
      "page_chrome": true
    },
    "selection": { "mode": "all_eligible", "require_dealer_flag": true, "in_stock_only": false }
  }'::jsonb,
  true,
  40
),
(
  'festival-specials',
  'Festival Specials',
  'customer',
  'Seasonal merchandising with featured badges and hero products.',
  'gifting',
  '{
    "design": "festival_specials",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true,
      "telugu_name": true,
      "short_description": true,
      "badges": true,
      "variant_prices": true,
      "mrp": true,
      "savings": true,
      "qr_code": true,
      "stock_status": true,
      "category_hero": true,
      "page_chrome": true
    },
    "selection": { "mode": "featured", "in_stock_only": false }
  }'::jsonb,
  true,
  50
),
-- Curated selection presets (same engine, different selection)
(
  'yasvik-complete-customer',
  'Complete Catalogue',
  'customer',
  'All public catalogue products, grouped by category.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "all_eligible", "in_stock_only": false }
  }'::jsonb,
  true,
  100
),
(
  'yasvik-snacks',
  'Snacks Catalogue',
  'customer',
  'Homemade snacks and traditional sweets.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "selected_categories", "category_slugs": ["snacks"], "in_stock_only": false }
  }'::jsonb,
  true,
  110
),
(
  'yasvik-pickles',
  'Pickles Catalogue',
  'customer',
  'Homemade pickles.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "selected_categories", "category_slugs": ["pickles"], "in_stock_only": false }
  }'::jsonb,
  true,
  120
),
(
  'yasvik-cold-pressed-oils',
  'Cold Pressed Oils Catalogue',
  'customer',
  'Cold pressed oils.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "selected_categories", "category_slugs": ["cold-pressed-oils"], "in_stock_only": false }
  }'::jsonb,
  true,
  130
),
(
  'yasvik-rice',
  'Rice Catalogue',
  'customer',
  'Heritage rice.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "selected_categories", "category_slugs": ["heritage-rice"], "in_stock_only": false }
  }'::jsonb,
  true,
  140
),
(
  'yasvik-millets',
  'Millets Catalogue',
  'customer',
  'Millets and millet foods.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "selected_categories", "category_slugs": ["millets"], "in_stock_only": false }
  }'::jsonb,
  true,
  150
),
(
  'yasvik-organic',
  'Organic Catalogue',
  'customer',
  'Organic-flagged products across categories.',
  'premium_lookbook',
  '{
    "design": "premium_magazine",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 2,
    "sort": "admin_priority",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": false,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "organic", "in_stock_only": false }
  }'::jsonb,
  true,
  160
),
(
  'yasvik-dry-fruits',
  'Dry Fruits Catalogue',
  'customer',
  'Dry fruits, nuts and seeds.',
  'editorial',
  '{
    "design": "classic",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "selected_categories", "category_slugs": ["dry-fruits"], "in_stock_only": false }
  }'::jsonb,
  true,
  170
),
(
  'yasvik-dealer',
  'Dealer Catalogue',
  'dealer',
  'B2B dealer price list. Requires dealer pricing configuration.',
  'dealer_table',
  '{
    "design": "dealer_price_list",
    "format": "dealer_pdf",
    "price_mode": "dealer",
    "products_per_page": 14,
    "sort": "category_order",
    "dealer_mode": true,
    "dealer_pricing_configured": false,
    "include_cover": true,
    "include_intro": false,
    "include_category_heroes": false,
    "include_final": true,
    "content": {
      "product_image": false, "telugu_name": false, "short_description": false, "badges": false,
      "variant_prices": true, "mrp": false, "savings": false, "qr_code": false, "stock_status": false,
      "category_hero": false, "page_chrome": true
    },
    "selection": { "mode": "all_eligible", "require_dealer_flag": true, "in_stock_only": false }
  }'::jsonb,
  true,
  180
),
(
  'yasvik-corporate-gifting',
  'Corporate Gifting Catalogue',
  'gifting',
  'Products suitable for corporate gifting.',
  'premium_lookbook',
  '{
    "design": "premium_magazine",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 2,
    "sort": "admin_priority",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": false,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "gifting", "in_stock_only": false }
  }'::jsonb,
  true,
  190
),
(
  'yasvik-festival',
  'Festival Catalogue',
  'customer',
  'Featured and seasonal festival favourites.',
  'gifting',
  '{
    "design": "festival_specials",
    "format": "a4_portrait",
    "price_mode": "mrp_and_selling",
    "products_per_page": 4,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": true,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": true, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": true,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "featured", "in_stock_only": false }
  }'::jsonb,
  true,
  200
),
(
  'yasvik-whatsapp-compact',
  'WhatsApp Compact Catalogue',
  'whatsapp',
  'Compact mobile-friendly price list for WhatsApp sharing.',
  'compact',
  '{
    "design": "whatsapp_compact",
    "format": "mobile_whatsapp",
    "price_mode": "mrp_and_selling",
    "products_per_page": 6,
    "sort": "bestsellers",
    "include_cover": true,
    "include_intro": false,
    "include_category_heroes": true,
    "include_final": true,
    "content": {
      "product_image": true, "telugu_name": true, "short_description": false, "badges": true,
      "variant_prices": true, "mrp": true, "savings": true, "qr_code": true, "stock_status": false,
      "category_hero": true, "page_chrome": true
    },
    "selection": { "mode": "hero_categories", "in_stock_only": true }
  }'::jsonb,
  true,
  210
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  catalogue_type = EXCLUDED.catalogue_type,
  description = EXCLUDED.description,
  design_template = EXCLUDED.design_template,
  default_options = EXCLUDED.default_options,
  is_system = true,
  is_active = true,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- Retire older MVP-only snack/pickles combined template if present
UPDATE public.catalogue_templates
SET is_active = false, updated_at = now()
WHERE key = 'yasvik-snacks-pickles';
