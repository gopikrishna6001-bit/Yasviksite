/**
 * Map purchase engine payloads ↔ Phase 1 purchase / ITC tables.
 * Read-only helpers + insert-shaped objects. No product cost writes.
 */

export function mapPurchaseInvoiceForInsert(invoice = {}, createdBy = null) {
  return {
    purchase_type: invoice.purchase_type,
    vendor_id: invoice.vendor_id,
    vendor_gstin: invoice.vendor_gstin,
    supplier_name: invoice.supplier_name,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
    purchase_date: invoice.purchase_date,
    document_storage_path: invoice.document_storage_path,
    taxable_value_paise: invoice.taxable_value_paise,
    cgst_paise: invoice.cgst_paise,
    sgst_paise: invoice.sgst_paise,
    igst_paise: invoice.igst_paise,
    total_gst_paise: invoice.total_gst_paise,
    invoice_total_paise: invoice.invoice_total_paise,
    cost_total_paise: invoice.cost_total_paise,
    itc_status: invoice.itc_status,
    reconciliation_status: invoice.reconciliation_status,
    place_of_supply_state: invoice.place_of_supply_state,
    notes: invoice.notes,
    created_by: createdBy,
  };
}

export function mapPurchaseLinesForInsert(purchaseInvoiceId, lines = []) {
  return (Array.isArray(lines) ? lines : []).map((line) => ({
    purchase_invoice_id: purchaseInvoiceId,
    product_id: line.product_id,
    variant_sku: line.variant_sku,
    description: line.description,
    hsn_sac: line.hsn_sac,
    quantity: line.quantity,
    unit: line.unit,
    taxable_value_paise: line.taxable_value_paise,
    gst_rate_bp: line.gst_rate_bp,
    cgst_paise: line.cgst_paise,
    sgst_paise: line.sgst_paise,
    igst_paise: line.igst_paise,
    line_total_paise: line.line_total_paise,
    existing_product_cost_paise: line.existing_product_cost_paise,
    notes: line.notes,
    sort_order: line.sort_order ?? 0,
  }));
}

/**
 * After lines are inserted, attach purchase_invoice_line_id to tax lines by sort order / index.
 */
export function mapPurchaseTaxLinesForInsert(purchaseInvoiceId, lineIdByIndex, taxLines = []) {
  return (Array.isArray(taxLines) ? taxLines : []).map((t) => ({
    purchase_invoice_id: purchaseInvoiceId,
    purchase_invoice_line_id: lineIdByIndex?.[t.line_index] ?? null,
    tax_component: t.tax_component,
    rate_bp: t.rate_bp,
    amount_paise: t.amount_paise,
  }));
}

export function mapInputTaxLedgerForInsert(purchaseInvoiceId, ledger = {}) {
  return {
    purchase_invoice_id: purchaseInvoiceId,
    vendor_id: ledger.vendor_id,
    vendor_gstin: ledger.vendor_gstin,
    invoice_number: ledger.invoice_number,
    invoice_date: ledger.invoice_date,
    taxable_value_paise: ledger.taxable_value_paise,
    cgst_paise: ledger.cgst_paise,
    sgst_paise: ledger.sgst_paise,
    igst_paise: ledger.igst_paise,
    total_gst_paise: ledger.total_gst_paise,
    itc_status: ledger.itc_status,
    potential_itc_paise: ledger.potential_itc_paise,
    claimed_itc_paise: ledger.claimed_itc_paise ?? 0,
    notes: ledger.notes,
  };
}

export function mapItcReconciliationForInsert(purchaseInvoiceId, inputTaxLedgerId, row = {}) {
  return {
    purchase_invoice_id: purchaseInvoiceId,
    input_tax_ledger_id: inputTaxLedgerId,
    supplier_gstin: row.supplier_gstin,
    invoice_number: row.invoice_number,
    invoice_date: row.invoice_date,
    taxable_value_paise: row.taxable_value_paise,
    gst_paise: row.gst_paise,
    reconciliation_status: row.reconciliation_status,
    external_source: row.external_source,
    external_payload: row.external_payload || {},
    notes: row.notes,
  };
}
