# Yasvik unified transaction spine

Verified against live code paths in `cloudflare/worker.js`, admin POS, and web checkout (July 2026).

## Spine diagram

```
Web checkout / Admin POS / WhatsApp-tagged POS
        │
        ▼
  cloudflare/worker.js
  createCodOrder | razorpayCreateOrder → razorpayVerifyPayment | createPosSale
        │
        ├── orders INSERT (+ items_snapshot enriched with categories + purchase cost)
        ├── order_items INSERT
        ├── deductInventory → products PATCH + stock_movements (reference_type: order)
        └── linkCustomerAfterOrder → customers upsert → refresh_customer_crm RPC → orders.customer_id
```

## Channel entry points

| Channel | Client | Worker function | Stock deducted | CRM linked |
|---------|--------|-----------------|----------------|------------|
| Web — Razorpay | `CheckoutSummary.jsx` → `useRazorpay.js` | `razorpayCreateOrder` (pending, no stock) → `razorpayVerifyPayment` → `finalizePaidOrder` | On payment verify | If 10-digit phone |
| Web — COD | `CheckoutSummary.jsx` | `createCodOrder` | Immediately on create | If 10-digit phone |
| POS / counter | `AdminPOS.jsx` | `createPosSale` | Immediately | If 10-digit phone |
| POS offline sync | `posOfflineSync.js` | `createPosSale` (idempotent via `receipt_id`) | On sync | If phone provided |
| WhatsApp sale | `AdminPOS.jsx` (`order_channel: whatsapp`) | `createPosSale` | Same as POS | If phone provided |

## Key worker functions

### `deductInventory` (worker.js ~702)

Reads `order_items`, decrements `shared_stock_kg` or variant `stock` / `stock_quantity`, writes `stock_movements` with `reason`: `sale_web`, `sale_pos`, or `sale_cod`.

### `linkCustomerAfterOrder` (worker.js ~2019)

- **Requires** a normalised 10-digit Indian mobile number.
- Fail-open: never throws; billing completes even if CRM fails.
- Upserts `customers`, calls `refresh_customer_crm(p_phone)`, patches `orders.customer_id`.

### `refresh_customer_crm` (018_customers_crm.sql)

Aggregates spend, order count, favourite products/categories from `items_snapshot`, assigns auto-tags (`rice_buyer`, `inactive_30`, etc.).

## Verified gaps (known limitations)

1. **Walk-in POS without phone** — order and stock deduction succeed; CRM is skipped (`linkCustomerAfterOrder` returns early).
2. **Razorpay abandoned carts** — pending orders hold line items without stock deduction until payment or manual cancel.
3. **Offline POS** — local stock preview in `AdminPOS.jsx` may drift until `createPosSale` sync succeeds.
4. **Quick-stock edits** — previously bypassed `stock_movements`; now routed through `recordStockAdjustment` (reason: `count`).
5. **Delivery economics** — checkout fee collection disabled (`COLLECT_DELIVERY_FEE_AT_CHECKOUT = false`); charged vs actual courier cost captured at dispatch via `delivery_fee_charged_paise` / `delivery_cost_actual_paise`.
6. **Invoices** — PDF uploaded to R2; `orders.invoice_url` persisted after upload for CRM ↔ billing link.

## Stock ledger (single path)

All stock changes should go through `recordStockAdjustment` → `applyStockAdjustment` → `recordStockMovement`:

| Source | Reason |
|--------|--------|
| Web / COD / POS sale | `sale_web` / `sale_pos` via `deductInventory` |
| Admin Inventory form | `purchase`, `adjustment`, `return`, etc. |
| Admin Products quick ops | `count` |
| Bulk stock refill | `count` |

## Order snapshot enrichment

At sale time, `items_snapshot` lines include:

- `category_id`, `category_name`, `category_slug` — from `enrichItemsSnapshotCategories`
- `purchase_rate_per_kg`, `purchase_cost_paise`, `line_cost_paise` — from `enrichItemsSnapshotCosts`

Historical margin can be computed from snapshots without re-reading live catalogue prices.

## Test checklist

- [ ] POS sale with phone → order in admin, stock movement row, customer profile updated
- [ ] POS sale without phone → order + stock; no `customer_id` on order
- [ ] Web COD → stock deducted, CRM linked when guest phone valid
- [ ] Razorpay paid → stock deducted only after verify
- [ ] Admin Products stock edit → `stock_movements` row with reason `count`
- [ ] Dispatch with delivery costs → `delivery_fee_charged_paise` / `delivery_cost_actual_paise` on order
- [ ] Invoice PDF upload → `orders.invoice_url` populated
