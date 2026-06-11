import { Client } from 'pg';

const client = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  port: 5432,
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const adminEmail = process.env.ADMIN_EMAIL || 'gopikrishna6001@gmail.com';

const sql = `
-- 1) Profile bootstrap on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, role, is_active, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = '${adminEmail}' THEN 'admin' ELSE 'customer' END,
    true,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false)
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name),
      email_verified = EXCLUDED.email_verified;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 2) Helper admin check using public.user_profiles.role
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin','staff')
      AND up.is_active = true
  );
$$;

-- 3) Tighten write policies: only admins can mutate catalog/content/admin objects
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname='public'
      AND policyname LIKE 'auth_manage_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY admin_manage_categories ON categories FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_products ON products FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_product_images ON product_images FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_combos ON combos FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_combo_items ON combo_items FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_journeys ON journeys FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_stories ON stories FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_story_comments ON story_comments FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_people ON people FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_recipes ON recipes FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_collections ON collections FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_collection_items ON collection_items FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_regions ON regions FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_orders ON orders FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_order_items ON order_items FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_subscriptions ON subscriptions FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_user_subscriptions ON user_subscriptions FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_reviews ON reviews FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_app_settings ON app_settings FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_homepage_sections ON homepage_sections FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_page_heroes ON page_heroes FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_media_assets ON media_assets FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
CREATE POLICY admin_manage_page_settings ON page_settings FOR ALL USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- Keep address self-management + admin override
DROP POLICY IF EXISTS own_addresses_manage ON addresses;
CREATE POLICY own_addresses_manage ON addresses FOR ALL
USING (auth.uid() = user_id OR public.is_admin_user())
WITH CHECK (auth.uid() = user_id OR public.is_admin_user());

-- 4) Ensure admin profile exists or is promoted
UPDATE public.user_profiles
SET role='admin', is_active=true
WHERE lower(email)=lower('${adminEmail}');
`;

await client.connect();
await client.query(sql);

const { rows } = await client.query("select id, email, role, is_active from public.user_profiles order by created_at desc nulls last limit 10");
console.log('Recent profiles:', rows);
await client.end();
console.log('Phase 2 hardening applied.');
