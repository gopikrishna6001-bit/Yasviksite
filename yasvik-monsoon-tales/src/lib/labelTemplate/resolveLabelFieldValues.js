import { buildProductTitle } from '@/lib/yasvikSeznikLabelLayout';
import { getProductNameEn, getProductNameTe } from '@/lib/labelProductOptions';
import { formatPackedDate, formatPrice } from '@/lib/priceLabelGenerator';
import { getVariantWeightLabel, resolveVariantPricing } from '@/lib/labelProductOptions';
import { buildBatchBarcodeValue, buildPosScanCode, buildPosScanQrPayload, formatSerialNo } from '@/lib/posScanCode';

export function buildSampleFieldValues(template = {}) {
  const meta = template.meta || {};
  const batchNo = 'YV260619001';
  return {
    productTitle: 'Toor Dal/కందిపప్పు',
    price: '132',
    netWt: '1kg',
    packedDate: '19/06/2026',
    batchNo,
    shelfLife: meta.shelfLifeDefault || 'Best before 6 months',
    fssaiLicense: meta.fssaiLicenseDefault || '23626032001451',
    website: meta.websiteDefault || 'www.yasvik.com',
    productBarcode: 'TOOR-DAL',
    posScanCode: buildPosScanQrPayload(
      { id: 'sample', sku: 'DAL-TOOR-1KG' },
      { sku: 'DAL-TOOR-1KG', price: 132 },
      132
    ) || 'https://www.yasvik.com/pos-scan?c=YV%3ADAL-TOOR-1KG%3A132',
    barcodeValue: buildBatchBarcodeValue(batchNo, 1),
  };
}

export function resolveLabelFieldValues(product, variant, options = {}, template = {}) {
  const meta = template.meta || {};
  const pricing = resolveVariantPricing(product, variant);
  const packedDate = options.packedDate ? formatPackedDate(options.packedDate) : '—';
  const batchNo = String(options.batchNo || '').trim() || '—';

  const serial = formatSerialNo(options.serialNo || 1);
  const posScanCode = buildPosScanQrPayload(product, variant, pricing.sellingPrice);

  return {
    productTitle: buildProductTitle(getProductNameEn(product), getProductNameTe(product)),
    price: formatPrice(pricing.sellingPrice),
    netWt: getVariantWeightLabel(variant, product),
    packedDate,
    batchNo,
    shelfLife: meta.shelfLifeDefault || 'Best before 6 months',
    fssaiLicense: meta.fssaiLicenseDefault || '23626032001451',
    website: meta.websiteDefault || 'www.yasvik.com',
    productBarcode: String(product?.sku || '').trim(),
    posScanCode: posScanCode || '',
    posScanInner: buildPosScanCode(product, variant, pricing.sellingPrice) || '',
    barcodeValue: batchNo !== '—' ? buildBatchBarcodeValue(batchNo, serial) : '',
  };
}
