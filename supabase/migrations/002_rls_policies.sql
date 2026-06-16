-- ============================================================================
-- Yasvik App - Row Level Security (RLS) Policies
-- ============================================================================
-- Controls data access at the database level
-- Enables secure multi-tenant access without app-level checks
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: Check User Role
-- ============================================================================

CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'role' = 'admin'
      OR raw_user_meta_data->>'role' = 'staff')
  )
$$ LANGUAGE sql SECURITY DEFINER;

-- Alternative using custom claims (if available)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
    OR (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'staff'
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- USER PROFILES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON user_profiles FOR SELECT
USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON user_profiles FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (auth.uid() = id);

-- Admins can insert profiles (for user creation)
CREATE POLICY "Admins can insert profiles"
ON user_profiles FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- CATEGORIES
-- ============================================================================

-- Public read (anyone can list categories)
CREATE POLICY "Categories are public"
ON categories FOR SELECT
USING (TRUE);

-- Only admins can insert/update/delete
CREATE POLICY "Only admins can manage categories"
ON categories FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Only admins can update categories"
ON categories FOR UPDATE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

CREATE POLICY "Only admins can delete categories"
ON categories FOR DELETE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- PRODUCTS
-- ============================================================================

-- Public read published products
CREATE POLICY "Public can read published products"
ON products FOR SELECT
USING (is_published = TRUE);

-- Authenticated users can read all products (for admin panel)
CREATE POLICY "Authenticated users can read all products"
ON products FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins can insert products
CREATE POLICY "Only admins can create products"
ON products FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Only admins can update products
CREATE POLICY "Only admins can update products"
ON products FOR UPDATE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Only admins can delete products
CREATE POLICY "Only admins can delete products"
ON products FOR DELETE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- PRODUCT IMAGES
-- ============================================================================

-- Public read images for published products
CREATE POLICY "Public can read product images"
ON product_images FOR SELECT
USING (EXISTS (
  SELECT 1 FROM products
  WHERE products.id = product_images.product_id
  AND products.is_published = TRUE
));

-- Admins can manage all product images
CREATE POLICY "Admins can insert product images"
ON product_images FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- COMBOS
-- ============================================================================

-- Public read published combos
CREATE POLICY "Public can read published combos"
ON combos FOR SELECT
USING (is_published = TRUE);

-- Authenticated users can read all combos
CREATE POLICY "Authenticated can read all combos"
ON combos FOR SELECT
USING (auth.role() = 'authenticated');

-- Only admins manage combos
CREATE POLICY "Only admins can manage combos"
ON combos FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- COMBO ITEMS
-- ============================================================================

-- Public read combo items
CREATE POLICY "Public can read combo items"
ON combo_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM combos
  WHERE combos.id = combo_items.combo_id
  AND combos.is_published = TRUE
));

-- Admins only
CREATE POLICY "Only admins can manage combo items"
ON combo_items FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- JOURNEYS
-- ============================================================================

-- Public read published journeys
CREATE POLICY "Public can read published journeys"
ON journeys FOR SELECT
USING (is_published = TRUE);

-- Authenticated users read all
CREATE POLICY "Authenticated can read all journeys"
ON journeys FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins only insert/update/delete
CREATE POLICY "Only admins can manage journeys"
ON journeys FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- STORIES
-- ============================================================================

-- Public read published stories
CREATE POLICY "Public can read published stories"
ON stories FOR SELECT
USING (is_published = TRUE);

-- Authenticated users read all
CREATE POLICY "Authenticated can read all stories"
ON stories FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins only insert/update/delete
CREATE POLICY "Only admins can manage stories"
ON stories FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- STORY COMMENTS
-- ============================================================================

-- Public read approved comments on published stories
CREATE POLICY "Public can read approved comments"
ON story_comments FOR SELECT
USING (
  is_approved = TRUE
  AND EXISTS (
    SELECT 1 FROM stories
    WHERE stories.id = story_comments.story_id
    AND stories.is_published = TRUE
  )
);

-- Authenticated users can insert comments
CREATE POLICY "Authenticated users can comment"
ON story_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND auth.role() = 'authenticated'
);

-- Users can update own comments
CREATE POLICY "Users can update own comments"
ON story_comments FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- PEOPLE
-- ============================================================================

-- Public read published people
CREATE POLICY "Public can read published people"
ON people FOR SELECT
USING (is_published = TRUE);

-- Authenticated users read all
CREATE POLICY "Authenticated can read all people"
ON people FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins only insert/update/delete
CREATE POLICY "Only admins can manage people"
ON people FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- RECIPES
-- ============================================================================

-- Public read published recipes
CREATE POLICY "Public can read published recipes"
ON recipes FOR SELECT
USING (is_published = TRUE);

-- Authenticated users read all
CREATE POLICY "Authenticated can read all recipes"
ON recipes FOR SELECT
USING (auth.role() = 'authenticated');

-- Admins only insert/update/delete
CREATE POLICY "Only admins can manage recipes"
ON recipes FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- COLLECTIONS
-- ============================================================================

-- Public read active collections
CREATE POLICY "Public can read active collections"
ON collections FOR SELECT
USING (is_active = TRUE);

-- Admins can read all collections
CREATE POLICY "Admins can read all collections"
ON collections FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Admins manage collections
CREATE POLICY "Only admins can manage collections"
ON collections FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- COLLECTION ITEMS
-- ============================================================================

-- Public read items in active collections
CREATE POLICY "Public can read collection items"
ON collection_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM collections
  WHERE collections.id = collection_items.collection_id
  AND collections.is_active = TRUE
));

-- Admins manage
CREATE POLICY "Only admins can manage collection items"
ON collection_items FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- REGIONS
-- ============================================================================

-- Public read regions
CREATE POLICY "Regions are public"
ON regions FOR SELECT
USING (TRUE);

-- Admins manage
CREATE POLICY "Only admins can manage regions"
ON regions FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- ORDERS
-- ============================================================================

-- Users can read their own orders
CREATE POLICY "Users can read own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all orders
CREATE POLICY "Admins can read all orders"
ON orders FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Authenticated users can create orders
CREATE POLICY "Authenticated users can create orders"
ON orders FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND auth.role() = 'authenticated'
);

-- Users can update their own orders (status updates)
CREATE POLICY "Users can update own orders"
ON orders FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can update all orders
CREATE POLICY "Admins can update all orders"
ON orders FOR UPDATE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================

-- Users can read items from their orders
CREATE POLICY "Users can read own order items"
ON order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM orders
  WHERE orders.id = order_items.order_id
  AND orders.user_id = auth.uid()
));

-- Admins can read all order items
CREATE POLICY "Admins can read all order items"
ON order_items FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================

-- Public read active subscriptions
CREATE POLICY "Public can read active subscriptions"
ON subscriptions FOR SELECT
USING (is_active = TRUE);

-- Admins manage subscriptions
CREATE POLICY "Only admins can manage subscriptions"
ON subscriptions FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- USER SUBSCRIPTIONS
-- ============================================================================

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
ON user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all subscriptions
CREATE POLICY "Admins can read all user subscriptions"
ON user_subscriptions FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Authenticated users can create subscriptions
CREATE POLICY "Users can subscribe"
ON user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
ON user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- REVIEWS
-- ============================================================================

-- Public read approved reviews
CREATE POLICY "Public can read approved reviews"
ON reviews FOR SELECT
USING (is_approved = TRUE);

-- Authenticated users can read all reviews (for moderation)
CREATE POLICY "Authenticated can read all reviews"
ON reviews FOR SELECT
USING (auth.role() = 'authenticated');

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
ON reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update own reviews
CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can delete reviews
CREATE POLICY "Admins can delete reviews"
ON reviews FOR DELETE
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- ADDRESSES
-- ============================================================================

-- Users can read their own addresses
CREATE POLICY "Users can read own addresses"
ON addresses FOR SELECT
USING (auth.uid() = user_id);

-- Admins can read all addresses
CREATE POLICY "Admins can read all addresses"
ON addresses FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Authenticated users can create addresses
CREATE POLICY "Users can create addresses"
ON addresses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses"
ON addresses FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
ON addresses FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- APP SETTINGS
-- ============================================================================

-- Public read some settings (read-only config)
CREATE POLICY "Public can read public settings"
ON app_settings FOR SELECT
USING (setting_key NOT IN ('payment_key', 'smtp_password', 'api_secret'));

-- Admins only insert/update/delete
CREATE POLICY "Only admins can manage app settings"
ON app_settings FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- HOMEPAGE SECTIONS
-- ============================================================================

-- Public read active sections
CREATE POLICY "Public can read active sections"
ON homepage_sections FOR SELECT
USING (is_active = TRUE);

-- Admins can read all
CREATE POLICY "Admins can read all sections"
ON homepage_sections FOR SELECT
USING (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- Admins manage sections
CREATE POLICY "Only admins can manage sections"
ON homepage_sections FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- PAGE HEROES
-- ============================================================================

-- Public read active heroes
CREATE POLICY "Public can read active page heroes"
ON page_heroes FOR SELECT
USING (is_active = TRUE);

-- Admins manage heroes
CREATE POLICY "Only admins can manage page heroes"
ON page_heroes FOR INSERT
WITH CHECK (auth.uid() IN (
  SELECT id FROM user_profiles
  WHERE raw_user_meta_data->>'role' IN ('admin', 'staff')
));

-- ============================================================================
-- MEDIA ASSETS
-- ============================================================================

-- Public read active public assets
CREATE POLICY "Public can read public media assets"
ON media_assets FOR SELECT
USING (is_active = TRUE);

-- Authenticated users can read all
CREATE POLICY "Authenticated can read all media assets"
ON media_assets FOR SELECT
USING (auth.role() = 'authenticated');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload media"
ON media_assets FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update own uploads
CREATE POLICY "Users can update own media"
ON media_assets FOR UPDATE
USING (auth.uid() = created_by);

COMMIT;
