# Dry Fruits, Nuts & Seeds — implementation deliverables

Generated: 2026-07-26

## 1. Products created (draft / unpublished / sell_online=false)

Individual:
- dried-kiwi
- kimia-dates
- dates
- makhana
- chia-seeds
- sabja-seeds
- halim-seeds
- white-sesame-seeds (review vs native-sesame-seeds)
- roasted-cashews
- five-seed-mix
- everyday-seed-mix (recipe pending)
- roasted-seed-mix (seasoning pending)

Combos (packaged SKUs, own stock — not BOM-linked):
- yasvik-everyday-dry-fruit-combo
- yasvik-seven-superfoods-combo
- yasvik-twelve-superfoods-combo
- yasvik-daily-nutrition-combo
- yasvik-family-dry-fruit-seeds-combo
- yasvik-premium-family-combo
- yasvik-five-seeds-combo
- yasvik-kids-snack-combo
- yasvik-office-snack-combo

## 2. Existing products updated (prices / stock / publish kept)

- badam-almonds → Almonds (Nuts)
- cashews → Cashew Nuts
- salted-pista → Pistachios – Salted
- walnuts → Walnut Kernels
- anjeer-rvnea → Dried Figs (fixed wrong pista copy/local_name/SEO; cleared wrong hero URL)
- green-raisins → Golden Raisins (slug kept)
- black-raisins
- dry-dates, fard-dates → Dates subcategory
- pumpkin-seeds, sunflower-seeds, watermelon-seeds, flax-seeds-yas-007
- cashews-fried-masala-b5nzo → Masala Cashews (Flavoured)
- cashews-pieces-ax2o7, cashews-split-avag5, salted-pista-premium-bjn3c

## 3. Skipped duplicates

- almonds / cashew-nuts / salted-pistachios / walnut-kernels / dried-figs-anjeer / golden-raisins / plain-cashews / new masala-cashews — mapped to existing SKUs
- Inventory-linked AdminCombos BOM — not supported by checkout; used packaged combo products instead

## 4. Migrations

- `supabase/migrations/20260726120000_dry_fruits_product_compliance_fields.sql`
- `supabase/migrations/20260726120100_dry_fruits_catalogue_data.sql`

## 5. Files modified / added

- `src/lib/categorySeo.js` — collection intro/SEO/FAQs
- `src/api/appClient.js` — ingredients, allergen_info, subject_to_availability allowlist
- `src/lib/adminProductFormUtils.js` — editor fields
- `src/components/admin/ProductFormDrawer.jsx` — Story tab fields
- `src/pages/ProductDetail.jsx` — ingredients + availability badge; hide supplier name on PDP
- `scripts/generate_dry_fruits_catalogue.mjs`
- `data/dry-fruits-catalogue/*` — SQL, image manifest CSV/JSON, report

## 6. Admin pricing calculator

**Already exists** at Admin → Pricing Strategy (`AdminPricingStrategy.jsx` + `pricingStrategy.js`): purchase rate, packaging, margins, pack suggestions, MRP charm. No separate calculator added. Draft products need cost entry there before publish.

## 7. Bundle inventory behaviour

Combos are **packaged products with their own stock**. Checkout does **not** auto-deduct component SKUs. Contents are listed on the product description. Mark unavailable by setting combo stock to 0 (or unpublish) until packaging workflow is ready.

## 8. Still requiring supplier cost

All newly created drafts + combos (price=0). Several live items already have purchase_rate_per_kg; black-raisins / dry-dates / green-raisins / flax may still need cost refresh in Pricing Strategy.

## 9. Ingredients / compliance confirmation

- dried-kiwi (added sugar?)
- roasted-cashews (oil / process)
- masala-cashews (exact seasoning)
- five-seed-mix / everyday-seed-mix / roasted-seed-mix (proportions / seasoning)
- white-sesame-seeds vs native-sesame-seeds duplicate review

## 10. Image manifest

- `data/dry-fruits-catalogue/image-generation-manifest.json`
- `data/dry-fruits-catalogue/image-generation-manifest.csv`
- 116 image briefs (hero / pouch / texture + combo + banners)

## 11. Publish confirmation

All newly inserted products: `is_published = false` AND `sell_online = false`.

## 12. Assumptions / unresolved

- Parent aisle reused: `/shop/dry-fruits` (no parallel parent).
- Subcategory chips on Shop already filter children.
- Anjeer hero was wrongly pointing at salted-pista asset — cleared; needs new photos.
- Gift Boxes subcategory created empty for later packaging.
- “Seven Superfoods” / “Twelve Superfoods” naming softened to avoid unsupported superfood claims in titles where practical; SEO still conversion-oriented without medicinal claims.
- Supplier brand name never written into customer copy.
- Frontend deploy needed for SEO/intro/PDP badge/admin fields; DB data already live for admin product list.
