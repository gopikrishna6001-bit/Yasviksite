-- Restrict admin RLS policies to authenticated so anon SELECT
-- does not evaluate private.has_admin_role (permission denied).

DROP POLICY IF EXISTS "Admins manage editorial campaigns" ON public.editorial_campaigns;
CREATE POLICY "Admins manage editorial campaigns"
  ON public.editorial_campaigns
  FOR ALL
  TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Admins manage storefront stories" ON public.storefront_stories;
CREATE POLICY "Admins manage storefront stories"
  ON public.storefront_stories
  FOR ALL
  TO authenticated
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));
