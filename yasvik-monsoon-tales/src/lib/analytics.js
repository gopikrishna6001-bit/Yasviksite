const GA_ID = String(import.meta.env.VITE_GA_MEASUREMENT_ID || '').trim();

let initialized = false;

function hasGtag() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

export function isAnalyticsEnabled() {
  return Boolean(GA_ID);
}

export function initAnalytics() {
  if (!GA_ID || initialized || typeof document === 'undefined') return;
  initialized = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });
}

export function trackPageView(path, title) {
  if (!GA_ID || !hasGtag()) return;
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
  });
}

export function trackEvent(eventName, params = {}) {
  if (!GA_ID || !hasGtag()) return;
  window.gtag('event', eventName, params);
}

export function trackWhatsAppClick(source = 'unknown') {
  trackEvent('whatsapp_click', { source });
}

export function trackBeginCheckout(value = 0, itemCount = 0) {
  trackEvent('begin_checkout', {
    currency: 'INR',
    value,
    items: itemCount,
  });
}
