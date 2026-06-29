export const LABEL_TEMPLATE_SETTINGS_KEY = 'label_templates';
export const LABEL_ACTIVE_TEMPLATE_KEY = 'label_active_template_id';

export const LABEL_FIELD_CATALOG = [
  { key: 'productTitle', label: 'Product name (English/Telugu)', sample: 'Toor Dal/కందిపప్పు' },
  { key: 'price', label: 'Selling price', sample: '132', prefix: 'Price: ₹' },
  { key: 'netWt', label: 'Net weight', sample: '1kg', prefix: 'Net wt: ' },
  { key: 'packedDate', label: 'Packed date', sample: '19/06/2026', prefix: 'Pkd: ' },
  { key: 'batchNo', label: 'Batch number', sample: 'YV260619001', prefix: 'B: ' },
  { key: 'shelfLife', label: 'Shelf life', sample: 'Best before 6 months' },
  { key: 'fssaiLicense', label: 'FSSAI license', sample: '23626032001451', prefix: 'Lic.No.' },
  { key: 'website', label: 'Website', sample: 'www.yasvik.com' },
  { key: 'productBarcode', label: 'Product barcode (Code128 SKU)', sample: 'TOOR-DAL' },
  { key: 'posScanCode', label: 'POS QR link (opens on phone)', sample: 'https://www.yasvik.com/pos-scan?c=…' },
  { key: 'barcodeValue', label: 'Batch barcode (batch-serial)', sample: 'YV260619001-001' },
];

/** Fields available for QR code elements on labels. */
export const QR_FIELD_OPTIONS = [
  { key: 'posScanCode', label: 'POS QR link (phone + scanner)' },
  { key: 'barcodeValue', label: 'Batch barcode (needs label database)' },
];

/** Fields available for 1D barcode elements on labels. */
export const BARCODE_FIELD_OPTIONS = [
  { key: 'productBarcode', label: 'Product SKU (counter scan) — recommended' },
  { key: 'barcodeValue', label: 'Batch barcode (batch-serial)' },
];

export const FONT_FAMILY_OPTIONS = [
  { id: 'arial', label: 'Arial / Helvetica', css: 'Arial, Helvetica, sans-serif' },
  { id: 'telugu', label: 'Telugu', css: '"Noto Sans Telugu", "Nirmala UI", Arial, sans-serif' },
  { id: 'mixed', label: 'English + Telugu', css: 'Arial, Helvetica, "Noto Sans Telugu", sans-serif' },
];

export const ELEMENT_TYPE_OPTIONS = [
  { id: 'field', label: 'Dynamic field' },
  { id: 'text', label: 'Static text' },
  { id: 'barcode', label: '1D barcode (Code128)' },
  { id: 'qr', label: 'QR code (POS / batch)' },
  { id: 'line', label: 'Divider line' },
  { id: 'image', label: 'Image / logo' },
];

export const ANCHOR_OPTIONS = ['left', 'center', 'right'];
export const ALIGN_OPTIONS = ['left', 'center', 'right'];
export const BASELINE_OPTIONS = ['top', 'middle', 'bottom'];
