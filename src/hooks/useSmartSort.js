/**
 * useSmartSort
 * ─────────────────────────────────────────────────────────
 * Sorts a list of items based on:
 *  1. Trending score (from TrendingContext)
 *  2. Landing source signal (social → featured, search → all)
 *  3. is_featured flag
 *  4. Recency (created_date / published_date fallback)
 *
 * Returns the sorted array.
 */
import { useMemo } from 'react';
import { useTrending } from '@/lib/TrendingContext';

export function useSmartSort(items = [], options = {}) {
  const { sortByTrending, landing } = useTrending();
  const { boostFeatured = true, dateField = 'created_date' } = options;

  return useMemo(() => {
    if (!items.length) return items;

    // Assign a composite weight to each item
    const scored = items.map(item => {
      let weight = 0;

      // Trending bump (0–100 range normalized roughly)
      // (sortByTrending handles ordering; here we just use it as a secondary signal
      //  by checking if item is in top half of trending list)
      if (boostFeatured && item.is_featured) weight += 20;

      // Landing source boosts
      if (landing.source === 'social') {
        // Social visitors respond to visually rich / featured content
        if (item.is_featured) weight += 15;
        if (item.cover_image || item.hero_image) weight += 5;
      } else if (landing.source === 'search') {
        // Search visitors want breadth — slight recency boost
        const d = item[dateField] ? new Date(item[dateField]).getTime() : 0;
        weight += Math.min(10, Math.floor(d / 1e11)); // small recency nudge
      } else if (landing.source === 'referral') {
        // Referral — trust featured picks
        if (item.is_featured) weight += 10;
      }

      // Recency tiebreaker
      const ts = item[dateField] ? new Date(item[dateField]).getTime() : 0;
      weight += ts / 1e13; // negligible absolute value, only matters as tiebreaker

      return { item, weight };
    });

    // Sort by weight desc, then apply trending on top via stable re-sort
    const weightSorted = scored.sort((a, b) => b.weight - a.weight).map(s => s.item);
    return sortByTrending(weightSorted);
  }, [items, sortByTrending, landing, boostFeatured, dateField]);
}