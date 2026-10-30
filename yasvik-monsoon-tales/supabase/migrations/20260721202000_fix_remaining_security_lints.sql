-- Fix remaining Supabase security WARN lints.

-- 1) Mutable search_path
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN length(digits) >= 10 THEN right(digits, 10)
    ELSE NULL
  END
  FROM (SELECT regexp_replace(coalesce(raw, ''), '\D', '', 'g') AS digits) s
  WHERE length(digits) >= 10;
$$;

CREATE OR REPLACE FUNCTION public.category_auto_tags(cat_text text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

CREATE OR REPLACE FUNCTION private.order_is_completed_paid(p_order public.orders)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    coalesce(p_order.payment_status, '') IN ('paid', 'pending_cod')
    AND coalesce(p_order.status, '') NOT IN ('failed', 'cancelled', 'refunded', 'pending')
    AND (
      coalesce(p_order.status, '') IN ('delivered', 'confirmed', 'packing', 'ready_for_dispatch', 'shipped', 'out_for_delivery')
      OR p_order.order_channel = 'pos'
    );
$$;

-- 2) Move moddatetime out of public
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION moddatetime SET SCHEMA extensions;

-- 3) Trigger RPC not publicly executable
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM authenticated;

-- 4) Popular sales: public invoker over cache (no order PII via SECURITY DEFINER)
CREATE TABLE IF NOT EXISTS public.popular_product_sales_cache (
  product_id UUID PRIMARY KEY,
  units_sold NUMERIC NOT NULL DEFAULT 0,
  orders_count BIGINT NOT NULL DEFAULT 0,
  refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.popular_product_sales_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read popular product sales cache" ON public.popular_product_sales_cache;
CREATE POLICY "Public read popular product sales cache"
ON public.popular_product_sales_cache
FOR SELECT
TO anon, authenticated
USING (true);

CREATE OR REPLACE FUNCTION private.refresh_popular_product_sales_cache(
  days_back integer DEFAULT 90,
  max_products integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer := 0;
BEGIN
  DELETE FROM public.popular_product_sales_cache;
  INSERT INTO public.popular_product_sales_cache (product_id, units_sold, orders_count, refreshed_at)
  SELECT
    (COALESCE(line->>'product_id', line->>'productId'))::uuid AS product_id,
    SUM(
      CASE
        WHEN COALESCE(line->>'qty', '') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN GREATEST((line->>'qty')::numeric, 1)
        ELSE 1
      END
    ) AS units_sold,
    COUNT(DISTINCT o.id) AS orders_count,
    NOW()
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(COALESCE(o.items_snapshot, '[]'::jsonb)) = 'array'
        THEN COALESCE(o.items_snapshot, '[]'::jsonb)
      ELSE '[]'::jsonb
    END
  ) AS line
  WHERE o.created_at >= NOW() - make_interval(days => GREATEST(COALESCE(days_back, 90), 1))
    AND COALESCE(o.status, '') NOT IN ('pending', 'cancelled', 'failed', 'refunded')
    AND COALESCE(o.payment_status, '') <> 'refunded'
    AND COALESCE(line->>'type', 'product') <> 'combo'
    AND COALESCE(line->>'product_id', line->>'productId')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND COALESCE(o.customer_name, '') !~* '\mtest\M'
    AND COALESCE(o.shipping_name, '') !~* '\mtest\M'
    AND COALESCE(o.notes, '') !~* 'test order'
    AND COALESCE(o.admin_notes, '') !~* 'test order'
  GROUP BY 1
  ORDER BY units_sold DESC, orders_count DESC
  LIMIT LEAST(GREATEST(COALESCE(max_products, 100), 1), 100);

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION private.refresh_popular_product_sales_cache(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.refresh_popular_product_sales_cache(integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_popular_product_sales_cache(
  days_back integer DEFAULT 90,
  max_products integer DEFAULT 100
)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.refresh_popular_product_sales_cache(days_back, max_products);
$$;

REVOKE ALL ON FUNCTION public.refresh_popular_product_sales_cache(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_popular_product_sales_cache(integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_popular_product_sales_cache(integer, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_popular_product_sales_cache(integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.get_popular_product_sales(
  days_back integer DEFAULT 90,
  max_products integer DEFAULT 24
)
RETURNS TABLE(product_id uuid, units_sold numeric, orders_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT c.product_id, c.units_sold, c.orders_count
  FROM public.popular_product_sales_cache c
  ORDER BY c.units_sold DESC, c.orders_count DESC
  LIMIT LEAST(GREATEST(COALESCE(max_products, 24), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.get_popular_product_sales(integer, integer) TO anon, authenticated, service_role;

SELECT private.refresh_popular_product_sales_cache(90, 100);
