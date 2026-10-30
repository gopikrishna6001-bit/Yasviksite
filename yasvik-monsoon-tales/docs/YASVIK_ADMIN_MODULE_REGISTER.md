# Yasvik Admin — Complete Module Register

**Date:** 2026-08-02 · Read-only forensic inventory  
**Router:** `src/App.jsx` · **Nav:** `src/components/admin/AdminSidebar.jsx`

Status values: **Live** | **Partial** | **Broken** | **Hidden** | **Unused**

---

## Register (all modules)

### Overview
| Field | Detail |
|---|---|
| Module name | Overview |
| Menu | Core → Overview |
| Route | `/admin` |
| Component | `pages/admin/AdminOverview.jsx` |
| Purpose | Daily ops snapshot |
| Actual behaviour | Counts products/content; sums paid `amount_paise` for “today” from a limited recent orders query |
| Owner inputs | None |
| Auto calc | Revenue/order counts |
| Data written | None |
| Data read | products, journeys, stories, people, media_assets, categories, orders; CF listCustomers |
| API | Supabase + CF |
| Storefront / POS / Orders / Reports | None / none / none / soft KPI only |
| Status | Live |
| Risks | Looks like finance; is sample-based |
| Duplicate with | Orders header revenue |
| Recommendation | Keep · later replace with real reports |

### Counter POS
| Field | Detail |
|---|---|
| Module name | Counter POS |
| Menu | Core → Counter POS |
| Route | `/admin/pos` |
| Component | `AdminPOS.jsx` + `components/admin/pos/*` |
| Purpose | Walk-in billing |
| Actual behaviour | Search/scan products; pick variants; cash/UPI/card; coupons/manual discount; bonus; creates **paid delivered** order via CF `createPosSale`; deducts stock; offline queue supported |
| Owner inputs | Lines, qty, payment, discounts, phone |
| Auto calc | Subtotal, discount, bonus, change UI |
| Data written | orders, order_items, stock_movements, coupon_redemptions, customers, bonus ledger |
| Data read | products/quick_variants, coupons, bonus rates, (intended label_items) |
| API | CF createPosSale + related |
| Storefront | None |
| POS | Canonical |
| Orders | Creates orders |
| Reports | Feeds order totals only |
| Status | Live |
| Risks | Offline stock drift; QR price override; label barcode tables missing |
| Duplicate with | Web checkout (shared worker spine) |
| Recommendation | Keep / Fix offline + labels |

### Orders
| Field | Detail |
|---|---|
| Module | Orders |
| Route | `/admin/orders` |
| Component | `AdminOrders.jsx`, `OrderDetailDrawer.jsx` |
| Purpose | Manage website + POS orders |
| Actual | List/filter; status timeline; detail drawer; revenue header sums selected statuses |
| Writes | orders, order_status_events |
| Reads | orders, order_items |
| Status | Live |
| Recommendation | Keep |

### Delivery board
| Field | Detail |
|---|---|
| Route | `/admin/delivery` |
| Component | `AdminDelivery.jsx` |
| Purpose | Dispatch board |
| Actual | Updates delivery fields including `delivery_fee_charged_paise`, `delivery_cost_actual_paise`; checkout fee collection is **disabled** in worker |
| Status | Live |
| Recommendation | Keep |

### Inventory ledger
| Field | Detail |
|---|---|
| Route | `/admin/inventory` |
| Component | `AdminInventory.jsx` |
| Purpose | Manual stock adjust + history |
| Actual | Calls stock adjustment; shows `stock_movements`; does not unify the three stock fields into one UI model |
| Writes | products stock fields, stock_movements |
| Status | Live |
| Risks | Triple stock sources |
| Recommendation | Keep / Fix model |

### Products
| Field | Detail |
|---|---|
| Route | `/admin/products` |
| Component | `AdminProducts.jsx`, `ProductFormDrawer.jsx`, quick ops |
| Purpose | Catalogue CRUD |
| Actual | Edit identity, packs (sizes/SKU/stock/images), publish, sell_online, SEO, media. **Shelf prices are read-only** and point to Pricing Strategy. Spreadsheet import ignores prices. |
| Writes | products, product_images, quick_variants (non-price fields) |
| Storefront | Direct |
| POS | Direct |
| Status | Live |
| Recommendation | Keep |

### Pricing Strategy
| Field | Detail |
|---|---|
| Route | `/admin/pricing` (alias `/admin/benchmark-pricing`) |
| Component | `AdminPricingStrategy.jsx`, `InvoiceRepricingPanel.jsx` |
| Purpose | Cost → margin → charm shelf + MRP |
| Actual | Edits purchase rate, bands, packaging ₹, pack margins/overrides; Apply writes `products.price`, `discount_price`, `quick_variants` prices + hidden `__yasvik_pricing__` meta |
| Formula | `shelf = charm((purchase×qty + pack₹)×(1+margin%))`; `mrp = charm(shelf×(1+inflate%))` |
| Storefront/POS | **Yes — live shelf** |
| Status | Live · should be canonical writer |
| Duplicate | Catalogue Simple Selling Price |
| Recommendation | Keep / Canonical |

### Packaging costs
| Field | Detail |
|---|---|
| Route | `/admin/packaging` |
| Component | `AdminPackaging.jsx` |
| Purpose | BOM landed cost |
| Actual | Materials/profiles/mappings; computes landed & contribution; **does not write shelf prices** |
| Writes | packaging_* tables, settings |
| Status | Partial (insight) |
| Duplicate | Strategy pack_packaging_rs |
| Recommendation | Keep as insight · do not treat as price engine |

### Coupons
| Field | Detail |
|---|---|
| Route | `/admin/coupons` |
| Component | `AdminCoupons.jsx` |
| Purpose | % / fixed discounts |
| Actual | CRUD coupons; worker applies on POS/web |
| Status | Live |
| Recommendation | Keep |

### Yasvik Bonus
| Field | Detail |
|---|---|
| Route | `/admin/bonus` |
| Component | `AdminBonus.jsx` |
| Purpose | Loyalty earn/redeem |
| Actual | Category rates/rules/campaigns; ledger; earn blocked if order has discount |
| Status | Live |
| Recommendation | Keep |

### Customers + Customer detail
| Field | Detail |
|---|---|
| Routes | `/admin/customers`, `/admin/customers/:id` (detail **hidden from nav**) |
| Components | `AdminCustomers.jsx`, `AdminCustomerDetail.jsx` |
| Purpose | CRM |
| Actual | Phone-keyed customers; lifetime spend; tags; detail view |
| Status | Live |
| Recommendation | Keep · add detail to nav |

### Retention
| Field | Detail |
|---|---|
| Route | `/admin/retention` |
| Component | `AdminRetention.jsx` |
| Purpose | Repeat-customer board |
| Actual | CF getRetentionStats; approximate returning revenue |
| Status | Partial |
| Recommendation | Keep |

### Campaigns (WhatsApp)
| Field | Detail |
|---|---|
| Route | `/admin/campaigns` |
| Component | `AdminCampaigns.jsx` |
| Purpose | WhatsApp outreach |
| Actual | Segments + export consented phones; **sending disabled** |
| Status | Partial |
| Duplicate name | Editorial Campaigns |
| Recommendation | Rename / Fix send later |

### Catalogue Manager
| Field | Detail |
|---|---|
| Route | `/admin/catalogue-manager` |
| Component | `AdminCatalogueManager.jsx`, `CatalogueImportPanel.jsx` |
| Purpose | PIM Excel import/export + IDs |
| Actual | Simple workbook parse/validate/publish; can **overwrite Selling/MRP**; stabilize dual-writes `product_variants`; some tabs coming soon |
| Status | Partial |
| Risks | Price conflict with Strategy |
| Recommendation | Fix write rules |

### Marketing Catalogues
| Field | Detail |
|---|---|
| Routes | `/admin/marketing/catalogues`, alias `/admin/catalogues` |
| Component | `AdminCatalogues.jsx` |
| Purpose | PDF dealer/customer catalogues |
| Actual | Templates + generations to R2; public `/catalogue` |
| Status | Live |
| Duplicate naming | Catalogue Manager |
| Recommendation | Rename to “PDF Catalogues” |

### Merchandising Review
| Field | Detail |
|---|---|
| Route | `/admin/merchandising-review` |
| Component | `AdminMerchandisingReview.jsx` |
| Purpose | Score products for launch |
| Actual | Reads audit runs; writes **proposals only**; UI states it does not change products |
| Status | Partial |
| Recommendation | Keep / clarify in nav label |

### Editorial Storefront
| Field | Detail |
|---|---|
| Route | `/admin/editorial-storefront` (+ DEV unauth `/__editorial-admin-cms`) |
| Component | `AdminEditorialStorefront.jsx` + editorial tabs |
| Purpose | New homepage CMS |
| Actual | Campaigns, heroes, stories overview, launch readiness; public only if `editorial_storefront_public` |
| Status | Partial |
| Recommendation | Keep · secure DEV route |

### Editorial Preview / Storefront Stories
| Field | Detail |
|---|---|
| Routes | `/admin/storefront-preview/editorial`, `/admin/storefront-stories` |
| Status | Partial (flag-gated public impact) |
| Duplicate | Long-form Stories |
| Recommendation | Rename Stories items |

### Price Labels
| Field | Detail |
|---|---|
| Route | `/admin/labels` |
| Component | `AdminLabelGenerator.jsx` + print panels |
| Purpose | Print pack price labels / barcodes |
| Actual | UI builds jobs/items; **live DB missing `label_print_jobs` / `label_items`** |
| Status | **Broken / Partial** |
| Recommendation | Investigate · migrate tables or hide |

### Categories
| Field | Detail |
|---|---|
| Route | `/admin/categories` |
| Component | `AdminCategories.jsx` |
| Purpose | Parent/sub aisles |
| Actual | Tree CRUD; launch vs legacy tabs; hide/delete empty legacy; SEO slug fields |
| Storefront | Nav chips / shop groups (filtered allowlist in code) |
| Status | Live |
| Recommendation | Keep / clean legacy |

### Media
| Field | Detail |
|---|---|
| Route | `/admin/media` |
| Component | `AdminMedia.jsx` |
| Purpose | R2 media library |
| Actual | Upload/delete via Worker; indexes `media_assets` |
| Status | Live |
| Recommendation | Keep |

### Journeys / People / Stories (long-form)
| Field | Detail |
|---|---|
| Routes | `/admin/journeys`, `/admin/people`, `/admin/stories` |
| Purpose | Brand content |
| Actual | Standard entity CRUD → public pages |
| Status | Live (low volume) |
| Recommendation | Keep |

### Combos
| Field | Detail |
|---|---|
| Route | `/admin/combos` |
| Component | `AdminCombos.jsx`, `AdminComboEditorDrawer.jsx` |
| Purpose | Bundles |
| Actual | Primarily `product_bundles` / items; legacy `combos` still in DB (10 rows) |
| Storefront | Shop Bundles / BundleDetail / ComboCard |
| Status | Live with dual-system risk |
| Recommendation | Merge to one system |

### Illustrations
| Field | Detail |
|---|---|
| Route | `/admin/illustrations` |
| Purpose | Page atmosphere art |
| Actual | Writes `app_settings` illustration slots |
| Duplicate | Settings hero media |
| Status | Live |
| Recommendation | Later merge |

### Hamburger Menu / SEO / Settings / Staff
| Module | Route | Status | Notes |
|---|---|---|---|
| Page visibility | `/admin/page-visibility` | Live | `page_settings` |
| SEO Manager | `/admin/seo` | Partial | Product SEO yes |
| Settings | `/admin/settings` | Live | Admin-only kitchen sink |
| Staff | `/admin/staff` | Live | Admin-only roles |

### Orphan / redirected modules
| Module | Former route | Status | Recommendation |
|---|---|---|---|
| Homepage CMS | `/admin/homepage` → settings | Unused file | Remove later |
| Hero CMS | `/admin/hero` → illustrations | Unused file | Remove later |
| Regions | `/admin/regions` → settings | Unused file | Remove later |
| Collections | `/admin/collections` → settings | Unused file | Remove later |
| Page Heroes | `/admin/page-heroes` → illustrations | Unused file | Remove later |
| BestSellersManager | (none) | Unused component | Remove or rewire |

### Explicitly missing business modules
| Expected | Status |
|---|---|
| Suppliers | Missing |
| Purchases / GRN | Missing |
| Expenses | Missing |
| Daily closing / cash recon | Missing |
| True P&L reports | Missing |
| Warehouse lot batches / expiry | Missing |
| Freebie engine | Missing |

---

## Pricing module forensic (condensed)

See also `YASVIK_SOURCE_OF_TRUTH_AUDIT.md`.

| Implementation | Writes live shelf? | Notes |
|---|---|---|
| Pricing Strategy | **Yes** | Canonical candidate |
| Catalogue Simple Selling/MRP | **Yes** | Bypass margin |
| Product form | No | Read-only prices |
| Packaging BOM | No | Landed preview |
| Excel Recommended | No | Unless pasted |
| Channel store_price | Residual | Collapsed |

---

## Stock / batch / inventory (condensed)

| Capability | Exists? |
|---|---|
| Product-level stock | Yes (`stock_quantity`) |
| Variant-level stock | Yes (`quick_variants[].stock`) |
| Bulk kg/L stock | Yes (`shared_stock_kg`) |
| Batch/lot stock | **No** |
| Purchase stock | **No purchases** |
| POS deduct | Yes |
| Website order deduct | Yes (COD immediate; Razorpay on pay) |
| Manual adjust | Yes |
| Expiry tracking | **No** |
| Reservation | **No** |
| History ledger | Yes (`stock_movements`) |
| Negative prevention | Yes (worker reject) |

Example SKU path today: Manual/import stock → product/variant fields → POS/web sale → `deductInventory` → `stock_movements`. **No purchase→lot→barcode stock chain.**

---

## POS forensic (condensed)

| Question | Answer |
|---|---|
| Add products | Search, category, barcode, custom line |
| Barcode | SKU / QR / intended label lookup |
| Price | `variant.price` (+ QR override) |
| Variant select | Yes |
| Batch select | No inventory batch |
| Stock deduct | Yes on sale |
| Cost stored | Snapshot purchase content if meta present |
| Margin stored | Not as report field |
| Cash/UPI | payment_method on order |
| Mixed pay | No |
| Discounts | Coupon or manual |
| Freebies | No |
| Receipt | PosSaleDocuments UI |
| Offline → reports | After sync as orders |
| Senior-friendly | Large POS UI; still requires product selection |

---

## Code smell highlights

- Orphan admin pages still on disk  
- `BestSellersManager` dead  
- DEV `/__editorial-admin-cms` without auth  
- Dual combo + dual variant systems  
- Label migrations not applied to production  
- TODO/coming-soon tabs in Catalogue Manager  
- Merchandising “needs_owner_input” placeholders  
