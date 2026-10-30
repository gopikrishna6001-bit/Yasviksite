-- Editorial storefront CMS support: campaigns table + Hero content fields.
-- Does NOT flip editorial_storefront_public. Public home wiring still flag-gated.

-- ─── Product fields needed for Hero PDP launch editing ─────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS primary_customer_benefit text,
  ADD COLUMN IF NOT EXISTS natural_variation_note text;

COMMENT ON COLUMN public.products.primary_customer_benefit IS
  'One clear customer benefit line for Hero / Favourites merchandising.';
COMMENT ON COLUMN public.products.natural_variation_note IS
  'Honest note that colour, texture or aroma may vary naturally.';

-- ─── Editorial campaigns (managed in /admin/editorial-storefront) ────────────
CREATE TABLE IF NOT EXISTS public.editorial_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  title text NOT NULL,
  headline text,
  supporting_copy text,
  desktop_media_url text,
  mobile_media_url text,
  poster_image_url text,
  media_type text NOT NULL DEFAULT 'image',
  cta_label text,
  cta_destination text,
  text_safe_position text NOT NULL DEFAULT 'bottom-left',
  collection_slug text,
  poster_tone text,
  display_priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editorial_campaigns_slug_key UNIQUE (slug),
  CONSTRAINT editorial_campaigns_media_type_check
    CHECK (media_type IN ('image', 'video')),
  CONSTRAINT editorial_campaigns_text_safe_check
    CHECK (text_safe_position IN (
      'bottom-left', 'bottom-right', 'top-left', 'top-right', 'center'
    ))
);

CREATE INDEX IF NOT EXISTS idx_editorial_campaigns_active_priority
  ON public.editorial_campaigns (is_active, display_priority);

ALTER TABLE public.editorial_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage editorial campaigns" ON public.editorial_campaigns;
CREATE POLICY "Admins manage editorial campaigns"
  ON public.editorial_campaigns
  FOR ALL
  USING (private.has_admin_role(ARRAY['admin', 'manager']))
  WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));

DROP POLICY IF EXISTS "Public read active editorial campaigns" ON public.editorial_campaigns;
CREATE POLICY "Public read active editorial campaigns"
  ON public.editorial_campaigns
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

COMMENT ON TABLE public.editorial_campaigns IS
  'Editorial homepage campaign carousel. Only launch-ready media+copy slides render.';

INSERT INTO public.editorial_campaigns (
  slug, title, headline, supporting_copy,
  desktop_media_url, mobile_media_url, poster_image_url, media_type,
  cta_label, cta_destination, text_safe_position, collection_slug, poster_tone,
  display_priority, is_active
)
VALUES
(
  'cold-pressed-oils',
  'Cold-Pressed Oils',
  'Bring back the aroma refined oils leave behind.',
  'Cold-pressed oils chosen for aroma, process and everyday cooking.',
  NULL, NULL, NULL, 'image',
  'Explore oils',
  '/shop',
  'bottom-left',
  'from-seed-to-oil',
  'from-[#2a3d2e] to-[#5c4a32]',
  10,
  true
),
(
  'homemade-andhra-foods',
  'Homemade Andhra Foods',
  'The taste of a home kitchen, ready when you are.',
  'Pickles, powders and snacks with a homemade Andhra kitchen feel.',
  NULL, NULL, NULL, 'image',
  'Explore homemade',
  '/shop',
  'bottom-left',
  'homemade-andhra-kitchen',
  'from-[#4a2f24] to-[#8a5a3a]',
  20,
  true
),
(
  'heritage-rice',
  'Heritage Rice',
  'Not all rice should taste and cook the same.',
  'Heritage grains with character for conscious everyday cooking.',
  NULL, NULL, NULL, 'image',
  'Explore heritage rice',
  '/shop',
  'bottom-left',
  'heritage-and-natural-everyday-foods',
  'from-[#3d3428] to-[#6b5a3e]',
  30,
  true
),
(
  'jaggery-honey',
  'Jaggery & Honey',
  'Traditional sweetness, understood better.',
  'Jaggery and honey for everyday kitchens — real variation included.',
  NULL, NULL, NULL, 'image',
  'Explore pantry sweets',
  '/shop',
  'bottom-left',
  'heritage-and-natural-everyday-foods',
  'from-[#5a3d1e] to-[#a67c2e]',
  40,
  true
)
ON CONFLICT (slug) DO NOTHING;
