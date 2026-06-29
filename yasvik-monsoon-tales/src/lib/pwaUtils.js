const ADMIN_INSTALL_DISMISS_KEY = 'yasvik_admin_pwa_install_dismissed_v1';

export function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  );
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isAdminInstallDismissed() {
  try {
    return window.localStorage.getItem(ADMIN_INSTALL_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissAdminInstall() {
  try {
    window.localStorage.setItem(ADMIN_INSTALL_DISMISS_KEY, '1');
  } catch {
    // ignore
  }
}

export function applyAdminPwaHead() {
  if (typeof document === 'undefined') return () => {};

  const previousManifest = document.querySelector('link[rel="manifest"]')?.getAttribute('href') || '/manifest.json';
  const previousTheme = document.querySelector('meta[name="theme-color"]')?.getAttribute('content') || '#FAF7EF';

  let manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = '/manifest-admin.json';

  const setMeta = (name, content) => {
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.name = name;
      document.head.appendChild(el);
    }
    el.content = content;
  };

  setMeta('theme-color', '#3d342c');
  setMeta('apple-mobile-web-app-capable', 'yes');
  setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
  setMeta('apple-mobile-web-app-title', 'Yasvik Admin');
  setMeta('mobile-web-app-capable', 'yes');

  let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement('link');
    appleIcon.rel = 'apple-touch-icon';
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = '/media/brand/logo-symbol.png';

  document.title = document.title.includes('Yasvik Admin') ? document.title : 'Yasvik Admin';

  return () => {
    manifestLink.href = previousManifest;
    setMeta('theme-color', previousTheme);
    document.querySelector('meta[name="apple-mobile-web-app-capable"]')?.remove();
    document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.remove();
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.remove();
    document.querySelector('meta[name="mobile-web-app-capable"]')?.remove();
    appleIcon?.remove();
  };
}
