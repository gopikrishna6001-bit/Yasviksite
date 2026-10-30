# Yasvik — Database Feature Map (Admin-related)

**Date:** 2026-08-02 · Live project `cpksnpuavywbmhrzglyh` row counts via Supabase MCP  
**Status key:** ACTIVE / LEGACY / DUPLICATE / ORPHANED / UNKNOWN / MISSING

---

## Core commerce

| Table | Rows | Purpose | Code refs | Safe status |
|---|---:|---|---|---|
| products | 208 | Catalogue spine; prices in quick_variants JSON | appClient, worker, shop, POS | ACTIVE |
| product_images | 231 | Gallery | attachProductImages | ACTIVE |
| product_variants | 551 | PIM shadow variants | catalogue stabilize | DUPLICATE (not shop SoT) |
| categories | 43 | Aisles / subs | AdminCategories, shop | ACTIVE |
| category_slug_aliases | 20 | SEO redirects | categories | ACTIVE |
| product_slug_aliases | 3 | Legacy product URLs | shop routes | ACTIVE |
| orders | 67 | All sales | worker, AdminOrders | ACTIVE |
| order_items | 301 | Line items | worker | ACTIVE |
| order_status_events | 68 | Status timeline | Orders UI | ACTIVE |
| stock_movements | 297 | Inventory ledger | Inventory, worker | ACTIVE |
| warehouses | 1 | Default warehouse on orders | worker | ACTIVE |
| coupons | 1 | Discount codes | AdminCoupons, worker | ACTIVE |
| coupon_redemptions | 0 | Redemption log | worker | ACTIVE |
| customers | 22 | CRM | AdminCustomers, worker | ACTIVE |
| delivery_zones | 18 | Pincode fees | Settings/Delivery | ACTIVE |
| notification_log | 36 | Notify attempts | worker | ACTIVE |

## Pricing / packaging

| Table | Rows | Purpose | Status |
|---|---:|---|---|
| app_settings | 83 | Site + pricing_strategy_defaults + editorial flags | ACTIVE |
| packaging_materials | 2 | BOM materials | ACTIVE |
| packaging_profiles | 3 | BOM profiles | ACTIVE |
| packaging_profile_components | 0 | BOM lines | ACTIVE (empty) |
| product_variant_packaging | 17 | Variant→profile map | ACTIVE |

## Combos / merchandising

| Table | Rows | Purpose | Status |
|---|---:|---|---|
| combos | 10 | Legacy combo headers | DUPLICATE / LEGACY |
| combo_items | 33 | Legacy combo products | DUPLICATE / LEGACY |
| product_bundles | 12 | Newer bundles | ACTIVE |
| product_bundle_items | 131 | Bundle products | ACTIVE |
| combo_option_groups | 1 | Combo V2 options | ACTIVE / partial |
| combo_option_choices | 2 | Choices | ACTIVE / partial |
| combo_option_choice_items | 10 | Choice items | ACTIVE / partial |
| combo_gift_rules | 0 | Gift rules | UNKNOWN / unused |
| product_related | 0 | Cross-sell links | ACTIVE (empty) |
| merchandising_collections | 3 | Review collections | ACTIVE (admin-only) |
| merchandising_collection_items | 6 | Collection items | ACTIVE |
| merchandising_audit_runs | 2 | Audit runs | ACTIVE |
| merchandising_product_proposals | 208 | Non-live decisions | ACTIVE |
| popular_product_sales_cache | 100 | Popularity cache | ACTIVE |
| editorial_campaigns | 4 | Editorial home campaigns | ACTIVE (flag) |
| storefront_stories | 7 | Vertical stories | ACTIVE (flag) |

## Content / brand

| Table | Rows | Purpose | Status |
|---|---:|---|---|
| stories | 4 | Long-form articles | ACTIVE |
| story_comments | 0 | Comments | LEGACY empty |
| journeys | 2 | Trace journeys | ACTIVE |
| people | 2 | Producers | ACTIVE |
| regions | 1 | Legacy region | LEGACY (UI redirected) |
| recipes | 31 | Recipes | ACTIVE / low admin |
| homepage_sections | 9 | Old homepage CMS | LEGACY (UI→settings) |
| page_heroes | 3 | Old heroes | LEGACY |
| collections | 0 | Old collections | ORPHANED |
| collection_items | 0 | — | ORPHANED |
| page_settings | 1 | Hamburger menu | ACTIVE |
| media_assets | 218 | R2 index | ACTIVE |
| reviews | 0 | Product reviews | EMPTY |
| addresses | 1 | User addresses | ACTIVE sparse |

## Loyalty / CRM campaigns

| Table | Rows | Status |
|---|---:|---|
| bonus_category_rates | 18 | ACTIVE |
| bonus_product_rules | 0 | ACTIVE empty |
| bonus_campaigns | 0 | ACTIVE empty |
| customer_bonus_ledger | 16 | ACTIVE |
| customer_bonus_consumptions | 3 | ACTIVE |
| customer_segments | 0 | ACTIVE empty |
| whatsapp_campaigns | 0 | ACTIVE empty |
| whatsapp_campaign_recipients | 0 | ACTIVE empty |

## Catalogues (PDF + PIM)

| Table | Rows | Status |
|---|---:|---|
| catalogues | 6 | ACTIVE |
| catalogue_templates | 18 | ACTIVE |
| catalogue_generations | 7 | ACTIVE |
| catalogue_versions | 3 | ACTIVE |
| catalogue_exports | 6 | ACTIVE |
| catalogue_import_runs | 1 | ACTIVE |
| catalogue_import_changes | 500 | ACTIVE |

## Auth / staff

| Table | Rows | Status |
|---|---:|---|
| user_profiles | 7 | ACTIVE |
| staff_profiles | 0 | ORPHANED empty |

## Subscriptions (unused)

| Table | Rows | Status |
|---|---:|---|
| subscriptions | 0 | ORPHANED |
| user_subscriptions | 0 | ORPHANED |

## MISSING vs code expectations

| Expected by code/migrations | Live public schema |
|---|---|
| `label_print_jobs` | **MISSING** |
| `label_items` | **MISSING** |
| purchases / suppliers / expenses | **MISSING** |
| warehouse lot / FEFO batches | **MISSING** |

---

## Views / functions / triggers / buckets / jobs

| Kind | Notes |
|---|---|
| RLS | Enabled on listed tables; admin via `is_admin()` / roles migration |
| Worker | Cloudflare `worker.js` — POS, COD, Razorpay finalize, stock, CRM, bonus, media, catalogues |
| Edge functions | Prefer Worker routes over Supabase Edge for commerce |
| Storage | R2 `media-assets` (primary); Supabase storage legacy paths still rewritten |
| Cron | Popular sales cache / SEO controls exist in migrations — verify schedules in dashboard separately |
| Triggers | Product/category updated_at patterns; bonus/CRM RPCs in SQL migrations |

---

## Duplicate clusters

1. `combos*` vs `product_bundles*`  
2. `quick_variants` JSON vs `product_variants` table  
3. `stories` vs `storefront_stories`  
4. `homepage_sections` / `page_heroes` vs Settings + Illustrations + Editorial  
5. Packaging BOM vs pricing meta packaging ₹  
