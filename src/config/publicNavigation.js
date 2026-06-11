export const PUBLIC_NAV_GROUPS = [
  { key: 'shop', label: 'Shop', sortOrder: 10 },
  { key: 'discover', label: 'Discover', sortOrder: 20 },
  { key: 'account', label: 'Account', sortOrder: 30 },
  { key: 'help', label: 'Help', sortOrder: 40 },
];

export const PUBLIC_NAV_ITEMS = [
  { key: 'shop_all', label: 'All Categories', path: '/shop', group: 'shop', sortOrder: 10, emphasis: true, configurable: true },
  { key: 'wishlist', label: 'Wishlist', path: '/wishlist', group: 'shop', sortOrder: 90, configurable: true },

  { key: 'our_roots', label: 'Our Roots', path: '/our-roots', group: 'discover', sortOrder: 10, configurable: true },
  { key: 'people', label: 'People', path: '/people', group: 'discover', sortOrder: 20, configurable: true },
  { key: 'stories', label: 'Stories', path: '/stories', group: 'discover', sortOrder: 30, configurable: true },
  { key: 'recipes', label: 'Recipes', path: '/recipes', group: 'discover', sortOrder: 40, configurable: true },
  { key: 'farming_cycle', label: 'Farming Cycle', path: '/farming-cycle', group: 'discover', sortOrder: 50, configurable: true },

  { key: 'profile', label: 'Profile', path: '/profile', group: 'account', sortOrder: 10, requiresAuth: true, configurable: true },
  { key: 'orders', label: 'Orders & Addresses', path: '/profile#orders', group: 'account', sortOrder: 20, requiresAuth: true, configurable: true },
  { key: 'login', label: 'Login / Sign Up', path: '/login?next=/profile', group: 'account', sortOrder: 10, guestOnly: true, configurable: false },

  { key: 'contact', label: 'Contact', path: '/contact', group: 'help', sortOrder: 10, configurable: true },
  { key: 'support', label: 'Support', path: '/contact#support', group: 'help', sortOrder: 20, configurable: true },
];

export function getConfigurableNavItems() {
  return PUBLIC_NAV_ITEMS.filter((item) => item.configurable !== false);
}

export function getPageSettingForKey(pageSettings = [], key) {
  return pageSettings.find((setting) => setting.page_key === key);
}

export function resolveVisibleNavItems({ pageSettings = [], isAuthenticated = false } = {}) {
  return PUBLIC_NAV_ITEMS.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.guestOnly && isAuthenticated) return false;
    const setting = getPageSettingForKey(pageSettings, item.key);
    return setting?.is_visible !== false;
  }).map((item) => {
    const setting = getPageSettingForKey(pageSettings, item.key);
    return {
      ...item,
      label: setting?.label || item.label,
      resolvedSortOrder: Number.isFinite(Number(setting?.sort_order)) ? Number(setting.sort_order) : item.sortOrder,
    };
  }).sort((a, b) => (a.resolvedSortOrder ?? 0) - (b.resolvedSortOrder ?? 0));
}

export function groupNavItems(items = []) {
  return PUBLIC_NAV_GROUPS.map((group) => ({
    ...group,
    items: items
      .filter((item) => item.group === group.key)
      .sort((a, b) => (a.resolvedSortOrder ?? a.sortOrder ?? 0) - (b.resolvedSortOrder ?? b.sortOrder ?? 0)),
  })).filter((group) => group.items.length > 0);
}
