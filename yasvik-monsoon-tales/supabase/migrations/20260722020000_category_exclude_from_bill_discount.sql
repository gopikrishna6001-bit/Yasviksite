-- Categories that never receive order-level / coupon / flat bill discounts.
-- Subcategories inherit from parent when the parent flag is set.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS exclude_from_bill_discount boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.categories.exclude_from_bill_discount IS
  'When true, products in this category (and descendants of a parent with the flag) are excluded from POS/online bill discounts.';
