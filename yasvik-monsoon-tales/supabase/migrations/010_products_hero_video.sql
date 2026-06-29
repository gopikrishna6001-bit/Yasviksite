-- Optional product hero video URL (mp4/webm/youtube) for detail page & card hover
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS hero_video text;
