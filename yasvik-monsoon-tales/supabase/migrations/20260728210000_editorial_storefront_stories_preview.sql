-- Editorial storefront Stories CMS + collection media fields + preview feature flag.
-- Does NOT enable public homepage consumption of merchandising or Stories.
-- Existing long-form public.stories (articles) remains unchanged.

-- ─── 1. Collection cover media for story-world cards ────────────────────────
ALTER TABLE public.merchandising_collections
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS poster_image_url text;

UPDATE public.merchandising_collections SET
  cover_image_url = COALESCE(cover_image_url, CASE slug
    WHEN 'from-seed-to-oil' THEN 'https://media.yasvik.com/media-assets/products/yasvik-asset-4.webp'
    WHEN 'homemade-andhra-kitchen' THEN 'https://media.yasvik.com/media-assets/products/yasvik-asset-9.webp'
    WHEN 'heritage-and-natural-everyday-foods' THEN 'https://media.yasvik.com/media-assets/products/yasvik-organic-kattuyanam-rice-hero.webp'
    ELSE NULL
  END),
  updated_at = now()
WHERE cover_image_url IS NULL;

-- ─── 2. Storefront Stories (vertical video CMS — separate from stories articles)
CREATE TABLE IF NOT EXISTS public.storefront_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  short_hook text,
  video_url text,
  poster_image_url text,
  captions text,
  duration_seconds integer,
  related_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  related_category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  related_collection_id uuid REFERENCES public.merchandising_collections(id) ON DELETE SET NULL,
  related_journey_id uuid REFERENCES public.journeys(id) ON DELETE SET NULL,
  cta_label text,
  cta_destination text,
  instagram_url text,
  youtube_url text,
  facebook_url text,
  display_priority integer NOT NULL DEFAULT 100,
  show_on_homepage boolean NOT NULL DEFAULT false,
  show_on_product_page boolean NOT NULL DEFAULT false,
  show_on_category_page boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  ends_at timestamptz,
  language text NOT NULL DEFAULT 'en',
  impression_count integer NOT NULL DEFAULT 0,
  play_count integer NOT NULL DEFAULT 0,
  complete_count integer NOT NULL DEFAULT 0,
  cta_click_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT storefront_stories_slug_key UNIQUE (slug),
  CONSTRAINT storefront_stories_status_check
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_storefront_stories_status_priority
  ON public.storefront_stories (status, display_priority, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_storefront_stories_homepage
  ON public.storefront_stories (show_on_homepage, display_priority)
  WHERE status = 'published' AND show_on_homepage = true;

ALTER TABLE public.storefront_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage storefront stories" ON public.storefront_stories;
CREATE POLICY "Admins manage storefront stories"
  ON public.storefront_stories
  FOR ALL
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

-- Public read only for published stories (future launch). Preview uses admin role.
DROP POLICY IF EXISTS "Public read published storefront stories" ON public.storefront_stories;
CREATE POLICY "Public read published storefront stories"
  ON public.storefront_stories
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

COMMENT ON TABLE public.storefront_stories IS
  'Vertical editorial Stories CMS (9:16). Separate from long-form stories articles and journeys.';

-- ─── 3. Seed six first-launch Stories as drafts (no video until approved media)
INSERT INTO public.storefront_stories (
  title, slug, short_hook, poster_image_url, captions, duration_seconds,
  related_product_id, related_collection_id, cta_label, cta_destination,
  display_priority, show_on_homepage, status, language
)
VALUES
(
  'Why Yasvik Goes Looking',
  'why-yasvik-goes-looking',
  'We go looking for foods worth bringing home.',
  NULL,
  'We Look. We Ask. We Taste. We Choose.',
  35,
  NULL,
  NULL,
  'Shop Yasvik Favourites',
  '/shop',
  10,
  true,
  'draft',
  'en'
),
(
  'Following Groundnut Oil Back to the Seed',
  'following-groundnut-oil-back-to-the-seed',
  'Before it is oil, it is seed.',
  'https://media.yasvik.com/media-assets/products/chatgpt-image-jun-27_-2026_-02_35_32-pm-mqw4xhgp.webp',
  'Cold pressed for aroma you can cook with.',
  40,
  '486919f8-f0e7-4911-8b8c-8471e6a6d795'::uuid,
  '5a683bfb-3a84-4ad3-883a-728b8e3f5543'::uuid,
  'Shop Groundnut Oil',
  '/product/cold-pressed-groundnut-oil',
  20,
  true,
  'draft',
  'en'
),
(
  'Inside an Avakaya Batch',
  'inside-an-avakaya-batch',
  'Avakaya is a batch, not a factory flavour.',
  'https://media.yasvik.com/media-assets/products/yasvik-asset-9.webp',
  'Home-style mango pickle — made to keep.',
  40,
  '4c4396d8-c1e4-4359-90fb-778105fd2c3f'::uuid,
  'fe18ddb1-e3bf-4f83-a58f-9daa1d26b428'::uuid,
  'Shop Avakaya',
  '/product/mango-pickle-avakaya',
  30,
  true,
  'draft',
  'en'
),
(
  'Sesame Oil for Pickles, Podis and Traditional Cooking',
  'sesame-oil-for-pickles-podis-and-traditional-cooking',
  'Sesame oil is not only for finishing.',
  'https://media.yasvik.com/media-assets/products/yasvik-asset-4.webp',
  'Cold-pressed white sesame for pickles, podis and traditional cooking.',
  40,
  '2f47f4cf-2002-4e8a-89ed-0400fc91a618'::uuid,
  '5a683bfb-3a84-4ad3-883a-728b8e3f5543'::uuid,
  'Shop Sesame Oil',
  '/product/cold-pressed-sesame-oil',
  40,
  true,
  'draft',
  'en'
),
(
  'Cooking Kattuyanam for the First Time',
  'cooking-kattuyanam-for-the-first-time',
  'Heritage rice needs a little patience.',
  'https://media.yasvik.com/media-assets/products/yasvik-organic-kattuyanam-rice-hero.webp',
  'Organic Kattuyanam — cook it once, you will understand the grain.',
  40,
  '9153896a-27dd-47b9-a1a1-e608a8ef870a'::uuid,
  '207a0bca-31d8-4fca-9ca2-783a0d9eff36'::uuid,
  'Shop Kattuyanam',
  '/product/organic-kattuyanam-rice',
  50,
  true,
  'draft',
  'en'
),
(
  'Why Jaggery Does Not Always Look Identical',
  'why-jaggery-does-not-always-look-identical',
  'Real jaggery is not factory-identical.',
  'https://media.yasvik.com/media-assets/products/yasvik-yureka-jaggery-powder-hero.webp',
  'Colour can shift. The sugarcane story stays.',
  35,
  '9bd19447-45d6-4c37-be1a-9849030365d0'::uuid,
  '207a0bca-31d8-4fca-9ca2-783a0d9eff36'::uuid,
  'Shop Jaggery Powder',
  '/product/yureka-jaggery-powder',
  60,
  true,
  'draft',
  'en'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  short_hook = EXCLUDED.short_hook,
  poster_image_url = COALESCE(storefront_stories.poster_image_url, EXCLUDED.poster_image_url),
  captions = EXCLUDED.captions,
  related_product_id = EXCLUDED.related_product_id,
  related_collection_id = EXCLUDED.related_collection_id,
  cta_label = EXCLUDED.cta_label,
  cta_destination = EXCLUDED.cta_destination,
  display_priority = EXCLUDED.display_priority,
  show_on_homepage = EXCLUDED.show_on_homepage,
  updated_at = now();

-- ─── 4. Feature flag — public editorial homepage OFF ────────────────────────
INSERT INTO public.app_settings (setting_key, setting_value, data_type, description)
VALUES (
  'editorial_storefront_public',
  'false',
  'boolean',
  'When true, public homepage may use editorial layout. Default false — preview only via /admin/storefront-preview/editorial.'
)
ON CONFLICT (setting_key) DO UPDATE SET
  description = EXCLUDED.description;
