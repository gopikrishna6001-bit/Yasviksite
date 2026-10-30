/**
 * Packaging cost engine — reusable materials + profiles → landed variant cost.
 * All money values in paise unless named *_rs.
 */

export const MATERIAL_TYPES = [
  { id: 'pp_cover', label: 'PP cover' },
  { id: 'kraft_pouch', label: 'Kraft pouch' },
  { id: 'plastic_container', label: 'Plastic container' },
  { id: 'oil_bottle', label: 'Oil bottle' },
  { id: 'lid', label: 'Lid' },
  { id: 'cap', label: 'Cap' },
  { id: 'seal', label: 'Seal' },
  { id: 'sticker', label: 'Sticker' },
  { id: 'label', label: 'Price / info label' },
  { id: 'tape', label: 'Tape' },
  { id: 'carton', label: 'Carton / outer' },
  { id: 'other', label: 'Other' },
];

export const PROFILE_FAMILIES = [
  { id: 'pp_cover', label: 'PP cover' },
  { id: 'kraft_pouch', label: 'Kraft pouch' },
  { id: 'plastic_container', label: 'Plastic container' },
  { id: 'oil_bottle', label: 'Oil bottle' },
  { id: 'multicomponent', label: 'Multi-component kit' },
  { id: 'other', label: 'Other' },
];

export const COMPONENT_ROLES = [
  { id: 'container', label: 'Container' },
  { id: 'pouch', label: 'Pouch' },
  { id: 'cover', label: 'Cover' },
  { id: 'lid', label: 'Lid' },
  { id: 'cap', label: 'Cap' },
  { id: 'seal', label: 'Seal' },
  { id: 'logo_sticker', label: 'Yasvik logo sticker' },
  { id: 'price_label', label: 'Price label' },
  { id: 'other', label: 'Other' },
];

export const DEFAULT_PACKAGING_SETTINGS = {
  default_packing_labour_paise: 100,
  default_inward_transport_paise: 0,
  default_wastage_pct: 2,
};

export function calcMaterialCostPerPiecePaise({
  total_purchase_cost_paise = 0,
  purchase_quantity = 1,
  wastage_pct = 0,
} = {}) {
  const qty = Number(purchase_quantity);
  const total = Math.max(0, Math.round(Number(total_purchase_cost_paise) || 0));
  const wastage = Math.max(0, Number(wastage_pct) || 0);
  if (!(qty > 0)) return 0;
  const base = total / qty;
  return Math.round(base * (1 + wastage / 100));
}

function materialUnitCost(material = {}) {
  const stored = Number(material.cost_per_piece_paise);
  if (Number.isFinite(stored) && stored >= 0) {
    // Prefer live calc when purchase fields present so price changes flow through
    if (material.total_purchase_cost_paise != null && material.purchase_quantity != null) {
      return calcMaterialCostPerPiecePaise(material);
    }
    return stored;
  }
  return calcMaterialCostPerPiecePaise(material);
}

/**
 * Merge profile BOM with variant-level component overrides.
 * Override rows with matching material_id+role replace qty; unmatched overrides append.
 */
export function resolveProfileBom(profileComponents = [], overrides = []) {
  const base = (Array.isArray(profileComponents) ? profileComponents : []).map((c) => ({
    material_id: c.material_id,
    quantity: Number(c.quantity) || 1,
    component_role: c.component_role || 'other',
    sort_order: Number(c.sort_order) || 0,
    material: c.packaging_materials || c.material || null,
  }));

  const overrideList = Array.isArray(overrides) ? overrides : [];
  if (!overrideList.length) return base.sort((a, b) => a.sort_order - b.sort_order);

  const map = new Map(base.map((c) => [`${c.material_id}:${c.component_role}`, { ...c }]));
  for (const o of overrideList) {
    if (!o?.material_id) continue;
    const key = `${o.material_id}:${o.component_role || 'other'}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        quantity: Number(o.quantity) > 0 ? Number(o.quantity) : existing.quantity,
      });
    } else {
      map.set(key, {
        material_id: o.material_id,
        quantity: Number(o.quantity) || 1,
        component_role: o.component_role || 'other',
        sort_order: 999,
        material: o.material || null,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.sort_order - b.sort_order);
}

export function sumBomCostPaise(bomLines = [], materialsById = {}) {
  let sum = 0;
  const lines = [];
  for (const line of bomLines) {
    const material = line.material || materialsById[line.material_id] || null;
    if (!material) continue;
    const unit = materialUnitCost(material);
    const qty = Number(line.quantity) || 0;
    const lineCost = Math.round(unit * qty);
    sum += lineCost;
    lines.push({
      material_id: line.material_id,
      name: material.name,
      component_role: line.component_role,
      quantity: qty,
      unit_cost_paise: unit,
      line_cost_paise: lineCost,
    });
  }
  return { packaging_cost_paise: sum, lines };
}

/**
 * Landed cost for one sellable variant unit.
 *
 * content + packaging + labour + wastage-on-packaging + inward transport
 */
export function calculateLandedVariantCost({
  purchase_rate_per_kg = null,
  pack_kg = null,
  packaging_cost_paise = 0,
  packing_labour_paise = 0,
  inward_transport_paise = 0,
  wastage_pct = 0,
  sell_price_rs = null,
  measure_type = 'kg',
} = {}) {
  const packQty = Number(pack_kg);
  const purchase = Number(purchase_rate_per_kg);
  // units: purchase is ₹/pc × piece count; kg/L: purchase × pack_kg (kg or litres)
  const contentPaise = (Number.isFinite(purchase) && purchase > 0 && Number.isFinite(packQty) && packQty > 0)
    ? Math.round(purchase * packQty * 100)
    : (measure_type === 'units' && Number.isFinite(purchase) && purchase > 0 && !(packQty > 0)
      ? Math.round(purchase * 100) // single piece default
      : 0);

  const packagingPaise = Math.max(0, Math.round(Number(packaging_cost_paise) || 0));
  const labourPaise = Math.max(0, Math.round(Number(packing_labour_paise) || 0));
  const transportPaise = Math.max(0, Math.round(Number(inward_transport_paise) || 0));
  const wastagePct = Math.max(0, Number(wastage_pct) || 0);
  const wastagePaise = Math.round(packagingPaise * (wastagePct / 100));

  const landedPaise = contentPaise + packagingPaise + labourPaise + wastagePaise + transportPaise;
  const sellPaise = sell_price_rs != null && Number.isFinite(Number(sell_price_rs))
    ? Math.round(Number(sell_price_rs) * 100)
    : null;

  const contributionPaise = sellPaise != null ? sellPaise - landedPaise : null;
  const marginPct = sellPaise != null && sellPaise > 0
    ? Math.round(((sellPaise - landedPaise) / sellPaise) * 100)
    : null;

  return {
    content_cost_paise: contentPaise,
    packaging_cost_paise: packagingPaise,
    packing_labour_paise: labourPaise,
    wastage_paise: wastagePaise,
    inward_transport_paise: transportPaise,
    landed_cost_paise: landedPaise,
    suggested_price_paise: sellPaise,
    gross_contribution_paise: contributionPaise,
    gross_margin_pct: marginPct,
    // rupee helpers for UI
    content_cost_rs: contentPaise / 100,
    packaging_cost_rs: packagingPaise / 100,
    packing_cost_rs: labourPaise / 100,
    landed_cost_rs: landedPaise / 100,
    suggested_price_rs: sellPaise != null ? sellPaise / 100 : null,
    gross_contribution_rs: contributionPaise != null ? contributionPaise / 100 : null,
  };
}

export function buildLandedFromMapping({
  mapping = null,
  profile = null,
  profileComponents = [],
  materialsById = {},
  purchase_rate_per_kg = null,
  pack_kg = null,
  sell_price_rs = null,
  defaults = DEFAULT_PACKAGING_SETTINGS,
} = {}) {
  if (!mapping?.profile_id && !profile) {
    return calculateLandedVariantCost({
      purchase_rate_per_kg,
      pack_kg,
      packaging_cost_paise: 0,
      packing_labour_paise: defaults.default_packing_labour_paise,
      inward_transport_paise: defaults.default_inward_transport_paise,
      wastage_pct: defaults.default_wastage_pct,
      sell_price_rs,
    });
  }

  const bom = resolveProfileBom(profileComponents, mapping?.component_overrides);
  const { packaging_cost_paise, lines } = sumBomCostPaise(bom, materialsById);

  const labour = mapping?.packing_labour_override_paise != null
    ? mapping.packing_labour_override_paise
    : (profile?.packing_labour_paise ?? defaults.default_packing_labour_paise);

  const transport = mapping?.inward_transport_override_paise != null
    ? mapping.inward_transport_override_paise
    : (profile?.inward_transport_paise ?? defaults.default_inward_transport_paise);

  const wastage = mapping?.wastage_override_pct != null
    ? mapping.wastage_override_pct
    : defaults.default_wastage_pct;

  const landed = calculateLandedVariantCost({
    purchase_rate_per_kg,
    pack_kg: pack_kg ?? mapping?.pack_kg ?? profile?.pack_kg,
    packaging_cost_paise,
    packing_labour_paise: labour,
    inward_transport_paise: transport,
    wastage_pct: wastage,
    sell_price_rs,
  });

  return {
    ...landed,
    profile_id: profile?.id || mapping?.profile_id || null,
    profile_name: profile?.name || null,
    packaging_scope: profile?.packaging_scope || 'primary',
    bom_lines: lines,
  };
}

export function formatPaiseAsRupee(paise) {
  if (paise == null || !Number.isFinite(Number(paise))) return '—';
  return `₹${(Number(paise) / 100).toFixed(2)}`;
}
