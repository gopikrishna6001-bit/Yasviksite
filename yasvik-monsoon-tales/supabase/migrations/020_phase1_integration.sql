-- Phase 1 integration: delivery economics, invoice link
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_fee_charged_paise integer,
  ADD COLUMN IF NOT EXISTS delivery_cost_actual_paise integer,
  ADD COLUMN IF NOT EXISTS invoice_url text;

COMMENT ON COLUMN orders.delivery_fee_charged_paise IS 'Courier fee charged to customer (paise); set at dispatch when not collected at checkout';
COMMENT ON COLUMN orders.delivery_cost_actual_paise IS 'Actual courier cost paid by Yasvik (paise); set at dispatch';
COMMENT ON COLUMN orders.invoice_url IS 'Public R2 URL of uploaded invoice PDF';
