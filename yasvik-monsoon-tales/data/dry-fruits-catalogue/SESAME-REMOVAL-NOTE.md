# Sesame duplicate removal — migration note

**Date:** 2026-07-26  
**Migrations:** `20260726130000_dry_fruits_launch_readiness_schema.sql`, `20260726130100_dry_fruits_launch_readiness_data.sql`

## What changed

| Item | Action |
|------|--------|
| `native-sesame-seeds` | Soft-archived (not hard-deleted) |
| `white-sesame-seeds` | Retained as canonical edible-seeds SKU |

### Soft-archive of `native-sesame-seeds`

- Product id `12ad6e99-93de-442e-adaa-e4c1a7cd53ea` kept for order/stock FK integrity.
- `is_published = false`, `sell_online = false`, `indexable = false` (removed from shop, search, and SEO index).
- Slug renamed to `native-sesame-seeds-archived-20260726` so the public slug is free.
- Live price and stock on this row were **not** overwritten.
- **0** `order_items` referenced this product at migration time; no order rewrite required.

### Alias / SEO continuity

- Inserted `product_slug_aliases`: `native-sesame-seeds` → `white-sesame-seeds` (`53e66ec1-46fc-4763-8c21-a9cbf37924a5`).
- Storefront `getBySlugOrId` and Cloudflare product SEO middleware resolve this alias when the canonical product is published.
- While `white-sesame-seeds` remains a draft, the old URL does not surface a live PDP (avoids publishing by accident).
- SEO keywords on `white-sesame-seeds` enriched with “native sesame seeds / nuvvulu” for future search continuity.
- Stale Meta catalog feed rows for `/product/native-sesame-seeds` removed from `public/catalog/meta-feed.csv`.

### Bundle / combo references

- No `combo_items` rows referenced the native sesame product id.
- Packaged dry-fruit combos use independent `prepacked_stock` inventory (not BOM component lists), so no component slug remapping was required.

## What was not done

- Hard delete of the native row (would break RESTRICT FKs if history appears later).
- Publishing `white-sesame-seeds`.
- Changing live prices or stock on any other product.
