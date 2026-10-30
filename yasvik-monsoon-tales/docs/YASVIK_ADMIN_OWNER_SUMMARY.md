# Yasvik Admin — Owner Summary (Forensic Audit)

**Date:** 2026-08-02  
**Scope:** Read-only inspection of code + live Supabase.  
**No code, schema, routes, or data were changed.**

---

## 1. What the admin currently contains

About **32 visible sidebar items**, plus detail/alias routes and several old pages that still exist as files but redirect elsewhere.

In plain language, the admin covers:

| Area | What you use it for |
|---|---|
| Counter POS | Bill walk-in customers (cash / UPI / card) |
| Orders + Delivery board | Website/POS orders and dispatch notes |
| Products + Pricing + Packaging | Catalogue, shelf prices, packaging cost math |
| Categories + Media + Labels UI | Aisles, images, price-label print screen |
| Coupons + Yasvik Bonus | Discounts and loyalty points |
| Customers + Retention + Campaigns | CRM and WhatsApp list prep |
| Catalogue Manager + Marketing Catalogues | Excel PIM + PDF dealer catalogues |
| Editorial / Stories / Journeys / People | Brand content for website |
| Settings / Staff / SEO / Menu | Site config and access |

---

## 2. What is actually working

- **POS sales** create real paid orders, deduct stock, and link customers by phone.
- **Website COD / Razorpay paid orders** create orders and deduct stock.
- **Pricing Strategy** can recalculate pack shelf prices + MRP and save them onto products.
- **Shop and POS both read the same shelf price** from product pack variants (`quick_variants[].price`).
- **Categories, products, media upload to R2, coupons, bonus earn/redeem** are live.
- **Customer CRM** updates after sales with phone numbers.
- **Marketing PDF catalogues** generate and store generations.
- **Inventory ledger** records stock movements for sales and manual adjustments.

---

## 3. What is partly working

| Module | Why “partial” |
|---|---|
| Editorial Storefront | CMS works; public home stays legacy until activation flag is turned on |
| Storefront Stories | Live CMS; only shown when editorial public flag is on |
| Catalogue Manager (Excel PIM) | Import/export/history exist; some tabs still “coming soon” |
| WhatsApp Campaigns | Builds lists / export only — **does not send WhatsApp** |
| Merchandising Review | Review board; **does not change live products** |
| SEO Manager | Product SEO editable; story SEO mostly display-only |
| Label Generator UI | Screen exists in admin — **live DB has no label_print_jobs / label_items tables** |
| Best Sellers on homepage | Setting + featured flags work; dedicated Best Sellers manager component is unused/dead |
| Combos | Two systems coexist: older `combos`/`combo_items` and newer `product_bundles` |

---

## 4. What is not connected to live business

| Expected feature | Reality today |
|---|---|
| Supplier management | **No module / no table** |
| Purchases / GRN | **No module / no table** |
| Expenses | **No module / no table** |
| Daily cash closing / Z-report | **Does not exist** |
| Payment reconciliation | Razorpay health check only |
| Warehouse lot / FEFO batches | **Does not exist** (BATCH = label print batch ID in code, not stock lot) |
| Delivery fee collected at checkout | **Disabled** in worker |
| True P&L / Profit dashboard | **Does not exist** |
| Freebie / BOGO engine | **Does not exist** (combo “free_items” is display grouping) |
| Orphan admin pages (Hero, Homepage, Regions, Collections, Page Heroes) | Files remain; routes redirect; not the live editors |

---

## 5. What is duplicated

1. **Pricing writers:** Pricing Strategy vs Catalogue Simple Excel “Selling Price/MRP” import vs leftover channel fields.  
2. **Cost models:** Pricing Strategy packaging ₹ map vs Packaging BOM landed cost (BOM does not set shelf price).  
3. **Variants:** Live `products.quick_variants` vs shadow `product_variants` (551 rows) — storefront/POS still use quick_variants.  
4. **Combos:** `combos` (10 rows) + `combo_items` (33) **and** `product_bundles` (12) + items (131).  
5. **Stories:** Long-form `stories` vs vertical `storefront_stories`.  
6. **Campaigns:** WhatsApp AdminCampaigns vs Editorial Campaigns.  
7. **Catalogues:** Catalogue Manager (PIM Excel) vs Marketing Catalogues (PDF).  
8. **Hero / atmosphere:** Settings hero media vs Illustrations.  
9. **Bestsellers:** `home_best_sellers` setting + `is_featured` flags; BestSellersManager UI unused.

---

## 6. What can create wrong prices

1. **Catalogue Simple import** can overwrite shelf price / MRP without going through margin math.  
2. **Product form** is not the price editor (by design), but Excel / Strategy can diverge.  
3. **Missing compare/MRP** can be recomputed from inflate rules — display may not match what you typed elsewhere.  
4. **Store vs online dual prices** were collapsed; residual `store_price` fields can confuse operators.  
5. **POS QR scan can embed a price override** that differs from the catalogue shelf price.

---

## 7. What can create wrong stock

1. Stock lives in **three places**: `shared_stock_kg`, pack `quick_variants[].stock`, and `products.stock_quantity`.  
2. Offline POS can sell from a **local preview** that drifts until sync.  
3. Combo components are **not auto-deducted** from stock when selling a combo.  
4. Custom POS lines without a product ID **do not deduct** stock.  
5. Label “batch sold” status (when tables exist) is separate from stock — today **label tables are missing in production**.

---

## 8. What can create wrong profit reports

1. There is **no true Profit / Net Profit report**.  
2. Pricing / Packaging / Merchandising screens show **planning margins**, not historical P&L.  
3. Order snapshots store purchase content cost **without packaging/labour/payment fees**.  
4. Overview revenue uses a **sample of recent orders** (limit), not a full ledger.  
5. Expenses, delivery actual cost, and till cash/UPI totals are **not consolidated**.

---

## 9. What is safe to keep (for now)

- Counter POS, Orders, Delivery board  
- Products, Pricing Strategy, Categories, Media  
- Coupons, Bonus, Customers, Inventory ledger  
- Settings, Staff, SEO (product), Page visibility  
- Marketing Catalogues (PDF)  
- Packaging (as cost insight — not as shelf writer)

---

## 10. What needs consolidation

1. **One price writer** (recommend Pricing Strategy as canonical; Excel import must only feed cost or go through Strategy).  
2. **One variant source** (keep `quick_variants` until PIM shadow is proven, then migrate deliberately).  
3. **One combo system** (`product_bundles` appears newer/richer).  
4. **Stories naming** (long-form vs vertical editorial).  
5. **Label tables** must either be migrated to production or the Labels UI marked offline.  
6. Remove or archive orphan Hero/Homepage/Regions/Collections pages.

---

## 11. What should not be touched yet

- Live POS sale path and stock deduction in the Cloudflare Worker  
- Order payment verification / Razorpay finalize  
- Bonus ledger RPCs  
- Any bulk “delete unused tables” without a second audit of worker triggers  
- Public editorial activation without owner QA

---

## 12. Highest-risk problems

| # | Risk | Why it matters |
|---|---|---|
| 1 | Labels UI without live label tables | Printing/barcode mapping may fail silently or error |
| 2 | Two price writers (Strategy vs Excel Selling Price) | Website/POS prices can diverge from intended margin |
| 3 | Triple stock storage | Wrong pack stock vs bulk kg shows “in stock” incorrectly |
| 4 | No expense / closing / recon | Owner cannot trust “net profit” numbers from any screen |
| 5 | Profit calculators ≠ sale-time profit | Changing purchase rate rewrites planning margins, not history |
| 6 | Dual combo systems | Bundles on shop may not match what admin edited |
| 7 | Offline POS stock drift | Counter can oversell until sync rejects |
| 8 | Merchandising Review looks like it changes products | It does not — decisions stay in proposal table |
| 9 | DEV editorial CMS route without auth | Security smell if ever exposed outside DEV |
| 10 | Shadow `product_variants` (551 rows) unused by shop/POS | Future imports may write the “wrong” table |

---

## 13. Recommended cleanup order (do not execute in this audit)

1. Confirm Labels: migrate missing tables **or** hide Labels until ready.  
2. Freeze a **single price-of-truth** rule and document who may write prices.  
3. Map every SKU’s stock path (bulk vs unit) and fix inconsistent products.  
4. Choose one combo system; freeze the other for writes.  
5. Add (or explicitly postpone) Expenses + Daily Closing before claiming “profit”.  
6. Archive orphan admin pages.  
7. Only then simplify navigation.

---

## Concise module table

| Module | What it currently does | Used? | Main problem | Action |
|---|---|---|---|---|
| Overview | Counts + today’s paid revenue sample | Yes | Not full finance | Keep / later report |
| Counter POS | Bills, payments, stock, coupons, bonus | Yes | Offline drift; no till close | Keep / Fix |
| Orders | List/update website+POS orders | Yes | “Revenue” ≠ paid-only | Keep |
| Delivery | Dispatch + fee/cost fields | Yes | Checkout fee disabled | Keep |
| Inventory | Adjustments + movement ledger | Yes | Multi stock sources | Keep / Fix |
| Products | Catalogue CRUD, packs, stock, SEO | Yes | Not price editor | Keep |
| Pricing Strategy | Cost→margin→shelf+MRP writer | Yes | Competing Excel writes | Keep / Canonical |
| Packaging | BOM landed cost preview | Partial | Doesn’t set shelf price | Keep (insight) |
| Coupons | % / fixed discounts | Yes | — | Keep |
| Yasvik Bonus | Earn/redeem points | Yes | Earn blocked if any discount | Keep |
| Customers / Retention | CRM + repeat metrics | Yes | Needs phone | Keep |
| Campaigns (WhatsApp) | Segment export | Partial | No send | Fix or Hide |
| Catalogue Manager | Excel PIM import/export | Partial | Overwrites prices | Fix rules |
| Marketing Catalogues | PDF generation | Yes | Naming clash | Keep / Rename |
| Labels | Print UI | **Broken/partial** | Tables missing in DB | Investigate |
| Categories | Aisle tree | Yes | Legacy duplicates | Keep / Clean |
| Media | R2 library | Yes | — | Keep |
| Combos | Bundle products | Yes | Dual tables | Merge |
| Stories (long-form) | Blog-like stories | Yes | Name clash | Keep / Rename |
| Storefront Stories | 9:16 editorial | Partial | Flag-gated | Keep |
| Editorial Storefront | Campaigns/heroes/launch | Partial | Flag-gated | Keep |
| Merchandising Review | Scorecard proposals | Partial | No live write | Keep / Clarify |
| Journeys / People | Traceability content | Yes | Low volume | Keep |
| Illustrations | Page atmosphere art | Yes | Overlaps Settings hero | Merge later |
| SEO | Product SEO | Partial | Stories limited | Keep |
| Settings | Site/commerce flags | Yes | Large kitchen-sink | Keep |
| Staff | Roles | Yes | Admin-only | Keep |
| Page visibility | Hamburger menu | Yes | — | Keep |
| Hero/Homepage/Regions/Collections pages | Old editors | No | Orphans | Remove later |

---

## Headline counts (for the final response)

See `YASVIK_ADMIN_MODULE_REGISTER.md` and the closing section of this audit for the numeric roll-up.
