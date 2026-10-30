/**
 * Hero margin calibration from live product cost meta (snapshot).
 * Run: npx vite-node scripts/calibrate-hero-margins.mjs
 */
import {
  buildProductMarginRows,
  normalizeOpsMarginAssumptions,
  formatChannelAdvice,
  formatRupee,
} from '../src/lib/ops/marginControl.js';

const assumptions = normalizeOpsMarginAssumptions({
  payment_fee_pct: 2,
  min_contribution_rs: 25,
  target_margin_pct: 20,
  bonus_redeem_pct: 5,
  typical_porter_cost_rs: 100,
  heavy_porter_cost_rs: 150,
  free_delivery_threshold_rs: 999,
  label_cost_rs: 2,
});

const heroes = [
  {
    name: 'Cold Pressed Groundnut Oil',
    slug: 'cold-pressed-groundnut-oil',
    merchandising_tier: 'hero',
    price: 389,
    quick_variants: [
      { label: '__yasvik_pricing__', notes: JSON.stringify({ purchase_rate_per_kg: '300', pack_packaging_rs: { '500ml': '15', '1L': '25' } }) },
      { label: '500 ml', price: '199' },
      { label: '1 l', price: '389' },
    ],
  },
  {
    name: 'Cold Pressed White Sesame Oil',
    slug: 'cold-pressed-sesame-oil',
    merchandising_tier: 'hero',
    price: 609,
    quick_variants: [
      { label: '__yasvik_pricing__', notes: JSON.stringify({ purchase_rate_per_kg: '480', pack_packaging_rs: { '500ml': '15', '1L': '25' } }) },
      { label: '500 ml', price: '309' },
      { label: '1 l', price: '609' },
    ],
  },
  {
    name: 'Mango Pickle / Avakaya',
    slug: 'mango-pickle-avakaya',
    merchandising_tier: 'hero',
    price: 129,
    quick_variants: [
      { label: '__yasvik_pricing__', notes: JSON.stringify({ purchase_rate_per_kg: '380', pack_packaging_rs: {} }) },
      { label: '250 g', price: '129' },
      { label: '500 g', price: '249' },
    ],
  },
  {
    name: 'Organic Jaggery Powder',
    slug: 'yureka-jaggery-powder',
    merchandising_tier: 'hero',
    price: 99,
    quick_variants: [
      { label: '__yasvik_pricing__', notes: JSON.stringify({ purchase_rate_per_kg: '65', pack_packaging_rs: { '500g': '3', '1kg': '3' } }) },
      { label: '500 g', price: '49' },
      { label: '1 kg', price: '99' },
    ],
  },
  {
    name: 'Multi Floral Honey',
    slug: 'multi-floral-honey',
    merchandising_tier: 'hero',
    price: 679,
    quick_variants: [
      { label: '__yasvik_pricing__', notes: JSON.stringify({ purchase_rate_per_kg: '450', pack_packaging_rs: { '250g': '15', '500g': '25', '1kg': '35' } }) },
      { label: '250 g', price: '189' },
      { label: '500 g', price: '359' },
      { label: '1 kg', price: '679' },
    ],
  },
  {
    name: 'Organic Kattuyanam Rice',
    slug: 'organic-kattuyanam-rice',
    merchandising_tier: 'hero',
    price: 149,
    quick_variants: [
      { label: '__yasvik_pricing__', notes: JSON.stringify({ purchase_rate_per_kg: '102', pack_packaging_rs: { '1kg': '3' } }) },
      { label: '1 kg', price: '149' },
    ],
  },
];

const lines = [
  '# Hero margin calibration',
  '',
  'Assumptions: Razorpay 2% · min contribution ₹25 · target 20% · Bonus stress 5% · Porter ₹100 (heavy ₹150) · free delivery ≥ ₹999.',
  'Delivery subsidy = max(0, Porter − customer fee), shared by line revenue / basket revenue.',
  'Avakaya pack_packaging_rs is empty in live data — packaging understated.',
  '',
  '| Product | Pack | Sell | Safe | Before delivery | After paid local | After free-delivery share | Max disc | Channel advice |',
  '|---|---|---:|---:|---:|---:|---:|---:|---|',
];

for (const product of heroes) {
  const rows = buildProductMarginRows(product, assumptions);
  for (const row of rows) {
    const o = row.online;
    if (!o) {
      lines.push(`| ${row.productName} | ${row.packLabel} | — | — | — | — | — | — | missing cost |`);
      continue;
    }
    lines.push([
      `| ${row.productName}`,
      row.packLabel,
      formatRupee(o.sellingPrice),
      formatRupee(o.minSafePrice),
      formatRupee(o.contributionBeforeDelivery),
      formatRupee(o.localBelow?.contributionAfterDelivery),
      formatRupee(o.localFree?.contributionAfterDelivery),
      formatRupee(o.maxSafeDiscountRs),
      formatChannelAdvice(o.channelAdvice),
      row.packagingSource === 'missing' ? '**(pack cost missing)** |' : '|',
    ].join(' | ').replace(' | |', ' |'));
  }
}

lines.push('');
lines.push('## Evidence from orders (90d)');
lines.push('- POS cash ~50 orders: ₹0 delivery subsidy (correct).');
lines.push('- Web Razorpay ~9 orders: customer fees ₹0–85; actual Porter often unrecorded → calibrate Typical Porter with Delivery board going forward.');
lines.push('- Do not assign full Porter cost to every SKU.');
lines.push('');

console.log(lines.join('\n'));
