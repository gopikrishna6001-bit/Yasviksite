-- Coupons, redemptions, and order discount columns for POS + web checkout

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  min_order_paise INTEGER NOT NULL DEFAULT 0 CHECK (min_order_paise >= 0),
  max_discount_paise INTEGER CHECK (max_discount_paise IS NULL OR max_discount_paise > 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  per_customer_limit INTEGER DEFAULT 1 CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
  channels TEXT NOT NULL DEFAULT 'both' CHECK (channels IN ('both', 'pos', 'web')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coupons_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_coupons_channels ON public.coupons (channels);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  discount_paise INTEGER NOT NULL CHECK (discount_paise >= 0),
  channel TEXT NOT NULL CHECK (channel IN ('pos', 'web')),
  customer_phone TEXT,
  customer_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions (coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order ON public.coupon_redemptions (order_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_phone ON public.coupon_redemptions (customer_phone);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_email ON public.coupon_redemptions (customer_email);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_paise INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type TEXT,
  ADD COLUMN IF NOT EXISTS discount_label TEXT;

-- Keep legacy discount_amount in sync when present (rupees)
COMMENT ON COLUMN public.orders.discount_paise IS 'Discount applied in paise (source of truth for worker)';
COMMENT ON COLUMN public.orders.discount_type IS 'manual_percent | manual_fixed | coupon';
COMMENT ON COLUMN public.orders.discount_label IS 'Display label e.g. 10% or MONSOON10';

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage coupons" ON public.coupons;
CREATE POLICY "Staff manage coupons"
ON public.coupons FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "Staff read coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Staff read coupon redemptions"
ON public.coupon_redemptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'staff')
  )
);

-- Public can read active coupons for preview is intentionally NOT allowed —
-- validation goes through the Cloudflare worker (service role).
