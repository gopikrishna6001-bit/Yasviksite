# Launch Batch 1 — Readiness Report

**Date:** 2026-07-26  
**Scope:** Dry Fruits Launch Batch 1 only  
**Rules observed:** no draft publishes; no AI image generation; no live individual price/stock overwrites; combo stock set to 0 for prepacked model only.

---

## Summary

| Metric | Value |
|--------|------:|
| Launch Batch 1 products | 20 |
| Image brief manifest rows | 22 |
| Products published by this phase | 0 |
| Live individual prices overwritten | 0 |
| Live individual stock overwritten | 0 |

### Sesame removal summary

- Removed from shop/search: `native-sesame-seeds` (soft-archived as `native-sesame-seeds-archived-20260726`).
- Retained: `white-sesame-seeds` (still draft; **not** in Launch Batch 1).
- Alias: `native-sesame-seeds` → `white-sesame-seeds`.
- Full detail: [SESAME-REMOVAL-NOTE.md](./SESAME-REMOVAL-NOTE.md).

### Combo inventory safeguard summary

- Model kept: `product_group = packaged_combo`, `inventory_mode = prepacked_stock`.
- Combo stock defaulted to **0** (independent packed units only; no BOM deduction).
- Admin helper + save confirm warning added (admin-only; not customer-facing).
- TODO for future: BOM inventory, made-to-order bundles, component deduction, substitution rules.

### Image manifest

- File: `image-generation-manifest-launch-batch-1.csv`
- Row count: **22** (15 individual heroes + 5 combo heroes + 2 collection banners)
- All `status = ready_for_generation`
- No images generated in this phase.

---

## Legend

| Field | Meaning |
|-------|---------|
| draft/published | Current storefront publish state |
| supplier cost entered | Supplier / cost fields present on product (blank if empty) |
| packaging cost entered | Linked row in `product_variant_packaging` |
| selling price approved | Selling price &gt; 0 and intentional for live SKUs; drafts with 0 = not approved |
| stock entered | Stock &gt; 0, or combo explicitly at 0 for prepacked model |
| ingredients confirmed | Non-empty `ingredients` |
| image brief ready | `image_status = brief_ready` (or later) |
| image generated | Workflow past brief (none yet) |
| compliance reviewed | Requires human sign-off (all pending) |

---

## Launch Batch 1 — Individuals (15)

### Almonds — `badam-almonds` — SKU `YAS-PREMIUMB-TWFYF`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no (0 packaging links) |
| selling price approved | yes (live ₹1169 kept) |
| stock entered | yes (20; unchanged) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; image generation/approval; compliance |
| next action | Confirm packaging BOM + ingredients; generate hero from brief |

### Cashew Nuts — `cashews` — SKU `YAS-PREMIUMC-U2WDF`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹119 kept) |
| stock entered | yes (20) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; image generation/approval; compliance |
| next action | Confirm packaging + ingredients; generate hero |

### Salted Pistachios — `salted-pista` — SKU `YAS-104`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹1929 kept) |
| stock entered | yes (20) |
| ingredients confirmed | yes (`Pistachios, salt.`) |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; image generation/approval; compliance; verify in-shell photography |
| next action | Generate in-shell pistachio hero; packaging cost |

### Walnut Kernels — `walnuts` — SKU `YAS-120`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹2029 kept) |
| stock entered | yes (20) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; image generation/approval; compliance |
| next action | Confirm ingredients; generate shelled-kernel hero |

### Dried Figs — `anjeer-rvnea` — SKU `YAS-137`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹1759 kept) |
| stock entered | yes (19) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; hero image missing on product; image generation/approval; compliance |
| next action | Generate dried-fig hero; upload after approval |

### Golden Raisins — `green-raisins` — SKU `YAS-034`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹389 kept) |
| stock entered | yes (20) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; image generation/approval; compliance |
| next action | Confirm golden colour accuracy in generated image |

### Black Raisins — `black-raisins` — SKU `YAS-PREMIUMB-JGOHK`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹489 kept) |
| stock entered | yes (20) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; image generation/approval; compliance |
| next action | Confirm dark raisins (not berries) in image review |

### Kimia Dates — `kimia-dates` — SKU `YAS-DF-KIMIA`

| Check | Status |
|-------|--------|
| draft/published | **draft** (remain unpublished) |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no (₹0) |
| stock entered | no (0) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; supplier cost; packaging; ingredients; image; compliance; publish gate |
| next action | Enter cost/price/stock; source reference for Kimia photography |

### Makhana — `makhana` — SKU `YAS-DF-MAKH`

| Check | Status |
|-------|--------|
| draft/published | **draft** |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no (₹0) |
| stock entered | no (0) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; supplier cost; packaging; ingredients; image; compliance; publish gate |
| next action | Enter commercial fields; generate fox-nut accurate hero |

### Pumpkin Seeds — `pumpkin-seeds` — SKU `YAS-PREMIUMP-GRAZO`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹779 kept) |
| stock entered | yes (5) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; image generation/approval; compliance |
| next action | Confirm hulled pepitas appearance |

### Sunflower Seeds — `sunflower-seeds` — SKU `YAS-109`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹519 kept) |
| stock entered | yes (20) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; image generation/approval; compliance |
| next action | Confirm product form vs supplier |

### Watermelon Seeds — `watermelon-seeds` — SKU `YAS-121`

| Check | Status |
|-------|--------|
| draft/published | published |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | yes (live ₹1109 kept) |
| stock entered | yes (20) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | packaging cost; ingredients; **source_reference_needed** for image form; compliance |
| next action | Verify supplier product form before image generation |

### Flax Seeds — `flax-seeds-yas-007` — SKU `YAS-007`

| Check | Status |
|-------|--------|
| draft/published | **draft** (price ₹229 present but unpublished) |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | pending human approval (₹229 set; not live) |
| stock entered | yes (20) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | publish gate; packaging; ingredients; image approval; compliance; price approval sign-off |
| next action | Approve price; ingredients; packaging; then consider publish |

### Chia Seeds — `chia-seeds` — SKU `YAS-DF-CHIA`

| Check | Status |
|-------|--------|
| draft/published | **draft** |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no (₹0) |
| stock entered | no (0) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; supplier cost; packaging; ingredients; image; compliance; publish gate |
| next action | Enter commercial fields; generate mixed-colour chia hero |

### Sabja Seeds — `sabja-seeds` — SKU `YAS-DF-SABJA`

| Check | Status |
|-------|--------|
| draft/published | **draft** |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no (₹0) |
| stock entered | no (0) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; supplier cost; packaging; ingredients; image; compliance; publish gate |
| next action | Enter commercial fields; ensure image is not chia |

---

## Launch Batch 1 — Combos (5)

All five: `packaged_combo` / `prepacked_stock` / stock **0** / **draft** / price **₹0** / image brief ready / image not generated.

### Yasvik Everyday Dry Fruit Combo — `yasvik-everyday-dry-fruit-combo` — SKU `YAS-DF-C-EVDY`

| Check | Status |
|-------|--------|
| draft/published | draft |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no |
| stock entered | yes (0 intentional prepacked default) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; packed-unit stock &gt; 0 when ready; ingredients list; image; compliance; publish gate |
| next action | Set selling price; pack physical units then set stock; generate combo hero |

### Yasvik Seven Superfoods Combo — `yasvik-seven-superfoods-combo` — SKU `YAS-DF-C-SEVN`

| Check | Status |
|-------|--------|
| draft/published | draft |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no |
| stock entered | yes (0 intentional) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; ingredients; image; compliance; publish gate |
| next action | Same as Everyday combo |

### Yasvik Five Seeds Combo — `yasvik-five-seeds-combo` — SKU `YAS-DF-C-5KG`

| Check | Status |
|-------|--------|
| draft/published | draft |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no |
| stock entered | yes (0 intentional) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; ingredients; image; compliance; publish gate |
| next action | Same as Everyday combo |

### Yasvik Family Dry Fruit & Seeds Combo — `yasvik-family-dry-fruit-seeds-combo` — SKU `YAS-DF-C-FMLY`

| Check | Status |
|-------|--------|
| draft/published | draft |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no |
| stock entered | yes (0 intentional) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; ingredients; image; compliance; publish gate |
| next action | Same as Everyday combo |

### Yasvik Premium Family Combo — `yasvik-premium-family-combo` — SKU `YAS-DF-C-PREM`

| Check | Status |
|-------|--------|
| draft/published | draft |
| supplier cost entered | no |
| packaging cost entered | no |
| selling price approved | no |
| stock entered | yes (0 intentional) |
| ingredients confirmed | no |
| image brief ready | yes |
| image generated | no |
| compliance reviewed | no |
| blockers | price; stock; ingredients; image; compliance; publish gate |
| next action | Same as Everyday combo |

---

## Products still blocked from publication

These Batch 1 SKUs must stay unpublished until commercial + image + compliance gates clear:

1. `kimia-dates`
2. `makhana`
3. `chia-seeds`
4. `sabja-seeds`
5. `flax-seeds-yas-007`
6. `yasvik-everyday-dry-fruit-combo`
7. `yasvik-seven-superfoods-combo`
8. `yasvik-five-seeds-combo`
9. `yasvik-family-dry-fruit-seeds-combo`
10. `yasvik-premium-family-combo`

Already-live Batch 1 individuals remain published as before; they are not “publication-blocked,” but still have launch polish blockers (ingredients, packaging cost links, image workflow, compliance review).

Non–Batch 1 dry-fruit drafts (including `white-sesame-seeds`) remain `launch_batch = later` and unpublished.

---

## Confirmation checklist

- [x] No products published by this phase
- [x] No live individual prices overwritten
- [x] Combo stock set to 0 only for packaged combos (inventory model)
- [x] No AI images generated
- [x] Image briefs only (22 rows)
- [x] `native-sesame-seeds` removed from live shop/search
- [x] `white-sesame-seeds` retained
