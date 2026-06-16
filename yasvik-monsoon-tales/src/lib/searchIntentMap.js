export const SEARCH_INTENT_MAP = {
  immunity: ['ragi', 'millet', 'honey', 'turmeric', 'pepper'],
  wellness: ['millet', 'organic', 'natural', 'farmer', 'healthy'],
  festive: ['jaggery', 'ghee', 'rice', 'spices', 'honey'],
  sambar: ['toor dal', 'turmeric', 'spices', 'red rice'],
  breakfast: ['dosa mix', 'flakes', 'ragi', 'millet'],
  diabetes: ['kodo', 'barnyard', 'little millet', 'sorghum', 'black rice'],
};

export function resolveIntentTerms(query = '') {
  const q = String(query).trim().toLowerCase();
  if (!q) return [];
  const direct = SEARCH_INTENT_MAP[q];
  if (direct) return direct;
  const matched = Object.entries(SEARCH_INTENT_MAP).find(([intent]) => q.includes(intent));
  return matched ? matched[1] : [];
}

