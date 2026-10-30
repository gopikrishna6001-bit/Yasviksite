import {
  computeVariantMargin,
  buildProductMarginRows,
  normalizeOpsMarginAssumptions,
  allocateDeliverySubsidy,
  formatChannelAdvice,
} from '../src/lib/ops/marginControl.js';

const a = normalizeOpsMarginAssumptions({
  payment_fee_pct: 2,
  min_contribution_rs: 25,
  target_margin_pct: 20,
  bonus_redeem_pct: 5,
  typical_porter_cost_rs: 100,
  heavy_porter_cost_rs: 150,
  free_delivery_threshold_rs: 999,
  label_cost_rs: 2,
});

// Subsidy share checks
const alone = allocateDeliverySubsidy({
  lineRevenueRs: 389,
  basketRevenueRs: 389,
  customerFeeRs: 30,
  actualDeliveryCostRs: 100,
  lineCount: 1,
});
const quarter = allocateDeliverySubsidy({
  lineRevenueRs: 389,
  basketRevenueRs: 389 * 4,
  customerFeeRs: 0,
  actualDeliveryCostRs: 100,
  lineCount: 4,
});
console.log('subsidy alone', alone);
console.log('subsidy 1/4 basket', quarter);

const oil = computeVariantMargin({
  purchasePerKg: 300,
  packKg: 1,
  packagingRs: 18,
  sellingPrice: 389,
  assumptions: a,
  wastagePct: 1,
  product: { name: 'Cold Pressed Groundnut Oil', slug: 'cold-pressed-groundnut-oil' },
});
console.log('groundnut 1L', {
  sell: oil.sellingPrice,
  safe: oil.minSafePrice,
  beforeDelivery: oil.contributionBeforeDelivery,
  afterFee: oil.contributionAfterOnlineFee,
  localBelow: oil.localBelow?.contributionAfterDelivery,
  localFree: oil.localFree?.contributionAfterDelivery,
  multi: oil.multi?.contributionAfterDelivery,
  advice: formatChannelAdvice(oil.channelAdvice),
  lineSubsidyFree: oil.localFree?.lineDeliverySubsidy,
});

const rows = buildProductMarginRows({
  id: '1',
  name: 'Cold Pressed Groundnut Oil',
  slug: 'cold-pressed-groundnut-oil',
  merchandising_tier: 'hero',
  price: 389,
  quick_variants: [
    {
      label: '__yasvik_pricing__',
      notes: JSON.stringify({
        purchase_rate_per_kg: 300,
        pack_packaging_rs: { '500ml': 14, '1L': 18 },
      }),
    },
    { label: '500ml', price: 209 },
    { label: '1L', price: 389 },
  ],
}, a);
console.log(rows.map((r) => ({
  pack: r.packLabel,
  packCost: r.packagingRs,
  sell: r.online?.sellingPrice,
  safe: r.online?.minSafePrice,
  before: r.online?.contributionBeforeDelivery,
  afterFree: r.online?.localFree?.contributionAfterDelivery,
  advice: r.online?.channelAdvice,
})));
