/**
 * Vendor / supplier master builders.
 * GSTIN optional for unregistered, farmer, local producer.
 */

import {
  INVOICE_CAPABILITY,
  SOURCING_ERROR_CODE,
  SUPPLIER_TYPE,
} from './sourcingConstants.js';

const GSTIN_OPTIONAL_TYPES = new Set([
  SUPPLIER_TYPE.UNREGISTERED,
  SUPPLIER_TYPE.FARMER,
  SUPPLIER_TYPE.LOCAL_PRODUCER,
  SUPPLIER_TYPE.OTHER,
]);

function normalizeGstin(value) {
  const s = String(value || '').trim().toUpperCase();
  return s || null;
}

/**
 * Validate + build vendor + optional vendor_tax_profiles insert payloads.
 */
export function buildVendorPayload(input = {}) {
  const legalName = String(input.legalName || input.legal_name || '').trim();
  if (!legalName) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.MISSING_VENDOR,
      message: 'Vendor legal/business name is required.',
    };
  }

  const supplierType = String(input.supplierType || input.supplier_type || SUPPLIER_TYPE.OTHER).toUpperCase();
  if (!Object.values(SUPPLIER_TYPE).includes(supplierType)) {
    return {
      ok: false,
      code: SOURCING_ERROR_CODE.INVALID_SUPPLIER_TYPE,
      message: `Unsupported supplier type: ${input.supplierType}`,
    };
  }

  const gstin = normalizeGstin(input.gstin);
  const gstStatus = String(
    input.gstRegistrationStatus || input.gst_registration_status || 'UNKNOWN',
  ).toUpperCase();

  if (supplierType === SUPPLIER_TYPE.GST_REGISTERED || gstStatus === 'ACTIVE') {
    if (!gstin) {
      return {
        ok: false,
        code: SOURCING_ERROR_CODE.GSTIN_REQUIRED,
        message: 'GSTIN is required for GST-registered suppliers (or ACTIVE vendor tax status).',
      };
    }
  }

  // Do not require GSTIN for unregistered / farmer / local producer
  if (!gstin && !GSTIN_OPTIONAL_TYPES.has(supplierType) && supplierType !== SUPPLIER_TYPE.JOB_WORKER
    && supplierType !== SUPPLIER_TYPE.MANUFACTURER && supplierType !== SUPPLIER_TYPE.DISTRIBUTOR) {
    // manufacturer/distributor may or may not be registered — leave optional unless ACTIVE
  }

  let invoiceCapability = String(
    input.invoiceCapability || input.invoice_capability || INVOICE_CAPABILITY.UNKNOWN,
  ).toUpperCase();
  if (!Object.values(INVOICE_CAPABILITY).includes(invoiceCapability)) {
    invoiceCapability = INVOICE_CAPABILITY.UNKNOWN;
  }
  if (supplierType === SUPPLIER_TYPE.FARMER || supplierType === SUPPLIER_TYPE.LOCAL_PRODUCER) {
    if (invoiceCapability === INVOICE_CAPABILITY.UNKNOWN) {
      invoiceCapability = INVOICE_CAPABILITY.NON_GST;
    }
  }
  if (supplierType === SUPPLIER_TYPE.GST_REGISTERED && invoiceCapability === INVOICE_CAPABILITY.UNKNOWN) {
    invoiceCapability = INVOICE_CAPABILITY.GST_INVOICE;
  }
  if (supplierType === SUPPLIER_TYPE.JOB_WORKER && invoiceCapability === INVOICE_CAPABILITY.UNKNOWN) {
    invoiceCapability = INVOICE_CAPABILITY.SERVICE_INVOICE;
  }

  const vendor = {
    legal_name: legalName,
    trade_name: input.tradeName || input.trade_name || null,
    contact_name: input.contactName || input.contact_name || null,
    phone: input.phone || null,
    email: input.email || null,
    address_line1: input.addressLine1 || input.address_line1 || null,
    address_line2: input.addressLine2 || input.address_line2 || null,
    city: input.city || null,
    state_name: input.stateName || input.state_name || null,
    state_code: input.stateCode || input.state_code || null,
    postal_code: input.postalCode || input.postal_code || null,
    country: input.country || 'IN',
    supplier_type: supplierType,
    invoice_capability: invoiceCapability,
    e_invoice_applicable: input.eInvoiceApplicable ?? input.e_invoice_applicable ?? null,
    notes: input.notes || null,
    source_location: input.sourceLocation || input.source_location || input.village || null,
    is_active: input.isActive !== false,
  };

  const taxProfile = {
    gstin,
    gst_registration_status: gstin
      ? (gstStatus === 'UNKNOWN' && supplierType === SUPPLIER_TYPE.GST_REGISTERED ? 'ACTIVE' : gstStatus)
      : (GSTIN_OPTIONAL_TYPES.has(supplierType) ? 'NOT_REGISTERED' : gstStatus),
    legal_name_on_gst: input.legalNameOnGst || input.legal_name_on_gst || (gstin ? legalName : null),
    state_code: input.stateCode || input.state_code || null,
    state_name: input.stateName || input.state_name || null,
    notes: input.taxNotes || null,
  };

  return {
    ok: true,
    vendor,
    taxProfile,
    gstinRequired: Boolean(supplierType === SUPPLIER_TYPE.GST_REGISTERED || gstStatus === 'ACTIVE'),
    disclaimer: 'GSTIN is optional for unregistered suppliers, farmers, and local producers.',
  };
}

export function buildFarmerVendorPayload(input = {}) {
  return buildVendorPayload({
    ...input,
    supplierType: SUPPLIER_TYPE.FARMER,
    invoiceCapability: INVOICE_CAPABILITY.NON_GST,
    gstRegistrationStatus: 'NOT_REGISTERED',
    sourceLocation: input.village || input.sourceLocation || input.source_location,
  });
}

export function buildLocalProducerVendorPayload(input = {}) {
  return buildVendorPayload({
    ...input,
    supplierType: SUPPLIER_TYPE.LOCAL_PRODUCER,
    invoiceCapability: INVOICE_CAPABILITY.NON_GST,
    gstRegistrationStatus: 'NOT_REGISTERED',
  });
}

export function buildGstRegisteredVendorPayload(input = {}) {
  return buildVendorPayload({
    ...input,
    supplierType: SUPPLIER_TYPE.GST_REGISTERED,
    invoiceCapability: INVOICE_CAPABILITY.GST_INVOICE,
    gstRegistrationStatus: input.gstRegistrationStatus || 'ACTIVE',
  });
}

export function buildJobWorkerVendorPayload(input = {}) {
  return buildVendorPayload({
    ...input,
    supplierType: SUPPLIER_TYPE.JOB_WORKER,
    invoiceCapability: INVOICE_CAPABILITY.SERVICE_INVOICE,
  });
}
