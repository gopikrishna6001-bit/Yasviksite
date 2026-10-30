# Yasvik Phase 1 — Operational Consolidation Plan

**Status:** PLAN ONLY — do not implement until owner approval of this document  
**Date:** 2026-08-02  
**Sources:** Forensic audit docs in `docs/YASVIK_ADMIN_*.md` and live schema inspection  
**Objective:** One reliable path: Purchase → cost → price → batch → barcode sale → profit snapshot

**Out of scope for Phase 1:** Editorial homepage, Stories, Journeys, Campaigns, People, WhatsApp, Loyalty redesign, Customers CRM redesign, SEO, Reviews, Retention, Delivery redesign, Expenses, Daily Closing, full admin navigation redesign, migrating shop/POS off `quick_variants`.

---

## 1. Current implementation (baseline)

| Concern | Today |
|---|---|
| Sellable variants | `products.quick_variants` JSONB (shop + POS) |
| Shadow variants | `product_variants` (551 rows) dual-written by Catalogue stabilize — **not** shop/POS SoT |
| Selling price | `quick_variants[].price` + denormalized `products.price` |
| MRP | `quick_variants[].compare_price` + denormalized `products.discount_price` (app alias `compare_price`) |
| Price writers | (1) Pricing Strategy Apply via `buildProductUpdateFromStrategy` (2) Catalogue Simple publish `catalogueSimplePublish.js` |
| Purchase cost | Hidden meta row `__yasvik_pricing__` → `notes.purchase_rate_per_kg` |
| Packaging | Dual: meta `pack_packaging_rs` (feeds shelf formula) **and** `packaging_profiles` BOM (preview only) |
| Sellable stock | Triple: `shared_stock_kg`, `quick_variants[].stock`, `stock_quantity` |
| Finished batches | **Missing** (label “batch” ≠ inventory lot) |
| Label tables | Migration `004_label_print_jobs.sql` exists in repo; **not present in live DB** |
| POS sale cost | Worker copies purchase rate into `orders.items_snapshot.line_cost_paise` (content only, no packaging) |
| Combos | Dual: legacy `combos`/`combo_items` + `product_bundles`/`product_bundle_items` |
| Profit UIs | Planning margins only — not sale-time P&L |

---

## 2. Canonical implementation after Phase 1

### 2.1 Field ownership matrix (exact)

| Business field | Canonical table.column / path | Notes |
|---|---|---|
| Product identity / content | `products.*` (name, slug, description, category_id, seo_*, sell_online, is_published, …) | Unchanged |
| Sellable variant + SKU | `products.quick_variants[]` entry (`label`, `sku`, `pack_kg`, images) | Retain temporarily |
| Approved selling price | `products.quick_variants[].price` | **Only** via `approveVariantPrice()` service |
| Denormalized list price | `products.price` | Written only by same service (default pack) |
| Approved MRP | `products.quick_variants[].compare_price` | Canonical MRP field for Phase 1 |
| Denormalized MRP | `products.discount_price` | Mirror of default pack MRP via same service |
| Purchase history | **NEW** `purchases` (+ optional `suppliers`) | Replaces primary reliance on meta JSON |
| Latest replacement cost | Derived: latest `purchases.effective_cost_per_base_unit` where `status=approved` for product + unit | Cached optionally on product later — not required in first cut |
| Packaging profile | `packaging_profiles` + `packaging_profile_components` + `packaging_materials` | Canonical packaging |
| Variant ↔ profile | `product_variant_packaging` | Map by product_id + variant_sku/label |
| Strategy packaging ₹ map | Meta `pack_packaging_rs` | **Deprecated** after migration into profiles |
| Finished batch stock | **NEW** `inventory_batches.qty_remaining` | Canonical sellable units |
| Batch unit cost / printed MRP | `inventory_batches.unit_cost_paise`, `inventory_batches.printed_mrp` | Immutable after create |
| Batch barcode | `batch_barcodes.barcode_value` (+ link to `label_items`) | Code 128 |
| Variant available stock (display) | **Derived** Σ active batch `qty_remaining` for that SKU | Not manually edited |
| Bulk unpacked stock | **NEW** `bulk_inventory` (or extend ledger with reason + measure) | Separate from finished |
| Legacy stock fields | `shared_stock_kg`, `quick_variants[].stock`, `stock_quantity` | Read-only after cutover; sync job may mirror derived totals for shop compatibility |
| Label jobs | `label_print_jobs`, `label_items` | Apply existing migration + harden RLS |
| Sale-time cost / profit | Extend `orders.items_snapshot[]` (and/or **NEW** `order_item_snapshots`) | Immutable |
| Shadow variants | `product_variants` | Non-canonical; freeze new business logic |
| Combos (future) | `product_bundles` | Document only; freeze legacy `combos` writes in new features |

### 2.2 Two inventory layers (mandatory)

```text
Bulk purchase
→ bulk_inventory ↑
→ Create packing batch (SKU + qty)
→ bulk_inventory ↓ (material consumption)
→ inventory_batches ↑ (finished)
→ Print labels / barcodes
→ POS/web sale
→ inventory_batches.qty_remaining ↓
→ items_snapshot cost from batch (or weighted average policy)
```

Website availability = Σ sellable batch qty for variant SKU (with temporary mirror into `quick_variants[].stock` for existing readers until shop is updated to query batches).

---

## 3. Tables retained / deprecated / new

### Retained (active)

- `products`, `product_images`, `categories`, `orders`, `order_items`, `order_status_events`
- `stock_movements` (extend reasons: `purchase`, `pack_to_batch`, `sale_pos`, `sale_web`, …)
- `packaging_materials`, `packaging_profiles`, `packaging_profile_components`, `product_variant_packaging`
- `warehouses`
- `coupons`, `coupon_redemptions` (unchanged behaviour)
- `media_assets`, `app_settings`
- `product_bundles`, `product_bundle_items` (no consolidation in Phase 1)

### New (Phase 1)

| Table | Purpose |
|---|---|
| `suppliers` | Minimal supplier directory (id, name, phone, notes, active) |
| `purchases` | Purchase records with effective cost fields |
| `bulk_inventory` | Unpacked stock by product + unit (kg/L/piece) |
| `bulk_inventory_movements` | Audit for bulk changes |
| `inventory_batches` | Finished packed lots tied to product + SKU/variant label |
| `batch_barcodes` | Barcode → batch (+ serial) |
| `price_change_audit` | Every approved price/MRP change |
| `label_print_jobs` | Apply from `004_label_print_jobs.sql` if missing |
| `label_items` | Same |
| Optional: `order_item_cost_snapshots` | If extending JSON snapshot proves fragile |

### Deprecated (not deleted in Phase 1)

| Object | Action |
|---|---|
| Meta `purchase_rate_per_kg` as primary cost | Migrate into `purchases`; keep readable as fallback until cutover |
| Meta `pack_packaging_rs` | Migrate into packaging profiles; then ignore for new calcs |
| Manual edits to `quick_variants[].stock` | UI read-only; derived sync |
| Manual edits to `stock_quantity` for sellable packs | Deprecated for packed SKUs |
| Direct writes to `quick_variants[].price` outside service | Forbidden in code |
| Expanding `product_variants` business logic | Frozen |
| New features on legacy `combos` | Frozen (data kept) |
| Orphan admin pages (Hero, Homepage, Regions, Collections, PageHeroes) | Hide from nav / keep redirects |

---

## 4. Data migration required

1. **Backup** `products`, `orders`, packaging_*, `stock_movements`, `app_settings` (pg_dump or Supabase backup).  
2. **Apply** missing `label_print_jobs` / `label_items` (+ updated RLS for `admin`/`manager`/`cashier` as needed).  
3. **Create** suppliers/purchases/bulk/batch/barcode/price_audit tables.  
4. **Seed purchases (best-effort):** For each product with meta `purchase_rate_per_kg`, create one synthetic `purchases` row (`status=migrated_from_meta`, quantity=1 base unit, effective cost = rate) — flagged for owner review.  
5. **Packaging:** Where meta `pack_packaging_rs[label]` exists and no `product_variant_packaging` row, create/link a simple profile “Migrated flat ₹{n}” or set override note — owner reviews.  
6. **Stock reconciliation report (mandatory before cutover):**  
   - For each SKU: legacy `quick_variants.stock` / `stock_quantity` / `shared_stock_kg` vs calculated batch totals (initially 0).  
   - Owner approves how to seed initial batches OR treat legacy stock as opening bulk/finished.  
7. **Do not rewrite** historical `orders.items_snapshot` costs.  
8. **Do not delete** `combos` / `product_variants` rows.

---

## 5. Routes retained / hidden

### Retained (refactored in place)

| Route | Change |
|---|---|
| `/admin/pricing` | Rename UI to **Cost & Price Recommendations**; recommend-only + Approve calls price service |
| `/admin/catalogue-manager` | Price columns → propose → same approve service |
| `/admin/packaging` | Canonical packaging profiles only |
| `/admin/products` | Stock fields read-only for packed SKUs; link to Purchases / Batch |
| `/admin/labels` | Becomes Batch & Print entry (or shared with new Batch screen) |
| `/admin/pos` | Batch barcode resolve + richer snapshots |
| `/admin/inventory` | Show bulk + batch + reconciliation; deprecate free-form triple edit |
| `/admin/orders` | Unchanged UX; richer snapshot display later |

### New routes (minimal)

| Route | Purpose |
|---|---|
| `/admin/purchases` | Purchase entry list/create (or tab under Inventory) |
| `/admin/batches` | Packing batch + print (may live under Labels) |

Prefer **tabs under Inventory / Labels** if we must avoid nav sprawl; document exact choice at implement time.

### Hidden after migration + tests (not deleted)

| Route / page | Reason |
|---|---|
| Direct price Apply that bypasses service | Removed from Pricing UI |
| Products spreadsheet price-adjacent paths that skip service | Disabled |
| Orphan redirects already in place | Keep redirects; document Deprecated Modules |

### Untouched routes

Editorial, Stories, Journeys, People, Campaigns, Bonus, Coupons (behaviour), Customers, Retention, SEO, Settings (except flags if needed), Combos (freeze only), Marketing Catalogues PDF.

---

## 6. APIs / services updated

| Service | Action |
|---|---|
| **NEW** `src/lib/pricing/approveVariantPrice.js` (+ Worker endpoint `approveVariantPrice`) | Sole writer of live `price` / `compare_price` / denormalized product fields |
| `pricingStrategy.js` `buildProductUpdateFromStrategy` | Stop writing prices; return recommendation DTO only |
| `AdminPricingStrategy.jsx` | UI rename; Approve button → service |
| `catalogueSimplePublish.js` | Pack price apply → service (or stage for approval) |
| `productSpreadsheet.js` | Ensure no price writes (already ignored) — leave hidden if unused |
| Launch CLI importers | Document as ops-only; do not wire into admin; no new use for prices |
| **NEW** purchase APIs | create/list/approve purchase → update bulk inventory |
| **NEW** batch APIs | create batch from bulk, print labels, adjust qty |
| `cloudflare/worker.js` `deductInventory` | Prefer batch deduction when barcode/batch_id present; fallback legacy during transition |
| `createPosSale` / web order finalize | Enrich `items_snapshot` with batch_id, unit_cost, gross/contribution fields |
| Label print service | Persist to `label_print_jobs` / `label_items` / `batch_barcodes` |
| `stabilizeCatalogueIds.js` | Freeze expansion; optional no-op for new dual-writes |

---

## 7. Storefront dependencies

| Dependency | Phase 1 approach |
|---|---|
| Reads `quick_variants[].price` | Unchanged |
| Reads `compare_price` / discount | Unchanged |
| Soft stock from product/variant | Temporary: sync derived batch sum into `quick_variants[].stock` on batch/sale so shop keeps working without PDP rewrite |
| No batch awareness on PDP | Acceptable for Phase 1 |

**Do not** migrate public shop to `product_variants` table.

---

## 8. POS dependencies

| Dependency | Phase 1 approach |
|---|---|
| `resolvePosVariantPrice` | Still reads `variant.price` (approved) |
| Barcode | Resolve `batch_barcodes` / `label_items` first → attach `batch_id` to cart line |
| Fallback | SKU / QR as today |
| Stock | Decrement `inventory_batches.qty_remaining`; mirror derived variant stock |
| Offline | Must queue `batch_id` when known; sync must be idempotent |
| Senior flow | Scan → item → Cash/UPI → Complete (PIN only for discount/override) |

---

## 9. One price-writing service (spec)

`approveVariantPrice({ productId, sku|label, sellingPrice, mrp, source, actorId, note })`

Must:

1. Validate product + variant exists in `quick_variants`  
2. Validate sellingPrice > 0, mrp ≥ sellingPrice  
3. Load replacement cost + packaging profile → landed cost  
4. Compute actual margin; warn if below target (configurable; default from `pricing_strategy_defaults`)  
5. Insert `price_change_audit` (before/after, source: `admin_ui` \| `excel_import` \| `recommendation_approve`)  
6. Update only that variant’s `price` + `compare_price`; refresh `products.price` / `discount_price` if default pack  
7. Invalidate React Query keys / CDN cache hooks if any  
8. Support rollback by re-applying previous audit row  

**Banned after cutover:** any `quick_variants` update that sets `.price` / `.compare_price` outside this service (eslint grep + code review gate).

---

## 10. Pricing Strategy → Cost & Price Recommendations

- Route remains `/admin/pricing` (label change in sidebar).  
- Shows: replacement cost, material, packaging, landed, target margin, recommended price, approved price, actual margin, profit/unit, MRP discount %, warnings.  
- **Approve Selling Price / MRP** → `approveVariantPrice`.  
- Remove/disable silent “Apply all” that writes without confirmation.  
- Invoice repricing panel becomes “propose then approve”.

---

## 11. Catalogue Excel import

- Keep **Catalogue Manager Simple** as the single admin importer.  
- Hide (do not delete): Products spreadsheet import entry points if confirmed unused; launch CLI stays ops-only.  
- Price columns create **proposals** or call approve service with `source=excel_import` after preview approval.  
- Keep existing import audit tables (`catalogue_import_runs`, `catalogue_import_changes`).  
- Add stale workbook detection (export timestamp / version hash).

---

## 12. Purchase cost model

`purchases` columns (minimum):

`id, product_id, supplier_id, purchase_date, invoice_reference, purchase_quantity, purchase_unit (kg|litre|piece|box), pieces_per_box, material_amount_paise, freight_amount_paise, inward_handling_amount_paise, other_inward_cost_paise, expected_wastage_pct, actual_usable_quantity, effective_cost_per_base_unit_paise, status, notes, created_by, created_at`

Auto:

```
gross_cost = material + freight + handling + other
usable = actual_usable_quantity OR purchase_quantity × (1 − wastage%)
effective_cost_per_base_unit = gross_cost / usable
```

Box units convert via `pieces_per_box`.

---

## 13. Packaging consolidation

- Canonical: existing `packaging_*` tables.  
- Extend profile display names for owner examples (Pouch 100g … Vendor Packed) as data, not new schema.  
- Ensure each sellable `quick_variants` row maps via `product_variant_packaging`.  
- Stop reading `pack_packaging_rs` for new landed-cost calc after migration.  
- Strategy UI packaging ₹ inputs become links to profiles.

Landed / recommended (margin, not markup):

```
material_cost = f(effective_cost, pack_qty, unit)
landed_cost = material_cost + packaging_profile_total + variant_extra_cost
recommended_price = landed_cost / (1 − target_margin%)
```

---

## 14. Labels / Batch & Print

1. Apply/repair `label_print_jobs` + `label_items` on production.  
2. Add `inventory_batches` + `batch_barcodes`.  
3. Refactor `/admin/labels` primary CTA: **CREATE BATCH & PRINT LABELS**.  
4. Inputs: SKU, bulk source, packed qty, packed date, optional MRP override.  
5. Outputs: batch cost, approved sell price, printed MRP, BB date (if shelf-life known), barcode, label count.  
6. Print: keep Seznik/A4/QZ paths; add failure status + reprint reason; prevent double-submit.

---

## 15. Sale snapshots (immutable)

Extend each line in `items_snapshot` (or parallel table) with:

`product_id, variant_sku, batch_id, qty, listed_selling_price_paise, actual_selling_price_paise, discount_allocated_paise, coupon_code, loyalty_redeemed_paise, freebie_cost_paise, net_revenue_paise, unit_cost_paise, line_cogs_paise, gross_profit_paise, delivery_subsidy_allocated_paise, payment_fee_allocated_paise, contribution_profit_paise, payment_method, cashier_id, sold_at`

Policy: batch unit cost if batch scanned; else weighted average of remaining batches; else latest purchase; else null.

**Never** recompute historical snapshots when purchase cost changes.

---

## 16. Profit reporting (Phase 1)

- Relabel Pricing / Packaging / Merchandising numbers as **Estimated / Planning**.  
- After snapshots: basic **Operational contribution** view (orders filter): net sales, COGS, gross profit, discounts, freebie cost, delivery subsidy, payment charges, contribution profit.  
- Explicitly **not** “Net profit” (no expenses/closing).

---

## 17. Combos

- Document `product_bundles` as future canonical.  
- Code comment / lint note: no new features on `combos`.  
- No data deletion. No storefront combo redesign in Phase 1.

---

## 18. Implementation order (locked)

1. Field ownership matrix (this doc §2.1) — done in plan  
2. Backup affected tables  
3. Canonical price-update service  
4. Refactor Pricing Strategy → recommendations + approve  
5. Refactor Catalogue Simple prices → service  
6. Purchase-cost tables + UI  
7. Packaging profile consolidation  
8. Variant landed-cost calculations in recommendation UI  
9. Stock reconciliation report + owner approval  
10. Bulk → batch packing flow  
11. Repair label tables + Batch & Print  
12. POS batch barcode + deduction  
13. Immutable sale snapshots  
14. Hide verified duplicate operational write paths  
15. Regression tests  
16. Full smoke test (Almonds script)

Any order change requires a dated amendment in this file.

---

## 19. Rollback procedure

| Step | Action |
|---|---|
| R1 | Disable new Worker flags: `USE_BATCH_STOCK`, `USE_PRICE_APPROVAL_SERVICE` (feature flags) → revert to legacy deduct + direct writes |
| R2 | Restore `products` / `orders` from pre-cutover backup if data corruption |
| R3 | Keep new tables in place (no drop) — stop writing; leave readable |
| R4 | Re-enable Pricing Strategy Apply path from git tag `pre-phase1` |
| R5 | Labels: if new tables empty/broken, hide Labels route again  
| R6 | Communicate: shop prices may need re-approval from audit log |

Feature flags (recommended):

- `ops_price_approval_required` (default on after cutover)  
- `ops_batch_stock_enabled` (off until reconciliation approved)  
- `ops_batch_pos_required` (off until labels printing proven)

---

## 20. Required tests (acceptance)

Almonds end-to-end (owner script) plus edge cases listed in the Phase 1 prompt:

- Product without cost / without MRP  
- Vendor-packed  
- Piece-based + box purchase  
- Oil per litre  
- Disconnected printer  
- Unknown barcode  
- Old vs new batch  
- Website order stock deduction  
- Offline POS sync  

Pass criteria: one sale → correct batch qty ↓, immutable cost stored, later purchase does not change old sale profit, no second price writer remains in code paths covered by grep.

---

## 21. Deprecated Modules section (documentation)

After Phase 1 hide-step, maintain `docs/YASVIK_DEPRECATED_MODULES.md` listing:

- Legacy `combos` write path  
- Meta-only purchase cost  
- Meta `pack_packaging_rs`  
- Manual triple stock editors  
- Orphan Hero/Homepage/Regions/Collections/PageHeroes pages  
- Direct Catalogue price publish (pre-service)  
- Expanding `product_variants` as shop SoT  

Delete only after 30–60 days + regression sign-off (Phase 2+).

---

## 22. Owner approval gates (stop points)

Implementation must pause for explicit owner approval at:

1. **This plan** (current)  
2. Stock reconciliation report (before enabling `ops_batch_stock_enabled`)  
3. First production label print on real SKU  
4. Cutover of price service (ban direct writers)

---

## 23. What this plan deliberately does NOT do

- Full 7-area navigation redesign  
- Expenses / Daily Closing / Net profit  
- Editorial vs legacy homepage decision  
- Migrating shop/POS to `product_variants`  
- Deleting historical combo/variant/meta data  
- Building a second POS or second Labels UI  

---

**End of plan.**  
Next action after owner approval: begin step 2 (backup) and step 3 (canonical price service) only.
