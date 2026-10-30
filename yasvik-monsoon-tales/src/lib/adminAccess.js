export const ADMIN_ROLES = ['admin', 'manager', 'cashier'];

const ROLE_LABELS = {
  admin: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
};

const CASHIER_PATHS = ['/admin/pos', '/admin/orders', '/admin/inventory'];
const MANAGER_BLOCKED_PATHS = ['/admin/staff', '/admin/settings'];

export function normalizeAdminRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized === 'staff' ? 'manager' : normalized;
}

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(normalizeAdminRole(role));
}

export function roleLabel(role) {
  return ROLE_LABELS[normalizeAdminRole(role)] || 'Staff';
}

export function canAccessAdminPath(role, path) {
  const normalizedRole = normalizeAdminRole(role);
  const normalizedPath = String(path || '/admin').replace(/\/+$/, '') || '/admin';

  if (normalizedRole === 'admin') return true;
  if (normalizedRole === 'manager') {
    return !MANAGER_BLOCKED_PATHS.some(
      (blocked) => normalizedPath === blocked || normalizedPath.startsWith(`${blocked}/`),
    );
  }
  if (normalizedRole === 'cashier') {
    return CASHIER_PATHS.some(
      (allowed) => normalizedPath === allowed || normalizedPath.startsWith(`${allowed}/`),
    );
  }
  return false;
}

export function adminLandingPath(role) {
  return normalizeAdminRole(role) === 'cashier' ? '/admin/pos' : '/admin';
}
