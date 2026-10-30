-- Critical: enable RLS on category_slug_aliases (was publicly writable without RLS)
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

-- Harden Yasvik Bonus / CRM SECURITY DEFINER RPCs: service_role only
REVOKE ALL ON FUNCTION public.apply_bonus_earn(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_bonus_earn(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.apply_bonus_earn(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_bonus_earn(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.apply_bonus_redeem(UUID, BIGINT, BOOLEAN, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_bonus_redeem(UUID, BIGINT, BOOLEAN, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.apply_bonus_redeem(UUID, BIGINT, BOOLEAN, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_bonus_redeem(UUID, BIGINT, BOOLEAN, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.reverse_bonus_for_order(UUID, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reverse_bonus_for_order(UUID, TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.reverse_bonus_for_order(UUID, TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_bonus_for_order(UUID, TEXT, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.expire_bonus_entries(TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_bonus_entries(TIMESTAMPTZ) FROM anon;
REVOKE ALL ON FUNCTION public.expire_bonus_entries(TIMESTAMPTZ) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_bonus_entries(TIMESTAMPTZ) TO service_role;

REVOKE ALL ON FUNCTION public.grant_surprise_bonus(UUID, BIGINT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.grant_surprise_bonus(UUID, BIGINT, TEXT, TEXT, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.grant_surprise_bonus(UUID, BIGINT, TEXT, TEXT, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.grant_surprise_bonus(UUID, BIGINT, TEXT, TEXT, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.preview_bonus(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_bonus(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.preview_bonus(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.preview_bonus(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_customer_crm(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_customer_crm(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.refresh_customer_crm(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_customer_crm(TEXT) TO service_role;
