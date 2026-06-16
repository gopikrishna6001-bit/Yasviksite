-- ============================================================================
-- Yasvik App - Storage Bucket Configuration
-- ============================================================================
-- NOTE: Supabase Storage buckets must be created via dashboard or API
-- This file documents the bucket structure and SQL-based policies
-- ============================================================================

-- ============================================================================
-- BUCKET CREATION (via Dashboard or CLI)
-- ============================================================================
 Create New Bucket
-- Or use Supabase CLI: supabase storage create-bucket <name> --public
-- Or use TypeScript client:
-- 
-- const { data, error } = await supabase.storage
--   .createBucket('product-images', { public: true })
--
-- Buckets needed:
-- 1. product-images      (Public)   - Product photos
-- 2. story-images        (Public)   - Story featured images
-- 3. person-images       (Public)   - Person/chef photos
-- 4. recipe-images       (Public)   - Recipe photos
-- 5. journey-images      (Public)   - Journey covers
-- 6. media-assets        (Public)   - General media
-- 7. user-uploads        (Private)  - User avatars, documents
-- 8. order-receipts      (Private)  - Order documents
-- ============================================================================

-- ============================================================================
-- STORAGE POLICIES - Public Buckets (Read Access)
-- ============================================================================

-- Product Images - Public Read
CREATE POLICY "Public read product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Story Images - Public Read
CREATE POLICY "Public read story images"
ON storage.objects FOR SELECT
USING (bucket_id = 'story-images');

-- Person Images - Public Read
CREATE POLICY "Public read person images"
ON storage.objects FOR SELECT
USING (bucket_id = 'person-images');

-- Recipe Images - Public Read
CREATE POLICY "Public read recipe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Journey Images - Public Read
CREATE POLICY "Public read journey images"
ON storage.objects FOR SELECT
USING (bucket_id = 'journey-images');

-- Media Assets - Public Read
CREATE POLICY "Public read media assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'media-assets');

-- ============================================================================
-- STORAGE POLICIES - Public Buckets (Authenticated Upload)
-- ============================================================================

-- Admins can upload to product images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- Admins can upload to story images
CREATE POLICY "Admins can upload story images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'story-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- Admins can upload to person images
CREATE POLICY "Admins can upload person images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'person-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- Admins can upload to recipe images
CREATE POLICY "Admins can upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- Admins can upload to journey images
CREATE POLICY "Admins can upload journey images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'journey-images'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- Admins can upload to media assets
CREATE POLICY "Admins can upload media assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'media-assets'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- ============================================================================
-- STORAGE POLICIES - Private Buckets (Authenticated Only)
-- ============================================================================

-- User Uploads - Read own files
CREATE POLICY "Users can read own uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-uploads'
  AND auth.role() = 'authenticated'
  AND (owner_id = auth.uid() OR auth.role() = 'authenticated')
);

-- Admins can read all user uploads
CREATE POLICY "Admins can read all user uploads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-uploads'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- Users can upload to their own directory
CREATE POLICY "Users can upload to user-uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-uploads'
  AND auth.role() = 'authenticated'
  AND LOWER(name) LIKE LOWER(CONCAT(auth.uid()::text, '/%'))
);

-- Order Receipts - Users can read own
CREATE POLICY "Users can read own order receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'order-receipts'
  AND auth.role() = 'authenticated'
);

-- Order Receipts - Admins can read all
CREATE POLICY "Admins can read all order receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'order-receipts'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

-- Admins can upload receipts
CREATE POLICY "Admins can upload order receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'order-receipts'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'role' IN ('admin', 'staff')
  )
);

COMMIT;
