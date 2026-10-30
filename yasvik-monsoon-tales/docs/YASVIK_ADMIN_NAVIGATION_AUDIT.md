# Yasvik Admin — Navigation & Route Audit

**Date:** 2026-08-02 · Read-only

## Roles

| Role | Login | Landing | Sees |
|---|---|---|---|
| admin | Google (daily IST session) | `/admin` | All 32 nav items |
| manager | Google (daily) | `/admin` | All except Settings + Staff |
| cashier | Email/password | `/admin/pos` | POS, Orders, Inventory only |

Gating: `ProtectedRoute` → `AdminPathGuard` (`src/lib/adminAccess.js`) → sidebar filter.

---

## Visible sidebar (32 items)

Source: `src/components/admin/AdminSidebar.jsx`

| # | Menu label | Route | Roles | Loads | Saves data | Data used live? | Duplicates | Safe to retain? |
|---|---|---|---|---|---|---|---|---|
| 1 | Overview | `/admin` | admin, manager | Yes | No | Dashboard only | — | Yes |
| 2 | Counter POS | `/admin/pos` | +cashier | Yes | Yes → orders/stock | Yes | — | Yes |
| 3 | Orders | `/admin/orders` | +cashier | Yes | Yes | Yes | — | Yes |
| 4 | Customers | `/admin/customers` | admin, manager | Yes | Yes (CRM) | Yes | Detail route hidden | Yes |
| 5 | Retention | `/admin/retention` | admin, manager | Yes | Read + worker stats | Partial metrics | — | Yes |
| 6 | Yasvik Bonus | `/admin/bonus` | admin, manager | Yes | Yes | Yes | — | Yes |
| 7 | Campaigns | `/admin/campaigns` | admin, manager | Yes | Segments / export | **No WhatsApp send** | Editorial Campaigns | Clarify name |
| 8 | Catalogues | `/admin/marketing/catalogues` | admin, manager | Yes | PDF gens | Public `/catalogue` | Catalogue Manager | Rename |
| 9 | Delivery board | `/admin/delivery` | admin, manager | Yes | Order dispatch fields | Yes | — | Yes |
| 10 | Inventory ledger | `/admin/inventory` | +cashier | Yes | stock_movements | Yes | — | Yes |
| 11 | Products | `/admin/products` | admin, manager | Yes | products | Yes | — | Yes |
| 12 | Catalogue Manager | `/admin/catalogue-manager` | admin, manager | Yes | products + import audit | Yes / price risk | Marketing Catalogues | Yes w/ rules |
| 13 | Merchandising Review | `/admin/merchandising-review` | admin, manager | Yes | proposals only | **Not storefront** | Editorial heroes | Clarify |
| 14 | Editorial Storefront | `/admin/editorial-storefront` | admin, manager | Yes | editorial_* | Flag-gated | Campaigns name | Yes |
| 15 | Editorial Preview | `/admin/storefront-preview/editorial` | admin, manager | Yes | No | Preview only | — | Yes |
| 16 | Storefront Stories | `/admin/storefront-stories` | admin, manager | Yes | storefront_stories | Flag-gated | Long-form Stories | Rename |
| 17 | Pricing Strategy | `/admin/pricing` | admin, manager | Yes | quick_variants + meta | **Yes shelf** | Excel Selling Price | Canonical |
| 18 | Packaging costs | `/admin/packaging` | admin, manager | Yes | packaging_* | Planning only | Strategy pack ₹ | Keep insight |
| 19 | Coupons | `/admin/coupons` | admin, manager | Yes | coupons | Yes | Manual POS disc. | Yes |
| 20 | Price Labels | `/admin/labels` | admin, manager | Yes UI | Intended label_* | **DB tables missing** | — | Investigate |
| 21 | Categories | `/admin/categories` | admin, manager | Yes | categories | Yes | — | Yes |
| 22 | Media | `/admin/media` | admin, manager | Yes | media_assets + R2 | Yes | Catalogue media tab | Yes |
| 23 | Journeys | `/admin/journeys` | admin, manager | Yes | journeys | Yes | — | Yes |
| 24 | Stories | `/admin/stories` | admin, manager | Yes | stories | Yes | Storefront Stories | Rename |
| 25 | People | `/admin/people` | admin, manager | Yes | people | Yes | — | Yes |
| 26 | Combos | `/admin/combos` | admin, manager | Yes | product_bundles (+legacy) | Yes / dual | — | Merge later |
| 27 | Illustrations | `/admin/illustrations` | admin, manager | Yes | app_settings slots | Yes | Settings hero | Later merge |
| 28 | Hamburger Menu | `/admin/page-visibility` | admin, manager | Yes | page_settings | Yes | — | Yes |
| 29 | SEO Manager | `/admin/seo` | admin, manager | Yes | product SEO | Partial | — | Yes |
| 30 | Settings | `/admin/settings` | **admin** | Yes | app_settings | Yes | Illustrations | Yes |
| 31 | Staff & Access | `/admin/staff` | **admin** | Yes | user_profiles | Yes | — | Yes |

---

## Hidden / alias / redirect routes

| Route | Type | Notes |
|---|---|---|
| `/admin/customers/:id` | Live | Customer detail; not in sidebar |
| `/admin/catalogues` | Alias | Same as marketing catalogues |
| `/admin/benchmark-pricing` | Redirect | → `/admin/pricing` |
| `/admin/regions` | Redirect | → settings (orphan AdminRegions.jsx) |
| `/admin/page-heroes` | Redirect | → illustrations |
| `/admin/collections` | Redirect | → settings |
| `/admin/homepage` | Redirect | → settings |
| `/admin/hero` | Redirect | → illustrations |
| `/admin/pages` | Redirect | → settings |
| `/admin-login` | Public | Auth entry |
| `/pos-scan` | Public | Barcode QR helper |
| `/__editorial-admin-cms` | DEV only | **No auth wrapper** — security smell |
| `/__editorial-preview` | DEV only | Editorial homepage preview |

---

## Orphan page files (not imported in App.jsx)

- `AdminHomepage.jsx`
- `AdminHero.jsx`
- `AdminRegions.jsx`
- `AdminCollections.jsx`
- `AdminPageHeroes.jsx` (+ `PageHeroEditor.jsx` only used here)

## Dead component

- `BestSellersManager.jsx` — zero imports; bestsellers edited via product `is_featured` / settings elsewhere

---

## Empty / placeholder / mock / hard-coded

| Item | Assessment |
|---|---|
| Merchandising Review | Real DB proposals; explicitly non-live for products |
| Campaigns WhatsApp | Real segments; send is disabled / prep-only |
| Catalogue Manager tabs | Some “coming soon” (batches/labels/settings) |
| Overview | Real queries but capped (e.g. last ~250 orders) |
| Packaging profiles | Live tables; some BOMs empty (0 components) |
| Google reviews in Settings | Manual paste into settings (not live Google API sync) |
| Collections / Regions / page_heroes tables | Data remnants; admin UI redirected away |

---

## Feature flags

| Flag | Effect |
|---|---|
| `import.meta.env.DEV` | Registers unauthenticated editorial CMS/preview routes |
| `VITE_ENABLE_GOOGLE_AUTH` | Google login on admin |
| `app_settings.editorial_storefront_public` | Public home uses editorial layout |
| `editorial_preview_qa_pass` | Owner QA gate before activation |
| Worker `COLLECT_DELIVERY_FEE_AT_CHECKOUT = false` | No delivery fee at web checkout |
