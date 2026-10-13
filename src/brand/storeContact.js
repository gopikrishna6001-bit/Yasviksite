/**
 * Single source of truth for Yasvik store NAP + lead channels.
 * Keep these identical on Google Business Profile, WhatsApp Business, and the site.
 */
export const STORE = {
  brandName: 'Yasvik',
  legalName: 'Yasvik Natural Foods',
  phoneDisplay: '78429 38998',
  phoneE164: '+917842938998',
  phoneTel: 'tel:+917842938998',
  whatsappNumber: '917842938998',
  email: 'hello@yasvik.com',
  supportEmail: 'yasvikfoods@gmail.com',
  area: 'Ashok Nagar, Chanda Nagar',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'IN',
  postalCode: '500050',
  streetAddress: 'Bavanipuram Colony, Road No. 4',
  addressLine: 'Ashok Nagar, Chanda Nagar, Hyderabad — Bavanipuram Colony, Road No. 4',
  mapsQuery: 'Yasvik Ashok Nagar Chanda Nagar Hyderabad',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Yasvik%20Ashok%20Nagar%20Chanda%20Nagar%20Hyderabad',
  serviceArea: [
    'Chanda Nagar',
    'Ashok Nagar',
    'Lingampally',
    'Beeramguda',
    'Ameenpur',
    'Patancheru',
    'Hyderabad',
  ],
  hoursNote: 'Store hours — confirm on WhatsApp before visiting',
  defaultWhatsAppMessage:
    'Hi Yasvik! I want to order / ask about your natural foods from Chanda Nagar.',
};

export function whatsappHref(message = STORE.defaultWhatsAppMessage) {
  return `https://wa.me/${STORE.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
