-- Phase 2: tax engine services are ready for preview/admin use.
-- GST_LIVE_BILLING remains false. Registration stays SUSPENDED until admin confirms.

UPDATE public.app_settings
SET
  setting_value = 'true',
  value = 'true',
  data_type = 'boolean',
  description = 'Tax engine services (rules, PoS, calculate, validate) are available. Does NOT permit live taxable GST invoicing.',
  updated_at = now()
WHERE setting_key = 'gst_ready_mode';

INSERT INTO public.app_settings (setting_key, setting_value, data_type, description, key, value)
SELECT
  'gst_ready_mode',
  'true',
  'boolean',
  'Tax engine services (rules, PoS, calculate, validate) are available. Does NOT permit live taxable GST invoicing.',
  'gst_ready_mode',
  'true'
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_settings WHERE setting_key = 'gst_ready_mode'
);

UPDATE public.app_settings
SET
  setting_value = 'false',
  value = 'false',
  updated_at = now()
WHERE setting_key = 'gst_live_billing';

UPDATE public.app_settings
SET
  setting_value = '2',
  value = '2',
  description = 'Commerce/tax engine schema+services phase marker.',
  updated_at = now()
WHERE setting_key = 'commerce_tax_schema_phase';

UPDATE public.business_tax_profile
SET
  gst_ready_mode = true,
  gst_live_billing = false,
  updated_at = now()
WHERE true;

COMMENT ON TABLE public.business_tax_profile IS
  'Yasvik GST registration state. Phase 2: gst_ready_mode may be true while gst_live_billing stays false until registration is ACTIVE and start date is set by authorized admin.';
