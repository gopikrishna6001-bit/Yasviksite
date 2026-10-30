-- Yasvik Bonus: mobile-keyed retention ledger with per-entry expiry,
-- category/product/campaign earn rules, FIFO redeem, and atomic RPCs.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- ============================================================================
-- CUSTOMERS + ORDERS columns
-- ============================================================================

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS bonus_balance_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_earned_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_redeemed_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bonus_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS bonus_earned_paise INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_redeemed_paise INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_balance_after_paise INTEGER,
  ADD COLUMN IF NOT EXISTS bonus_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================================
-- RULE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bonus_category_rates (
  category_id UUID PRIMARY KEY REFERENCES public.categories(id) ON DELETE CASCADE,
  earn_percent NUMERIC(6,3) NOT NULL DEFAULT 0
    CHECK (earn_percent >= 0 AND earn_percent <= 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bonus_product_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL CHECK (mode IN ('exclude', 'override_percent')),
  earn_percent NUMERIC(6,3)
    CHECK (earn_percent IS NULL OR (earn_percent >= 0 AND earn_percent <= 100)),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bonus_product_rules_override_needs_percent CHECK (
    mode <> 'override_percent' OR earn_percent IS NOT NULL
  ),
  CONSTRAINT bonus_product_rules_unique UNIQUE (product_id, variant_key)
);

CREATE TABLE IF NOT EXISTS public.bonus_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('category', 'product')),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('percent', 'multiplier')),
  value NUMERIC(8,4) NOT NULL CHECK (value >= 0),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bonus_campaigns_scope_target CHECK (
    (scope = 'category' AND category_id IS NOT NULL AND product_id IS NULL)
    OR (scope = 'product' AND product_id IS NOT NULL AND category_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_bonus_campaigns_active_window
  ON public.bonus_campaigns (is_active, starts_at, ends_at);

-- ============================================================================
-- LEDGER + CONSUMPTIONS (earn rows immutable; consumption tracks FIFO use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.customer_bonus_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'earned', 'redeemed', 'reversed', 'expired', 'surprise'
  )),
  amount_paise BIGINT NOT NULL,
  balance_after_paise BIGINT NOT NULL,
  expires_at TIMESTAMPTZ,
  rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  reason_code TEXT,
  related_ledger_id UUID REFERENCES public.customer_bonus_ledger(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_bonus_ledger_idempotency UNIQUE (idempotency_key),
  CONSTRAINT customer_bonus_ledger_earn_positive CHECK (
    entry_type NOT IN ('earned', 'surprise') OR amount_paise > 0
  ),
  CONSTRAINT customer_bonus_ledger_redeem_negative CHECK (
    entry_type NOT IN ('redeemed', 'expired') OR amount_paise < 0
  )
);

CREATE INDEX IF NOT EXISTS idx_bonus_ledger_customer_created
  ON public.customer_bonus_ledger (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bonus_ledger_order
  ON public.customer_bonus_ledger (order_id);
CREATE INDEX IF NOT EXISTS idx_bonus_ledger_open_earn
  ON public.customer_bonus_ledger (customer_id, expires_at NULLS LAST)
  WHERE entry_type IN ('earned', 'surprise');

CREATE TABLE IF NOT EXISTS public.customer_bonus_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ledger_id UUID NOT NULL REFERENCES public.customer_bonus_ledger(id) ON DELETE CASCADE,
  consumer_ledger_id UUID NOT NULL REFERENCES public.customer_bonus_ledger(id) ON DELETE CASCADE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_bonus_consumptions_unique UNIQUE (source_ledger_id, consumer_ledger_id)
);

CREATE INDEX IF NOT EXISTS idx_bonus_consumptions_source
  ON public.customer_bonus_consumptions (source_ledger_id);
CREATE INDEX IF NOT EXISTS idx_bonus_consumptions_consumer
  ON public.customer_bonus_consumptions (consumer_ledger_id);

-- Prevent mutating immutable ledger fields
CREATE OR REPLACE FUNCTION private.prevent_bonus_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'customer_bonus_ledger rows are append-only';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
    OR NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.entry_type IS DISTINCT FROM OLD.entry_type
    OR NEW.amount_paise IS DISTINCT FROM OLD.amount_paise
    OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.related_ledger_id IS DISTINCT FROM OLD.related_ledger_id
    OR NEW.rule_snapshot IS DISTINCT FROM OLD.rule_snapshot
  THEN
    RAISE EXCEPTION 'customer_bonus_ledger immutable fields cannot change';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bonus_ledger_immutable ON public.customer_bonus_ledger;
CREATE TRIGGER trg_bonus_ledger_immutable
BEFORE UPDATE OR DELETE ON public.customer_bonus_ledger
FOR EACH ROW EXECUTE FUNCTION private.prevent_bonus_ledger_mutation();

-- ============================================================================
-- SETTINGS SEEDS
-- ============================================================================

INSERT INTO public.app_settings (setting_key, setting_value, data_type, description)
VALUES
  ('bonus.enabled', 'true', 'boolean', 'Yasvik Bonus program enabled'),
  ('bonus.max_per_order_paise', '50000', 'number', 'Max bonus earn per order (paise)'),
  ('bonus.max_redeem_percent', '5', 'number', 'Max percent of eligible bill payable with bonus'),
  ('bonus.max_share_of_contribution_percent', '10', 'number', 'Max earn as share of order contribution'),
  ('bonus.contribution_guard_mode', 'block', 'string', 'warn or block when earn exceeds contribution share'),
  ('bonus.excluded_product_ids', '[]', 'json', 'Global product UUID exclusions'),
  ('bonus.gift_wrap_product_ids', '[]', 'json', 'Gift wrap product UUIDs (non-earning)'),
  ('bonus.expiry_days', '90', 'number', 'Days until earned/surprise bonus expires; 0 = never'),
  ('bonus.reminder_days_before', '30', 'number', 'Days before expiry to remind'),
  ('bonus.next_order_message', 'Share your number next time to use your Yasvik Bonus.', 'string', 'Invoice/WhatsApp next-order line')
ON CONFLICT (setting_key) DO NOTHING;

-- Seed category defaults by top-level slug
INSERT INTO public.bonus_category_rates (category_id, earn_percent)
SELECT c.id,
  CASE
    WHEN c.slug IN ('snacks') THEN 2
    WHEN c.slug IN ('pickles') THEN 2
    WHEN c.slug IN ('spices') THEN 2
    WHEN c.slug IN ('honey') THEN 1
    WHEN c.slug IN ('dry-fruits') THEN 1
    WHEN c.slug IN ('jaggery') THEN 1
    WHEN c.slug IN ('cold-pressed-oils') THEN 0
    WHEN c.slug IN ('heritage-rice') THEN 0
    WHEN c.slug IN ('millets') THEN 1
    WHEN c.slug IN ('natural-care') THEN 1
    WHEN c.slug IN ('ghee') THEN 1
    ELSE 0
  END
FROM public.categories c
WHERE c.parent_id IS NULL
ON CONFLICT (category_id) DO NOTHING;

-- ============================================================================
-- HELPERS
-- ============================================================================

CREATE OR REPLACE FUNCTION private.bonus_setting_text(p_key TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT setting_value FROM public.app_settings WHERE setting_key = p_key LIMIT 1),
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION private.bonus_setting_num(p_key TEXT, p_default NUMERIC)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(private.bonus_setting_text(p_key, NULL), '')::numeric,
    p_default
  );
$$;

CREATE OR REPLACE FUNCTION private.bonus_setting_json(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  raw TEXT := private.bonus_setting_text(p_key, '[]');
BEGIN
  BEGIN
    RETURN coalesce(raw::jsonb, '[]'::jsonb);
  EXCEPTION WHEN others THEN
    RETURN '[]'::jsonb;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION private.bonus_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(private.bonus_setting_text('bonus.enabled', 'true'), 'true')) IN ('true', '1', 'yes');
$$;

CREATE OR REPLACE FUNCTION private.lock_customer(p_customer_id UUID)
RETURNS public.customers
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  row public.customers;
BEGIN
  SELECT * INTO row FROM public.customers WHERE id = p_customer_id FOR UPDATE;
  IF row.id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION private.category_ancestors(p_category_id UUID)
RETURNS TABLE (category_id UUID, depth INT)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH RECURSIVE walk AS (
    SELECT c.id AS category_id, 0 AS depth, c.parent_id
    FROM public.categories c
    WHERE c.id = p_category_id
    UNION ALL
    SELECT c.id, walk.depth + 1, c.parent_id
    FROM public.categories c
    JOIN walk ON c.id = walk.parent_id
  )
  SELECT category_id, depth FROM walk;
$$;

CREATE OR REPLACE FUNCTION private.bonus_open_remaining(p_source_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT greatest(
    0,
    coalesce((SELECT amount_paise FROM public.customer_bonus_ledger WHERE id = p_source_id), 0)
    - coalesce((
        SELECT sum(amount_paise)
        FROM public.customer_bonus_consumptions
        WHERE source_ledger_id = p_source_id
      ), 0)
  );
$$;

CREATE OR REPLACE FUNCTION private.refresh_customer_bonus_cache(p_customer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  bal BIGINT;
  earned BIGINT;
  redeemed BIGINT;
  soonest TIMESTAMPTZ;
BEGIN
  SELECT coalesce(sum(amount_paise), 0)
  INTO bal
  FROM public.customer_bonus_ledger
  WHERE customer_id = p_customer_id;

  SELECT
    coalesce(sum(CASE WHEN entry_type IN ('earned', 'surprise') THEN amount_paise ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'redeemed' THEN abs(amount_paise) ELSE 0 END), 0)
  INTO earned, redeemed
  FROM public.customer_bonus_ledger
  WHERE customer_id = p_customer_id;

  SELECT min(l.expires_at)
  INTO soonest
  FROM public.customer_bonus_ledger l
  WHERE l.customer_id = p_customer_id
    AND l.entry_type IN ('earned', 'surprise')
    AND private.bonus_open_remaining(l.id) > 0
    AND (l.expires_at IS NULL OR l.expires_at > NOW());

  UPDATE public.customers SET
    bonus_balance_paise = bal,
    bonus_earned_paise = earned,
    bonus_redeemed_paise = redeemed,
    bonus_expires_at = soonest,
    updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION private.settled_bonus_balance(p_customer_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(sum(private.bonus_open_remaining(l.id)), 0)
  FROM public.customer_bonus_ledger l
  WHERE l.customer_id = p_customer_id
    AND l.entry_type IN ('earned', 'surprise')
    AND (l.expires_at IS NULL OR l.expires_at > NOW());
$$;

-- Resolve earn rate for one line into a jsonb rule snapshot fragment
CREATE OR REPLACE FUNCTION private.resolve_line_bonus_rate(
  p_product_id UUID,
  p_variant TEXT,
  p_category_id UUID,
  p_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_key TEXT := coalesce(nullif(trim(p_variant), ''), '');
  rule public.bonus_product_rules;
  base_rate NUMERIC := 0;
  camp public.bonus_campaigns;
  applied_rate NUMERIC := 0;
  multiplier NUMERIC := 1;
  campaign_id UUID := NULL;
  override_id UUID := NULL;
  excluded BOOLEAN := FALSE;
  anc RECORD;
BEGIN
  -- Global exclusions (JSON arrays of product UUID strings)
  IF p_product_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(private.bonus_setting_json('bonus.excluded_product_ids')) x
    WHERE x = p_product_id::text
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'excluded_product', 'applied_rate', 0);
  END IF;
  IF p_product_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(private.bonus_setting_json('bonus.gift_wrap_product_ids')) x
    WHERE x = p_product_id::text
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'gift_wrap', 'applied_rate', 0);
  END IF;

  -- Product / variant rules (exact variant, then blank variant)
  SELECT * INTO rule
  FROM public.bonus_product_rules
  WHERE product_id = p_product_id AND variant_key = v_key
  LIMIT 1;
  IF rule.id IS NULL AND v_key <> '' THEN
    SELECT * INTO rule
    FROM public.bonus_product_rules
    WHERE product_id = p_product_id AND variant_key = ''
    LIMIT 1;
  END IF;

  IF rule.id IS NOT NULL THEN
    IF rule.mode = 'exclude' THEN
      RETURN jsonb_build_object(
        'eligible', false,
        'reason', 'product_exclude',
        'override_id', rule.id,
        'applied_rate', 0
      );
    END IF;
    override_id := rule.id;
    applied_rate := rule.earn_percent;
    RETURN jsonb_build_object(
      'eligible', true,
      'reason', 'product_override',
      'override_id', override_id,
      'applied_rate', applied_rate,
      'campaign_id', NULL,
      'campaign_multiplier', NULL
    );
  END IF;

  -- Base category rate (walk ancestors)
  FOR anc IN SELECT * FROM private.category_ancestors(p_category_id) ORDER BY depth LOOP
    SELECT earn_percent INTO base_rate
    FROM public.bonus_category_rates
    WHERE category_id = anc.category_id;
    IF FOUND THEN
      EXIT;
    END IF;
  END LOOP;
  base_rate := coalesce(base_rate, 0);

  -- Active product campaign
  SELECT * INTO camp
  FROM public.bonus_campaigns c
  WHERE c.is_active
    AND c.scope = 'product'
    AND c.product_id = p_product_id
    AND c.starts_at <= p_at
    AND (c.ends_at IS NULL OR c.ends_at > p_at)
  ORDER BY c.starts_at DESC
  LIMIT 1;

  -- Else category campaign (walk ancestors)
  IF camp.id IS NULL THEN
    FOR anc IN SELECT * FROM private.category_ancestors(p_category_id) ORDER BY depth LOOP
      SELECT * INTO camp
      FROM public.bonus_campaigns c
      WHERE c.is_active
        AND c.scope = 'category'
        AND c.category_id = anc.category_id
        AND c.starts_at <= p_at
        AND (c.ends_at IS NULL OR c.ends_at > p_at)
      ORDER BY c.starts_at DESC
      LIMIT 1;
      EXIT WHEN camp.id IS NOT NULL;
    END LOOP;
  END IF;

  IF camp.id IS NOT NULL THEN
    campaign_id := camp.id;
    IF camp.mode = 'percent' THEN
      applied_rate := camp.value;
      multiplier := 1;
    ELSE
      multiplier := camp.value;
      applied_rate := base_rate * multiplier;
    END IF;
  ELSE
    applied_rate := base_rate;
  END IF;

  IF applied_rate <= 0 THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'zero_rate',
      'applied_rate', 0,
      'base_rate', base_rate,
      'campaign_id', campaign_id,
      'campaign_multiplier', CASE WHEN campaign_id IS NULL THEN NULL ELSE multiplier END
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', CASE WHEN campaign_id IS NULL THEN 'category_default' ELSE 'campaign' END,
    'applied_rate', applied_rate,
    'base_rate', base_rate,
    'campaign_id', campaign_id,
    'campaign_multiplier', CASE WHEN campaign_id IS NULL THEN NULL ELSE multiplier END,
    'override_id', NULL
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.compute_order_bonus_earn(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  o public.orders;
  item JSONB;
  line_eligible BIGINT;
  rate_info JSONB;
  line_earn NUMERIC;
  lines JSONB := '[]'::jsonb;
  total_eligible BIGINT := 0;
  total_earn BIGINT := 0;
  max_per_order BIGINT := private.bonus_setting_num('bonus.max_per_order_paise', 50000)::bigint;
  max_share NUMERIC := private.bonus_setting_num('bonus.max_share_of_contribution_percent', 10);
  guard_mode TEXT := lower(coalesce(private.bonus_setting_text('bonus.contribution_guard_mode', 'block'), 'block'));
  contribution BIGINT;
  uncapped BIGINT;
  share_pct NUMERIC;
  guard_status TEXT := 'ok';
  title TEXT;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id;
  IF o.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(o.items_snapshot, '[]'::jsonb))
  LOOP
    title := lower(coalesce(item->>'title', item->>'name', ''));
    IF title ~ 'gift.?wrap|delivery|shipping|tax' THEN
      CONTINUE;
    END IF;

    line_eligible := coalesce(
      nullif(item->>'line_total_after_discount_paise', '')::bigint,
      round(coalesce((item->>'price')::numeric, 0) * coalesce((item->>'qty')::numeric, 1) * 100)
    )::bigint;
    IF line_eligible <= 0 THEN
      CONTINUE;
    END IF;

    rate_info := private.resolve_line_bonus_rate(
      nullif(item->>'product_id', '')::uuid,
      coalesce(item->>'variant', item->>'unit', ''),
      nullif(item->>'category_id', '')::uuid,
      coalesce(o.completed_at, o.created_at, NOW())
    );

    IF coalesce((rate_info->>'eligible')::boolean, false) IS NOT TRUE THEN
      lines := lines || jsonb_build_array(jsonb_build_object(
        'product_id', item->>'product_id',
        'title', coalesce(item->>'title', item->>'name'),
        'eligible_amount_paise', line_eligible,
        'eligible', false,
        'applied_rate', 0,
        'earned_paise', 0,
        'rule', rate_info
      ));
      CONTINUE;
    END IF;

    line_earn := floor(line_eligible * (rate_info->>'applied_rate')::numeric / 100.0);
    total_eligible := total_eligible + line_eligible;
    total_earn := total_earn + line_earn::bigint;

    lines := lines || jsonb_build_array(jsonb_build_object(
      'product_id', item->>'product_id',
      'title', coalesce(item->>'title', item->>'name'),
      'eligible_amount_paise', line_eligible,
      'eligible', true,
      'applied_rate', (rate_info->>'applied_rate')::numeric,
      'campaign_id', rate_info->'campaign_id',
      'campaign_multiplier', rate_info->'campaign_multiplier',
      'override_id', rate_info->'override_id',
      'earned_paise', line_earn::bigint,
      'rule', rate_info
    ));
  END LOOP;

  uncapped := total_earn;
  IF total_earn > max_per_order THEN
    total_earn := max_per_order;
  END IF;

  -- Contribution = goods paid (exclude delivery/tax). Prefer amount - delivery.
  contribution := greatest(
    0,
    coalesce(o.amount_paise, round(coalesce(o.total_amount, 0) * 100)::int)
      - coalesce(o.delivery_fee_paise, 0)
  )::bigint;
  IF contribution <= 0 THEN
    contribution := total_eligible;
  END IF;

  share_pct := CASE WHEN contribution > 0 THEN (total_earn::numeric * 100.0 / contribution) ELSE 0 END;
  IF max_share > 0 AND share_pct > max_share THEN
    IF guard_mode = 'block' THEN
      total_earn := floor(contribution * max_share / 100.0)::bigint;
      guard_status := 'blocked_capped';
    ELSE
      guard_status := 'warned';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'eligible_amount_paise', total_eligible,
    'uncapped_earned_paise', uncapped,
    'earned_paise', total_earn,
    'contribution_paise', contribution,
    'share_percent', round(share_pct, 3),
    'guard_status', guard_status,
    'max_per_order_paise', max_per_order,
    'max_share_percent', max_share,
    'lines', lines
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.order_eligible_for_redeem(p_order_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  o public.orders;
  item JSONB;
  total BIGINT := 0;
  line_eligible BIGINT;
  title TEXT;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = p_order_id;
  IF o.id IS NULL THEN RETURN 0; END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(coalesce(o.items_snapshot, '[]'::jsonb))
  LOOP
    title := lower(coalesce(item->>'title', item->>'name', ''));
    IF title ~ 'gift.?wrap|delivery|shipping|tax' THEN
      CONTINUE;
    END IF;
    IF nullif(item->>'product_id', '')::uuid IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM jsonb_array_elements_text(private.bonus_setting_json('bonus.gift_wrap_product_ids')) x
         WHERE x = item->>'product_id'
       ) THEN
      CONTINUE;
    END IF;
    line_eligible := coalesce(
      nullif(item->>'line_total_after_discount_paise', '')::bigint,
      round(coalesce((item->>'price')::numeric, 0) * coalesce((item->>'qty')::numeric, 1) * 100)
    )::bigint;
    IF line_eligible > 0 THEN
      total := total + line_eligible;
    END IF;
  END LOOP;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION private.order_is_completed_paid(p_order public.orders)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    coalesce(p_order.payment_status, '') IN ('paid', 'pending_cod')
    AND coalesce(p_order.status, '') NOT IN ('failed', 'cancelled', 'refunded', 'pending')
    AND (
      coalesce(p_order.status, '') IN ('delivered', 'confirmed', 'packing', 'ready_for_dispatch', 'shipped', 'out_for_delivery')
      OR p_order.order_channel = 'pos'
    );
$$;

-- ============================================================================
-- PUBLIC / PRIVATE RPCs
-- ============================================================================

CREATE OR REPLACE FUNCTION private.preview_bonus(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  cust_id UUID;
  settled BIGINT := 0;
  max_redeem_pct NUMERIC := private.bonus_setting_num('bonus.max_redeem_percent', 5);
  eligible BIGINT;
  suggested BIGINT;
  earn JSONB;
BEGIN
  IF NOT private.bonus_enabled() THEN
    RETURN jsonb_build_object('enabled', false);
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  cust_id := o.customer_id;
  IF cust_id IS NULL THEN
    -- try phone link without creating
    SELECT id INTO cust_id FROM public.customers
    WHERE phone_digits = public.normalize_phone_digits(coalesce(o.customer_phone, o.guest_phone))
    LIMIT 1;
  END IF;

  IF cust_id IS NOT NULL THEN
    settled := private.settled_bonus_balance(cust_id);
  END IF;

  eligible := private.order_eligible_for_redeem(p_order_id);
  suggested := least(settled, floor(eligible * max_redeem_pct / 100.0)::bigint);
  earn := private.compute_order_bonus_earn(p_order_id);

  RETURN jsonb_build_object(
    'enabled', true,
    'customer_id', cust_id,
    'settled_balance_paise', settled,
    'eligible_bill_paise', eligible,
    'max_redeem_percent', max_redeem_pct,
    'suggested_redeem_paise', suggested,
    'earn', earn
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.apply_bonus_earn(
  p_order_id UUID,
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  cust_id UUID;
  earn JSONB;
  earned BIGINT;
  expiry_days INT;
  expires TIMESTAMPTZ;
  new_balance BIGINT;
  ledger_id UUID;
  existing UUID;
  idem TEXT;
  cust public.customers;
BEGIN
  IF NOT private.bonus_enabled() THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'disabled');
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  idem := 'earn:' || p_order_id::text;
  SELECT id INTO existing FROM public.customer_bonus_ledger WHERE idempotency_key = idem;
  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'applied', true,
      'idempotent', true,
      'ledger_id', existing,
      'earned_paise', (SELECT amount_paise FROM public.customer_bonus_ledger WHERE id = existing)
    );
  END IF;

  -- Earn only after completed/paid (pending Razorpay unpaid does not earn)
  IF coalesce(o.payment_status, '') NOT IN ('paid', 'pending_cod') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_paid');
  END IF;
  IF coalesce(o.status, '') IN ('failed', 'cancelled', 'refunded', 'pending') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_completed');
  END IF;

  cust_id := o.customer_id;
  IF cust_id IS NULL THEN
    cust_id := public.refresh_customer_crm(coalesce(o.customer_phone, o.guest_phone));
    IF cust_id IS NOT NULL THEN
      UPDATE public.orders SET customer_id = cust_id WHERE id = o.id;
    END IF;
  END IF;
  IF cust_id IS NULL THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'no_customer');
  END IF;

  cust := private.lock_customer(cust_id);
  earn := private.compute_order_bonus_earn(p_order_id);
  earned := coalesce((earn->>'earned_paise')::bigint, 0);
  IF earned <= 0 THEN
    UPDATE public.orders SET
      bonus_earned_paise = 0,
      bonus_breakdown = earn,
      bonus_balance_after_paise = cust.bonus_balance_paise,
      updated_at = NOW()
    WHERE id = p_order_id;
    RETURN jsonb_build_object('applied', false, 'reason', 'zero_earn', 'earn', earn);
  END IF;

  expiry_days := private.bonus_setting_num('bonus.expiry_days', 90)::int;
  expires := CASE WHEN expiry_days > 0 THEN NOW() + make_interval(days => expiry_days) ELSE NULL END;

  new_balance := cust.bonus_balance_paise + earned;
  INSERT INTO public.customer_bonus_ledger (
    customer_id, order_id, entry_type, amount_paise, balance_after_paise,
    expires_at, rule_snapshot, reason, idempotency_key, created_by
  ) VALUES (
    cust_id, p_order_id, 'earned', earned, new_balance,
    expires,
    earn || jsonb_build_object(
      'eligible_amount_paise', earn->'eligible_amount_paise',
      'applied_rate_summary', 'per_line',
      'calculated_earned_paise', earned
    ),
    'Yasvik Bonus earned on completed order',
    idem,
    p_actor
  ) RETURNING id INTO ledger_id;

  PERFORM private.refresh_customer_bonus_cache(cust_id);

  UPDATE public.orders SET
    bonus_earned_paise = earned,
    bonus_breakdown = earn || jsonb_build_object('ledger_id', ledger_id, 'expires_at', expires),
    bonus_balance_after_paise = (SELECT bonus_balance_paise FROM public.customers WHERE id = cust_id),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'applied', true,
    'idempotent', false,
    'ledger_id', ledger_id,
    'earned_paise', earned,
    'expires_at', expires,
    'balance_after_paise', (SELECT bonus_balance_paise FROM public.customers WHERE id = cust_id),
    'earn', earn,
    -- Deferred: this earn is in balance but was posted AFTER redeem on same order,
    -- so it was not available for this order's redemption.
    'usable_from_next_order', true
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.reverse_bonus_for_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Order cancelled/refunded',
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  earn_row public.customer_bonus_ledger;
  redeem_row public.customer_bonus_ledger;
  cust_id UUID;
  rev_earn_id UUID;
  rev_redeem_id UUID;
  open_earn BIGINT;
  redeem_amt BIGINT;
  bal BIGINT;
  already BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.customer_bonus_ledger
    WHERE idempotency_key IN (
      'reverse:' || p_order_id::text || ':earn',
      'reverse:' || p_order_id::text || ':redeem'
    )
  ) INTO already;
  IF already THEN
    RETURN jsonb_build_object('reversed', true, 'idempotent', true);
  END IF;

  SELECT * INTO earn_row
  FROM public.customer_bonus_ledger
  WHERE idempotency_key = 'earn:' || p_order_id::text
  LIMIT 1;

  SELECT * INTO redeem_row
  FROM public.customer_bonus_ledger
  WHERE idempotency_key = 'redeem:' || p_order_id::text
  LIMIT 1;

  IF earn_row.id IS NULL AND redeem_row.id IS NULL THEN
    RETURN jsonb_build_object('reversed', false, 'reason', 'nothing_to_reverse');
  END IF;

  cust_id := coalesce(earn_row.customer_id, redeem_row.customer_id);
  PERFORM private.lock_customer(cust_id);
  bal := (SELECT bonus_balance_paise FROM public.customers WHERE id = cust_id);

  -- 1) Reverse redemption first: restore bonus and release FIFO consumptions
  IF redeem_row.id IS NOT NULL THEN
    redeem_amt := abs(redeem_row.amount_paise);
    bal := bal + redeem_amt;
    INSERT INTO public.customer_bonus_ledger (
      customer_id, order_id, entry_type, amount_paise, balance_after_paise,
      related_ledger_id, reason, idempotency_key, created_by, rule_snapshot
    ) VALUES (
      cust_id, p_order_id, 'reversed', redeem_amt, bal,
      redeem_row.id, p_reason,
      'reverse:' || p_order_id::text || ':redeem',
      p_actor,
      jsonb_build_object('reverses', redeem_row.id, 'restored_paise', redeem_amt)
    ) RETURNING id INTO rev_redeem_id;

    DELETE FROM public.customer_bonus_consumptions
    WHERE consumer_ledger_id = redeem_row.id;
  END IF;

  -- 2) Reverse remaining open earn on this order (already-spent portion stays with later orders)
  IF earn_row.id IS NOT NULL THEN
    open_earn := private.bonus_open_remaining(earn_row.id);
    IF open_earn > 0 THEN
      bal := bal - open_earn;
      INSERT INTO public.customer_bonus_ledger (
        customer_id, order_id, entry_type, amount_paise, balance_after_paise,
        related_ledger_id, reason, idempotency_key, created_by, rule_snapshot
      ) VALUES (
        cust_id, p_order_id, 'reversed', -open_earn, bal,
        earn_row.id, p_reason,
        'reverse:' || p_order_id::text || ':earn',
        p_actor,
        jsonb_build_object(
          'reverses', earn_row.id,
          'original_amount_paise', earn_row.amount_paise,
          'open_reversed_paise', open_earn
        )
      ) RETURNING id INTO rev_earn_id;

      INSERT INTO public.customer_bonus_consumptions (source_ledger_id, consumer_ledger_id, amount_paise)
      VALUES (earn_row.id, rev_earn_id, open_earn);
    ELSE
      -- Marker so retries stay idempotent even when fully consumed
      INSERT INTO public.customer_bonus_ledger (
        customer_id, order_id, entry_type, amount_paise, balance_after_paise,
        related_ledger_id, reason, idempotency_key, created_by, rule_snapshot
      ) VALUES (
        cust_id, p_order_id, 'reversed', 0, bal,
        earn_row.id, p_reason || ' (earn already consumed)',
        'reverse:' || p_order_id::text || ':earn',
        p_actor,
        jsonb_build_object('reverses', earn_row.id, 'open_reversed_paise', 0)
      ) RETURNING id INTO rev_earn_id;
    END IF;
  END IF;

  PERFORM private.refresh_customer_bonus_cache(cust_id);

  UPDATE public.orders SET
    bonus_earned_paise = 0,
    bonus_redeemed_paise = 0,
    bonus_balance_after_paise = (SELECT bonus_balance_paise FROM public.customers WHERE id = cust_id),
    bonus_breakdown = coalesce(bonus_breakdown, '{}'::jsonb) || jsonb_build_object(
      'reversed', true,
      'reverse_reason', p_reason
    ),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'reversed', true,
    'idempotent', false,
    'earn_reverse_id', rev_earn_id,
    'redeem_reverse_id', rev_redeem_id,
    'balance_after_paise', (SELECT bonus_balance_paise FROM public.customers WHERE id = cust_id)
  );
END;
$$;

-- Allow zero-amount reverse markers
ALTER TABLE public.customer_bonus_ledger
  DROP CONSTRAINT IF EXISTS customer_bonus_ledger_earn_positive;
ALTER TABLE public.customer_bonus_ledger
  ADD CONSTRAINT customer_bonus_ledger_earn_positive CHECK (
    entry_type NOT IN ('earned', 'surprise') OR amount_paise > 0
  );
ALTER TABLE public.customer_bonus_ledger
  DROP CONSTRAINT IF EXISTS customer_bonus_ledger_redeem_negative;
ALTER TABLE public.customer_bonus_ledger
  ADD CONSTRAINT customer_bonus_ledger_redeem_negative CHECK (
    entry_type NOT IN ('redeemed', 'expired') OR amount_paise < 0
  );

CREATE OR REPLACE FUNCTION private.expire_bonus_entries(p_as_of TIMESTAMPTZ DEFAULT NOW())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src RECORD;
  open_amt BIGINT;
  ledger_id UUID;
  bal BIGINT;
  expired_count INT := 0;
  expired_paise BIGINT := 0;
BEGIN
  FOR src IN
    SELECT l.*
    FROM public.customer_bonus_ledger l
    WHERE l.entry_type IN ('earned', 'surprise')
      AND l.expires_at IS NOT NULL
      AND l.expires_at <= p_as_of
      AND private.bonus_open_remaining(l.id) > 0
    ORDER BY l.expires_at ASC, l.created_at ASC
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.customer_bonus_ledger
      WHERE idempotency_key = 'expire:' || src.id::text
    ) THEN
      CONTINUE;
    END IF;

    open_amt := private.bonus_open_remaining(src.id);
    PERFORM private.lock_customer(src.customer_id);
    bal := (SELECT bonus_balance_paise FROM public.customers WHERE id = src.customer_id) - open_amt;

    INSERT INTO public.customer_bonus_ledger (
      customer_id, order_id, entry_type, amount_paise, balance_after_paise,
      related_ledger_id, reason, idempotency_key, rule_snapshot
    ) VALUES (
      src.customer_id, src.order_id, 'expired', -open_amt, bal,
      src.id, 'Yasvik Bonus expired',
      'expire:' || src.id::text,
      jsonb_build_object('source_ledger_id', src.id, 'expired_paise', open_amt, 'expires_at', src.expires_at)
    ) RETURNING id INTO ledger_id;

    INSERT INTO public.customer_bonus_consumptions (source_ledger_id, consumer_ledger_id, amount_paise)
    VALUES (src.id, ledger_id, open_amt);

    PERFORM private.refresh_customer_bonus_cache(src.customer_id);
    expired_count := expired_count + 1;
    expired_paise := expired_paise + open_amt;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_entries', expired_count,
    'expired_paise', expired_paise,
    'as_of', p_as_of
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.grant_surprise_bonus(
  p_customer_id UUID,
  p_amount_paise BIGINT,
  p_reason_code TEXT,
  p_reason TEXT DEFAULT NULL,
  p_actor UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cust public.customers;
  idem TEXT;
  existing UUID;
  expiry_days INT;
  expires TIMESTAMPTZ;
  ledger_id UUID;
  new_balance BIGINT;
BEGIN
  IF coalesce(p_amount_paise, 0) <= 0 THEN
    RAISE EXCEPTION 'Surprise bonus amount must be positive';
  END IF;
  IF p_reason_code IS NULL OR p_reason_code NOT IN (
    'birthday', 'festival', 'first_anniversary', 'first_order', 'hundredth_customer', 'manual'
  ) THEN
    RAISE EXCEPTION 'Invalid surprise reason_code';
  END IF;

  idem := coalesce(nullif(p_idempotency_key, ''), 'surprise:' || p_customer_id::text || ':' || p_reason_code || ':' || p_amount_paise::text || ':' || floor(extract(epoch from NOW()))::text);
  SELECT id INTO existing FROM public.customer_bonus_ledger WHERE idempotency_key = idem;
  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object('applied', true, 'idempotent', true, 'ledger_id', existing);
  END IF;

  cust := private.lock_customer(p_customer_id);
  expiry_days := private.bonus_setting_num('bonus.expiry_days', 90)::int;
  expires := CASE WHEN expiry_days > 0 THEN NOW() + make_interval(days => expiry_days) ELSE NULL END;
  new_balance := cust.bonus_balance_paise + p_amount_paise;

  INSERT INTO public.customer_bonus_ledger (
    customer_id, entry_type, amount_paise, balance_after_paise,
    expires_at, reason, reason_code, idempotency_key, created_by, rule_snapshot
  ) VALUES (
    p_customer_id, 'surprise', p_amount_paise, new_balance,
    expires,
    coalesce(p_reason, 'Surprise Yasvik Bonus'),
    p_reason_code,
    idem,
    p_actor,
    jsonb_build_object('reason_code', p_reason_code, 'calculated_earned_paise', p_amount_paise)
  ) RETURNING id INTO ledger_id;

  PERFORM private.refresh_customer_bonus_cache(p_customer_id);

  RETURN jsonb_build_object(
    'applied', true,
    'idempotent', false,
    'ledger_id', ledger_id,
    'amount_paise', p_amount_paise,
    'expires_at', expires,
    'balance_after_paise', (SELECT bonus_balance_paise FROM public.customers WHERE id = p_customer_id)
  );
END;
$$;

-- Redeem must not mutate cash tender totals; bonus_redeemed_paise is the source of truth.
CREATE OR REPLACE FUNCTION private.apply_bonus_redeem(
  p_order_id UUID,
  p_amount_paise BIGINT,
  p_confirmed BOOLEAN,
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o public.orders;
  cust public.customers;
  cust_id UUID;
  settled BIGINT;
  eligible BIGINT;
  max_redeem_pct NUMERIC := private.bonus_setting_num('bonus.max_redeem_percent', 5);
  capped BIGINT;
  amount BIGINT;
  src RECORD;
  take BIGINT;
  left_to_take BIGINT;
  new_balance BIGINT;
  ledger_id UUID;
  existing UUID;
  idem TEXT;
BEGIN
  IF NOT private.bonus_enabled() THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'disabled');
  END IF;
  IF coalesce(p_confirmed, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Yasvik Bonus redemption requires explicit confirmation';
  END IF;
  IF coalesce(p_amount_paise, 0) <= 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'zero_amount', 'redeemed_paise', 0);
  END IF;

  SELECT * INTO o FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  idem := 'redeem:' || p_order_id::text;
  SELECT id INTO existing FROM public.customer_bonus_ledger WHERE idempotency_key = idem;
  IF existing IS NOT NULL THEN
    RETURN jsonb_build_object(
      'applied', true,
      'idempotent', true,
      'ledger_id', existing,
      'redeemed_paise', abs((SELECT amount_paise FROM public.customer_bonus_ledger WHERE id = existing))
    );
  END IF;

  cust_id := o.customer_id;
  IF cust_id IS NULL THEN
    cust_id := public.refresh_customer_crm(coalesce(o.customer_phone, o.guest_phone));
    IF cust_id IS NOT NULL THEN
      UPDATE public.orders SET customer_id = cust_id WHERE id = o.id;
    END IF;
  END IF;
  IF cust_id IS NULL THEN
    RAISE EXCEPTION 'Customer phone required to redeem Yasvik Bonus';
  END IF;

  cust := private.lock_customer(cust_id);
  settled := private.settled_bonus_balance(cust_id);
  eligible := private.order_eligible_for_redeem(p_order_id);
  capped := least(settled, floor(eligible * max_redeem_pct / 100.0)::bigint, p_amount_paise);
  amount := greatest(0, capped);
  IF amount <= 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'nothing_redeemable', 'redeemed_paise', 0);
  END IF;

  new_balance := cust.bonus_balance_paise - amount;
  INSERT INTO public.customer_bonus_ledger (
    customer_id, order_id, entry_type, amount_paise, balance_after_paise,
    rule_snapshot, reason, idempotency_key, created_by
  ) VALUES (
    cust_id, p_order_id, 'redeemed', -amount, new_balance,
    jsonb_build_object(
      'eligible_bill_paise', eligible,
      'requested_paise', p_amount_paise,
      'max_redeem_percent', max_redeem_pct,
      'settled_before_paise', settled
    ),
    'Yasvik Bonus redeemed on order',
    idem,
    p_actor
  ) RETURNING id INTO ledger_id;

  left_to_take := amount;
  FOR src IN
    SELECT l.id, private.bonus_open_remaining(l.id) AS open_amt, l.expires_at
    FROM public.customer_bonus_ledger l
    WHERE l.customer_id = cust_id
      AND l.entry_type IN ('earned', 'surprise')
      AND private.bonus_open_remaining(l.id) > 0
      AND (l.expires_at IS NULL OR l.expires_at > NOW())
    ORDER BY l.expires_at ASC NULLS LAST, l.created_at ASC
  LOOP
    EXIT WHEN left_to_take <= 0;
    take := least(src.open_amt, left_to_take);
    INSERT INTO public.customer_bonus_consumptions (source_ledger_id, consumer_ledger_id, amount_paise)
    VALUES (src.id, ledger_id, take);
    left_to_take := left_to_take - take;
  END LOOP;

  IF left_to_take > 0 THEN
    RAISE EXCEPTION 'FIFO bonus allocation failed (short by % paise)', left_to_take;
  END IF;

  PERFORM private.refresh_customer_bonus_cache(cust_id);

  UPDATE public.orders SET
    bonus_redeemed_paise = amount,
    bonus_balance_after_paise = (SELECT bonus_balance_paise FROM public.customers WHERE id = cust_id),
    updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'applied', true,
    'idempotent', false,
    'ledger_id', ledger_id,
    'redeemed_paise', amount,
    'balance_after_paise', (SELECT bonus_balance_paise FROM public.customers WHERE id = cust_id)
  );
END;
$$;

-- Thin public wrappers for service_role / worker
CREATE OR REPLACE FUNCTION public.preview_bonus(p_order_id UUID)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT private.preview_bonus(p_order_id); $$;

CREATE OR REPLACE FUNCTION public.apply_bonus_redeem(
  p_order_id UUID,
  p_amount_paise BIGINT,
  p_confirmed BOOLEAN,
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT private.apply_bonus_redeem(p_order_id, p_amount_paise, p_confirmed, p_actor); $$;

CREATE OR REPLACE FUNCTION public.apply_bonus_earn(p_order_id UUID, p_actor UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT private.apply_bonus_earn(p_order_id, p_actor); $$;

CREATE OR REPLACE FUNCTION public.reverse_bonus_for_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Order cancelled/refunded',
  p_actor UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT private.reverse_bonus_for_order(p_order_id, p_reason, p_actor); $$;

CREATE OR REPLACE FUNCTION public.expire_bonus_entries(p_as_of TIMESTAMPTZ DEFAULT NOW())
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$ SELECT private.expire_bonus_entries(p_as_of); $$;

CREATE OR REPLACE FUNCTION public.grant_surprise_bonus(
  p_customer_id UUID,
  p_amount_paise BIGINT,
  p_reason_code TEXT,
  p_reason TEXT DEFAULT NULL,
  p_actor UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.grant_surprise_bonus(
    p_customer_id, p_amount_paise, p_reason_code, p_reason, p_actor, p_idempotency_key
  );
$$;

REVOKE ALL ON FUNCTION public.preview_bonus(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_bonus_redeem(UUID, BIGINT, BOOLEAN, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_bonus_earn(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_bonus_for_order(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_bonus_entries(TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_surprise_bonus(UUID, BIGINT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.preview_bonus(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_bonus_redeem(UUID, BIGINT, BOOLEAN, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_bonus_earn(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reverse_bonus_for_order(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_bonus_entries(TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_surprise_bonus(UUID, BIGINT, TEXT, TEXT, UUID, TEXT) TO service_role;

-- Staff may preview; mutations stay service_role / worker
GRANT EXECUTE ON FUNCTION public.preview_bonus(UUID) TO authenticated;

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.bonus_category_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_product_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_bonus_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_bonus_consumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage bonus category rates" ON public.bonus_category_rates;
CREATE POLICY "Staff manage bonus category rates"
ON public.bonus_category_rates FOR ALL
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Staff manage bonus product rules" ON public.bonus_product_rules;
CREATE POLICY "Staff manage bonus product rules"
ON public.bonus_product_rules FOR ALL
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Staff manage bonus campaigns" ON public.bonus_campaigns;
CREATE POLICY "Staff manage bonus campaigns"
ON public.bonus_campaigns FOR ALL
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Staff read bonus ledger" ON public.customer_bonus_ledger;
CREATE POLICY "Staff read bonus ledger"
ON public.customer_bonus_ledger FOR SELECT
USING (private.has_admin_role(ARRAY['admin', 'manager', 'cashier']));

DROP POLICY IF EXISTS "Users read own bonus ledger" ON public.customer_bonus_ledger;
CREATE POLICY "Users read own bonus ledger"
ON public.customer_bonus_ledger FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = customer_id AND c.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Staff read bonus consumptions" ON public.customer_bonus_consumptions;
CREATE POLICY "Staff read bonus consumptions"
ON public.customer_bonus_consumptions FOR SELECT
USING (private.has_admin_role(ARRAY['admin', 'manager', 'cashier']));

-- No direct client inserts into ledger; RPCs (service_role) bypass RLS.
