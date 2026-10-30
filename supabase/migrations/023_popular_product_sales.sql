-- Popular products: aggregate completed sales across POS + website orders.
--
-- SECURITY DEFINER lets the public homepage read aggregate product ranks
-- without exposing order rows (orders RLS stays intact). The function returns
-- only product ids + counts — no customer or order data.

CREATE OR REPLACE FUNCTION public.get_popular_product_sales(
  days_back integer DEFAULT 90,
  max_products integer DEFAULT 24
)
RETURNS TABLE (product_id uuid, units_sold numeric, orders_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (COALESCE(line->>'product_id', line->>'productId'))::uuid AS product_id,
    SUM(
      CASE
        WHEN COALESCE(line->>'qty', '') ~ '^[0-9]+(\.[0-9]+)?$'
          THEN GREATEST((line->>'qty')::numeric, 1)
        ELSE 1
      END
    ) AS units_sold,
    COUNT(DISTINCT o.id) AS orders_count
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(COALESCE(o.items_snapshot, '[]'::jsonb)) = 'array'
        THEN COALESCE(o.items_snapshot, '[]'::jsonb)
      ELSE '[]'::jsonb
    END
  ) AS line
  WHERE o.created_at >= NOW() - make_interval(days => GREATEST(COALESCE(days_back, 90), 1))
    -- Completed / in-flight sales only: exclude abandoned, cancelled, failed, refunded.
    AND COALESCE(o.status, '') NOT IN ('pending', 'cancelled', 'failed', 'refunded')
    AND COALESCE(o.payment_status, '') <> 'refunded'
    -- Combos are priced bundles, not individual product demand signals.
    AND COALESCE(line->>'type', 'product') <> 'combo'
    -- Only lines that reference a real catalog product id.
    AND COALESCE(line->>'product_id', line->>'productId')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    -- Best-effort exclusion of test orders.
    AND COALESCE(o.customer_name, '') !~* '\mtest\M'
    AND COALESCE(o.shipping_name, '') !~* '\mtest\M'
    AND COALESCE(o.notes, '') !~* 'test order'
    AND COALESCE(o.admin_notes, '') !~* 'test order'
  GROUP BY 1
  ORDER BY units_sold DESC, orders_count DESC
  LIMIT LEAST(GREATEST(COALESCE(max_products, 24), 1), 100);
$$;

REVOKE ALL ON FUNCTION public.get_popular_product_sales(integer, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_popular_product_sales(integer, integer)
  TO anon, authenticated, service_role;
