import { appClient } from '@/api/appClient';
import { supabase } from '@/api/supabaseClient';
import {
  getProductNameEn,
  getProductNameTe,
  getVariantWeightLabel,
  resolveVariantPricing,
} from '@/lib/labelProductOptions';
import {
  buildSeznikLabelQueue,
  formatBatchDatePart,
  generateBatchNo,
  generatePrintJobNo,
} from '@/lib/seznikLabelGenerator';

export async function getNextDailyBatchSequence(packedDate) {
  const prefix = `YV${formatBatchDatePart(packedDate)}`;
  try {
    const { data, error } = await supabase
      .from('label_print_jobs')
      .select('batch_no')
      .like('batch_no', `${prefix}%`);

    if (error || !Array.isArray(data) || data.length === 0) return 1;

    const maxSeq = data.reduce((acc, row) => {
      const seq = parseInt(String(row.batch_no || '').slice(-3), 10);
      return Number.isFinite(seq) ? Math.max(acc, seq) : acc;
    }, 0);

    return maxSeq + 1;
  } catch {
    return 1;
  }
}

export async function suggestBatchNo(packedDate) {
  const sequence = await getNextDailyBatchSequence(packedDate);
  return generateBatchNo(packedDate, sequence);
}

export async function createSeznikPrintJob({
  product,
  variant,
  quantity,
  packedDate,
  batchNo,
  generatedBy,
  template,
}) {
  const qty = Math.max(1, Number(quantity) || 1);
  const batch = String(batchNo || '').trim() || (await suggestBatchNo(packedDate));
  const { mrp, sellingPrice } = resolveVariantPricing(product, variant);
  const printJobNo = generatePrintJobNo(packedDate);
  const labelQueue = buildSeznikLabelQueue(product, variant, { packedDate, batchNo: batch, quantity: qty }, template);

  const jobPayload = {
    print_job_no: printJobNo,
    product_id: product.id,
    variant_id: variant?.sku || variant?.label || null,
    product_name_en: getProductNameEn(product),
    product_name_te: getProductNameTe(product),
    weight: getVariantWeightLabel(variant, product),
    mrp: Number(String(mrp).replace(/[^\d.]/g, '')) || null,
    selling_price: Number(String(sellingPrice).replace(/[^\d.]/g, '')) || null,
    packed_date: packedDate,
    batch_no: batch,
    quantity: qty,
    generated_by: generatedBy || null,
    status: 'generated',
  };

  let job;
  try {
    job = await appClient.entities.LabelPrintJob.create(jobPayload);
  } catch (error) {
    console.warn('Label print job DB save failed, continuing with PDF export:', error?.message);
    job = { ...jobPayload, id: null };
  }

  const items = labelQueue.map((label) => ({
    print_job_id: job.id,
    product_id: product.id,
    variant_id: variant?.sku || variant?.label || null,
    batch_no: batch,
    serial_no: label.serialNo,
    barcode_value: label.barcodeValue,
    status: 'generated',
  }));

  if (job.id) {
    try {
      await Promise.all(items.map((item) => appClient.entities.LabelItem.create(item)));
    } catch (error) {
      console.warn('Label items DB save failed:', error?.message);
    }
  }

  return { job, labelQueue, items };
}
