/**
 * Publish the five approved Yasvik dry-fruit combos.
 * - Adds missing exact pack variants (price 0; does not change existing packs)
 * - Upserts five sellable combo parents + product_bundles / items
 * - Unpublishes all other dry-fruit combo parents
 *
 * Usage: node --env-file=.env.local scripts/publish-five-dry-fruit-combos.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const DRY_FRUITS_CATEGORY_ID = 'bdba5b32-71e3-4f05-b852-c7902860effb';
const COMBOS_SUBCAT_ID = 'e7a1c2d3-4b5e-6f70-8192-a3b4c5d6e706';

const MISSING_VARIANTS = [
  { slug: 'pumpkin-seeds', sku: 'YAS-PREMIUMP-GRAZO-200G', label: '200g', pack_kg: 0.2 },
  { slug: 'sunflower-seeds', sku: 'YAS-109-200G', label: '200g', pack_kg: 0.2 },
  { slug: 'watermelon-seeds', sku: 'YAS-121-200G', label: '200g', pack_kg: 0.2 },
  { slug: 'flax-seeds-yas-007', sku: 'YAS-007-200G', label: '200g', pack_kg: 0.2 },
  { slug: 'green-raisins', sku: 'YAS-034-200G', label: '200g', pack_kg: 0.2 },
  { slug: 'dates', sku: 'YAS-DF-DATES-100G', label: '100g', pack_kg: 0.1 },
  { slug: 'salted-pista', sku: 'YAS-104-50G', label: '50g', pack_kg: 0.05 },
  { slug: 'walnuts', sku: 'YAS-120-50G', label: '50g', pack_kg: 0.05 },
  { slug: 'kimia-dates', sku: 'YAS-DF-KIMIA-400G', label: '400g', pack_kg: 0.4 },
];

const COMBOS = [
  {
    productId: 'a8c20001-b333-4333-8333-000000000001',
    bundleId: 'e8b20001-a222-4222-8222-000000000001',
    name: 'Yasvik Everyday Seeds Pack',
    slug: 'yasvik-everyday-seeds-pack',
    sku: 'YAS-DF-C-EVERYDAY-SEEDS',
    price: 550,
    itemCount: 5,
    weightG: 1000,
    badge: 'Seed Essential',
    featured: false,
    sortOrder: 2,
    short: 'Five everyday seeds in practical 200 g packs for regular home use.',
    purpose: 'For customers who already use seeds in breakfast bowls, smoothies, salads and home recipes.',
    education: 'A simple way to keep commonly used seeds together without purchasing five separate full-sized packs.',
    perfectFor: ['Regular seed users', 'Breakfast bowls', 'Fitness routines', 'Conscious pantry stocking'],
    seoTitle: 'Buy Everyday Seeds Pack Online in Hyderabad | Yasvik',
    seoDescription: 'Shop five everyday seeds in practical 200 g packs from Yasvik. Includes pumpkin, watermelon, sunflower, chia and flax seeds, subject to availability.',
    items: [
      { slug: 'pumpkin-seeds', qty: 200, sku: 'YAS-PREMIUMP-GRAZO-200G' },
      { slug: 'watermelon-seeds', qty: 200, sku: 'YAS-121-200G' },
      { slug: 'sunflower-seeds', qty: 200, sku: 'YAS-109-200G' },
      { slug: 'chia-seeds', qty: 200, sku: 'YAS-DF-CHIA-200G' },
      { slug: 'flax-seeds-yas-007', qty: 200, sku: 'YAS-007-200G' },
    ],
  },
  {
    productId: 'a8c20001-b333-4333-8333-000000000002',
    bundleId: 'e8b20001-a222-4222-8222-000000000002',
    name: 'Yasvik 17-Item Discovery Box',
    slug: 'yasvik-17-item-discovery-box',
    sku: 'YAS-DF-C-17-DISCOVERY',
    price: 999,
    itemCount: 17,
    weightG: 1550,
    badge: 'Best Value',
    featured: true,
    sortOrder: 1,
    short: 'Seventeen dry fruits and seeds in discovery-sized packs for customers who want to try a wider variety.',
    purpose: 'For first-time buyers and conscious households that want variety without choosing seventeen separate products.',
    education: 'Keep several small packs ready so biscuits, chips and sweets are not the only convenient snack choices at home.',
    perfectFor: ['New starters', 'Maximum variety', 'Conscious snack shelves', 'Family sharing', 'Trying before buying larger packs'],
    seoTitle: 'Buy 17-Item Dry Fruits and Seeds Combo | Yasvik',
    seoDescription: 'Explore seventeen dry fruits, nuts and seeds in a 1.55 kg Yasvik discovery box. A practical way to try a wider variety in smaller packs.',
    items: [
      { slug: 'cashews', qty: 100, sku: 'YAS-PREMIUMC-100G' },
      { slug: 'badam-almonds', qty: 100, sku: 'YAS-PREMIUMB-TWFYF-100G' },
      { slug: 'anjeer-rvnea', qty: 100, sku: 'YAS-137-100G' },
      { slug: 'black-raisins', qty: 100, sku: 'YAS-PREMIUMB-JGOHK-100G' },
      { slug: 'green-raisins', qty: 100, sku: 'YAS-034-100G' },
      { slug: 'dates', qty: 100, sku: 'YAS-DF-DATES-100G' },
      { slug: 'salted-pista', qty: 50, sku: 'YAS-104-50G' },
      { slug: 'walnuts', qty: 50, sku: 'YAS-120-50G' },
      { slug: 'makhana', qty: 50, sku: 'YAS-DF-MAKH-50G' },
      { slug: 'pumpkin-seeds', qty: 100, sku: 'YAS-PREMIUMP-GRAZO-100G' },
      { slug: 'sunflower-seeds', qty: 100, sku: 'YAS-109-100G' },
      { slug: 'watermelon-seeds', qty: 100, sku: 'YAS-121-100G' },
      { slug: 'flax-seeds-yas-007', qty: 100, sku: 'YAS-007-100G' },
      { slug: 'white-sesame-seeds', qty: 100, sku: 'YAS-DF-WSES-100G' },
      { slug: 'chia-seeds', qty: 100, sku: 'YAS-DF-CHIA-100G' },
      { slug: 'sabja-seeds', qty: 100, sku: 'YAS-DF-SABJA-100G' },
      { slug: 'halim-seeds', qty: 100, sku: 'YAS-DF-HALIM-100G' },
    ],
  },
  {
    productId: 'a8c20001-b333-4333-8333-000000000003',
    bundleId: 'e8b20001-a222-4222-8222-000000000003',
    name: 'Yasvik Dry Fruit Essentials Box',
    slug: 'yasvik-dry-fruit-essentials-box',
    sku: 'YAS-DF-C-ESSENTIALS',
    price: 1199,
    itemCount: 8,
    weightG: 1100,
    badge: 'Dry Fruit Pick',
    featured: false,
    sortOrder: 3,
    short: 'A dry-fruit-focused selection with nuts, figs, makhana, raisins and a generous pack of Kimia dates.',
    purpose: 'For customers who prefer familiar nuts and dry fruits rather than a seed-heavy assortment.',
    education: 'Built around familiar dry fruits for direct snacking, soaking, sweets, breakfast dishes and everyday serving.',
    perfectFor: ['Dry-fruit lovers', 'Family snack jars', 'Guest serving', 'Traditional home use', 'Gifting'],
    seoTitle: 'Buy Dry Fruit Essentials Box in Hyderabad | Yasvik',
    seoDescription: 'Shop a 1.1 kg dry-fruit-focused Yasvik box with cashews, almonds, walnuts, pista, figs, makhana, raisins and Kimia dates.',
    items: [
      { slug: 'cashews', qty: 100, sku: 'YAS-PREMIUMC-100G' },
      { slug: 'badam-almonds', qty: 100, sku: 'YAS-PREMIUMB-TWFYF-100G' },
      { slug: 'walnuts', qty: 100, sku: 'YAS-120-100G' },
      { slug: 'salted-pista', qty: 100, sku: 'YAS-104-100G' },
      { slug: 'anjeer-rvnea', qty: 100, sku: 'YAS-137-100G' },
      { slug: 'makhana', qty: 100, sku: 'YAS-DF-MAKH-100G' },
      { slug: 'green-raisins', qty: 100, sku: 'YAS-034-100G' },
      { slug: 'kimia-dates', qty: 400, sku: 'YAS-DF-KIMIA-400G' },
    ],
  },
  {
    productId: 'a8c20001-b333-4333-8333-000000000004',
    bundleId: 'e8b20001-a222-4222-8222-000000000004',
    name: 'Yasvik Family Pantry Box',
    slug: 'yasvik-family-pantry-box',
    sku: 'YAS-DF-C-FAMILY-PANTRY',
    price: 1399,
    itemCount: 10,
    weightG: 2100,
    badge: 'Family Value',
    featured: false,
    sortOrder: 4,
    short: 'Larger household packs of almonds, cashews, raisins and everyday seeds for regular family use.',
    purpose: 'For households that already consume nuts and seeds regularly and prefer useful 200–250 g quantities.',
    education: 'Fewer varieties than the discovery box, but larger and more practical quantities for regular household consumption.',
    perfectFor: ['Family use', 'Monthly stocking', 'Shared snack jars', 'Breakfast pantry', 'Regular seed users'],
    seoTitle: 'Buy Family Dry Fruits and Seeds Pantry Box | Yasvik',
    seoDescription: 'Shop a 2.1 kg Yasvik family pantry box with larger packs of nuts, raisins and everyday seeds for regular household use.',
    items: [
      { slug: 'cashews', qty: 250, sku: 'YAS-PREMIUMC-250G' },
      { slug: 'badam-almonds', qty: 250, sku: 'YAS-PREMIUMB-TWFYF-250G' },
      { slug: 'green-raisins', qty: 200, sku: 'YAS-034-200G' },
      { slug: 'pumpkin-seeds', qty: 200, sku: 'YAS-PREMIUMP-GRAZO-200G' },
      { slug: 'watermelon-seeds', qty: 200, sku: 'YAS-121-200G' },
      { slug: 'sunflower-seeds', qty: 200, sku: 'YAS-109-200G' },
      { slug: 'flax-seeds-yas-007', qty: 200, sku: 'YAS-007-200G' },
      { slug: 'sabja-seeds', qty: 200, sku: 'YAS-DF-SABJA-200G' },
      { slug: 'halim-seeds', qty: 200, sku: 'YAS-DF-HALIM-200G' },
      { slug: 'chia-seeds', qty: 200, sku: 'YAS-DF-CHIA-200G' },
    ],
  },
  {
    productId: 'a8c20001-b333-4333-8333-000000000005',
    bundleId: 'e8b20001-a222-4222-8222-000000000005',
    name: 'Yasvik Premium Family Selection',
    slug: 'yasvik-premium-family-selection',
    sku: 'YAS-DF-C-PREMIUM-FAMILY',
    price: 2199,
    itemCount: 12,
    weightG: 2500,
    badge: 'Premium Pick',
    featured: false,
    sortOrder: 5,
    short: 'Premium dry fruits in generous quantities, completed with five useful seed packs.',
    purpose: 'For premium home stocking, festive serving and gift-worthy buying.',
    education: 'This box prioritises premium ingredient quantities rather than maximum product count.',
    perfectFor: ['Premium home use', 'Gifting', 'Festive occasions', 'Guest serving', 'Family stocking'],
    seoTitle: 'Buy Premium Family Dry Fruit Selection | Yasvik',
    seoDescription: 'Shop a 2.5 kg Yasvik premium family selection with generous dry-fruit quantities, Kimia dates and five everyday seed packs.',
    items: [
      { slug: 'cashews', qty: 250, sku: 'YAS-PREMIUMC-250G' },
      { slug: 'badam-almonds', qty: 250, sku: 'YAS-PREMIUMB-TWFYF-250G' },
      { slug: 'salted-pista', qty: 250, sku: 'YAS-104-250G' },
      { slug: 'green-raisins', qty: 250, sku: 'YAS-034-250G' },
      { slug: 'anjeer-rvnea', qty: 250, sku: 'YAS-137-250G' },
      { slug: 'makhana', qty: 250, sku: 'YAS-DF-MAKH-250G' },
      { slug: 'kimia-dates', qty: 500, sku: 'YAS-DF-KIMIA-500G' },
      { slug: 'pumpkin-seeds', qty: 100, sku: 'YAS-PREMIUMP-GRAZO-100G' },
      { slug: 'watermelon-seeds', qty: 100, sku: 'YAS-121-100G' },
      { slug: 'sunflower-seeds', qty: 100, sku: 'YAS-109-100G' },
      { slug: 'flax-seeds-yas-007', qty: 100, sku: 'YAS-007-100G' },
      { slug: 'chia-seeds', qty: 100, sku: 'YAS-DF-CHIA-100G' },
    ],
  },
];

const PUBLISH_SLUGS = new Set(COMBOS.map((c) => c.slug));

function draftVariant({ sku, label, pack_kg }) {
  return {
    sku,
    label,
    notes: 'Shared bulk stock — deduct website stock from bulk inventory. Draft — set cost in Pricing Strategy before publish.',
    price: 0,
    stock: 0,
    pack_kg,
    image_url: '',
    image_urls: [],
  };
}

function hasPack(variants, { sku, label, pack_kg }) {
  return (variants || []).some((v) => {
    if (!v || v.sku === '__yasvik_pricing__') return false;
    if (sku && String(v.sku || '') === sku) return true;
    const kg = Number(v.pack_kg);
    const lbl = String(v.label || '').toLowerCase();
    return (Number.isFinite(kg) && Math.abs(kg - pack_kg) < 0.0001)
      || lbl === String(label).toLowerCase();
  });
}

async function ensureMissingVariants() {
  const created = [];
  for (const row of MISSING_VARIANTS) {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, slug, quick_variants')
      .eq('slug', row.slug)
      .maybeSingle();
    if (error) throw error;
    if (!product) throw new Error(`Missing product slug: ${row.slug}`);

    const variants = Array.isArray(product.quick_variants) ? [...product.quick_variants] : [];
    if (hasPack(variants, row)) {
      console.log(`variant ok: ${row.slug} ${row.label}`);
      continue;
    }

    // Insert after pricing meta (index 0) in gram order.
    const meta = variants.filter((v) => v?.sku === '__yasvik_pricing__');
    const packs = variants.filter((v) => v?.sku !== '__yasvik_pricing__');
    packs.push(draftVariant(row));
    packs.sort((a, b) => Number(a.pack_kg || 0) - Number(b.pack_kg || 0));
    const next = [...meta, ...packs];

    const { error: upErr } = await supabase
      .from('products')
      .update({ quick_variants: next, updated_at: new Date().toISOString() })
      .eq('id', product.id);
    if (upErr) throw upErr;
    created.push(`${row.slug}:${row.label}`);
    console.log(`created variant: ${row.slug} ${row.label} (${row.sku})`);
  }
  return created;
}

async function loadComponentMap() {
  const slugs = [...new Set(COMBOS.flatMap((c) => c.items.map((i) => i.slug)))];
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name')
    .in('slug', slugs);
  if (error) throw error;
  const map = new Map((data || []).map((p) => [p.slug, p]));
  for (const slug of slugs) {
    if (!map.has(slug)) throw new Error(`Component product missing: ${slug}`);
  }
  return map;
}

async function upsertCombo(combo, components) {
  const bestFor = combo.perfectFor.join('\n');
  const description = [combo.purpose, '', combo.education].join('\n');

  const productPayload = {
    id: combo.productId,
    name: combo.name,
    slug: combo.slug,
    sku: combo.sku,
    price: combo.price,
    category_id: DRY_FRUITS_CATEGORY_ID,
    product_kind: 'bundle_combo',
    composition_status: 'n_a',
    product_group: 'packaged_combo',
    inventory_mode: 'prepacked_stock',
    stock_measure_type: 'units',
    stock_quantity: 0,
    subject_to_availability: true,
    is_published: true,
    sell_online: true,
    is_featured: combo.featured,
    sort_order: combo.sortOrder,
    yasvik_mark: combo.badge,
    best_for: bestFor,
    short_description: combo.short,
    description,
    seo_title: combo.seoTitle,
    seo_description: combo.seoDescription,
    bundle_item_count: combo.itemCount,
    bundle_net_weight_g: combo.weightG,
    bundle_id: combo.bundleId,
    updated_at: new Date().toISOString(),
  };

  const { error: pErr } = await supabase.from('products').upsert(productPayload, { onConflict: 'id' });
  if (pErr) throw pErr;

  // Ensure slug uniqueness if an older row used a different id
  const { error: slugFix } = await supabase
    .from('products')
    .update({
      name: combo.name,
      price: combo.price,
      category_id: DRY_FRUITS_CATEGORY_ID,
      product_kind: 'bundle_combo',
      composition_status: 'n_a',
      product_group: 'packaged_combo',
      inventory_mode: 'prepacked_stock',
      stock_measure_type: 'units',
      subject_to_availability: true,
      is_published: true,
      sell_online: true,
      is_featured: combo.featured,
      sort_order: combo.sortOrder,
      yasvik_mark: combo.badge,
      best_for: bestFor,
      short_description: combo.short,
      description,
      seo_title: combo.seoTitle,
      seo_description: combo.seoDescription,
      bundle_item_count: combo.itemCount,
      bundle_net_weight_g: combo.weightG,
      bundle_id: combo.bundleId,
      stock_quantity: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', combo.slug);
  if (slugFix) throw slugFix;

  const { data: parent, error: parentErr } = await supabase
    .from('products')
    .select('id')
    .eq('slug', combo.slug)
    .single();
  if (parentErr) throw parentErr;

  const bundlePayload = {
    id: combo.bundleId,
    bundle_name: combo.name,
    bundle_slug: combo.slug,
    bundle_description: combo.short,
    bundle_type: 'bundle_combo',
    display_locations: ['product', 'category', 'home'],
    is_active: true,
    sort_order: combo.sortOrder,
    parent_product_id: parent.id,
    bundle_status: 'active',
    inventory_mode: 'prepacked_stock',
    packaging_mode: 'separately_packed',
    substitution_policy:
      'If a listed item is temporarily unavailable, Yasvik may substitute with an equivalent grade of the same product type after confirming with you where required.',
    total_net_weight_g: combo.weightG,
    item_count: combo.itemCount,
    outer_packaging_cost_paise: 0,
    has_unresolved_components: false,
    mapping_notes: `Published ${new Date().toISOString().slice(0, 10)} — approved five-combo set.`,
    updated_at: new Date().toISOString(),
  };

  const { error: bErr } = await supabase.from('product_bundles').upsert(bundlePayload, { onConflict: 'id' });
  if (bErr) throw bErr;

  await supabase.from('product_bundle_items').delete().eq('bundle_id', combo.bundleId);

  const itemRows = combo.items.map((item, index) => {
    const component = components.get(item.slug);
    return {
      bundle_id: combo.bundleId,
      product_id: component.id,
      sort_order: index + 1,
      is_required: true,
      component_variant_sku: item.sku,
      component_title_snapshot: component.name,
      quantity_value: item.qty,
      quantity_unit: 'g',
      pack_count: 1,
      substitution_allowed: false,
      is_active: true,
      updated_at: new Date().toISOString(),
    };
  });

  const { error: iErr } = await supabase.from('product_bundle_items').insert(itemRows);
  if (iErr) throw iErr;

  await supabase
    .from('products')
    .update({ bundle_id: combo.bundleId, updated_at: new Date().toISOString() })
    .eq('id', parent.id);

  console.log(`published: ${combo.slug} ₹${combo.price} (${combo.itemCount} items / ${combo.weightG}g)`);
  return parent.id;
}

async function unpublishOtherCombos() {
  const { data: combos, error } = await supabase
    .from('products')
    .select('id, slug, name, is_published, sell_online')
    .eq('product_kind', 'bundle_combo');
  if (error) throw error;

  const others = (combos || []).filter((p) => !PUBLISH_SLUGS.has(p.slug));
  if (!others.length) return [];

  const ids = others.map((p) => p.id);
  const { error: upErr } = await supabase
    .from('products')
    .update({
      is_published: false,
      sell_online: false,
      is_featured: false,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);
  if (upErr) throw upErr;

  const { data: bundles } = await supabase
    .from('product_bundles')
    .select('id, parent_product_id')
    .in('parent_product_id', ids);
  if (bundles?.length) {
    await supabase
      .from('product_bundles')
      .update({ bundle_status: 'draft', is_active: true, updated_at: new Date().toISOString() })
      .in('id', bundles.map((b) => b.id));
  }

  console.log('unpublished drafts:', others.map((p) => p.slug).join(', '));
  return others.map((p) => p.slug);
}

async function verify() {
  const { data: published } = await supabase
    .from('products')
    .select('slug, name, price, is_published, sell_online, bundle_net_weight_g, bundle_item_count, yasvik_mark, is_featured, sort_order, subject_to_availability, stock_quantity, category_id')
    .eq('product_kind', 'bundle_combo')
    .eq('is_published', true)
    .order('sort_order');

  const { data: items } = await supabase
    .from('product_bundle_items')
    .select('bundle_id, quantity_value, component_variant_sku, product_id')
    .in('bundle_id', COMBOS.map((c) => c.bundleId));

  const sumByBundle = {};
  for (const row of items || []) {
    sumByBundle[row.bundle_id] = (sumByBundle[row.bundle_id] || 0) + Number(row.quantity_value || 0);
  }

  return { published, weightSums: sumByBundle };
}

async function main() {
  console.log('1) Ensuring missing exact variants…');
  const createdVariants = await ensureMissingVariants();

  console.log('2) Loading component products…');
  const components = await loadComponentMap();

  console.log('3) Upserting five approved combos…');
  for (const combo of COMBOS) {
    await upsertCombo(combo, components);
  }

  console.log('4) Unpublishing other dry-fruit combos…');
  const unpublished = await unpublishOtherCombos();

  console.log('5) Verify…');
  const verification = await verify();
  console.log(JSON.stringify({ createdVariants, unpublished, verification }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
