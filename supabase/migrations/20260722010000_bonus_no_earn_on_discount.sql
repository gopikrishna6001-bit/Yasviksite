-- Discounted orders do not earn Yasvik Bonus (offer OR bonus, not both).
-- compute_order_bonus_earn / apply_bonus_earn return zero when discount_paise > 0.

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

  -- Rule: if any bill discount/coupon is applied, no bonus is earned on this order.
  IF coalesce(o.discount_paise, 0) > 0 THEN
    RETURN jsonb_build_object(
      'eligible_amount_paise', 0,
      'uncapped_earned_paise', 0,
      'earned_paise', 0,
      'contribution_paise', 0,
      'share_percent', 0,
      'guard_status', 'discounted_order_no_earn',
      'reason', 'discounted_order_no_earn',
      'max_per_order_paise', max_per_order,
      'max_share_percent', max_share,
      'lines', '[]'::jsonb
    );
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

  IF coalesce(o.payment_status, '') NOT IN ('paid', 'pending_cod') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_paid');
  END IF;
  IF coalesce(o.status, '') IN ('failed', 'cancelled', 'refunded', 'pending') THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'not_completed');
  END IF;

  -- Discounted bills: no earn (still allow redeem which already ran earlier in checkout).
  IF coalesce(o.discount_paise, 0) > 0 THEN
    UPDATE public.orders SET
      bonus_earned_paise = 0,
      bonus_breakdown = jsonb_build_object('reason', 'discounted_order_no_earn', 'earned_paise', 0),
      updated_at = NOW()
    WHERE id = p_order_id;
    RETURN jsonb_build_object('applied', false, 'reason', 'discounted_order_no_earn');
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
    'usable_from_next_order', true
  );
END;
$$;
