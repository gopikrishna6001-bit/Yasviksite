# Catalogue Manager — Phase 2

Simple workbook import is live.

## Flow

1. Export `YASVIK_CATALOGUE_SIMPLE.xlsx`
2. Edit yellow cells (PRODUCTS / PACKS_PRICING)
3. **Import** → Upload & validate
4. Review errors / warnings / field diffs
5. **Save draft** (nothing live yet)
6. **Publish approved draft**
7. **Rollback** from history if needed (product/pack snapshot only; orders untouched)

## Modes

- `UPDATE_EXISTING` — safest; no creates
- `ADD_AND_UPDATE` — create missing product codes / SKUs

## Schema

- `catalogue_import_runs`
- `catalogue_import_changes`

Migration: `20260802020000_catalogue_pim_phase2_import.sql`

## Not in Phase 2

- Media ZIP (Phase 3)
- SETTINGS → DB margin write-back (Phase 4)
- BATCH_LABELS persist (Phase 5)
