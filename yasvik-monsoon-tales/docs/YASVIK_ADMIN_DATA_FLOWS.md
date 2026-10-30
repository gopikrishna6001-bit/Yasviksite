# Yasvik Admin — End-to-End Data Flows

**Date:** 2026-08-02 · Read-only · Competing sources marked **CONFLICT**

---

## 1. Product creation

```
Admin Products form / Catalogue import / CLI scripts
  → appClient.entities.Product.create / Worker / SQL
  → products (+ product_images, category_id)
  → Storefront: productsApi.listPublished (is_published + sell_online)
  → Search / Shop / PDP / Cart (variant.price)
  → Order: createCodOrder / createPosSale → orders + order_items + items_snapshot
```

**Broken links / risks**
- Product form does **not** set shelf prices (preservePrices); new products may show ₹0 until Pricing Strategy or Excel Selling Price is applied.
- `sell_online=false` products stay in POS/admin but hide from shop.

---

## 2. Variant creation

```
Admin Products “pack sizes” list
  OR Pricing Strategy pack add
  OR Catalogue Simple PACKS_PRICING sheet
  → products.quick_variants[] JSONB
     { label, sku, price, compare_price, pack_kg, stock, image_urls, … }
  → optional dual-write product_variants (Catalogue “Stabilize IDs”)
  → Website pack selector + POS variant picker read quick_variants
```

**CONFLICT:** Shadow `product_variants` (551 rows) is **not** the customer source of truth. Shop/POS/pricing still use `quick_variants`.

---

## 3. Price change

```
CANONICAL WRITE (intended):
  /admin/pricing Pricing Strategy apply
    → formula: landed = purchase×qty + packaging₹
               shelf = charm(landed × (1+margin%))  // usually ends in 9
               mrp   = charm(shelf × (1+inflate%))
    → products.price, products.discount_price (compare)
    → quick_variants[].price / compare_price
    → meta row __yasvik_pricing__ notes (cost, band, overrides)

COMPETING WRITE:
  Catalogue Simple import Selling Price / MRP
    → writes quick_variants prices directly (bypasses margin formula)

READERS:
  Storefront ProductCard / PDP / Cart → variant.price
  POS resolvePosVariantPrice → variant.price ?? product.price
  Labels / PDF catalogues → same
  Order snapshot → price at sale time (paise)
```

**CONFLICT:** Two live writers. Product form intentionally does not write prices.

Historical sales are **not** recalculated when price changes.

---

## 4. MRP change

```
Pricing Strategy inflate → quick_variants.compare_price + products.discount_price
  OR Catalogue import MRP column → same fields
  → Website strikethrough (resolveVariantComparePrice)
  → Label print preview uses compare_price
  → POS does not require MRP validation for sale
```

**Note:** Live DB has **no** `label_print_jobs` / `label_items`; “batch printed MRP” path is incomplete in production.

Fallback chain if compare missing: product.compare/discount → inflate from meta → inflate from sell.

---

## 5. Purchase cost change

```
Pricing Strategy “purchase_rate_per_kg” (₹/kg, ₹/L, or ₹/pc)
  → stored in quick_variants meta notes JSON (NOT a first-class column)
  → feeds suggested shelf on next Apply
  → on sale: worker copies purchase_rate into orders.items_snapshot
             line_cost_paise ≈ purchase × pack_qty × 100 × qty
             (packaging/labour usually excluded from snapshot)

Packaging BOM landed cost (separate):
  packaging_* tables → admin preview only → does NOT write shelf price
```

**No Purchases / Supplier GRN module.** Cost is manual in Pricing Strategy (or Excel).

---

## 6. Catalogue import

| Path | Format | Match key | Creates? | Deletes missing? | Updates prices? | Images? | Categories? | SEO? | Batches? | Preview? | Rollback? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Catalogue Manager Simple | XLSX multi-sheet | Product Code / SKU | Yes | No (diff-based) | **Yes Selling/MRP** | Via media tab | Yes | Partial | No | Diff UI | Audit tables only |
| Products spreadsheet | CSV/XLSX | **id required** | Limited | No | **No** (ignored) | Possible | Yes | Yes | No | Dialog | No |
| Launch corrections CLI | Launch workbook | slug/code/sku/title | Yes | No | Via payload | Preserve option | Yes | Yes | No | dry-run | No |
| Generated SQL / seeds | SQL | various | Yes | varies | often zeros | varies | Yes | varies | No | — | — |

**Unused / parallel:** Excel “Recommended Price” formula is **not** imported unless pasted into Selling Price.

---

## 7. Image upload

```
Admin Media / ImageUploadField / Illustrations / Settings
  → POST /api/media/upload (Cloudflare Worker)
  → R2 bucket media-assets
  → public https://media.yasvik.com/{key}
  → media_assets row
  → product_images / product.featured_image_url / category.cover_image / settings keys
  → Storefront OptimizedImage
```

---

## 8. Batch creation

**Intended (code):** Label Generator → `label_print_jobs` + `label_items` with barcode `{batch_no}-{serial}`, MRP/price snapshot on print.

**Production reality:** Tables **`label_print_jobs` / `label_items` are absent** from live public schema.  
**BATCH ≠ warehouse lot.** There is no FEFO / expiry / lot stock table.

---

## 9. Barcode scan (POS)

```
Scanner → posBarcode.js
  A) SKU match on product/variant
  B) Label barcode YV…-### → LabelItem lookup (broken if tables missing)
  C) QR YV:SKU:price or /pos-scan?c=… → may set priceOverride
  → cart line with resolvePosVariantPrice
  → createPosSale → stock deduct + order
```

---

## 10. Sale completion (POS)

```
AdminPOS cart
  → Cloudflare createPosSale
  → orders (status=delivered, payment_status=paid, payment_method cash|upi|card)
  → order_items + items_snapshot (price, cost fields)
  → deductInventory (sale_pos) → stock_movements
  → coupon redemption (optional)
  → linkCustomerAfterOrder + bonus lifecycle
  → Offline path: local queue → sync with client_sale_id idempotency
```

**Missing:** till Z-report, cash drawer, expense link, daily closing.

---

## 11. Offer application

```
Coupon (%/fixed) OR POS manual %/₹
  → discount_paise on order
  → line discount allocation
  → If discount_paise > 0 → Yasvik Bonus earn = 0 (offer OR bonus)
  → Net payable after bonus redeem
  → Reports: only order amount fields; no dedicated offer P&L
```

Freebies: **no checkout freebie engine.**

---

## 12. Expense entry

**Does not exist.** No expense table, screen, or worker route.  
Monthly net profit **cannot** be computed from admin today.

---

## Competing sources of truth (summary)

| Flow | Competing truth |
|---|---|
| Price | Strategy apply vs Catalogue Selling Price vs QR override |
| Cost | Meta purchase_rate vs Packaging BOM vs Excel Landed |
| Variant | quick_variants vs product_variants shadow |
| Combo | combos/combo_items vs product_bundles |
| Stock | shared_stock_kg vs variant.stock vs stock_quantity |
| Homepage | Legacy Home.jsx vs Editorial (flag) |
| Stories | stories vs storefront_stories |
