/** Shared mobile bottom chrome — avoids stacked nav + cart + buy bars. */

export const HIDE_BOTTOM_NAV_PREFIXES = ['/checkout', '/login', '/register', '/admin'];

export function resolveMobileChrome({ pathname, totalItems, storeOffline }) {
  const isProductPage = pathname.startsWith('/product/');
  const isCheckout = pathname.startsWith('/checkout');
  const hiddenRoute = HIDE_BOTTOM_NAV_PREFIXES.some((p) => pathname.startsWith(p));

  const showCartCheckoutBar =
    !storeOffline
    && totalItems > 0
    && (pathname === '/' || pathname.startsWith('/shop'))
    && !isCheckout;

  const showBottomNav =
    !hiddenRoute
    && !isProductPage
    && !showCartCheckoutBar
    && !isCheckout;

  let bottomInset = '0px';
  if (showBottomNav) {
    bottomInset = 'calc(3.75rem + env(safe-area-inset-bottom, 0px))';
  } else if (showCartCheckoutBar || isProductPage) {
    bottomInset = 'calc(4.75rem + env(safe-area-inset-bottom, 0px))';
  }

  return {
    isProductPage,
    showCartCheckoutBar,
    showBottomNav,
    bottomInset,
  };
}
