import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalytics, isAnalyticsEnabled, trackPageView } from '@/lib/analytics';

export default function GoogleAnalytics() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    trackPageView(`${pathname}${search || ''}`);
  }, [pathname, search]);

  return null;
}
