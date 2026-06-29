/**
 * Revert mistaken update from enroll_organic_sdr_products.mjs (June 2026).
 * Restores 19 admin duplicates + catalog Organic Red Rice to pre-change state.
 * Does NOT touch yureka-* invoice products.
 *
 * Run: SUPABASE_DB_PASSWORD=… node scripts/revert_wrong_organic_enroll.mjs
 */
import { Client } from 'pg';

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dryRun = process.argv.includes('--dry-run');

if (!dryRun && !dbPassword) {
  console.error('Missing SUPABASE_DB_PASSWORD (or pass --dry-run)');
  process.exit(1);
}

const client = new Client({
  host: 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: dbPassword,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const PICKLE_CATEGORY = 'd1197d4e-1199-455a-a7e6-8da6437f7873';
const ORGANIC_ESSENTIALS = 'cb997e94-1fb0-4e43-8876-64855f521b3e';

const JEERA_VARIANTS = [
  {
    sku: '__yasvik_pricing__',
    label: '__yasvik_pricing__',
    notes: '{"selling_price_per_kg":"280","price_inflate_percent":"","small_pack_margin_rs":"5"}',
  },
  {
    sku: 'YAS-JEERA-7F8DG-250g',
    label: '250g',
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    price: 75,
    pack_kg: 0.25,
    weight_grams: 250,
    stock_source_kg: 10,
    visible_stock_units: 40,
  },
  {
    sku: 'YAS-JEERA-7F8DG-500g',
    label: '500g',
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    price: 145,
    pack_kg: 0.5,
    weight_grams: 500,
    stock_source_kg: 10,
    visible_stock_units: 20,
  },
  {
    sku: 'YAS-JEERA-7F8DG-1kg',
    label: '1kg',
    price: 280,
    pack_kg: 1,
    weight_grams: 1000,
  },
  {
    sku: 'YAS-JEERA-7F8DG-100g',
    label: '100g',
    price: 33,
    pack_kg: 0.1,
    weight_grams: 100,
  },
  {
    sku: 'YAS-JEERA-7F8DG-150g',
    label: '150g',
    price: 47,
    pack_kg: 0.15,
    weight_grams: 150,
  },
  {
    sku: 'YAS-JEERA-7F8DG-50g',
    label: '50g',
    price: 19,
    pack_kg: 0.05,
    weight_grams: 50,
  },
];

const DHANIYA_VARIANTS = [
  {
    sku: '__yasvik_pricing__',
    label: '__yasvik_pricing__',
    notes: '{"selling_price_per_kg":"189","price_inflate_percent":"","small_pack_margin_rs":"5"}',
  },
  {
    sku: 'YAS-DHANIYA-78VMV-250g',
    label: '250g',
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    price: 52,
    pack_kg: 0.25,
    weight_grams: 250,
    stock_source_kg: 10,
    visible_stock_units: 40,
  },
  {
    sku: 'YAS-DHANIYA-78VMV-500g',
    label: '500g',
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    price: 100,
    pack_kg: 0.5,
    weight_grams: 500,
    stock_source_kg: 10,
    visible_stock_units: 20,
  },
  {
    sku: 'YAS-DHANIYA-78VMV-1kg',
    label: '1kg',
    price: 189,
    pack_kg: 1,
    weight_grams: 1000,
  },
  {
    sku: 'YAS-DHANIYA-78VMV-100g',
    label: '100g',
    price: 24,
    pack_kg: 0.1,
    weight_grams: 100,
  },
];

function pricingMeta(price) {
  return [{
    sku: '__yasvik_pricing__',
    label: '__yasvik_pricing__',
    notes: JSON.stringify({
      selling_price_per_kg: String(price),
      price_inflate_percent: '',
      small_pack_margin_rs: '5',
    }),
  }];
}

const RED_RICE_VARIANTS = [
  {
    label: '250g',
    sku: 'YAS-045-250G',
    price: 29,
    compare_price: 33,
    pack_kg: 0.25,
    weight_grams: 250,
    visible_stock_units: 100,
    stock_source_kg: 25,
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    image_url: '',
    image_urls: [],
  },
  {
    label: '500g',
    sku: 'YAS-045-500G',
    price: 53,
    compare_price: 60,
    pack_kg: 0.5,
    weight_grams: 500,
    visible_stock_units: 50,
    stock_source_kg: 25,
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    image_url: '',
    image_urls: [],
  },
  {
    label: '1kg',
    sku: 'YAS-045-1KG',
    price: 95,
    compare_price: 110,
    pack_kg: 1,
    weight_grams: 1000,
    visible_stock_units: 25,
    stock_source_kg: 25,
    notes: 'Shared bulk stock. Website stock deducts from product-level bulk kg.',
    image_url: '',
    image_urls: [],
  },
];

const RED_RICE_PURITY = [
  { label: 'Yasvik quality assured', tone: 'trust' },
  { label: 'Fair prices guaranteed', tone: 'trust' },
  { label: 'Carefully selected stock', tone: 'trust' },
  { label: 'Clean packing', tone: 'trust' },
];

/** Pre–wrong-enroll snapshot (2026-06-21 duplicates + catalog red rice). */
const REVERTS = [
  {
    id: '1dc44b2d-13e7-4004-af6d-5632751b6727',
    name: 'Anakapalle Jaggery',
    slug: 'jaggery-6y9k2',
    sku: 'YAS-JAGGERY-6Y9K2',
    local_name: 'అనకాపల్లి బెల్లం',
    price: 78,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(78),
  },
  {
    id: '907fb0ca-7895-46ad-ad2f-bfb993cb02de',
    name: 'Cinnamon',
    slug: 'dalchi-8kuqw',
    sku: 'YAS-DALCHI-8KUQW',
    local_name: 'దాల్చిన చెక్క',
    price: 599,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(599),
  },
  {
    id: '9313da57-59e6-46ac-87a5-1893cd6ee901',
    name: 'Dhaniya',
    slug: 'dhaniya-78vmv',
    sku: 'YAS-DHANIYA-78VMV',
    local_name: 'ధనియాలు',
    price: 189,
    category_id: PICKLE_CATEGORY,
    quick_variants: DHANIYA_VARIANTS,
  },
  {
    id: '74bbc839-571b-4d11-a6ad-a3fc3575f7d9',
    name: 'Fenugreek',
    slug: 'fenugreek-7tbq6',
    sku: 'YAS-FENUGREE-7TBQ6',
    local_name: 'మెంతులు',
    price: 119,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(119),
  },
  {
    id: '23758ba0-ef39-45a4-8153-5862013d5b37',
    name: 'Flax Seeds',
    slug: 'flax-seeds-aul9i',
    sku: 'YAS-FLAXSEED-AUL9I',
    local_name: 'అవిసె గింజలు',
    price: 249,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(249),
  },
  {
    id: 'f274c342-7317-4f75-b5f7-0bb4aefcda4d',
    name: 'Jeera',
    slug: 'jeera-7f8dg',
    sku: 'YAS-JEERA-7F8DG',
    local_name: 'జీలకర్ర',
    price: 280,
    category_id: PICKLE_CATEGORY,
    quick_variants: JEERA_VARIANTS,
  },
  {
    id: 'd875da72-ee5a-4f57-bf83-b11ebb591e09',
    name: 'Kerala Clove',
    slug: 'clove-bc2ly',
    sku: 'YAS-CLOVE-BC2LY',
    local_name: 'కేరళ లవంగాలు',
    price: 1199,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(1199),
  },
  {
    id: '74586e50-5e5d-45fd-8b6b-c8703361c608',
    name: 'Kerala Elachi',
    slug: 'elachi-b693w',
    sku: 'YAS-ELACHI-B693W',
    local_name: 'కేరళ యాలకులు',
    price: 3800,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(3800),
  },
  {
    id: 'd8aa7bc8-81d1-4f90-b579-a08fbf95c7a7',
    name: 'Kolli Hills black pepper',
    slug: 'kolli-hills-black-pepper-all8x',
    sku: 'YAS-KOLLIHIL-ALL8X',
    local_name: 'మిరియాలు',
    price: 1199,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(1199),
  },
  {
    id: '50de3edf-2338-4d8b-aaad-99bc1eadbc33',
    name: 'Mustard',
    slug: 'mustard-7z5ar',
    sku: 'YAS-MUSTARD-7Z5AR',
    local_name: 'ఆవాలు',
    price: 119,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(119),
  },
  {
    id: '12ad6e99-93de-442e-adaa-e4c1a7cd53ea',
    name: 'Native Sesame Seeds',
    slug: 'seseme-8ue0n',
    sku: 'YAS-SESEME-8UE0N',
    local_name: 'దేశీ నువ్వులు',
    price: 499,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(499),
  },
  {
    id: '2b2fd0e3-7c9d-4339-83a5-3027c27ab9ec',
    name: 'Natural Turmeric Powder',
    slug: 'natural-turmeric-powder-9ohi4',
    sku: 'YAS-NATURALT-9OHI4',
    local_name: 'కొమ్ము పసుపు',
    price: 399,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(399),
  },
  {
    id: '59273e65-9f04-4f55-ba9b-2a9b19352c75',
    name: 'Pacha Karpuram',
    slug: 'pacha-karpuram-bk1fw',
    sku: 'YAS-PACHAKAR-BK1FW',
    local_name: 'పచ్చ కర్పూరం',
    price: 1399,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(1399),
  },
  {
    id: '2b4b6a92-a764-4eef-8554-f5a3302b87f5',
    name: 'Sabudana',
    slug: 'sabudana-7mna1',
    sku: 'YAS-SABUDANA-7MNA1',
    local_name: 'సగ్గుబియ్యం',
    price: 98,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(98),
  },
  {
    id: '96c939f3-b9af-4fba-bdb9-8f199eea7f9f',
    name: 'Tamarind',
    slug: 'homemade-lemon-pickle-copy-6eqof',
    sku: 'YAS-036-COPY',
    local_name: 'చింతపండు',
    price: 149,
    category_id: PICKLE_CATEGORY,
    is_published: false,
    quick_variants: pricingMeta(149),
  },
  {
    id: '8192daf7-f6a8-4fbe-bb85-056230a62249',
    name: 'Thadka Mix',
    slug: 'thadka-mix-8hayo',
    sku: 'YAS-THADKAMI-8HAYO',
    local_name: 'తాలింపు గింజలు',
    price: 249,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(249),
  },
  {
    id: 'f144330c-1712-4643-a398-20b270d3fd37',
    name: 'Unpolished moong dal',
    slug: 'unpolished-moong-dal-aerf5',
    sku: 'YAS-UNPOLISH-AERF5',
    local_name: 'పెసర పప్పు',
    price: 249,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(249),
  },
  {
    id: '559faf58-89ef-4620-b95b-94a009818089',
    name: 'Unpolished toor dal',
    slug: 'roasted-unpolished-toor-dal-a43cs',
    sku: 'YAS-ROASTEDU-A43CS',
    local_name: 'వేయించిన కందిపప్పు',
    price: 249,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(249),
  },
  {
    id: '2a4c9a7d-3410-47fb-a9f6-6b5af97c567c',
    name: 'Vermicelli',
    slug: 'vermicelli-8zu02',
    sku: 'YAS-VERMICEL-8ZU02',
    local_name: 'సేమియా',
    price: 75,
    category_id: PICKLE_CATEGORY,
    quick_variants: pricingMeta(75),
  },
  {
    slug: 'organic-red-rice',
    name: 'Organic Red Rice',
    sku: 'YAS-045',
    product_code: 'YAS-045',
    local_name: 'Organic Erra Biyyam',
    price: 95,
    discount_price: 110,
    category_id: ORGANIC_ESSENTIALS,
    processing_method: 'Organic whole grain',
    yasvik_mark: 'Quality assured by Yasvik • Fair prices guaranteed • Carefully selected stock • Packed for everyday use',
    short_description: 'Quality-assured Organic Erra Biyyam / Organic Red Rice for daily rice meals and healthier family plates.',
    inventory_group: 'YAS-045',
    shared_stock_kg: 25,
    stock_quantity: 25,
    is_published: true,
    purity_badges: RED_RICE_PURITY,
    quick_variants: RED_RICE_VARIANTS,
  },
];

async function revertProduct(row) {
  const where = row.id ? 'id = $1::uuid' : 'slug = $1';
  const key = row.id || row.slug;

  const params = [
    key,
    row.name,
    row.slug,
    row.sku,
    row.local_name,
    row.price,
    row.category_id,
    row.processing_method ?? 'Homemade pickle',
    row.yasvik_mark ?? null,
    row.short_description ?? null,
    JSON.stringify(row.quick_variants),
    row.product_code ?? null,
    row.inventory_group ?? null,
    row.shared_stock_kg ?? 10,
    row.stock_quantity ?? 100,
    row.is_published ?? true,
    row.discount_price ?? null,
    JSON.stringify(row.purity_badges ?? []),
  ];

  const result = await client.query(
    `
      update public.products set
        name = $2,
        slug = $3,
        sku = $4,
        local_name = $5,
        price = $6,
        category_id = $7,
        processing_method = $8,
        yasvik_mark = $9,
        short_description = $10,
        quick_variants = $11::jsonb,
        product_code = $12,
        inventory_group = $13,
        shared_stock_kg = $14,
        stock_quantity = $15,
        is_published = $16,
        discount_price = $17,
        purity_badges = $18::jsonb,
        updated_at = now()
      where ${where}
      returning id, name, slug, price
    `,
    params,
  );

  return result.rows[0];
}

async function main() {
  if (dryRun) {
    console.log(JSON.stringify(REVERTS.map((r) => ({ name: r.name, slug: r.slug, price: r.price })), null, 2));
    return;
  }

  await client.connect();
  await client.query('begin');

  try {
    // Fix tamarind slug first if needed (may conflict when restoring)
    await client.query(
      `update public.products set slug = 'tamarind-6eqof-revert-tmp' where slug = 'tamarind-6eqof' and id != '96c939f3-b9af-4fba-bdb9-8f199eea7f9f'`,
    );
    await client.query(
      `update public.products set slug = 'unpolished-toor-dal-a43cs-tmp' where slug = 'unpolished-toor-dal-a43cs' and id != '559faf58-89ef-4620-b95b-94a009818089'`,
    );

    const restored = [];
    for (const row of REVERTS) {
      restored.push(await revertProduct(row));
    }

    await client.query('commit');
    console.log(`Reverted ${restored.length} products:`);
    for (const r of restored) {
      console.log(`  ${r.name} (${r.slug}) · ₹${r.price}`);
    }
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
