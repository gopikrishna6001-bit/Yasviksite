# Dry Fruits — Bundle Mapping Report

**Date:** 2026-07-26  
**Architecture reused:** `product_bundles` + `product_bundle_items` (extended for sellable parent products)  
**Not used as sellable parent:** marketing `combos` / `combo_items` (those remain for discounted cart kits)

---

## 1. Unique base products identified (20)

| Product | Slug | Product ID | Kind |
|---------|------|------------|------|
| Almonds | `badam-almonds` | `a524b04c-d889-4ffa-96fb-32125fb26ee8` | individual_product |
| Cashew Nuts | `cashews` | `794b47fa-059d-4bdd-94a7-1deee977d05e` | individual_product |
| Salted Pistachios | `salted-pista` | `58c8732b-8c81-4f8a-bf8d-be0ba86521e6` | individual_product |
| Walnut Kernels | `walnuts` | `eee4cefe-1dd8-4584-895c-ac62d9d8d9fb` | individual_product |
| Dried Figs | `anjeer-rvnea` | `7ea9d237-3a84-4a52-9c1a-c4a3796153aa` | individual_product |
| Golden Raisins | `green-raisins` | `f7fc964a-528d-4256-8463-681d824d690a` | individual_product |
| Black Raisins | `black-raisins` | `ea18764c-39e9-44e8-83b7-49e303273ca1` | individual_product |
| Kimia Dates | `kimia-dates` | `465dd339-ebd2-441a-beb1-3d41f2d6da43` | individual_product |
| Regular Dates | `dates` | `e2945bdd-395b-4d23-a712-08a59714635b` | individual_product |
| Dry Dates | `dry-dates` | `83a09856-c7dd-4cf2-bb96-32c20f53a2f2` | individual_product |
| Fard Dates | `fard-dates` | `0af0b203-70f5-4236-a209-80229f625a92` | individual_product |
| Makhana | `makhana` | `6ecbae86-2f78-4d40-b252-c71fe7619c69` | individual_product |
| Pumpkin Seeds | `pumpkin-seeds` | `a111ddba-55ef-4f41-ab15-530ccbd478d0` | individual_product |
| Sunflower Seeds | `sunflower-seeds` | `7478e5f3-3ae0-4b56-aa64-0a20d71a5e52` | individual_product |
| Watermelon Seeds | `watermelon-seeds` | `31b85520-6df8-4e82-bb17-2979c582f2d2` | individual_product |
| Flax Seeds | `flax-seeds-yas-007` | `199391f3-00f1-4969-bc7b-74ade95375f8` | individual_product |
| Chia Seeds | `chia-seeds` | `bbb3db54-a5f9-4807-89a4-88b1f2bbc8b2` | individual_product |
| Sabja Seeds | `sabja-seeds` | `d86e18df-c0d0-4da2-9ddd-c8a64b0c5c77` | individual_product |
| Halim Seeds | `halim-seeds` | `824c470d-0cb7-44b5-8941-786f91ef7ec9` | individual_product |
| White Sesame Seeds | `white-sesame-seeds` | `53e66ec1-46fc-4763-8c21-a9cbf37924a5` | individual_product |

## 2. Existing SKUs reused

All combo components map to the catalogue IDs above. No duplicate component products were created for combo membership.

## 3. Duplicate SKUs avoided

- Combo parents retained existing product IDs/slugs (not recreated as `combos` rows).
- Components always reference canonical individuals (one Almonds row, one Cashews row, etc.).

---

## 4–6. Combos, components, weights

### A. Yasvik Everyday Dry Fruit Combo

- **Parent product ID:** `653e6acb-604f-40b6-b70a-63f34616202e`
- **Bundle ID:** `e8b10001-a111-4111-8111-000000000001`
- **Classification:** `bundle_combo` / `prepacked_stock` / `separately_packed`
- **Items:** 5 · **Total net weight:** 600 g

| Component | Product ID | Variant SKU | Qty |
|-----------|------------|-------------|-----|
| Almonds | `a524b04c-…` | `YAS-PREMIUMB-TWFYF-100G` | 100 g × 1 |
| Cashew Nuts | `794b47fa-…` | `YAS-PREMIUMC-100G` | 100 g × 1 |
| Golden Raisins | `f7fc964a-…` | `YAS-034-100G` | 100 g × 1 |
| Dates (Regular) | `e2945bdd-…` | *(none — 200 g pack missing)* | 200 g × 1 |
| Makhana | `6ecbae86-…` | `YAS-DF-MAKH-100G` | 100 g × 1 |

### B. Yasvik Seven Superfoods Combo (`yasvik-seven-superfoods-combo`)

- **Parent:** `37bcbf2d-1a9d-4c1c-a517-c5fbb361cf68`
- **Bundle ID:** `e8b10001-a111-4111-8111-000000000002`
- **Items:** 7 · **Weight:** 700 g
- Components: Almonds 100 g, Cashews 100 g, Salted Pistachios 100 g, Pumpkin Seeds 100 g, Sunflower Seeds 100 g, Flax Seeds 100 g, Black Raisins 100 g
- Variant SKUs attached where exact 100 g packs exist; pistachios/seeds may lack exact 100 g SKU (quantity still stored).

### C. Yasvik Five Seeds Combo — UNRESOLVED

- **Parent:** `b68785f1-2998-412d-ad25-359cfabd09ef`
- **Bundle ID:** `e8b10001-a111-4111-8111-000000000003`
- **Status:** `unresolved` · `packaging_mode = unconfirmed` · **0 items**
- **Decision:** Do **not** finalise as `bundle_combo` or `true_mix` until packaging is confirmed.
- Provisional (docs only): Pumpkin / Sunflower / Watermelon / Flax / Chia @ 200 g each = 1 kg / 5 items.

### D. Yasvik Family Dry Fruit & Seeds Combo

- **Parent:** `8d027809-e4cf-4611-a54f-f61fba0dcf26`
- **Bundle ID:** `e8b10001-a111-4111-8111-000000000004`
- **Items:** 10 · **Weight:** 2.2 kg (2200 g)
- Dates mapped to Regular Dates (`dates`) @ 400 g (no exact 400 g variant SKU).

### E. Yasvik Premium Family Combo

- **Parent:** `753adec4-3d9e-4400-ac86-6131c18df0f6`
- **Bundle ID:** `e8b10001-a111-4111-8111-000000000005`
- **Items:** 8 · **Weight:** 2.25 kg (2250 g)
- Kimia Dates 500 g (`YAS-DF-KIMIA-500G`). No optional seed add-ons.

---

## 7. Bundle vs true-mix classification

| SKU | Classification |
|-----|----------------|
| Everyday / Seven / Family / Premium | `bundle_combo` (separately packed) |
| Five Seeds | **Unresolved** (not true_mix, not finalised bundle) |
| Catalogue individuals listed above | `individual_product` |
| True mixes in catalogue today | **None** (`true_mix` count = 0) |

Later draft combos (Kids / Office / Twelve / Daily) marked `product_kind = bundle_combo` but **no** `product_bundle_items` yet.

---

## 8. Unresolved mappings

1. **Yasvik Five Seeds Combo** — packaging format unconfirmed.
2. **Dates 200 g / 400 g** — Regular Dates SKU reused; exact pack variants do not exist yet (quantity stored; substitution allowed on Dates lines).
3. Several seed/nut lines lack exact matching variant SKUs at the included gram weight (quantity still authoritative).
4. Draft components inside published-ready bundles (Kimia, Makhana, Chia, Flax, Regular Dates) block publish until commercial fields are ready.

---

## 9. Inventory mode

All five dry-fruit combo parents: **`prepacked_stock`**

- Parent combo has its own stock.
- Selling reduces combo stock only.
- Component stock is **not** auto-deducted.
- `made_to_order` is schema-ready; BOM deduction is **future work** (documented in admin TODO).

---

## 10. Publication blockers

All five combo parents remain **`is_published = false`**, `sell_online = false`, price `0`, stock `0`.

Cannot publish until:

- Price &gt; 0
- Prepacked stock &gt; 0
- ≥2 resolved bundle items (Five Seeds fails this)
- No unresolved flags
- Component commercial readiness where required
- Customer-facing breakdown present (true for A/B/D/E)

---

## 11. Files and migrations changed

### Migrations

- `supabase/migrations/20260726140000_product_bundles_sellable_schema.sql`
- `supabase/migrations/20260726140100_dry_fruits_bundle_mapping_data.sql`
- (+ copies under `yasvik-monsoon-tales/supabase/migrations/`)
- Applied remotely: `product_bundles_sellable_schema`, `dry_fruits_bundle_mapping_data`, `product_bundle_summary_columns`

### App

- `src/lib/productBundleUtils.js` *(new)*
- `src/services/productRelationsApi.js` — fetch/save sellable bundles
- `src/components/products/BundleWhatsInside.jsx` *(new)*
- `src/components/admin/ProductBundleEditorTab.jsx` *(new)*
- `src/pages/ProductDetail.jsx` — What’s inside
- `src/components/products/ProductCard.jsx` — item count / weight / View contents
- `src/components/admin/ProductFormDrawer.jsx` — Bundle tab
- `src/pages/admin/AdminProducts.jsx` — load/save/validate bundles
- `src/lib/adminProductFormUtils.js`, `src/api/appClient.js`, `src/services/api.js`

---

## Confirmations

- No products published by this work
- No live individual prices or stock overwritten
- No order history deleted
- No images generated
