/**
 * Remap shop combos to the V2 catalogue sections.
 * Usage: node --env-file=.env.local scripts/remap-combo-catalogue-v2.mjs
 */
const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const COMBOS_SUBCAT_ID = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706';
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function rest(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { ...headers, ...(prefer ? { Prefer: prefer } : {}) },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : text;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

const SLUGS = [
  'cashews', 'badam-almonds', 'salted-pista', 'walnuts', 'anjeer-rvnea',
  'green-raisins', 'black-raisins', 'dates', 'dry-dates', 'kimia-dates',
  'makhana', 'pumpkin-seeds', 'sunflower-seeds', 'watermelon-seeds',
  'flax-seeds-yas-007', 'chia-seeds', 'sabja-seeds', 'halim-seeds',
  'white-sesame-seeds', 'dried-kiwi', 'roasted-seed-mix',
];

function item(slug, qty, unit = 'g', role = 'included', group = null, sku = null, packs = 1) {
  return { slug, qty, unit, role, group, sku, packs };
}

const COMBOS = [
  {
    productId: 'a8c30001-b333-4333-8333-000000000007',
    bundleId: 'e8b30001-a222-4222-8222-000000000007',
    name: 'Yasvik 7 Superfoods Combo',
    slug: 'yasvik-seven-superfoods-combo',
    sku: 'YAS-DF-C-7-SUPERFOODS',
    price: 699, weightG: 700, itemCount: 7, merch: 'mixed',
    purpose: 'Natural Protein Pack', audience: ['gym', 'office', 'natural_snacking'],
    short: 'Seven everyday nuts and seeds in practical 100 g packs.', sortOrder: 10,
    items: [
      item('badam-almonds', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMB-TWFYF-100G'),
      item('cashews', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMC-100G'),
      item('salted-pista', 100, 'g', 'included', 'nuts', 'YAS-104-100G'),
      item('pumpkin-seeds', 100, 'g', 'included', 'seeds', 'YAS-PREMIUMP-GRAZO-100G'),
      item('sunflower-seeds', 100, 'g', 'included', 'seeds', 'YAS-109-100G'),
      item('flax-seeds-yas-007', 100, 'g', 'included', 'seeds', 'YAS-007-100G'),
      item('black-raisins', 100, 'g', 'included', 'dry_fruits', 'YAS-PREMIUMB-JGOHK-100G'),
    ],
  },
  {
    productId: 'a8c30001-b333-4333-8333-000000000012',
    bundleId: 'e8b30001-a222-4222-8222-000000000012',
    name: 'Yasvik 12 Superfoods Combo',
    slug: 'yasvik-twelve-superfoods-combo',
    sku: 'YAS-DF-C-12-SUPERFOODS',
    price: 899, weightG: 1200, itemCount: 12, merch: 'mixed',
    purpose: 'Healthy Snacking', audience: ['parents', 'natural_snacking', 'monthly_grocery'],
    short: 'Twelve dry fruits and seeds for a wider everyday pantry.', sortOrder: 11,
    items: [
      item('badam-almonds', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMB-TWFYF-100G'),
      item('cashews', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMC-100G'),
      item('salted-pista', 100, 'g', 'included', 'nuts', 'YAS-104-100G'),
      item('dates', 100, 'g', 'included', 'dry_fruits', 'YAS-DF-DATES-100G'),
      item('black-raisins', 100, 'g', 'included', 'dry_fruits', 'YAS-PREMIUMB-JGOHK-100G'),
      item('pumpkin-seeds', 100, 'g', 'included', 'seeds', 'YAS-PREMIUMP-GRAZO-100G'),
      item('sunflower-seeds', 100, 'g', 'included', 'seeds', 'YAS-109-100G'),
      item('watermelon-seeds', 100, 'g', 'included', 'seeds', 'YAS-121-100G'),
      item('flax-seeds-yas-007', 100, 'g', 'included', 'seeds', 'YAS-007-100G'),
      item('chia-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-CHIA-100G'),
      item('sabja-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-SABJA-100G'),
      item('white-sesame-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-WSES-100G'),
    ],
  },
  {
    productId: 'a8c20001-b333-4333-8333-000000000002',
    bundleId: 'e8b20001-a222-4222-8222-000000000002',
    name: 'Yasvik 17 Item Discovery',
    slug: 'yasvik-17-item-discovery-box',
    sku: 'YAS-DF-C-17-DISCOVERY',
    price: 999, weightG: 1600, itemCount: 17, merch: 'mixed', featured: true,
    purpose: 'Healthy Snacking', audience: ['kids', 'parents', 'natural_snacking'],
    short: 'Seventeen dry fruits and seeds in discovery-sized packs.', sortOrder: 12,
    items: [
      item('badam-almonds', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMB-TWFYF-100G'),
      item('cashews', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMC-100G'),
      item('salted-pista', 50, 'g', 'included', 'nuts', 'YAS-104-50G'),
      item('walnuts', 50, 'g', 'included', 'nuts', 'YAS-120-50G'),
      item('anjeer-rvnea', 100, 'g', 'included', 'dry_fruits', 'YAS-137-100G'),
      item('green-raisins', 100, 'g', 'included', 'dry_fruits', 'YAS-034-100G'),
      item('black-raisins', 100, 'g', 'included', 'dry_fruits', 'YAS-PREMIUMB-JGOHK-100G'),
      item('dates', 100, 'g', 'included', 'dry_fruits', 'YAS-DF-DATES-100G'),
      item('makhana', 100, 'g', 'included', 'nuts', 'YAS-DF-MAKH-100G'),
      item('pumpkin-seeds', 100, 'g', 'included', 'seeds', 'YAS-PREMIUMP-GRAZO-100G'),
      item('sunflower-seeds', 100, 'g', 'included', 'seeds', 'YAS-109-100G'),
      item('watermelon-seeds', 100, 'g', 'included', 'seeds', 'YAS-121-100G'),
      item('flax-seeds-yas-007', 100, 'g', 'included', 'seeds', 'YAS-007-100G'),
      item('chia-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-CHIA-100G'),
      item('sabja-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-SABJA-100G'),
      item('halim-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-HALIM-100G'),
      item('white-sesame-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-WSES-100G'),
    ],
  },
  {
    productId: 'a8c30001-b333-4333-8333-000000000020',
    bundleId: 'e8b30001-a222-4222-8222-000000000020',
    name: 'Yasvik 20 Item Variety',
    slug: 'yasvik-grand-variety-combo',
    sku: 'YAS-DF-C-20-VARIETY',
    price: 1299, weightG: 1750, itemCount: 20, merch: 'mixed',
    purpose: 'Maximum Variety', audience: ['parents', 'natural_snacking', 'kids'],
    short: 'Twenty dry fruits, seeds and free mini chikkis for maximum variety.', sortOrder: 13,
    items: [
      item('cashews', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMC-100G'),
      item('badam-almonds', 100, 'g', 'included', 'nuts', 'YAS-PREMIUMB-TWFYF-100G'),
      item('walnuts', 50, 'g', 'included', 'nuts', 'YAS-120-50G'),
      item('makhana', 50, 'g', 'included', 'nuts', 'YAS-DF-MAKH-50G'),
      item('green-raisins', 100, 'g', 'included', 'dry_fruits', 'YAS-034-100G'),
      item('pumpkin-seeds', 100, 'g', 'included', 'seeds', 'YAS-PREMIUMP-GRAZO-100G'),
      item('sunflower-seeds', 100, 'g', 'included', 'seeds', 'YAS-109-100G'),
      item('roasted-seed-mix', 100, 'g', 'included', 'seeds', null),
      item('anjeer-rvnea', 100, 'g', 'included', 'dry_fruits', 'YAS-137-100G'),
      item('black-raisins', 100, 'g', 'included', 'dry_fruits', 'YAS-PREMIUMB-JGOHK-100G'),
      item('dry-dates', 100, 'g', 'included', 'dry_fruits', null),
      item('halim-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-HALIM-100G'),
      item('dried-kiwi', 100, 'g', 'included', 'dry_fruits', null),
      item('watermelon-seeds', 100, 'g', 'included', 'seeds', 'YAS-121-100G'),
      item('chia-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-CHIA-100G'),
      item('flax-seeds-yas-007', 100, 'g', 'included', 'seeds', 'YAS-007-100G'),
      item('salted-pista', 50, 'g', 'included', 'nuts', 'YAS-104-50G'),
      item('sabja-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-SABJA-100G'),
      item('white-sesame-seeds', 100, 'g', 'included', 'seeds', 'YAS-DF-WSES-100G'),
      item('yasvik-mini-chikki', 10, 'unit', 'free_gift', 'free_items', null, 1),
    ],
  },
  {
    productId: 'a8c30001-b333-4333-8333-000000000027',
    bundleId: 'e8b30001-a222-4222-8222-000000000027',
    name: 'Yasvik 2.75kg Premium Combo',
    slug: 'yasvik-premium-family-combo',
    sku: 'YAS-DF-C-2750-PREMIUM',
    price: 2199, weightG: 2750, itemCount: 13, merch: 'free_gift',
    purpose: 'Premium Dry Fruits', audience: ['parents', 'seniors', 'monthly_grocery'],
    short: 'Premium dry fruits with five free seed packs — 2.75 kg total.', sortOrder: 20,
    items: [
      item('cashews', 250, 'g', 'included', 'nuts', 'YAS-PREMIUMC-250G'),
      item('badam-almonds', 250, 'g', 'included', 'nuts', 'YAS-PREMIUMB-TWFYF-250G'),
      item('anjeer-rvnea', 250, 'g', 'included', 'dry_fruits', 'YAS-137-250G'),
      item('salted-pista', 250, 'g', 'included', 'nuts', 'YAS-104-250G'),
      item('walnuts', 250, 'g', 'included', 'nuts', 'YAS-120-250G'),
      item('makhana', 250, 'g', 'included', 'nuts', 'YAS-DF-MAKH-250G'),
      item('green-raisins', 250, 'g', 'included', 'dry_fruits', 'YAS-034-250G'),
      item('kimia-dates', 500, 'g', 'included', 'dry_fruits', 'YAS-DF-KIMIA-500G'),
      item('pumpkin-seeds', 100, 'g', 'free_gift', 'free_items', 'YAS-PREMIUMP-GRAZO-100G'),
      item('watermelon-seeds', 100, 'g', 'free_gift', 'free_items', 'YAS-121-100G'),
      item('sunflower-seeds', 100, 'g', 'free_gift', 'free_items', 'YAS-109-100G'),
      item('flax-seeds-yas-007', 100, 'g', 'free_gift', 'free_items', 'YAS-007-100G'),
      item('chia-seeds', 100, 'g', 'free_gift', 'free_items', 'YAS-DF-CHIA-100G'),
    ],
  },
  {
    productId: 'a8c30001-b333-4333-8333-000000000022',
    bundleId: 'e8b30001-a222-4222-8222-000000000022',
    name: 'Yasvik 2.2kg Family Combo',
    slug: 'yasvik-family-dry-fruit-seeds-combo',
    sku: 'YAS-DF-C-2200-FAMILY',
    price: 1499, weightG: 2200, itemCount: 10, merch: 'free_gift',
    purpose: 'Perfect Family Box', audience: ['parents', 'monthly_grocery', 'natural_snacking'],
    short: 'Family quantities of nuts, raisins, dates and everyday seeds — 2.2 kg.', sortOrder: 21,
    items: [
      item('badam-almonds', 250, 'g', 'included', 'nuts', 'YAS-PREMIUMB-TWFYF-250G'),
      item('cashews', 250, 'g', 'included', 'nuts', 'YAS-PREMIUMC-250G'),
      item('green-raisins', 200, 'g', 'included', 'dry_fruits', 'YAS-034-200G'),
      item('dates', 400, 'g', 'included', 'dry_fruits', null),
      item('makhana', 100, 'g', 'included', 'nuts', 'YAS-DF-MAKH-100G'),
      item('pumpkin-seeds', 200, 'g', 'included', 'seeds', 'YAS-PREMIUMP-GRAZO-200G'),
      item('sunflower-seeds', 200, 'g', 'included', 'seeds', 'YAS-109-200G'),
      item('watermelon-seeds', 200, 'g', 'included', 'seeds', 'YAS-121-200G'),
      item('flax-seeds-yas-007', 200, 'g', 'included', 'seeds', 'YAS-007-200G'),
      item('chia-seeds', 200, 'g', 'free_gift', 'free_items', 'YAS-DF-CHIA-200G'),
    ],
  },
  {
    productId: 'a8c30001-b333-4333-8333-000000000040',
    bundleId: 'e8b30001-a222-4222-8222-000000000040',
    name: 'Yasvik 4kg Grand Family Combo',
    slug: 'yasvik-grand-family-combo',
    sku: 'YAS-DF-C-4000-GRAND',
    price: 2999, weightG: 4000, itemCount: 12, merch: 'free_gift',
    purpose: 'Monthly Wellness', audience: ['parents', 'seniors', 'monthly_grocery'],
    short: 'Grand family dry-fruit stocking at 4 kg, with free mini chikkis.', sortOrder: 22,
    items: [
      item('cashews', 500, 'g', 'included', 'nuts', null),
      item('badam-almonds', 500, 'g', 'included', 'nuts', null),
      item('anjeer-rvnea', 400, 'g', 'included', 'dry_fruits', null),
      item('salted-pista', 400, 'g', 'included', 'nuts', null),
      item('walnuts', 400, 'g', 'included', 'nuts', null),
      item('makhana', 300, 'g', 'included', 'nuts', null),
      item('green-raisins', 400, 'g', 'included', 'dry_fruits', null),
      item('kimia-dates', 800, 'g', 'included', 'dry_fruits', null),
      item('pumpkin-seeds', 100, 'g', 'included', 'seeds', 'YAS-PREMIUMP-GRAZO-100G'),
      item('watermelon-seeds', 100, 'g', 'included', 'seeds', 'YAS-121-100G'),
      item('sunflower-seeds', 100, 'g', 'included', 'seeds', 'YAS-109-100G'),
      item('yasvik-mini-chikki', 10, 'unit', 'free_gift', 'free_items', null, 1),
    ],
  },
];

async function loadComponents() {
  const data = await rest(`products?select=id,slug,name&slug=in.(${SLUGS.join(',')})`);
  const map = new Map((data || []).map((row) => [row.slug, row]));
  for (const slug of SLUGS) {
    if (!map.has(slug)) throw new Error(`Missing component product: ${slug}`);
  }
  return map;
}

async function ensureMiniChikki() {
  const id = 'a8c30001-b333-4333-8333-000000000099';
  await rest('products?on_conflict=id', {
    method: 'POST',
    body: {
      id, name: 'Yasvik Mini Chikki', slug: 'yasvik-mini-chikki', sku: 'YAS-DF-MINI-CHIKKI',
      price: 20, stock_quantity: 0, subject_to_availability: true, is_published: true, sell_online: false,
      product_kind: 'individual_product',
      short_description: 'Mini chikki pieces used as free gifts with selected Yasvik combos.',
      description: 'Mini chikki pack pieces. Sold as a free gift with selected family combos.',
      category_id: COMBOS_SUBCAT_ID, updated_at: new Date().toISOString(),
    },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
  const rows = await rest('products?select=id,slug,name&slug=eq.yasvik-mini-chikki');
  return rows?.[0] || { id, slug: 'yasvik-mini-chikki', name: 'Yasvik Mini Chikki' };
}

async function upsertCombo(combo, components, miniChikki) {
  await rest('products?on_conflict=id', {
    method: 'POST',
    body: {
      id: combo.productId, name: combo.name, slug: combo.slug, sku: combo.sku, price: combo.price,
      category_id: COMBOS_SUBCAT_ID, product_kind: 'bundle_combo', product_group: 'packaged_combo',
      inventory_mode: 'prepacked_stock', stock_measure_type: 'units', stock_quantity: 0,
      subject_to_availability: true, is_published: true, sell_online: true,
      is_featured: Boolean(combo.featured), sort_order: combo.sortOrder, yasvik_mark: combo.purpose,
      short_description: combo.short, description: combo.short,
      bundle_item_count: combo.itemCount, bundle_net_weight_g: combo.weightG,
      updated_at: new Date().toISOString(),
    },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });

  const conflicts = await rest(`products?select=id&slug=eq.${combo.slug}&id=neq.${combo.productId}`);
  for (const row of conflicts || []) {
    await rest(`products?id=eq.${row.id}`, {
      method: 'PATCH',
      body: { slug: `${combo.slug}-archived-${Date.now()}`, is_published: false, sell_online: false },
      prefer: 'return=minimal',
    });
  }
  await rest(`products?id=eq.${combo.productId}`, {
    method: 'PATCH', body: { slug: combo.slug }, prefer: 'return=minimal',
  });

  await rest('product_bundles?on_conflict=id', {
    method: 'POST',
    body: {
      id: combo.bundleId, bundle_name: combo.name, bundle_slug: combo.slug, bundle_description: combo.short,
      bundle_type: 'bundle_combo', display_locations: ['home', 'category', 'product'], is_active: true,
      sort_order: combo.sortOrder, parent_product_id: combo.productId, bundle_status: 'active',
      inventory_mode: 'prepacked_stock', packaging_mode: 'separately_packed',
      item_count: combo.itemCount, total_net_weight_g: combo.weightG, has_unresolved_components: false,
      combo_merch_category: combo.merch, purpose_label: combo.purpose, audience_tags: combo.audience,
      has_customer_options: false, updated_at: new Date().toISOString(),
    },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });

  await rest(`product_bundle_items?bundle_id=eq.${combo.bundleId}`, { method: 'DELETE', prefer: 'return=minimal' });

  const rows = combo.items.map((row, index) => {
    const product = row.slug === 'yasvik-mini-chikki' ? miniChikki : components.get(row.slug);
    if (!product?.id) throw new Error(`Missing product for ${row.slug} in ${combo.slug}`);
    return {
      bundle_id: combo.bundleId, product_id: product.id, sort_order: index, is_required: true, is_active: true,
      quantity_value: row.qty, quantity_unit: row.unit, pack_count: row.packs || 1,
      component_variant_sku: row.sku,
      component_title_snapshot: row.slug === 'salted-pista' ? 'Salted Pista' : (product.name || null),
      item_role: row.role, display_group: row.group,
      gift_worth_paise: row.role === 'free_gift' ? 14900 : null,
    };
  });
  await rest('product_bundle_items', { method: 'POST', body: rows, prefer: 'return=minimal' });
  await rest(`products?id=eq.${combo.productId}`, {
    method: 'PATCH',
    body: { bundle_id: combo.bundleId, bundle_item_count: combo.itemCount, bundle_net_weight_g: combo.weightG },
    prefer: 'return=minimal',
  });
  console.log(`✓ ${combo.slug} (${combo.merch})`);
}

async function main() {
  const components = await loadComponents();
  await rest(`products?id=eq.${components.get('roasted-seed-mix').id}`, {
    method: 'PATCH',
    body: {
      name: 'Roasted Seeds', short_description: 'Roasted seed mix for snacking and combo packs.',
      is_published: true, sell_online: true, subject_to_availability: true, updated_at: new Date().toISOString(),
    },
    prefer: 'return=minimal',
  });
  const miniChikki = await ensureMiniChikki();
  components.set('yasvik-mini-chikki', miniChikki);

  for (const slug of ['yasvik-dry-fruit-essentials-box', 'yasvik-family-pantry-box', 'yasvik-premium-family-selection']) {
    await rest(`products?slug=eq.${slug}`, {
      method: 'PATCH',
      body: { is_published: false, sell_online: false, updated_at: new Date().toISOString() },
      prefer: 'return=minimal',
    });
    await rest(`product_bundles?bundle_slug=eq.${slug}`, {
      method: 'PATCH',
      body: { is_active: false, bundle_status: 'archived', combo_merch_category: null, updated_at: new Date().toISOString() },
      prefer: 'return=minimal',
    });
    console.log(`archived ${slug}`);
  }

  for (const combo of COMBOS) await upsertCombo(combo, components, miniChikki);

  await rest('product_bundles?bundle_slug=eq.yasvik-everyday-seeds-Combo', {
    method: 'PATCH', body: { combo_merch_category: 'separate', purpose_label: 'Daily Nutrition' }, prefer: 'return=minimal',
  });

  // Ensure Five Dry Fruits (options product) stays published in Separate
  await rest('products?on_conflict=id', {
    method: 'POST',
    body: {
      id: 'a8c20001-b333-4333-8333-000000000006',
      name: 'Yasvik Five Dry Fruits Combo',
      slug: 'yasvik-five-dry-fruits-combo',
      sku: 'YAS-DF-C-FIVE-DRY-FRUITS',
      price: 899,
      category_id: COMBOS_SUBCAT_ID,
      product_kind: 'bundle_combo',
      product_group: 'packaged_combo',
      inventory_mode: 'prepacked_stock',
      stock_quantity: 0,
      subject_to_availability: true,
      is_published: true,
      sell_online: true,
      yasvik_mark: 'Premium Dry Fruits',
      short_description: 'Choose your five dry-fruit combination — each pack includes a free seed gift.',
      bundle_item_count: 5,
      bundle_net_weight_g: 450,
      updated_at: new Date().toISOString(),
    },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
  await rest('product_bundles?on_conflict=id', {
    method: 'POST',
    body: {
      id: 'e8b20001-a222-4222-8222-000000000006',
      bundle_name: 'Yasvik Five Dry Fruits Combo',
      bundle_slug: 'yasvik-five-dry-fruits-combo',
      bundle_description: 'Choose Classic Nuts or Premium Wellness — includes a free seed gift.',
      bundle_type: 'bundle_combo',
      display_locations: ['home', 'category', 'product'],
      is_active: true,
      sort_order: 1,
      parent_product_id: 'a8c20001-b333-4333-8333-000000000006',
      bundle_status: 'active',
      inventory_mode: 'prepacked_stock',
      packaging_mode: 'separately_packed',
      item_count: 5,
      total_net_weight_g: 450,
      combo_merch_category: 'separate',
      purpose_label: 'Premium Dry Fruits',
      audience_tags: ['parents', 'office', 'natural_snacking'],
      has_customer_options: true,
      updated_at: new Date().toISOString(),
    },
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
  await rest('products?id=eq.a8c20001-b333-4333-8333-000000000006', {
    method: 'PATCH',
    body: { bundle_id: 'e8b20001-a222-4222-8222-000000000006', is_published: true, sell_online: true },
    prefer: 'return=minimal',
  });

  await rest('product_bundles?bundle_slug=eq.yasvik-five-dry-fruits-combo', {
    method: 'PATCH', body: { combo_merch_category: 'separate', purpose_label: 'Premium Dry Fruits', has_customer_options: true, is_active: true }, prefer: 'return=minimal',
  });

  const parents = await rest('products?select=id&slug=eq.yasvik-five-dry-fruits-combo');
  const parent = parents?.[0];
  if (parent) {
    const bundles = await rest(`product_bundles?select=id&parent_product_id=eq.${parent.id}`);
    const bundle = bundles?.[0];
    if (bundle) {
      const groups = await rest(`combo_option_groups?select=id&bundle_id=eq.${bundle.id}`);
      const groupIds = (groups || []).map((g) => g.id);
      if (groupIds.length) {
        const choices = await rest(`combo_option_choices?select=id&group_id=in.(${groupIds.join(',')})`);
        const choiceIds = (choices || []).map((c) => c.id);
        const pista = components.get('salted-pista');
        if (choiceIds.length && pista) {
          await rest(`combo_option_choice_items?choice_id=in.(${choiceIds.join(',')})&product_id=eq.${pista.id}`, {
            method: 'PATCH',
            body: { component_title_snapshot: 'Salted Pista', display_group: 'nuts' },
            prefer: 'return=minimal',
          });
          console.log('✓ Classic Nuts Salted Pista title fixed');
        }
      } else {
        console.log('⚠ Five Dry Fruits has no option groups — re-run V2 data SQL');
      }
    }
  }
  console.log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
