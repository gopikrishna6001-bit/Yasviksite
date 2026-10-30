-- SEO controls, canonical public category slugs, and redirect history support.

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS seo_slug text,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_intro text,
  ADD COLUMN IF NOT EXISTS seo_faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_override text,
  ADD COLUMN IF NOT EXISTS indexable boolean NOT NULL DEFAULT true;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS canonical_override text,
  ADD COLUMN IF NOT EXISTS indexable boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_seo_slug_unique
  ON public.categories (lower(seo_slug))
  WHERE seo_slug IS NOT NULL AND btrim(seo_slug) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_category_slug_aliases_old_slug_lower
  ON public.category_slug_aliases (lower(old_slug));

WITH slug_map AS (
  SELECT *
  FROM (VALUES
    ('snacks', 'homemade-snacks-sweets'),
    ('pickles', 'homemade-pickles'),
    ('spices', 'spices-powders-podis'),
    ('cold-pressed-oils', 'cold-pressed-oils'),
    ('ghee', 'ghee'),
    ('honey', 'honey'),
    ('jaggery', 'jaggery'),
    ('dry-fruits', 'dry-fruits-nuts-seeds'),
    ('heritage-rice', 'heritage-rice'),
    ('millets', 'millets-millet-foods'),
    ('store-staples', 'organic-staples'),
    ('pooja', 'pooja-essentials'),
    ('functional-food-powders', 'functional-food-powders'),
    ('natural-care', 'natural-care')
  ) AS t(db_slug, public_slug)
)
UPDATE public.categories c
SET seo_slug = m.public_slug,
    updated_at = now()
FROM slug_map m
WHERE c.parent_id IS NULL
  AND lower(c.slug) = m.db_slug
  AND (c.seo_slug IS NULL OR btrim(c.seo_slug) = '');

WITH slug_map AS (
  SELECT *
  FROM (VALUES
    ('snacks', 'homemade-snacks-sweets'),
    ('pickles', 'homemade-pickles'),
    ('spices', 'spices-powders-podis'),
    ('cold-pressed-oils', 'cold-pressed-oils'),
    ('ghee', 'ghee'),
    ('honey', 'honey'),
    ('jaggery', 'jaggery'),
    ('dry-fruits', 'dry-fruits-nuts-seeds'),
    ('heritage-rice', 'heritage-rice'),
    ('millets', 'millets-millet-foods'),
    ('store-staples', 'organic-staples'),
    ('pooja', 'pooja-essentials'),
    ('functional-food-powders', 'functional-food-powders'),
    ('natural-care', 'natural-care')
  ) AS t(db_slug, public_slug)
)
INSERT INTO public.category_slug_aliases (old_slug, category_id)
SELECT c.slug, c.id
FROM public.categories c
JOIN slug_map m
  ON lower(c.slug) = m.db_slug
WHERE c.parent_id IS NULL
  AND c.slug IS NOT NULL
  AND btrim(c.slug) <> ''
  AND lower(c.slug) <> lower(m.public_slug)
ON CONFLICT (old_slug) DO NOTHING;

INSERT INTO public.category_slug_aliases (old_slug, category_id)
SELECT old_slug, category_id
FROM (
  VALUES
    ('homemade-snacks-and-sweets', (SELECT id FROM public.categories WHERE lower(slug) = 'snacks' LIMIT 1)),
    ('snacks-and-sweets', (SELECT id FROM public.categories WHERE lower(slug) = 'snacks' LIMIT 1)),
    ('pickles-and-condiments', (SELECT id FROM public.categories WHERE lower(slug) = 'pickles' LIMIT 1)),
    ('spices-masalas-and-pantry', (SELECT id FROM public.categories WHERE lower(slug) = 'spices' LIMIT 1)),
    ('cold-pressed-oil', (SELECT id FROM public.categories WHERE lower(slug) = 'cold-pressed-oils' LIMIT 1)),
    ('wood-pressed-oils', (SELECT id FROM public.categories WHERE lower(slug) = 'cold-pressed-oils' LIMIT 1)),
    ('dry-fruits-nuts-and-seeds', (SELECT id FROM public.categories WHERE lower(slug) = 'dry-fruits' LIMIT 1)),
    ('heritage-rice-millets', (SELECT id FROM public.categories WHERE lower(slug) = 'heritage-rice' LIMIT 1)),
    ('millet-flours', (SELECT id FROM public.categories WHERE lower(slug) = 'millets' LIMIT 1)),
    ('pooja', (SELECT id FROM public.categories WHERE lower(slug) = 'pooja' LIMIT 1)),
    ('store-staples', (SELECT id FROM public.categories WHERE lower(slug) = 'store-staples' LIMIT 1))
) AS aliases(old_slug, category_id)
WHERE category_id IS NOT NULL
ON CONFLICT (old_slug) DO NOTHING;

ALTER TABLE public.category_slug_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read category slug aliases" ON public.category_slug_aliases;
CREATE POLICY "Public read category slug aliases"
ON public.category_slug_aliases
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Admins manage category slug aliases" ON public.category_slug_aliases;
CREATE POLICY "Admins manage category slug aliases"
ON public.category_slug_aliases
FOR ALL
TO authenticated
USING (private.has_admin_role(ARRAY['admin', 'manager']))
WITH CHECK (private.has_admin_role(ARRAY['admin', 'manager']));
