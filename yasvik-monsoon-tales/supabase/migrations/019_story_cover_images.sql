-- Story cover image galleries for slideshows

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS cover_images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.stories.cover_images IS 'Array of cover image URLs for slideshow; featured_image_url remains primary';

-- Backfill primary cover into gallery when empty
UPDATE public.stories
SET cover_images = jsonb_build_array(featured_image_url)
WHERE featured_image_url IS NOT NULL
  AND featured_image_url <> ''
  AND (cover_images IS NULL OR cover_images = '[]'::jsonb);
