/** Yureka commercial invoice #4717 — product catalog + pricing rules. */
export const INVOICE_REF = 'Yureka-4717';
export const SMALL_PACK_MARGIN = 10;
export const SELL_MARKUP = 2;

export const SDR_LABELS = {
  S: 'S — Sprouted',
  D: 'D — Dried',
  R: 'R — Roasted',
};

export const STANDARD_PACKS = [
  { label: '1kg', pack_kg: 1 },
  { label: '500g', pack_kg: 0.5 },
  { label: '250g', pack_kg: 0.25 },
  { label: '100g', pack_kg: 0.1 },
  { label: '50g', pack_kg: 0.05 },
];

export const GRAIN_PACKS = [{ label: '2kg', pack_kg: 2 }, ...STANDARD_PACKS];

/** Invoice ₹/kg from PDF. Duplicate supplier lines 16–18 omitted. */
export const YUREKA_INVOICE_4717 = [
  { line: 1, name: 'Organic Foxtail', local_name: 'సేంద్రీయ కొర్ర', slug: 'yureka-foxtail', invoice_per_kg: 64, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 2, name: 'Organic Kodo', local_name: 'సేంద్రీయ ఆరిక', slug: 'yureka-kodo', invoice_per_kg: 68, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 3, name: 'Organic Sorghum', local_name: 'సేంద్రీయ చిన్న జొన్న', slug: 'yureka-white-sorghum', invoice_per_kg: 42, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 4, name: 'Organic Ragi', local_name: 'సేంద్రీయ రాగి', slug: 'yureka-ragi', invoice_per_kg: 50, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 5, name: 'Organic Barnyard S', local_name: 'సేంద్రీయ ఉడ్ల (S)', slug: 'yureka-barnyard-sdr', invoice_per_kg: 112.5, sdr: 'S', category: 'rice-and-millets', grain: true },
  { line: 6, name: 'Organic Little S', local_name: 'సేంద్రీయ సామ (S)', slug: 'yureka-little-sdr', invoice_per_kg: 109.5, sdr: 'S', category: 'rice-and-millets', grain: true },
  { line: 7, name: 'Organic Foxtail Flour S', local_name: 'సేంద్రీయ కొర్ర పిండి (S)', slug: 'yureka-foxtail-flour-sdr', invoice_per_kg: 87.5, sdr: 'S', category: 'rice-and-millets' },
  { line: 8, name: 'Organic Ragi Flour S', local_name: 'సేంద్రీయ రాగి పిండి (S)', slug: 'yureka-ragi-flour-sdr', invoice_per_kg: 73.5, sdr: 'S', category: 'rice-and-millets' },
  { line: 9, name: 'Organic MM Flour S', local_name: 'సేంద్రీయ మిల్లెట్ పిండి (S)', slug: 'yureka-mm-flour-sdr', invoice_per_kg: 104.5, sdr: 'S', category: 'rice-and-millets' },
  { line: 10, name: 'Organic Pearl Flour', local_name: 'సేంద్రీయ సజ్జా పిండి', slug: 'yureka-pearl-flour-dr', invoice_per_kg: 59.5, sdr: 'D', category: 'rice-and-millets' },
  { line: 11, name: 'Organic Sorghum Flour', local_name: 'సేంద్రీయ జొన్న పిండి', slug: 'yureka-wsorghum-flour-dr', invoice_per_kg: 59.5, sdr: 'D', category: 'rice-and-millets' },
  { line: 12, name: 'Organic MM Healthmix', local_name: 'సేంద్రీయ మిల్లెట్ హెల్త్ మిక్స్', slug: 'yureka-mm-healthmix', invoice_per_kg: 176.5, sdr: 'D', category: 'breakfast-essentials' },
  { line: 13, name: 'Organic Ragi Malt S', local_name: 'సేంద్రీయ మొలక రాగి మాల్ట్ (S)', slug: 'yureka-ragi-malt', invoice_per_kg: 176.5, sdr: 'S', category: 'breakfast-essentials' },
  { line: 14, name: 'Organic Jaggery Powder', local_name: 'సేంద్రీయ బెల్లం పొడి', slug: 'yureka-jaggery-powder', invoice_per_kg: 55, sdr: 'D', category: 'staples-and-sweeteners' },
  { line: 15, name: 'Organic Jaggery Balls', local_name: 'సేంద్రీయ బెల్లం ఉండలు', slug: 'yureka-jaggery-balls', invoice_per_kg: 55, sdr: 'D', category: 'staples-and-sweeteners' },
  { line: 19, name: 'Organic Red Rice', local_name: 'సేంద్రీయ ఎర్ర బియ్యం', slug: 'yureka-red-rice', invoice_per_kg: 59, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 20, name: 'Organic Matta Rice', local_name: 'సేంద్రీయ మట్ట బియ్యం', slug: 'yureka-matta-rice', invoice_per_kg: 56, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 21, name: 'Organic Idly Rice', local_name: 'సేంద్రీయ ఇడ్లి బియ్యం', slug: 'yureka-idly-rice', invoice_per_kg: 46, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 22, name: 'Organic Kaikuttal', local_name: 'సేంద్రీయ కైకుత్తల్', slug: 'yureka-kaikuttal-rice', invoice_per_kg: 57, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 23, name: 'Organic Kattuyanam', local_name: 'Kattuyanam Biyyam', slug: 'yureka-kattuyanam-rice', invoice_per_kg: 91.5, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 24, name: 'Organic Karungurvai', local_name: 'Karunguruvai Biyyam', slug: 'yureka-karungurvai-rice', invoice_per_kg: 91.5, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 25, name: 'Organic Black Rice', local_name: 'సేంద్రీయ నల్ల బియ్యం', slug: 'yureka-black-rice', invoice_per_kg: 107.5, sdr: 'D', category: 'rice-and-millets', grain: true },
  { line: 26, name: 'Organic Fox Noodles', local_name: 'సేంద్రీయ కొర్ర నూడుల్స్', slug: 'yureka-foxtail-noodles', invoice_per_kg: 41, sdr: 'D', category: 'breakfast-essentials' },
  { line: 27, name: 'Organic Ragi Noodles', local_name: 'సేంద్రీయ రాగి నూడుల్స్', slug: 'yureka-ragi-noodles', invoice_per_kg: 41, sdr: 'D', category: 'breakfast-essentials' },
  { line: 28, name: 'Organic MM Noodles', local_name: 'సేంద్రీయ మిల్లెట్ నూడుల్స్', slug: 'yureka-mm-noodles', invoice_per_kg: 41, sdr: 'D', category: 'breakfast-essentials' },
  { line: 29, name: 'Organic Ragi Pasta', local_name: 'సేంద్రీయ రాగి పాస్తా', slug: 'yureka-ragi-pasta', invoice_per_kg: 42, sdr: 'D', category: 'breakfast-essentials' },
  { line: 30, name: 'Organic MM Pasta', local_name: 'సేంద్రీయ మిల్లెట్ పాస్తా', slug: 'yureka-mm-pasta', invoice_per_kg: 42, sdr: 'D', category: 'breakfast-essentials' },
  { line: 31, name: 'Organic Ragi Rava', local_name: 'సేంద్రీయ రాగి రవ్వ', slug: 'yureka-ragi-rava', invoice_per_kg: 76.5, sdr: 'D', category: 'breakfast-essentials' },
  { line: 32, name: 'Organic MM Dosa Mix', local_name: 'సేంద్రీయ మిల్లెట్ దోస మిక్స్', slug: 'yureka-mm-dosa-mix', invoice_per_kg: 107.5, sdr: 'D', category: 'breakfast-essentials' },
  { line: 33, name: 'Organic MM Chapati S', local_name: 'సేంద్రీయ చపాతి మిక్స్ (S)', slug: 'yureka-mm-chapati-sdr', invoice_per_kg: 106.5, sdr: 'S', category: 'breakfast-essentials' },
];

export const CATEGORY_IDS = {
  'rice-and-millets': '0e011b5a-206f-4fb7-aefc-68682083d19f',
  'breakfast-essentials': '2eabae04-1f46-4b24-8c80-7474f90af91a',
  'staples-and-sweeteners': '151812ab-ce3e-4915-83c8-910f63b2288f',
};

export const PRICING_META_LABEL = '__yasvik_pricing__';

export function roundRetail(value) {
  return Math.round(value);
}

export function variantSellingPrice(sellPerKg, packKg, margin = SMALL_PACK_MARGIN) {
  let price = sellPerKg * packKg;
  if (packKg < 1) price += margin;
  return roundRetail(price);
}

export function buildQuickVariants(product, sellPerKg, skuBase) {
  const packs = product.grain ? GRAIN_PACKS : STANDARD_PACKS;
  const pricingMeta = {
    label: PRICING_META_LABEL,
    sku: PRICING_META_LABEL,
    notes: JSON.stringify({
      selling_price_per_kg: String(sellPerKg),
      price_inflate_percent: '',
      small_pack_margin_rs: String(SMALL_PACK_MARGIN),
      invoice_per_kg: String(product.invoice_per_kg),
      invoice_ref: INVOICE_REF,
    }),
  };

  const variants = packs.map(({ label, pack_kg }) => ({
    label,
    sku: `${skuBase}-${label.toUpperCase()}`,
    price: variantSellingPrice(sellPerKg, pack_kg),
    pack_kg,
    weight_grams: Math.round(pack_kg * 1000),
    image_url: '',
    image_urls: [],
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    stock_source_kg: 10,
    visible_stock_units: pack_kg >= 1 ? 20 : 40,
  }));

  return [pricingMeta, ...variants];
}

export function buildProductPayload(product, productCode) {
  const sellPerKg = roundRetail(product.invoice_per_kg * SELL_MARKUP);
  const sdrText = SDR_LABELS[product.sdr] || SDR_LABELS.D;
  const skuBase = productCode;
  const processingMethod = `Certified organic · ${sdrText}`;

  return {
    ...product,
    product_code: productCode,
    sku_base: skuBase,
    sell_per_kg: sellPerKg,
    category_id: CATEGORY_IDS[product.category],
    processing_method: processingMethod,
    yasvik_mark: processingMethod,
    purity_badges: ['Certified Organic', sdrText],
    short_description: `${product.name} — Yureka invoice 4717. Invoice ₹${product.invoice_per_kg}/kg · Sell ₹${sellPerKg}/kg.`,
    price: sellPerKg,
    quick_variants: buildQuickVariants(product, sellPerKg, skuBase),
    inventory_group: INVOICE_REF,
    shared_stock_kg: 10,
    stock_quantity: 100,
  };
}
