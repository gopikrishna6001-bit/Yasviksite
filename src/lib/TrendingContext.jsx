/**
 * TrendingContext
 * ─────────────────────────────────────────────────────
 * Tracks view/cart events for products per-session and
 * derives a "trending score" list (most interacted first).
 *
 * Also reads landing signals:
 *   - document.referrer  → search engine / social / direct
 *   - ?utm_source        → campaign source
 *   - ?ref               → custom referral tag
 *   - ?q / ?search       → search query hint
 *
 * Persisted to localStorage so signals survive soft nav.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORE_KEY = 'yasvik_trending';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    const now = Date.now();
    // Prune old entries
    Object.keys(raw).forEach(id => {
      if (now - (raw[id].lastSeen || 0) > MAX_AGE_MS) delete raw[id];
    });
    return raw;
  } catch { return {}; }
}

function parseLandingSignal() {
  const params = new URLSearchParams(window.location.search);
  const referrer = document.referrer || '';
  let source = 'direct';
  if (params.get('utm_source')) source = params.get('utm_source');
  else if (referrer.includes('google') || referrer.includes('bing') || referrer.includes('yahoo')) source = 'search';
  else if (referrer.includes('instagram') || referrer.includes('facebook') || referrer.includes('twitter') || referrer.includes('whatsapp')) source = 'social';
  else if (referrer && !referrer.includes(window.location.hostname)) source = 'referral';

  return {
    source,                                    // 'search' | 'social' | 'referral' | 'direct' | utm value
    ref: params.get('ref') || null,            // custom ref tag
    searchQuery: params.get('q') || params.get('search') || null,
    campaignMedium: params.get('utm_medium') || null,
    campaignContent: params.get('utm_content') || null,
  };
}

const TrendingContext = createContext(null);

export function TrendingProvider({ children }) {
  const [scores, setScores] = useState(loadStore);
  const [landing] = useState(parseLandingSignal);

  // Persist on change
  useEffect(() => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(scores)); } catch {}
  }, [scores]);

  const bump = useCallback((productId, eventType = 'view') => {
    // view=1pt, cart=3pt, purchase=5pt
    const pts = { view: 1, cart: 3, purchase: 5 }[eventType] || 1;
    setScores(prev => {
      const entry = prev[productId] || { score: 0, views: 0, carts: 0, lastSeen: 0 };
      return {
        ...prev,
        [productId]: {
          ...entry,
          score: entry.score + pts,
          views: entry.views + (eventType === 'view' ? 1 : 0),
          carts: entry.carts + (eventType === 'cart' ? 1 : 0),
          lastSeen: Date.now(),
        },
      };
    });
  }, []);

  /**
   * Sort an array of objects (with .id) by trending score, descending.
   * Items not in the scores map are placed at the end.
   */
  const sortByTrending = useCallback((items) => {
    return [...items].sort((a, b) => {
      const sa = scores[a.id]?.score || 0;
      const sb = scores[b.id]?.score || 0;
      return sb - sa;
    });
  }, [scores]);

  /**
   * Returns top-N product IDs by trending score.
   */
  const topProductIds = useCallback((n = 6) => {
    return Object.entries(scores)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, n)
      .map(([id]) => id);
  }, [scores]);

  return (
    <TrendingContext.Provider value={{ bump, sortByTrending, topProductIds, landing, scores }}>
      {children}
    </TrendingContext.Provider>
  );
}

export const useTrending = () => useContext(TrendingContext);