-- Campaign media approval status for editorial launch gates.
-- Does NOT flip editorial_storefront_public.

ALTER TABLE public.editorial_campaigns
  ADD COLUMN IF NOT EXISTS media_approval_status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'editorial_campaigns_media_approval_check'
  ) THEN
    ALTER TABLE public.editorial_campaigns
      ADD CONSTRAINT editorial_campaigns_media_approval_check
      CHECK (media_approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

COMMENT ON COLUMN public.editorial_campaigns.media_approval_status IS
  'Owner media QA: pending | approved | rejected. Launch-ready campaigns require approved.';
