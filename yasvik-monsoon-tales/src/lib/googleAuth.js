/** Google OAuth is on by default when Supabase is configured. Set VITE_ENABLE_GOOGLE_AUTH=false to hide it. */
export function isGoogleAuthEnabled() {
  const flag = String(import.meta.env.VITE_ENABLE_GOOGLE_AUTH || '').trim().toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (flag === 'true' || flag === '1' || flag === 'on') return true;
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}
