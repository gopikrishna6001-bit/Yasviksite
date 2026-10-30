# COMBO-POPULATION-REPORT

**Date:** 2026-07-26 (updated — supplier accuracy audit)  
**Source:** Supplier catalogue contents + supplier 20-item breakup provided in audit  
**Architecture:** Existing `product_bundles` + `product_bundle_items` only  
**Rules observed:** no publish; no price/stock/SEO/image changes on live individuals; no duplicate catalogue products created for components

---

## Accuracy audit — Daily 17-item combo

### Exact component table

| # | Product | Qty | Pack count | Line weight |
|---|---------|-----|------------|-------------|
| 1 | Almonds (`badam-almonds`) | 100 g | 1 | 100 g |
| 2 | Cashew Nuts (`cashews`) | 100 g | 1 | 100 g |
| 3 | Salted Pistachios (`salted-pista`) | 50 g | 1 | 50 g |
| 4 | Walnut Kernels (`walnuts`) | 50 g | 1 | 50 g |
| 5 | Dried Figs (`anjeer-rvnea`) | 100 g | 1 | 100 g |
| 6 | Golden Raisins (`green-raisins`) | 100 g | 1 | 100 g |
| 7 | Black Raisins (`black-raisins`) | 100 g | 1 | 100 g |
| 8 | Dates (`dates`) | 100 g | 1 | 100 g |
| 9 | Makhana (`makhana`) | 100 g | 1 | 100 g |
| 10 | Pumpkin Seeds (`pumpkin-seeds`) | 100 g | 1 | 100 g |
| 11 | Sunflower Seeds (`sunflower-seeds`) | 100 g | 1 | 100 g |
| 12 | Watermelon Seeds (`watermelon-seeds`) | 100 g | 1 | 100 g |
| 13 | Flax Seeds (`flax-seeds-yas-007`) | 100 g | 1 | 100 g |
| 14 | Chia Seeds (`chia-seeds`) | 100 g | 1 | 100 g |
| 15 | Sabja Seeds (`sabja-seeds`) | 100 g | 1 | 100 g |
| 16 | Halim Seeds (`halim-seeds`) | 100 g | 1 | 100 g |
| 17 | White Sesame Seeds (`white-sesame-seeds`) | 100 g | 1 | 100 g |

### Arithmetic total

```
(15 × 100 g) + (2 × 50 g) = 1500 + 100 = 1600 g = 1.6 kg exactly
```

### Corrected / locked total weight

| Field | Value |
|-------|-------|
| `product_bundles.total_net_weight_g` | **1600** |
| `products.bundle_net_weight_g` | **1600** |
| Customer-facing exact total | **1600 g (1.6 kg)** |

### Mapping correction decision

| Question | Answer |
|----------|--------|
| Does component arithmetic equal 1.55 kg? | **No** — sum is **1600 g** |
| Was ~1.55 kg a rounding of components? | **No** — 1.6 kg is the exact component sum, not a rounded 1.55 |
| Were component quantities changed? | **No** — documented supplier catalogue lines already match DB rows |
| Difference vs poster visual estimate | Poster may *appear* ≈1.55 kg; project’s documented line quantities sum to **1600 g**. No alternate line-by-line poster weights were available to justify changing a component. |

---

## 20-item combo — Yasvik Grand Variety Combo

| Field | Value |
|-------|-------|
| Name | Yasvik Grand Variety Combo |
| Slug | `yasvik-grand-variety-combo` |
| Product ID | `a8c10001-b222-4222-8222-000000000020` |
| Bundle ID | `e8b10001-a111-4111-8111-000000000010` |
| `is_published` | **false** |
| `sell_online` | **false** |
| `price` | **₹0** |
| `stock` | **0** |
| Bundle status | **unresolved** |
| `has_unresolved_components` | **true** |
| Declared item count | **20** |
| Linked item rows | **18** |
| Customer-facing weight | **1.75 kg dry fruits and seeds + 10 chikki pieces** |
| Stored `total_net_weight_g` | **1750** (intended dry weight including unresolved Roasted Seeds 100 g) |
| Linked weighted sum (resolved only) | **1650 g** |

### 20-item mapping

| # | Supplier line | Qty | Linked Yasvik SKU | Status |
|---|---------------|-----|-------------------|--------|
| 1 | Cashew Nuts | 100 g | `cashews` | Linked |
| 2 | Almonds | 100 g | `badam-almonds` | Linked |
| 3 | Walnut Kernels | 50 g | `walnuts` | Linked |
| 4 | Makhana | 50 g | `makhana` | Linked |
| 5 | Golden Raisins | 100 g | `green-raisins` | Linked |
| 6 | Pumpkin Seeds | 100 g | `pumpkin-seeds` | Linked |
| 7 | Sunflower Seeds | 100 g | `sunflower-seeds` | Linked |
| 8 | Roasted Seeds | 100 g | — | **Unresolved** |
| 9 | Dried Figs / Anjeer | 100 g | `anjeer-rvnea` | Linked |
| 10 | Black Raisins | 100 g | `black-raisins` | Linked |
| 11 | Dry Dates | 100 g | `dry-dates` | Linked |
| 12 | Halim Seeds | 100 g | `halim-seeds` | Linked |
| 13 | Dried Kiwi | 100 g | `dried-kiwi` | Linked |
| 14 | Watermelon Seeds | 100 g | `watermelon-seeds` | Linked |
| 15 | Chia Seeds | 100 g | `chia-seeds` | Linked |
| 16 | Flax Seeds | 100 g | `flax-seeds-yas-007` | Linked |
| 17 | Salted Pistachios | 50 g | `salted-pista` | Linked |
| 18 | Sabja Seeds | 100 g | `sabja-seeds` | Linked |
| 19 | White Sesame Seeds | 100 g | `white-sesame-seeds` | Linked |
| 20 | Chikki | 10 pieces | — | **Unresolved** |

### Unresolved components

1. **Roasted Seeds (100 g)**  
   - Draft mix `roasted-seed-mix` exists but is **not** a confirmed canonical “Roasted Seeds” product (seasoning/ingredients pending).  
   - **Not linked** (do not invent / do not treat mix draft as confirmed).  

2. **Chikki (10 pieces)**  
   - No generic Chikki SKU.  
   - Existing `kaju-chikki-77wlz` / `palli-chikki-0kwcp` were **not** auto-linked.  
   - Net weight unknown — excluded from kg total.

### Publication blockers (Grand Variety)

- `has_unresolved_components = true`
- `bundle_status = unresolved`
- Price = 0
- Stock = 0
- Roasted Seeds unresolved
- Chikki unresolved / weight unconfirmed
- Must stay unpublished until resolved

---

## Earlier population summary (9 prior combos)

| Combo | Products | Weight | Status |
|-------|----------|--------|--------|
| Everyday | 5 | 600 g | Complete |
| Seven Seeds & Nuts | 7 | 700 g | Complete |
| Five Seeds | 5 | 1 kg | Complete |
| Family Dry Fruit & Seeds | 10 | 2.2 kg | Complete |
| Premium Family | 8 | 2.25 kg | Complete |
| Twelve | 12 | 1.2 kg | Complete |
| Daily (17 Item) | 17 | **1600 g** | Complete (weight audited) |
| Kids Snack | 5 | 600 g | Complete |
| Office Snack | 5 | 500 g | Complete |
| **Grand Variety (20 Item)** | 20 intended / 18 linked | **1.75 kg + 10 chikki** | **Incomplete / blocked** |

---

## Confirmations

- No product was published by this audit
- No live individual prices changed
- No live stock changed
- No SEO fields rewritten on live individuals
- No images generated
- No duplicate Almonds/Cashews/Raisins/etc. created
- Grand Variety created as **draft only** (`price=0`, `stock=0`, unpublished)
