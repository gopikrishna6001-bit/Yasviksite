# Yasvik — Source of Truth Audit

**Date:** 2026-08-02 · Read-only  
**HIGH RISK** = more than one active write path or read path mismatch

---

## Field matrix

| Business field | Tables/columns found | Admin screens editing it | APIs using it | Storefront reads | POS reads | Reports read | Conflict |
|---|---|---|---|---|---|---|---|
| Product name | `products.name` (app: title) | Products, Catalogue import | appClient, worker | Yes | Yes | Order snapshot title | Low |
| Description | `products.description`, short_description | Products, import | appClient | Yes | No | No | Low |
| Category | `products.category_id` → `categories` | Products, Categories, import | appClient | Yes (nav filter) | Filter | CRM insights | Medium (legacy cats) |
| Subcategory | `categories.parent_id` | Categories | appClient | Shop chips | No | No | Medium |
| SKU | `products.sku`, `quick_variants[].sku` | Products, Pricing, import | POS barcode | Rare | Yes | Labels | Medium (two levels) |
| Pack quantity | `quick_variants[].pack_kg` / label | Products, Pricing, import | pricing math | Selector | Selector | Snapshot | Low |
| Unit | label string / stock_measure_type | Products | stock utils | Display | Display | No | Low |
| Barcode (label) | Intended `label_items.barcode_value` | Labels UI | POS lookup | No | Intended | No | **HIGH — tables missing** |
| Supplier barcode | — | — | — | — | — | — | Missing |
| Supplier cost | — | — | — | — | — | — | Missing |
| Purchase cost | Meta `__yasvik_pricing__.notes.purchase_rate_per_kg` | Pricing Strategy, Catalogue import | worker snapshot | No | Discount floor est. | Snapshot / planning | **HIGH (hidden JSON)** |
| Effective cost /kg | Same meta + Excel Landed | Pricing / Excel | — | No | No | Planning | **HIGH** |
| Packaging cost | Meta `pack_packaging_rs` **and** `packaging_*` BOM | Pricing + Packaging | packagingCost.js | No | Floor guard est. | Planning | **HIGH dual models** |
| Label cost / labour | Packaging BOM labour/transport | Packaging | packagingCost | No | No | Planning | Low |
| Landed cost | Computed (BOM or Excel) | Packaging preview / Excel | — | No | No | Planning | Medium |
| Recommended price | Excel col only | Workbook | Not imported | No | No | No | Medium (unused) |
| Selling price | `quick_variants[].price`, `products.price` | **Pricing Strategy**, Catalogue Selling Price | cart, POS, shop | **Yes** | **Yes** | Snapshot | **HIGH dual writers** |
| MRP | `quick_variants[].compare_price`, `products.discount_price` | Strategy inflate, Catalogue MRP | shop strikethrough | Yes | No validation | Labels | **HIGH** |
| Discount (offer) | `orders.discount_paise`, coupons | Coupons, POS | worker | Cart coupon | Yes | Order amount | Low |
| Margin % | Strategy bands / pack_margins (meta) | Pricing Strategy | Admin only | No | No | Planning | Low |
| Stock (product) | `products.stock_quantity` | Products, Inventory | deductInventory | Soft | Soft | Ledger | **HIGH triple** |
| Stock (variant) | `quick_variants[].stock` | Products, Pricing | deductInventory | Soft | Soft | Ledger | **HIGH** |
| Stock (bulk) | `products.shared_stock_kg` | Products, Inventory | deduct by pack_kg | Soft | Soft | Ledger | **HIGH** |
| Batch stock | — | — | — | — | — | — | Missing |
| Batch printed MRP | Intended label_* | Labels | — | — | — | — | **HIGH missing tables** |
| Batch cost | — | — | — | — | — | — | Missing |
| Product status | `is_published`, `sell_online` | Products | listPublished | Yes | POS can see store-only | No | Low |
| Variant availability | Availability flags / stock | Import, Products | filters | Yes | Yes | No | Low |
| Image URL | `product_images`, featured_image_url, R2 | Media, Products | CDN | Yes | Yes | No | Low |
| Slug | `products.slug`, aliases | Products, SEO | routes | Yes | No | No | Low |
| SEO title | `products.seo_*` | SEO, Products | meta | Yes | No | No | Low |
| Featured / bestseller | `is_featured`, `featured_in_hero`, `app_settings.home_best_sellers` | Products flags / settings | Home fetch | Yes | No | No | Medium (dead UI) |
| Combo price | `product_bundles` / `combos.combo_price` / choice overrides | Combos | cart | Yes | Optional | Snapshot | **HIGH dual combo** |
| Combo cost | Not consistently stored | — | — | No | No | No | Medium |
| Freebie cost | — | — | — | — | — | — | Missing |
| Sales revenue | `orders.amount_paise` | POS/web create | Overview sum | No | No | Overview/Orders | Medium (sample) |
| Sale item cost | `items_snapshot.line_cost_paise` | Worker at sale | — | No | No | **No UI report** | Medium |
| Gross profit | Computed planning only | Pricing/Packaging | — | No | No | Estimated | **HIGH misnamed** |
| Contribution profit | Packaging landed math | Packaging, Merch | — | No | No | Estimated | Medium |
| Expense | — | — | — | — | — | — | Missing |
| Cash total | `orders.payment_method='cash'` | POS | — | No | No | **No till report** | Medium |
| UPI total | `payment_method='upi'` | POS | — | No | No | **No till report** | Medium |

---

## Pricing implementations (explicit answers)

1. **How many pricing modules?** ≈ **4 active concepts**: Pricing Strategy UI, Catalogue Simple Selling/MRP import, residual channel/store_price fields, Packaging/Excel landed advisors (non-writers).  
2. **Live website price?** `quick_variants[].price` (written mainly by Pricing Strategy **or** Catalogue import).  
3. **POS price?** Same `variant.price` (plus optional QR override).  
4. **Margin calculator?** Pricing Strategy (+ Packaging contribution preview).  
5. **Purchase cost store?** Meta JSON `purchase_rate_per_kg` (not a clean column).  
6. **Packaging cost store?** Dual: meta `pack_packaging_rs` (affects shelf) + `packaging_*` BOM (preview).  
7. **MRP store?** `compare_price` / `discount_price`.  
8. **Unused?** Excel Recommended Price; orphan DB cols like top-level `selling_price_per_kg` (stripped on write); BestSellersManager UI.  
9. **Partial?** Labels MRP snapshot; store vs web dual channel (collapsed).  
10. **Should become canonical?** **Pricing Strategy → `quick_variants`**, with Excel import restricted to cost/identity or forced through Strategy apply.

---

## Stock sources (count = 3 live + ledger)

1. `products.shared_stock_kg`  
2. `quick_variants[].stock`  
3. `products.stock_quantity`  
Plus audit ledger: `stock_movements`  
**Not present:** batch/lot stock, reservation, FEFO.

## MRP sources (count ≈ 3)

1. Strategy inflate → compare_price  
2. Catalogue MRP import  
3. Fallback inflate recompute at read time  

## Product-cost sources (count ≈ 3)

1. Meta purchase_rate  
2. Packaging BOM landed  
3. Excel Landed / Recommended workbook  

## Catalogue import implementations (count ≈ 4+)

1. Catalogue Manager Simple XLSX  
2. Products spreadsheet dialog  
3. Launch corrections CLI  
4. SQL seed / generated import scripts  

## Label-printing implementations (count = 1 UI, 0 live tables)

- UI: `/admin/labels` (Seznik/A4 panels)  
- Production tables for jobs/items: **not found**

## Profit/report implementations (count ≈ 4 estimated surfaces, 0 true P&L)

1. Overview revenue sample  
2. Orders header revenue  
3. Pricing/Packaging planning margins  
4. Merchandising estimated contribution  
**No** Expenses / Net Profit / Daily Closing module.
