import { normalizeAdminRole } from '@/lib/adminAccess';

/** Admin + manager must use Google OAuth and re-authenticate each calendar day (IST). */
export const GOOGLE_ONLY_STAFF_ROLES = new Set(['admin', 'manager']);

export const ADMIN_AUTH_TZ = 'Asia/Kolkata';

export function requiresGoogleDailyAuth(role) {
  return GOOGLE_ONLY_STAFF_ROLES.has(normalizeAdminRole(role));
}

export function userHasGoogleIdentity(authUser) {
  if (!authUser) return false;
  const identities = Array.isArray(authUser.identities) ? authUser.identities : [];
  if (identities.some((identity) => String(identity?.provider || '').toLowerCase() === 'google')) {
    return true;
  }
  const metaProvider = String(authUser.app_metadata?.provider || '').toLowerCase();
  if (metaProvider === 'google') return true;
  const providers = authUser.app_metadata?.providers;
  if (Array.isArray(providers) && providers.map((p) => String(p).toLowerCase()).includes('google')) {
    return true;
  }
  return false;
}

/** Calendar day in Asia/Kolkata, e.g. "2026-07-22". */
export function calendarDayInTz(date = new Date(), timeZone = ADMIN_AUTH_TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date instanceof Date ? date : new Date(date));
}

/**
 * Privileged staff must sign in again if last_sign_in_at is not today (IST).
 * Missing timestamp → treat as expired.
 */
export function isPrivilegedStaffSessionExpired(lastSignInAt, now = new Date()) {
  if (!lastSignInAt) return true;
  const signedIn = new Date(lastSignInAt);
  if (Number.isNaN(signedIn.getTime())) return true;
  return calendarDayInTz(signedIn) !== calendarDayInTz(now);
}

export function privilegedStaffAuthError({ missingGoogle, expired } = {}) {
  if (missingGoogle) {
    return new Error('Administrators and managers must sign in with Google');
  }
  if (expired) {
    return new Error('Your admin session expired. Please sign in again with Google.');
  }
  return new Error('Admin Google sign-in required');
}

/**
 * Returns null when OK, otherwise an Error for admin/manager policy failures.
 * Cashiers and customers are not checked.
 */
export function getPrivilegedStaffAuthViolation(role, authUser) {
  if (!requiresGoogleDailyAuth(role)) return null;
  if (!userHasGoogleIdentity(authUser)) {
    return privilegedStaffAuthError({ missingGoogle: true });
  }
  if (isPrivilegedStaffSessionExpired(authUser?.last_sign_in_at)) {
    return privilegedStaffAuthError({ expired: true });
  }
  return null;
}
