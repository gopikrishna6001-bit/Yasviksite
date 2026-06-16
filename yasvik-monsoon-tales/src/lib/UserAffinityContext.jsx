/**
 * UserAffinityContext
 * ──────────────────────────────────────────────────────────
 * Tracks the first category/region a user engaged with and
 * their top interest area. Used to personalize homepage copy
 * and section ordering.
 *
 * Persisted in localStorage.
 */
import { createContext, useContext, useState, useCallback } from 'react';

const STORE_KEY = 'yasvik_affinity';

function loadAffinity() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { return {}; }
}

const UserAffinityContext = createContext(null);

export function UserAffinityProvider({ children }) {
  const [affinity, setAffinity] = useState(loadAffinity);

  const recordEngagement = useCallback(({ categoryId, categoryName, regionId, regionName, journeyId, journeyName } = {}) => {
    setAffinity(prev => {
      const updated = { ...prev };
      // Record first engagement only
      if (!updated.firstCategoryId && categoryId) {
        updated.firstCategoryId = categoryId;
        updated.firstCategoryName = categoryName || null;
      }
      if (!updated.firstRegionId && regionId) {
        updated.firstRegionId = regionId;
        updated.firstRegionName = regionName || null;
      }
      if (!updated.firstJourneyId && journeyId) {
        updated.firstJourneyId = journeyId;
        updated.firstJourneyName = journeyName || null;
      }
      // Track engagement counts
      if (categoryId) {
        updated.categoryCounts = { ...(updated.categoryCounts || {}), [categoryId]: ((updated.categoryCounts || {})[categoryId] || 0) + 1 };
      }
      try { localStorage.setItem(STORE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  // Returns the category the user engaged with most
  const topCategoryId = affinity.categoryCounts
    ? Object.entries(affinity.categoryCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
    : null;

  return (
    <UserAffinityContext.Provider value={{ affinity, recordEngagement, topCategoryId }}>
      {children}
    </UserAffinityContext.Provider>
  );
}

export const useUserAffinity = () => useContext(UserAffinityContext);