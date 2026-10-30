-- Lightweight customer CRM: phone-keyed profiles, order link, marketing prep

-- ============================================================================
-- CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_digits TEXT NOT NULL,
  name TEXT,
  email TEXT,
  address_snapshot JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  order_count INTEGER NOT NULL DEFAULT 0,
  lifetime_spend_paise BIGINT NOT NULL DEFAULT 0,
  avg_order_value_paise BIGINT NOT NULL DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  preferred_payment_method TEXT,
  preferred_channel TEXT,
  notes TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_consent_at TIMESTAMPTZ,
  manual_tags TEXT[] NOT NULL DEFAULT '{}',
  auto_tags TEXT[] NOT NULL DEFAULT '{}',
  insights JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_phone_digits_unique UNIQUE (phone_digits),
  CONSTRAINT customers_phone_digits_len CHECK (phone_digits ~ '^[0-9]{10}$')
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone_digits);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_user ON public.customers (user_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_order ON public.customers (last_order_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_customers_lifetime ON public.customers (lifetime_spend_paise DESC);
CREATE INDEX IF NOT EXISTS idx_customers_auto_tags ON public.customers USING GIN (auto_tags);
CREATE INDEX IF NOT EXISTS idx_customers_manual_tags ON public.customers USING GIN (manual_tags);

-- ============================================================================
-- ORDERS — customer_id + whatsapp channel
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_order_channel_check'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_order_channel_check;
  END IF;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Soft validate channel values via comment; avoid hard fail on legacy rows
COMMENT ON COLUMN public.orders.order_channel IS 'web | pos | whatsapp';

-- ============================================================================
-- MARKETING PREP (no auto-sends)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  segment_id UUID REFERENCES public.customer_segments(id) ON DELETE SET NULL,
  template_body TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'archived')),
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone_digits TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'exported', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_campaign_recipients_campaign
  ON public.whatsapp_campaign_recipients (campaign_id);

-- ============================================================================
-- HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(raw TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN length(digits) >= 10 THEN right(digits, 10)
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(raw, ''), '\D', '', 'g') AS digits) s
  WHERE length(digits) >= 10;
$$;

CREATE OR REPLACE FUNCTION public.category_auto_tags(cat_text TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t TEXT := lower(coalesce(cat_text, ''));
  tags TEXT[] := '{}';
BEGIN
  IF t ~ 'rice|millet|grain' THEN tags := array_append(tags, 'rice_buyer'); END IF;
  IF t ~ 'millet' THEN tags := array_append(tags, 'millet_buyer'); END IF;
  IF t ~ 'honey|ghee|oil' THEN tags := array_append(tags, 'honey_buyer'); END IF;
  IF t ~ 'pickle|condiment' THEN tags := array_append(tags, 'pickle_buyer'); END IF;
  IF t ~ 'dry.?fruit|nut|date|almond|cashew' THEN tags := array_append(tags, 'dry_fruit_buyer'); END IF;
  IF t ~ 'organic' THEN tags := array_append(tags, 'organic_buyer'); END IF;
  RETURN tags;
END;
$$;

/**
 * Recompute aggregates, insights, auto_tags for a phone; link unmatched orders.
 * Safe to call after every paid/completed order. Returns customer id or null.
 */
CREATE OR REPLACE FUNCTION public.refresh_customer_crm(p_phone TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  digits TEXT := public.normalize_phone_digits(p_phone);
  cust_id UUID;
  agg RECORD;
  fav_products JSONB := '[]'::jsonb;
  fav_categories JSONB := '[]'::jsonb;
  recent_products JSONB := '[]'::jsonb;
  freq_products JSONB := '[]'::jsonb;
  auto TEXT[] := '{}';
  days_since NUMERIC;
  avg_gap NUMERIC;
  likely TIMESTAMPTZ;
  pay_mode TEXT;
  pref_channel TEXT;
  insights_json JSONB;
BEGIN
  IF digits IS NULL OR length(digits) <> 10 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.customers (phone_digits)
  VALUES (digits)
  ON CONFLICT (phone_digits) DO NOTHING;

  SELECT id INTO cust_id FROM public.customers WHERE phone_digits = digits;

  -- Link orders missing customer_id
  UPDATE public.orders o
  SET customer_id = cust_id
  WHERE o.customer_id IS NULL
    AND public.normalize_phone_digits(coalesce(o.customer_phone, o.guest_phone)) = digits;

  SELECT
    count(*)::int AS order_count,
    coalesce(sum(coalesce(o.amount_paise, round(coalesce(o.total_amount, 0) * 100)::bigint)), 0)::bigint AS lifetime_spend_paise,
    min(coalesce(o.completed_at, o.created_at)) AS first_order_at,
    max(coalesce(o.completed_at, o.created_at)) AS last_order_at
  INTO agg
  FROM public.orders o
  WHERE o.customer_id = cust_id
    AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
    AND coalesce(o.status, '') NOT IN ('failed', 'cancelled');

  IF coalesce(agg.order_count, 0) = 0 THEN
    UPDATE public.customers SET
      order_count = 0,
      lifetime_spend_paise = 0,
      avg_order_value_paise = 0,
      updated_at = NOW()
    WHERE id = cust_id;
    RETURN cust_id;
  END IF;

  SELECT o.payment_method INTO pay_mode
  FROM public.orders o
  WHERE o.customer_id = cust_id
    AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
  GROUP BY o.payment_method
  ORDER BY count(*) DESC
  LIMIT 1;

  SELECT o.order_channel INTO pref_channel
  FROM public.orders o
  WHERE o.customer_id = cust_id
    AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
  GROUP BY o.order_channel
  ORDER BY count(*) DESC
  LIMIT 1;

  -- Favourite / frequent products from items_snapshot
  WITH lines AS (
    SELECT
      coalesce(item->>'product_id', item->>'title') AS product_key,
      coalesce(item->>'title', 'Item') AS title,
      item->>'variant' AS variant,
      item->>'category_id' AS category_id,
      coalesce(item->>'category_name', '') AS category_name,
      coalesce((item->>'qty')::numeric, 1) AS qty,
      coalesce(o.completed_at, o.created_at) AS ordered_at
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items_snapshot, '[]'::jsonb)) AS item
    WHERE o.customer_id = cust_id
      AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
      AND coalesce(o.status, '') NOT IN ('failed', 'cancelled')
  ),
  by_product AS (
    SELECT product_key, max(title) AS title, max(variant) AS variant,
           sum(qty) AS total_qty, count(*) AS line_orders, max(ordered_at) AS last_at
    FROM lines
    WHERE product_key IS NOT NULL
    GROUP BY product_key
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'key', product_key, 'title', title, 'variant', variant,
    'total_qty', total_qty, 'order_count', line_orders, 'last_ordered_at', last_at
  ) ORDER BY total_qty DESC, last_at DESC), '[]'::jsonb)
  INTO fav_products
  FROM (SELECT * FROM by_product ORDER BY total_qty DESC, last_at DESC LIMIT 8) s;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'key', product_key, 'title', title, 'variant', variant,
    'total_qty', total_qty, 'order_count', line_orders, 'last_ordered_at', last_at
  ) ORDER BY line_orders DESC, total_qty DESC), '[]'::jsonb)
  INTO freq_products
  FROM (
    SELECT product_key, max(title) AS title, max(variant) AS variant,
           sum(qty) AS total_qty, count(*) AS line_orders, max(ordered_at) AS last_at
    FROM (
      SELECT
        coalesce(item->>'product_id', item->>'title') AS product_key,
        coalesce(item->>'title', 'Item') AS title,
        item->>'variant' AS variant,
        coalesce((item->>'qty')::numeric, 1) AS qty,
        coalesce(o.completed_at, o.created_at) AS ordered_at
      FROM public.orders o
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items_snapshot, '[]'::jsonb)) AS item
      WHERE o.customer_id = cust_id
        AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
    ) x
    GROUP BY product_key
    ORDER BY count(*) DESC, sum(qty) DESC
    LIMIT 8
  ) s;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'title', title, 'variant', variant, 'ordered_at', ordered_at
  ) ORDER BY ordered_at DESC), '[]'::jsonb)
  INTO recent_products
  FROM (
    SELECT * FROM (
      SELECT DISTINCT ON (coalesce(item->>'product_id', item->>'title'))
        coalesce(item->>'title', 'Item') AS title,
        item->>'variant' AS variant,
        coalesce(o.completed_at, o.created_at) AS ordered_at
      FROM public.orders o
      CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items_snapshot, '[]'::jsonb)) AS item
      WHERE o.customer_id = cust_id
        AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
      ORDER BY coalesce(item->>'product_id', item->>'title'), coalesce(o.completed_at, o.created_at) DESC
    ) x
    ORDER BY ordered_at DESC
    LIMIT 8
  ) r;

  WITH cats AS (
    SELECT
      coalesce(nullif(item->>'category_name', ''), 'Uncategorised') AS category_name,
      sum(coalesce((item->>'qty')::numeric, 1)) AS total_qty
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items_snapshot, '[]'::jsonb)) AS item
    WHERE o.customer_id = cust_id
      AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
    GROUP BY 1
    ORDER BY 2 DESC
    LIMIT 6
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', category_name, 'total_qty', total_qty)), '[]'::jsonb)
  INTO fav_categories
  FROM cats;

  -- Auto tags from category names + product titles
  SELECT array_agg(DISTINCT t)
  INTO auto
  FROM (
    SELECT unnest(public.category_auto_tags(
      coalesce(item->>'category_name', '') || ' ' || coalesce(item->>'title', '')
    )) AS t
    FROM public.orders o
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(o.items_snapshot, '[]'::jsonb)) AS item
    WHERE o.customer_id = cust_id
      AND coalesce(o.payment_status, '') IN ('paid', 'pending_cod')
  ) x
  WHERE t IS NOT NULL;

  auto := coalesce(auto, '{}');

  IF agg.order_count >= 2 THEN
    auto := array_append(auto, 'repeat');
  END IF;

  IF agg.lifetime_spend_paise >= 500000 OR (agg.lifetime_spend_paise / agg.order_count) >= 200000 THEN
    auto := array_append(auto, 'high_value');
  END IF;

  days_since := EXTRACT(EPOCH FROM (NOW() - agg.last_order_at)) / 86400.0;
  IF days_since >= 90 THEN
    auto := array_append(auto, 'inactive_90');
  ELSIF days_since >= 60 THEN
    auto := array_append(auto, 'inactive_60');
  ELSIF days_since >= 30 THEN
    auto := array_append(auto, 'inactive_30');
  END IF;

  IF agg.order_count >= 2 THEN
    avg_gap := EXTRACT(EPOCH FROM (agg.last_order_at - agg.first_order_at)) / 86400.0 / (agg.order_count - 1);
    IF avg_gap > 0 THEN
      likely := agg.last_order_at + (avg_gap || ' days')::interval;
    END IF;
  ELSE
    avg_gap := NULL;
    likely := agg.last_order_at + interval '45 days';
  END IF;

  auto := (SELECT array_agg(DISTINCT x) FROM unnest(auto) x WHERE x IS NOT NULL);

  insights_json := jsonb_build_object(
    'favourite_products', fav_products,
    'frequently_purchased', freq_products,
    'recently_purchased', recent_products,
    'favourite_categories', fav_categories,
    'lifetime_value_paise', agg.lifetime_spend_paise,
    'avg_purchase_frequency_days', avg_gap,
    'likely_reorder_at', likely,
    'days_since_last_purchase', round(days_since::numeric, 1)
  );

  UPDATE public.customers SET
    order_count = agg.order_count,
    lifetime_spend_paise = agg.lifetime_spend_paise,
    avg_order_value_paise = CASE WHEN agg.order_count > 0 THEN agg.lifetime_spend_paise / agg.order_count ELSE 0 END,
    first_order_at = agg.first_order_at,
    last_order_at = agg.last_order_at,
    preferred_payment_method = pay_mode,
    preferred_channel = pref_channel,
    auto_tags = coalesce(auto, '{}'),
    insights = insights_json,
    updated_at = NOW()
  WHERE id = cust_id;

  -- Enrich profile contact from latest order (non-empty only)
  UPDATE public.customers c SET
    name = coalesce(nullif(trim(o.customer_name), ''), c.name),
    email = coalesce(nullif(trim(coalesce(o.customer_email, o.guest_email)), ''), c.email),
    address_snapshot = CASE
      WHEN o.address_snapshot IS NOT NULL AND o.address_snapshot <> '{}'::jsonb THEN o.address_snapshot
      ELSE c.address_snapshot
    END,
    user_id = coalesce(c.user_id, CASE WHEN o.order_channel = 'web' THEN o.user_id ELSE NULL END)
  FROM (
    SELECT * FROM public.orders
    WHERE customer_id = cust_id
    ORDER BY coalesce(completed_at, created_at) DESC NULLS LAST
    LIMIT 1
  ) o
  WHERE c.id = cust_id;

  RETURN cust_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_customer_crm(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_customer_crm(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_customer_crm(TEXT) TO authenticated;

-- ============================================================================
-- BACKFILL
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT public.normalize_phone_digits(coalesce(customer_phone, guest_phone)) AS digits
    FROM public.orders
    WHERE public.normalize_phone_digits(coalesce(customer_phone, guest_phone)) IS NOT NULL
  LOOP
    PERFORM public.refresh_customer_crm(r.digits);
  END LOOP;
END $$;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage customers" ON public.customers;
CREATE POLICY "Staff manage customers"
ON public.customers FOR ALL
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

DROP POLICY IF EXISTS "Users read own customer row" ON public.customers;
CREATE POLICY "Users read own customer row"
ON public.customers FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff manage segments" ON public.customer_segments;
CREATE POLICY "Staff manage segments"
ON public.customer_segments FOR ALL
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

DROP POLICY IF EXISTS "Staff manage campaigns" ON public.whatsapp_campaigns;
CREATE POLICY "Staff manage campaigns"
ON public.whatsapp_campaigns FOR ALL
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

DROP POLICY IF EXISTS "Staff manage campaign recipients" ON public.whatsapp_campaign_recipients;
CREATE POLICY "Staff manage campaign recipients"
ON public.whatsapp_campaign_recipients FOR ALL
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
