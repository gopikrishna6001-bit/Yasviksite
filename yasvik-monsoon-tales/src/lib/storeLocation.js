/** Canonical store location — keep in sync with Google Business Profile. */
export const YASVIK_GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/5ED9n4iZ3tQZKzGb6';

export const YASVIK_STORE_NAME = 'Yasvik Natural Foods';

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
  latitude: 17.4942,
  longitude: 78.3169,
};

export const YASVIK_PHONE_DIGITS = '7842938998';
export const YASVIK_WHATSAPP_NUMBER = `91${YASVIK_PHONE_DIGITS}`;
export const YASVIK_SUPPORT_PHONE_DISPLAY = '78429 38998';
export const YASVIK_SUPPORT_PHONE = `+91-${YASVIK_PHONE_DIGITS.slice(0, 5)}-${YASVIK_PHONE_DIGITS.slice(5)}`;
export const YASVIK_SUPPORT_PHONE_TEL = `+91${YASVIK_PHONE_DIGITS}`;
export const YASVIK_SUPPORT_EMAIL = 'yasvikfoods@gmail.com';
export const YASVIK_STORE_HOURS = 'Mo-Su 09:00-21:00';

export function buildLocalBusinessJsonLd(origin = 'https://www.yasvik.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    '@id': `${origin}/#store`,
    name: YASVIK_STORE_NAME,
    url: origin,
    image: `${origin}/media/brand/logo-horizontal.png`,
    telephone: YASVIK_SUPPORT_PHONE,
    email: YASVIK_SUPPORT_EMAIL,
    hasMap: YASVIK_GOOGLE_MAPS_URL,
    sameAs: [YASVIK_GOOGLE_MAPS_URL],
    address: {
      '@type': 'PostalAddress',
      ...YASVIK_STORE_POSTAL_ADDRESS,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: YASVIK_STORE_GEO.latitude,
      longitude: YASVIK_STORE_GEO.longitude,
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
  };
}
