-- Run via Supabase SQL editor / execute_sql.
-- Ends with RAISE EXCEPTION 'YASVIK_BONUS_DB_TESTS_PASSED' so the transaction rolls back.

DO $$
DECLARE
  snacks_id UUID;
  oils_id UUID;
  snack_prod UUID := 'dbaffe4a-15d5-4784-b717-16c9c641b6ae'; -- Ragi Biscuits
  oil_prod UUID := '3ec1d011-f280-4fab-afa9-645348861a71';
  cust_id UUID;
  order1 UUID := gen_random_uuid();
  order2 UUID := gen_random_uuid();
  order3 UUID := gen_random_uuid();
  r JSONB;
  bal BIGINT;
  src1 UUID;
  src_expired UUID;
BEGIN
  SELECT id INTO snacks_id FROM categories WHERE slug = 'snacks' AND parent_id IS NULL LIMIT 1;
  SELECT id INTO oils_id FROM categories WHERE slug = 'cold-pressed-oils' AND parent_id IS NULL LIMIT 1;
  IF snacks_id IS NULL OR oils_id IS NULL THEN RAISE EXCEPTION 'missing category seeds'; END IF;

  INSERT INTO bonus_category_rates (category_id, earn_percent)
  VALUES (snacks_id, 2), (oils_id, 0)
  ON CONFLICT (category_id) DO UPDATE SET earn_percent = EXCLUDED.earn_percent;

  UPDATE app_settings SET setting_value = '5' WHERE setting_key = 'bonus.max_redeem_percent';
  UPDATE app_settings SET setting_value = '50000' WHERE setting_key = 'bonus.max_per_order_paise';
  UPDATE app_settings SET setting_value = '10' WHERE setting_key = 'bonus.max_share_of_contribution_percent';
  UPDATE app_settings SET setting_value = 'block' WHERE setting_key = 'bonus.contribution_guard_mode';
  UPDATE app_settings SET setting_value = '90' WHERE setting_key = 'bonus.expiry_days';
  UPDATE app_settings SET setting_value = '[]' WHERE setting_key = 'bonus.excluded_product_ids';

  INSERT INTO customers (id, phone_digits, name)
  VALUES (gen_random_uuid(), '9999900001', 'Bonus Test')
  RETURNING id INTO cust_id;

  INSERT INTO orders (
    id, order_number, status, payment_status, payment_method, order_channel,
    customer_id, customer_phone, customer_name,
    amount_paise, subtotal_paise, delivery_fee_paise, discount_paise, total_amount,
    items_snapshot, completed_at
  ) VALUES (
    order1, 'BONUS-TEST-1-' || substr(order1::text,1,8), 'pending', 'unpaid', 'cash', 'pos',
    cust_id, '9999900001', 'Bonus Test',
    60000, 60000, 0, 0, 600,
    jsonb_build_array(
      jsonb_build_object('product_id', snack_prod, 'title', 'Test Murukulu', 'variant', '250g', 'qty', 1, 'price', 100,
        'category_id', snacks_id, 'category_name', 'Snacks', 'line_total_after_discount_paise', 10000),
      jsonb_build_object('product_id', oil_prod, 'title', 'Test Oil', 'variant', '1L', 'qty', 1, 'price', 500,
        'category_id', oils_id, 'category_name', 'Oils', 'line_total_after_discount_paise', 50000),
      jsonb_build_object('product_id', gen_random_uuid(), 'title', 'Gift Wrap', 'qty', 1, 'price', 50,
        'category_id', snacks_id, 'line_total_after_discount_paise', 5000)
    ),
    NOW()
  );

  r := public.apply_bonus_earn(order1);
  IF coalesce(r->>'applied','') = 'true' THEN RAISE EXCEPTION 'unpaid should not earn: %', r; END IF;

  UPDATE orders SET payment_status = 'paid', status = 'delivered' WHERE id = order1;
  r := public.apply_bonus_earn(order1);
  IF r->>'applied' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'earn1 failed: %', r; END IF;
  IF (r->>'earned_paise')::bigint <> 200 THEN RAISE EXCEPTION 'expected earn 200 got %', r->>'earned_paise'; END IF;

  r := public.apply_bonus_earn(order1);
  IF r->>'idempotent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'earn not idempotent'; END IF;

  SELECT bonus_balance_paise INTO bal FROM customers WHERE id = cust_id;
  IF bal <> 200 THEN RAISE EXCEPTION 'balance after earn1 expected 200 got %', bal; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM orders WHERE id = order1
      AND bonus_earned_paise = 200
      AND bonus_breakdown ? 'eligible_amount_paise'
      AND bonus_breakdown ? 'lines'
  ) THEN RAISE EXCEPTION 'order snapshot missing'; END IF;

  INSERT INTO bonus_product_rules (product_id, variant_key, mode)
  VALUES (snack_prod, '250g', 'exclude')
  ON CONFLICT (product_id, variant_key) DO UPDATE SET mode = 'exclude', earn_percent = NULL;
  IF (private.compute_order_bonus_earn(order1)->>'earned_paise')::bigint <> 0 THEN
    RAISE EXCEPTION 'product exclude did not zero earn';
  END IF;
  DELETE FROM bonus_product_rules WHERE product_id = snack_prod AND variant_key = '250g';

  INSERT INTO orders (
    id, order_number, status, payment_status, payment_method, order_channel,
    customer_id, customer_phone, amount_paise, subtotal_paise, delivery_fee_paise, total_amount,
    items_snapshot, completed_at
  ) VALUES (
    order2, 'BONUS-TEST-2-' || substr(order2::text,1,8), 'delivered', 'paid', 'cash', 'pos',
    cust_id, '9999900001', 20000, 20000, 0, 200,
    jsonb_build_array(
      jsonb_build_object('product_id', snack_prod, 'title', 'Test Murukulu', 'variant', '250g', 'qty', 1, 'price', 200,
        'category_id', snacks_id, 'line_total_after_discount_paise', 20000)
    ),
    NOW()
  );

  BEGIN
    PERFORM public.apply_bonus_redeem(order2, 1000, false, NULL);
    RAISE EXCEPTION 'redeem without confirm should raise';
  EXCEPTION WHEN others THEN
    IF SQLERRM LIKE '%redeem without confirm%' THEN RAISE; END IF;
    IF SQLERRM NOT LIKE '%explicit confirmation%' THEN RAISE EXCEPTION 'unexpected: %', SQLERRM; END IF;
  END;

  r := public.preview_bonus(order2);
  IF (r->>'suggested_redeem_paise')::bigint <> 200 THEN
    RAISE EXCEPTION 'suggested expected 200 got %', r->>'suggested_redeem_paise';
  END IF;

  r := public.apply_bonus_redeem(order2, 1000, true, NULL);
  IF r->>'applied' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'redeem failed %', r; END IF;
  IF (r->>'redeemed_paise')::bigint <> 200 THEN RAISE EXCEPTION 'redeem amount expected 200'; END IF;

  r := public.apply_bonus_earn(order2);
  IF r->>'applied' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'earn2 failed %', r; END IF;
  IF (r->>'earned_paise')::bigint <> 400 THEN RAISE EXCEPTION 'earn2 expected 400 got %', r->>'earned_paise'; END IF;
  IF r->>'usable_from_next_order' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'deferred flag missing'; END IF;

  SELECT bonus_balance_paise INTO bal FROM customers WHERE id = cust_id;
  IF bal <> 400 THEN RAISE EXCEPTION 'balance after order2 expected 400 got %', bal; END IF;

  r := public.apply_bonus_redeem(order2, 1000, true, NULL);
  IF r->>'idempotent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'redeem not idempotent'; END IF;

  INSERT INTO customer_bonus_ledger (
    customer_id, entry_type, amount_paise, balance_after_paise, expires_at, idempotency_key, reason
  ) VALUES (
    cust_id, 'surprise', 100, bal+100, NOW() + interval '2 days', 'test-fifo-early-' || order3::text, 'fifo early'
  ) RETURNING id INTO src1;
  INSERT INTO customer_bonus_ledger (
    customer_id, entry_type, amount_paise, balance_after_paise, expires_at, idempotency_key, reason
  ) VALUES (
    cust_id, 'surprise', 100, bal+200, NOW() + interval '30 days', 'test-fifo-late-' || order3::text, 'fifo late'
  );
  PERFORM private.refresh_customer_bonus_cache(cust_id);

  INSERT INTO orders (
    id, order_number, status, payment_status, payment_method, order_channel,
    customer_id, customer_phone, amount_paise, subtotal_paise, total_amount,
    items_snapshot, completed_at
  ) VALUES (
    order3, 'BONUS-TEST-3-' || substr(order3::text,1,8), 'delivered', 'paid', 'cash', 'pos',
    cust_id, '9999900001', 100000, 100000, 1000,
    jsonb_build_array(
      jsonb_build_object('product_id', snack_prod, 'title', 'Big Pack', 'qty', 1, 'price', 1000,
        'category_id', snacks_id, 'line_total_after_discount_paise', 100000)
    ),
    NOW()
  );

  r := public.apply_bonus_redeem(order3, 100, true, NULL);
  IF (r->>'redeemed_paise')::bigint <> 100 THEN RAISE EXCEPTION 'fifo redeem amount'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM customer_bonus_consumptions c
    JOIN customer_bonus_ledger l ON l.id = c.consumer_ledger_id
    WHERE c.source_ledger_id = src1 AND l.idempotency_key = 'redeem:' || order3::text
  ) THEN RAISE EXCEPTION 'FIFO did not consume earliest source'; END IF;

  INSERT INTO customer_bonus_ledger (
    customer_id, entry_type, amount_paise, balance_after_paise, expires_at, idempotency_key, reason
  ) VALUES (
    cust_id, 'surprise', 50,
    (SELECT bonus_balance_paise FROM customers WHERE id = cust_id)+50,
    NOW() - interval '1 hour', 'test-expired-open-' || order3::text, 'expired open'
  ) RETURNING id INTO src_expired;
  PERFORM private.refresh_customer_bonus_cache(cust_id);
  r := public.expire_bonus_entries(NOW());
  IF coalesce((r->>'expired_entries')::int,0) < 1 THEN RAISE EXCEPTION 'expire did not run %', r; END IF;
  IF private.bonus_open_remaining(src_expired) <> 0 THEN RAISE EXCEPTION 'expired entry still open'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM customer_bonus_ledger
    WHERE idempotency_key = 'expire:' || src_expired::text AND entry_type = 'expired'
  ) THEN RAISE EXCEPTION 'missing expired compensating entry'; END IF;

  r := public.reverse_bonus_for_order(order2, 'test cancel', NULL);
  IF r->>'reversed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'reverse failed %', r; END IF;
  r := public.reverse_bonus_for_order(order2, 'test cancel', NULL);
  IF r->>'idempotent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'reverse not idempotent'; END IF;

  UPDATE app_settings SET setting_value = '0.01' WHERE setting_key = 'bonus.max_share_of_contribution_percent';
  r := private.compute_order_bonus_earn(order1);
  IF r->>'guard_status' IS DISTINCT FROM 'blocked_capped' THEN
    RAISE EXCEPTION 'expected blocked_capped got %', r;
  END IF;

  RAISE EXCEPTION 'YASVIK_BONUS_DB_TESTS_PASSED';
END $$;
