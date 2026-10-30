-- Fix SECURITY DEFINER views flagged by Supabase linter.
-- Recreate with security_invoker so underlying table RLS applies.

CREATE OR REPLACE VIEW public.published_products
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.description,
  p.price,
  p.discount_price,
  p.featured_image_url,
  c.name AS category_name,
  c.slug AS category_slug,
  p.is_featured,
  p.featured_in_hero,
  p.created_at,
  p.updated_at
FROM public.products p
LEFT JOIN public.categories c ON p.category_id = c.id
WHERE p.is_published = TRUE;

CREATE OR REPLACE VIEW public.active_categories
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  slug,
  description,
  icon_url,
  color_hex,
  sort_order,
  is_active,
  created_at,
  updated_at
FROM public.categories
WHERE is_active = TRUE
ORDER BY sort_order;

CREATE OR REPLACE VIEW public.user_order_summary
WITH (security_invoker = true) AS
SELECT
  o.user_id,
  COUNT(o.id) AS total_orders,
  SUM(o.total_amount) AS lifetime_value,
  MAX(o.created_at) AS last_order_date,
  SUM(CASE WHEN o.status::text = 'delivered' THEN 1 ELSE 0 END) AS delivered_orders
FROM public.orders o
GROUP BY o.user_id;

DROP POLICY IF EXISTS "Public read approved reviews" ON public.reviews;
CREATE POLICY "Public read approved reviews"
ON public.reviews
FOR SELECT
TO anon, authenticated
USING (COALESCE(is_approved, true) = true);

CREATE OR REPLACE VIEW public.product_review_stats
WITH (security_invoker = true) AS
SELECT
  product_id,
  COUNT(*) FILTER (WHERE COALESCE(is_approved, true)) AS review_count,
  ROUND(AVG(rating) FILTER (WHERE COALESCE(is_approved, true)), 1) AS avg_rating
FROM public.reviews
GROUP BY product_id;

REVOKE ALL ON public.published_products FROM PUBLIC;
REVOKE ALL ON public.published_products FROM anon, authenticated;
GRANT SELECT ON public.published_products TO anon, authenticated, service_role;

REVOKE ALL ON public.active_categories FROM PUBLIC;
REVOKE ALL ON public.active_categories FROM anon, authenticated;
GRANT SELECT ON public.active_categories TO anon, authenticated, service_role;

REVOKE ALL ON public.user_order_summary FROM PUBLIC;
REVOKE ALL ON public.user_order_summary FROM anon, authenticated;
GRANT SELECT ON public.user_order_summary TO authenticated, service_role;

REVOKE ALL ON public.product_review_stats FROM PUBLIC;
REVOKE ALL ON public.product_review_stats FROM anon, authenticated;
GRANT SELECT ON public.product_review_stats TO anon, authenticated, service_role;
