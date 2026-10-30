export const PUBLIC_NAV_GROUPS = [
  { key: 'shop', label: 'Shop', sortOrder: 10 },
  { key: 'brand', label: 'Yasvik', sortOrder: 20 },
  { key: 'legacy', label: 'More', sortOrder: 25 },
  { key: 'account', label: 'Account', sortOrder: 30 },
  { key: 'help', label: 'Help', sortOrder: 40 },
];

/** Primary drawer + header destinations for the current retail build. */
export const DRAWER_PRIMARY_ITEMS = [
  { key: 'shop_all', label: 'Shop', path: '/shop' },
  { key: 'our_roots', label: 'Our Roots', path: '/our-roots' },
  { key: 'stories', label: 'Stories', path: '/stories' },
  { key: 'contact', label: 'Contact', path: '/contact' },
];

export const PUBLIC_NAV_ITEMS = [
  { key: 'shop_all', label: 'All Products', path: '/shop', group: 'shop', sortOrder: 10, emphasis: true, configurable: true },
  { key: 'wishlist', label: 'Wishlist', path: '/wishlist', group: 'shop', sortOrder: 20, configurable: true },
  { key: 'bundles', label: 'Bundles', path: '/shop?category=__bundles__', group: 'shop', sortOrder: 30, configurable: true, defaultVisible: false },

  { key: 'our_roots', label: 'Our Roots', path: '/our-roots', group: 'brand', sortOrder: 10, configurable: true },
  { key: 'stories', label: 'Stories', path: '/stories', group: 'brand', sortOrder: 20, configurable: true },

  { key: 'producers', label: 'Our Farmers', path: '/farmers', group: 'legacy', sortOrder: 10, configurable: true, defaultVisible: false },
  { key: 'farming_cycle', label: 'Farming Cycle', path: '/farming-cycle', group: 'legacy', sortOrder: 20, configurable: true, defaultVisible: false },

  { key: 'profile', label: 'Profile', path: '/profile', group: 'account', sortOrder: 10, requiresAuth: true, configurable: true },
  { key: 'orders', label: 'Orders & Addresses', path: '/profile#orders', group: 'account', sortOrder: 20, requiresAuth: true, configurable: true },
  { key: 'login', label: 'Login / Sign Up', path: '/login?next=/profile', group: 'account', sortOrder: 10, guestOnly: true, configurable: false },

  { key: 'contact', label: 'Contact', path: '/contact', group: 'help', sortOrder: 10, configurable: true },
  { key: 'support', label: 'Support', path: '/contact#support', group: 'help', sortOrder: 20, configurable: true, defaultVisible: false },
  { key: 'privacy', label: 'Privacy', path: '/privacy', group: 'help', sortOrder: 30, configurable: true },
  { key: 'terms', label: 'Terms', path: '/terms', group: 'help', sortOrder: 40, configurable: true },
  { key: 'delivery_policy', label: 'Delivery policy', path: '/delivery-policy', group: 'help', sortOrder: 35, configurable: true },
];

export function getConfigurableNavItems() {
  return PUBLIC_NAV_ITEMS.filter((item) => item.configurable !== false);
}

export function getPageSettingForKey(pageSettings = [], key) {
  return pageSettings.find((setting) => setting.page_key === key);
}

export function isNavItemVisible(item, { pageSettings = [], isAuthenticated = false } = {}) {
  if (!item) return false;
  if (item.requiresAuth && !isAuthenticated) return false;
  if (item.guestOnly && isAuthenticated) return false;

  const setting = getPageSettingForKey(pageSettings, item.key);
  if (setting?.is_visible === false) return false;
  if (setting?.is_visible === true) return true;
  if (item.defaultVisible === false) return false;
  return true;
}

export function resolveVisibleNavItems({ pageSettings = [], isAuthenticated = false } = {}) {
  return PUBLIC_NAV_ITEMS.filter((item) => isNavItemVisible(item, { pageSettings, isAuthenticated })).map((item) => {
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

/** Drawer sections aligned with footer + mobile chrome for the current storefront. */
export function getDrawerNavSections({ pageSettings = [], isAuthenticated = false } = {}) {
  const visible = resolveVisibleNavItems({ pageSettings, isAuthenticated });
  const visibleKeys = new Set(visible.map((item) => item.key));

  const primary = DRAWER_PRIMARY_ITEMS.filter((item) => visibleKeys.has(item.key)).map((item) => {
    const resolved = visible.find((entry) => entry.key === item.key);
    return { ...item, label: resolved?.label || item.label, path: resolved?.path || item.path };
  });

  const shopExtras = visible.filter((item) => item.group === 'shop' && item.key !== 'shop_all');
  const account = visible.filter((item) => item.group === 'account');
  const legal = visible.filter((item) => item.group === 'help' && item.key !== 'contact');

  return { primary, shopExtras, account, legal };
}
