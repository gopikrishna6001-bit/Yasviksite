-- Individual admin accounts and role-based access.
-- Roles: admin (all), manager (operational + content), cashier (POS/orders/inventory).

UPDATE public.user_profiles
SET role = 'manager'
WHERE role = 'staff';

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('customer', 'admin', 'manager', 'cashier'));

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_admin_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.is_active = true
      AND profile.role = ANY (allowed_roles)
  );
$$;

REVOKE ALL ON FUNCTION private.has_admin_role(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_admin_role(text[]) TO authenticated;

-- Keep the existing policy helper names while moving privileged reads to private.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT private.has_admin_role(ARRAY['admin', 'manager']);
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT private.has_admin_role(ARRAY['admin', 'manager']);
$$;

-- Authenticated users must never be able to promote or reactivate themselves.
CREATE OR REPLACE FUNCTION public.protect_profile_access_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.role := 'customer';
      NEW.is_active := true;
    ELSE
      NEW.role := OLD.role;
      NEW.is_active := OLD.is_active;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_access_fields_trigger ON public.user_profiles;
CREATE TRIGGER protect_profile_access_fields_trigger
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_access_fields();

-- Manager access for features whose older policies used the legacy staff role.
ALTER POLICY "Staff manage coupons" ON public.coupons
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff read coupon redemptions" ON public.coupon_redemptions
  USING (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage customers" ON public.customers
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage segments" ON public.customer_segments
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage campaigns" ON public.whatsapp_campaigns
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage campaign recipients" ON public.whatsapp_campaign_recipients
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage packaging materials" ON public.packaging_materials
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage packaging profiles" ON public.packaging_profiles
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage packaging profile components" ON public.packaging_profile_components
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Staff manage product variant packaging" ON public.product_variant_packaging
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Admins can manage delivery zones" ON public.delivery_zones
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

ALTER POLICY "Admins can read stock movements" ON public.stock_movements
  USING (private.has_admin_role(ARRAY['admin', 'manager', 'cashier']));

-- Cashiers need read access for their three screens. Mutations continue through
-- authenticated Worker endpoints, which enforce the same permission matrix.
DROP POLICY IF EXISTS "Cashiers read orders" ON public.orders;
CREATE POLICY "Cashiers read orders"
ON public.orders FOR SELECT TO authenticated
USING (private.has_admin_role(ARRAY['cashier']));

DROP POLICY IF EXISTS "Cashiers read order items" ON public.order_items;
CREATE POLICY "Cashiers read order items"
ON public.order_items FOR SELECT TO authenticated
USING (private.has_admin_role(ARRAY['cashier']));

-- Remove the historical rule that allowed every signed-in customer to read all orders.
ALTER POLICY "own_orders_read" ON public.orders
  USING (auth.uid() = user_id);
