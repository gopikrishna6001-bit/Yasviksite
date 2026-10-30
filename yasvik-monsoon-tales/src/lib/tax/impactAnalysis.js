/**
 * Tax-rule change impact analysis (admin preview — does not mutate products).
 */

export function analyzeTaxRuleImpact({
  products = [],
  classifications = [],
  currentVersionsByRuleId = {},
  newVersion = {},
} = {}) {
  const classByProduct = new Map();
  for (const c of classifications) {
    if (!c?.product_id && !c?.productId) continue;
    const pid = c.product_id || c.productId;
    if (String(c.classification_status || c.classificationStatus || '').toUpperCase() === 'RETIRED') {
      continue;
    }
    classByProduct.set(String(pid), c);
  }

  const ruleId = String(newVersion.tax_rule_id || newVersion.taxRuleId || '');
  const newRate = Number(newVersion.gst_rate_bp ?? newVersion.gstRateBp ?? 0);
  const effectiveFrom = newVersion.effective_from || newVersion.effectiveFrom || null;

  const affected = [];
  for (const product of products) {
    const pid = String(product.id);
    const classification = classByProduct.get(pid);
    if (!classification) continue;
    const cRuleId = String(classification.tax_rule_id || classification.taxRuleId || '');
    if (ruleId && cRuleId && cRuleId !== ruleId) continue;
    if (ruleId && !cRuleId) continue;

    const current = currentVersionsByRuleId[cRuleId] || null;
    const currentRate = Number(
      classification.gst_rate_bp
        ?? classification.gstRateBp
        ?? current?.gst_rate_bp
        ?? current?.gstRateBp
        ?? NaN,
    );

    affected.push({
      productId: product.id,
      productName: product.name || product.title || null,
      currentHsn: classification.hsn_sac || classification.hsnSac || null,
      currentRateBp: Number.isFinite(currentRate) ? currentRate : null,
      newRateBp: newRate,
      effectiveFrom,
      classificationStatus:
        classification.classification_status || classification.classificationStatus || null,
    });
  }

  return {
    affectedCount: affected.length,
    message: `${affected.length} product${affected.length === 1 ? '' : 's'} may be affected.`,
    affected,
    disclaimer: 'Impact preview only. Do not silently change product tax treatment — admin must review before activation.',
  };
}
