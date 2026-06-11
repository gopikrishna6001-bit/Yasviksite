/**
 * useStockNotify
 * ─────────────────────────────────────────────────────────
 * Manages per-product "notify me on restock" toggles.
 * Stores subscriptions in localStorage keyed by product ID.
 * In a real integration this would call a backend endpoint;
 * here it persists locally and returns subscribe/unsubscribe helpers.
 */
import { useState, useCallback } from 'react';

const STORE_KEY = 'yasvik_notify_me';

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

export function useStockNotify(productId) {
  const [store, setStore] = useState(loadStore);

  const isSubscribed = !!store[productId];

  const toggle = useCallback(() => {
    setStore(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = { subscribedAt: Date.now() };
      }
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [productId]);

  return { isSubscribed, toggle };
}