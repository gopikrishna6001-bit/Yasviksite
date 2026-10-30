/**
 * Physical page format profiles for catalogue PDFs.
 */

export const FORMAT_PROFILES = {
  a4_portrait: {
    id: 'a4_portrait',
    label: 'A4 Portrait',
    pageSize: 'A4',
    orientation: 'portrait',
    cssSize: 'A4 portrait',
    margin: { top: '12mm', bottom: '14mm', left: '10mm', right: '10mm' },
    columns: 2,
    productsPerPage: 4,
    imageWidth: 720,
    cardImageHeight: 150,
  },
  a4_landscape: {
    id: 'a4_landscape',
    label: 'A4 Landscape',
    pageSize: 'A4',
    orientation: 'landscape',
    cssSize: 'A4 landscape',
    margin: { top: '10mm', bottom: '12mm', left: '10mm', right: '10mm' },
    columns: 3,
    productsPerPage: 6,
    imageWidth: 640,
    cardImageHeight: 120,
  },
  a5_booklet: {
    id: 'a5_booklet',
    label: 'A5 Booklet',
    pageSize: 'A5',
    orientation: 'portrait',
    cssSize: 'A5 portrait',
    margin: { top: '10mm', bottom: '12mm', left: '8mm', right: '8mm' },
    columns: 1,
    productsPerPage: 2,
    imageWidth: 720,
    cardImageHeight: 180,
  },
  mobile_whatsapp: {
    id: 'mobile_whatsapp',
    label: 'Mobile WhatsApp PDF',
    pageSize: 'A4',
    orientation: 'portrait',
    cssSize: 'A4 portrait',
    margin: { top: '10mm', bottom: '12mm', left: '8mm', right: '8mm' },
    columns: 2,
    productsPerPage: 6,
    imageWidth: 560,
    cardImageHeight: 110,
    dense: true,
  },
  dealer_pdf: {
    id: 'dealer_pdf',
    label: 'Dealer PDF',
    pageSize: 'A4',
    orientation: 'portrait',
    cssSize: 'A4 portrait',
    margin: { top: '10mm', bottom: '12mm', left: '8mm', right: '8mm' },
    columns: 1,
    productsPerPage: 14,
    imageWidth: 240,
    cardImageHeight: 48,
    dense: true,
    dealer: true,
  },
  printable_price_list: {
    id: 'printable_price_list',
    label: 'Printable Price List',
    pageSize: 'A4',
    orientation: 'portrait',
    cssSize: 'A4 portrait',
    margin: { top: '10mm', bottom: '12mm', left: '8mm', right: '8mm' },
    columns: 1,
    productsPerPage: 16,
    imageWidth: 200,
    cardImageHeight: 40,
    dense: true,
  },
};

export function resolveFormat(formatId, designTemplate) {
  if (formatId && FORMAT_PROFILES[formatId]) return FORMAT_PROFILES[formatId];
  if (designTemplate === 'compact') return FORMAT_PROFILES.mobile_whatsapp;
  if (designTemplate === 'premium_lookbook') return FORMAT_PROFILES.a4_portrait;
  if (designTemplate === 'dealer_table') return FORMAT_PROFILES.dealer_pdf;
  if (designTemplate === 'gifting' || designTemplate === 'festival') return FORMAT_PROFILES.a4_portrait;
  return FORMAT_PROFILES.a4_portrait;
}

export function browserPdfOptions(format) {
  return {
    format: String(format.pageSize || 'A4').toLowerCase(),
    landscape: format.orientation === 'landscape',
    printBackground: true,
    preferCSSPageSize: true,
    margin: format.margin || { top: '12mm', bottom: '14mm', left: '10mm', right: '10mm' },
  };
}
