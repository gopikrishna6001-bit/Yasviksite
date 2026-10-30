export const HOME_GOOGLE_REVIEWS_SETTING_KEY = 'home_google_reviews';

const FALLBACK_REVIEWS = [
  {
    id: 'fallback-1',
    text: 'The quality is excellent. Fresh, well-packed, and delivered on time. Highly recommended!',
    name: 'Priya S.',
    location: 'Hyderabad',
    rating: 5,
    source: 'google',
  },
];

export function parseGoogleReviews(value) {
  if (value == null || value === '') return [];

  let raw = value;
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(raw)) return [];

  return raw
    .map((row, index) => {
      const text = String(row?.text || row?.review_text || row?.quote || '').trim();
      const name = String(row?.name || row?.display_name || row?.author_name || '').trim();
      if (!text || !name) return null;
      const rawRating = Number(row?.rating);
      // Google reviews default to 5 when stars weren't pasted with the quote.
      const rating = Number.isFinite(rawRating) && rawRating >= 1
        ? Math.min(5, rawRating)
        : 5;
      return {
        id: String(row?.id || `review-${index + 1}`),
        text,
        name,
        location: String(row?.location || '').trim(),
        rating,
        source: String(row?.source || 'google').trim() || 'google',
        order: Number(row?.order ?? index + 1) || index + 1,
        is_active: row?.is_active === false ? false : true,
      };
    })
    .filter(Boolean)
    .filter((row) => row.is_active)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function serializeGoogleReviews(reviews = []) {
  return parseGoogleReviews(reviews).map((row, index) => ({
    id: row.id,
    text: row.text,
    name: row.name,
    location: row.location,
    rating: row.rating,
    source: row.source || 'google',
    order: index + 1,
    is_active: true,
  }));
}

export function resolveHomeGoogleReviews(settingsValue, { includeFallback = true } = {}) {
  const curated = parseGoogleReviews(settingsValue);
  if (curated.length) return curated;
  return includeFallback ? FALLBACK_REVIEWS : [];
}
