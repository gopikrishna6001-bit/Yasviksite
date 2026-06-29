/** Detect Telugu script (Unicode Telugu block). */
export function hasTeluguScript(value = '') {
  return /[\u0C00-\u0C7F]/.test(String(value || ''));
}

/**
 * Canonical Telugu display names keyed by product slug.
 * Used when admin `local_name` is still in Roman transliteration.
 */
export const TELUGU_NAME_BY_SLUG = {
  'whole-wheat': 'గోధుమలు',
  'kabuli-chana': 'కబులి శెనగలు',
  'masoor-dal': 'మసూర్ పప్పు',
  'whole-green-gram': 'పూర్తి పెసరపప్పు',
  'poha-flattened-rice': 'అటుకులు',
  'upma-sooji-rava': 'ఉప్మా రవ్వ · బొంబాయి రవ్వ',
  'flax-seeds': 'అవిసె గింజలు',
  'whole-toor': 'పూర్తి కంది పప్పు',
  'idly-rava': 'ఇడ్లి రవ్వ',
  'white-jowar': 'తెల్ల జొన్నలు',
  'whole-urad': 'మినుములు',
  'white-peas': 'తెల్ల బటానీలు',
  'brown-chana': 'చెనగలు',
  'roasted-gram': 'పుట్నాలు',
  'yellow-jowar': 'పచ్చ జొన్నలు',
  'urad-gota': 'మినప గుండ్లు',
  'horse-gram': 'ఉలవలు',
  'black-horse-gram': 'నల్ల ఉలవలు',
  'green-peas': 'పచ్చ బటానీలు',
  'split-urad-dal-with-skin': 'మినపప్పు తొక్కతో',
  'split-moong-dal-with-skin': 'పెసరపప్పు తొక్కతో',
  'red-rajma': 'ఎరుపు రాజ్మా',
  'white-rajma': 'తెల్ల రాజ్మా',
  'white-lobiya': 'తెల్ల లోబియా',
  'wheat-rava': 'గోధుమ రవ్వ',
  'chana-dal': 'చెనగపప్పు',
  cowpeas: 'బొబ్బర్లు',
  'moong-dal': 'పెసరపప్పు',
  'white-sugar': 'తెల్ల చక్కర',
  'toor-dal': 'కంది పప్పు',
};

export function getProductTeluguName(product = {}) {
  const teluguField = String(product.telugu_name || '').trim();
  if (teluguField && hasTeluguScript(teluguField)) return teluguField;

  const localName = String(product.local_name || '').trim();
  if (localName && hasTeluguScript(localName)) return localName;

  const slug = String(product.slug || '').trim().toLowerCase();
  if (slug && TELUGU_NAME_BY_SLUG[slug]) return TELUGU_NAME_BY_SLUG[slug];

  return '';
}
