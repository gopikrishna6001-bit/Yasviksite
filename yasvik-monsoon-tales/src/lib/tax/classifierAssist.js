/**
 * Optional assisted classifier — never silently assigns legal tax treatment.
 * Scores HSN master candidates from product attributes using keyword overlap.
 * AI/LLM hooks may wrap suggestTaxClassification(); they must not auto-persist VERIFIED.
 */

import { assessClassificationAmbiguity } from './classification.js';

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function unique(arr) {
  return [...new Set(arr)];
}

/**
 * @param {object} productProfile - name, description, ingredients, processingMethod, etc.
 * @param {object[]} hsnCandidates - from hsn_master / tax_rules ({ hsn_sac, description, gst_rate_bp?, tax_treatment? })
 */
export function suggestTaxClassification(productProfile = {}, hsnCandidates = []) {
  const tokens = unique([
    ...tokenize(productProfile.name || productProfile.productName),
    ...tokenize(productProfile.description || productProfile.detailedDescription),
    ...tokenize(productProfile.ingredients),
    ...tokenize(productProfile.processingMethod || productProfile.process_method),
    ...tokenize(productProfile.intendedUse),
    ...tokenize(productProfile.packaging),
    ...tokenize(productProfile.productForm),
    ...tokenize(productProfile.brandedUnbranded),
  ]);

  const scored = (Array.isArray(hsnCandidates) ? hsnCandidates : [])
    .map((row) => {
      const descTokens = tokenize(row.description || row.hsn_description || '');
      const hsn = String(row.hsn_sac || row.hsnSac || '').trim();
      if (!hsn) return null;
      let overlap = 0;
      for (const t of tokens) {
        if (descTokens.includes(t)) overlap += 1;
      }
      const coverage = descTokens.length ? overlap / descTokens.length : 0;
      const tokenHit = tokens.length ? overlap / tokens.length : 0;
      const score = overlap === 0 ? 0 : 0.6 * coverage + 0.4 * tokenHit;

      let confidence = 'LOW';
      if (score >= 0.55 && overlap >= 3) confidence = 'HIGH';
      else if (score >= 0.3 && overlap >= 2) confidence = 'MEDIUM';

      return {
        hsnSac: hsn,
        description: row.description || null,
        taxTreatment: row.tax_treatment || row.taxTreatment || null,
        gstRateBp: row.gst_rate_bp ?? row.gstRateBp ?? null,
        score: Math.round(score * 1000) / 1000,
        overlap,
        confidence,
        sourceType: row.source_type || row.sourceType || 'ASSISTED',
        reason: overlap
          ? `Matched ${overlap} keyword(s) against HSN description.`
          : 'No keyword overlap with HSN description.',
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.overlap - a.overlap);

  const ambiguity = assessClassificationAmbiguity(scored.slice(0, 5));
  const top = scored[0] || null;

  if (!top || top.confidence === 'LOW') {
    return {
      confidence: 'LOW',
      autoAssign: false,
      message: 'Tax classification requires confirmation.',
      candidates: scored.slice(0, 5),
      ambiguity,
      disclaimer: 'Assisted suggestion only — not legal authority. Do not treat as CBIC/GSTN determination.',
    };
  }

  if (ambiguity.ambiguous) {
    return {
      confidence: 'MEDIUM',
      autoAssign: false,
      message: ambiguity.message,
      candidates: scored.slice(0, 5),
      ambiguity,
      disclaimer: 'Assisted suggestion only — not legal authority. Do not treat as CBIC/GSTN determination.',
    };
  }

  if (top.confidence === 'HIGH') {
    return {
      confidence: 'HIGH',
      autoAssign: false, // NEVER auto-assign
      likelyHsn: top.hsnSac,
      likelyTaxTreatment: top.taxTreatment,
      likelyRateBp: top.gstRateBp,
      reason: top.reason,
      candidates: scored.slice(0, 5),
      ambiguity,
      message: 'High-confidence suggestion available. User must explicitly confirm.',
      disclaimer: 'Assisted suggestion only — not legal authority. Do not treat as CBIC/GSTN determination.',
    };
  }

  return {
    confidence: 'MEDIUM',
    autoAssign: false,
    candidates: scored.slice(0, 5),
    ambiguity,
    message: 'Show top candidates for admin review.',
    disclaimer: 'Assisted suggestion only — not legal authority. Do not treat as CBIC/GSTN determination.',
  };
}
