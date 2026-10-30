function paise(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function lineSubtotalPaise(item = {}) {
  if (item.line_subtotal_paise != null) return paise(item.line_subtotal_paise);
  const qty = Math.max(1, Number(item.qty) || 1);
  const unitPaise = item.original_unit_price_paise != null
    ? paise(item.original_unit_price_paise)
    : Math.max(0, Math.round(Number(item.price ?? item.unit_price ?? item.unitPrice) * 100) || 0);
  return unitPaise * qty;
}

/** True when this line must not receive order-level / coupon discount. */
export function isDiscountExcluded(item = {}) {
  return Boolean(
    item?.exclude_from_discount
    || item?.discount_excluded
    || item?.excludeFromDiscount
  );
}

/** Subtotal (paise) of lines that can receive discount. */
export function eligibleDiscountSubtotalPaise(items = []) {
  return (Array.isArray(items) ? items : []).reduce((sum, item) => {
    if (isDiscountExcluded(item)) return sum;
    return sum + lineSubtotalPaise(item);
  }, 0);
}

/**
 * Allocate an order-level discount to item lines in paise.
 * Uses largest remainders so line savings add up exactly to the bill discount.
 * Lines marked exclude_from_discount get ₹0 discount; allocation uses eligible subtotal only.
 * Stored allocations are preferred for new orders; old orders are derived.
 */
export function allocateOrderDiscountToLines(
  items = [],
  discountPaise = 0,
  subtotalPaise = null,
) {
  const rows = (Array.isArray(items) ? items : []).map((item, index) => {
    const qty = Math.max(1, Number(item?.qty) || 1);
    const originalLinePaise = lineSubtotalPaise(item);
    const storedDiscount = item?.discount_allocated_paise;
    const excluded = isDiscountExcluded(item);
    return {
      item,
      index,
      qty,
      originalLinePaise,
      excluded,
      storedDiscount: storedDiscount == null ? null : paise(storedDiscount),
    };
  });

  const eligibleSubtotal = rows.reduce(
    (sum, row) => (row.excluded ? sum : sum + row.originalLinePaise),
    0,
  );
  const sourceSubtotal = paise(subtotalPaise)
    || rows.reduce((sum, row) => sum + row.originalLinePaise, 0);
  const requestedDiscount = Math.min(
    paise(discountPaise),
    eligibleSubtotal > 0 ? eligibleSubtotal : sourceSubtotal,
  );
  const hasStoredAllocation = rows.length > 0 && rows.every((row) => row.storedDiscount != null);

  let allocations;
  if (hasStoredAllocation) {
    allocations = rows.map((row) => (
      row.excluded ? 0 : Math.min(row.storedDiscount, row.originalLinePaise)
    ));
  } else if (requestedDiscount > 0 && eligibleSubtotal > 0) {
    const raw = rows.map((row) => (
      row.excluded ? 0 : (requestedDiscount * row.originalLinePaise) / eligibleSubtotal
    ));
    allocations = raw.map((value, index) => (
      rows[index].excluded
        ? 0
        : Math.min(Math.floor(value), rows[index].originalLinePaise)
    ));
    let remainder = requestedDiscount - allocations.reduce((sum, value) => sum + value, 0);
    const priority = raw
      .map((value, index) => ({ index, fraction: value - Math.floor(value), excluded: rows[index].excluded }))
      .filter((row) => !row.excluded)
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
    for (const { index } of priority) {
      if (remainder <= 0) break;
      if (allocations[index] >= rows[index].originalLinePaise) continue;
      allocations[index] += 1;
      remainder -= 1;
    }
  } else {
    allocations = rows.map(() => 0);
  }

  return rows.map((row, index) => {
    const discountAllocatedPaise = allocations[index] || 0;
    const finalLinePaise = Math.max(0, row.originalLinePaise - discountAllocatedPaise);
    return {
      ...row.item,
      qty: row.qty,
      exclude_from_discount: row.excluded,
      originalUnitPrice: row.originalLinePaise / row.qty / 100,
      originalLineTotal: row.originalLinePaise / 100,
      discountAllocated: discountAllocatedPaise / 100,
      finalLineTotal: finalLinePaise / 100,
      effectiveUnitPrice: finalLinePaise / row.qty / 100,
      original_unit_price_paise: Math.round(row.originalLinePaise / row.qty),
      line_subtotal_paise: row.originalLinePaise,
      discount_allocated_paise: discountAllocatedPaise,
      line_total_after_discount_paise: finalLinePaise,
    };
  });
}
