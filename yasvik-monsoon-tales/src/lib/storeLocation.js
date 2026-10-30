/** Canonical store location — keep in sync with Google Business Profile. */
export const YASVIK_GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/sKdPkSmNvqmrUC2a7';

/** Shown on Contact until a real storefront photo is uploaded in admin. */
export const YASVIK_STORE_PHOTO_PLACEHOLDER = '/media/footer-home-trial.png';

export const YASVIK_STORE_NAME = 'Yasvik Foods';
export const YASVIK_BRAND_NAME = 'Yasvik';

export const YASVIK_STORE_ADDRESS_LINES = [
  'Yasvik Store, Bavanipuram Colony Road no 4',
  'Ashok Nagar, Chanda Nagar',
  'Hyderabad, Telangana 500050',
];

export const YASVIK_STORE_POSTAL_ADDRESS = {
  streetAddress: 'Bavanipuram Colony Road no 4, Ashok Nagar',
  addressLocality: 'Chanda Nagar, Hyderabad',
  addressRegion: 'Telangana',
  postalCode: '500050',
  addressCountry: 'IN',
};

export const YASVIK_STORE_GEO = {
  latitude: 17.5079009,
  longitude: 78.3114584,
};

export const YASVIK_PHONE_DIGITS = '7842938998';
export const YASVIK_WHATSAPP_NUMBER = `91${YASVIK_PHONE_DIGITS}`;
export const YASVIK_SUPPORT_PHONE_DISPLAY = '78429 38998';
export const YASVIK_SUPPORT_PHONE = `+91-${YASVIK_PHONE_DIGITS.slice(0, 5)}-${YASVIK_PHONE_DIGITS.slice(5)}`;
export const YASVIK_SUPPORT_PHONE_TEL = `+91${YASVIK_PHONE_DIGITS}`;
export const YASVIK_SUPPORT_EMAIL = 'yasvikfoods@gmail.com';
export const YASVIK_STORE_HOURS = 'Mo-Su 09:00-21:00';

/** Default pincode for header / delivery context (Ashok Nagar store). */
export const YASVIK_DEFAULT_SERVICE_PINCODE = YASVIK_STORE_POSTAL_ADDRESS.postalCode;

/** Customer-facing service area line — keep pin in sync with store address. */
export const YASVIK_SERVICE_AREA_LABEL = `Door delivery across Hyderabad · Store: Ashok Nagar ${YASVIK_DEFAULT_SERVICE_PINCODE}`;

export function buildLocalBusinessJsonLd(origin = 'https://www.yasvik.com', options = {}) {
  const lat = Number(options.latitude ?? YASVIK_STORE_GEO.latitude);
  const lng = Number(options.longitude ?? YASVIK_STORE_GEO.longitude);
  const mapsUrl = String(options.googleMapsUrl || YASVIK_GOOGLE_MAPS_URL).trim() || YASVIK_GOOGLE_MAPS_URL;
  const description = String(options.description || '').trim() || (
    'Yasvik — Better Food. Found. Visit us in Ashok Nagar, Chanda Nagar, Hyderabad for homemade snacks, '
    + 'pickles, spice powders and podis, cold-pressed oils, ghee, honey, jaggery, dry fruits, heritage rice, millets and carefully chosen everyday foods.'
  );
  const sameAs = [
    ...(Array.isArray(options.sameAs) ? options.sameAs : []),
    options.instagramUrl,
    options.facebookUrl,
    options.youtubeUrl,
    mapsUrl,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    '@id': `${origin.replace(/\/$/, '')}/#store`,
    name: YASVIK_STORE_NAME,
    alternateName: YASVIK_BRAND_NAME,
    url: origin,
    image: `${origin.replace(/\/$/, '')}/media/brand/logo-horizontal.png`,
    telephone: YASVIK_SUPPORT_PHONE,
    email: YASVIK_SUPPORT_EMAIL,
    description,
    hasMap: mapsUrl,
    sameAs,
    address: {
      '@type': 'PostalAddress',
      ...YASVIK_STORE_POSTAL_ADDRESS,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: Number.isFinite(lat) ? lat : YASVIK_STORE_GEO.latitude,
      longitude: Number.isFinite(lng) ? lng : YASVIK_STORE_GEO.longitude,
    },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '09:00',
      closes: '21:00',
    }],
    priceRange: '₹₹',
    areaServed: {
      '@type': 'City',
      name: 'Hyderabad',
    },
    parentOrganization: {
      '@id': `${origin.replace(/\/$/, '')}/#organization`,
    },
  };
}
