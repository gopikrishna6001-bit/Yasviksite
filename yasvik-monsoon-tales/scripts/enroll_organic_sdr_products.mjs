/**
 * Normalize Yasvik certified-organic SDR products:
 * - Short unique label names (Org …)
 * - Invoice ₹/kg × 1.5 = selling ₹/kg
 * - ₹5 small-pack margin on packs < 1 kg
 * - Standard packs: 1kg, 500g, 250g, 100g, 50g (rice starts at 2kg)
 *
 * Run: SUPABASE_DB_PASSWORD=… node scripts/enroll_organic_sdr_products.mjs
 * Dry run: node scripts/enroll_organic_sdr_products.mjs --dry-run
 */
import { Client } from 'pg';

const dbPassword = process.env.SUPABASE_DB_PASSWORD;
const dryRun = process.argv.includes('--dry-run');
const emitSql = process.argv.includes('--emit-sql');

if (!dryRun && !emitSql && !dbPassword) {
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

const PRICING_META_LABEL = '__yasvik_pricing__';
const SMALL_PACK_MARGIN = 5;

const CATEGORY_IDS = {
  'spices-and-masalas': '08f65d7c-061a-4ee4-9f4e-020e8843642d',
  'seeds-and-superfoods': 'a4c68b4c-51e1-4dde-accd-a53cd79e95d1',
  'dals-and-lentils': 'e1490ef5-4b88-4d7c-a690-540f8cc33f5b',
  'breakfast-essentials': '2eabae04-1f46-4b24-8c80-7474f90af91a',
  'staples-and-sweeteners': '151812ab-ce3e-4915-83c8-910f63b2288f',
  'rice-and-millets': '0e011b5a-206f-4fb7-aefc-68682083d19f',
};

const SDR_LABELS = {
  S: 'S — Sprouted',
  D: 'D — Dried',
  R: 'R — Roasted',
};

const STANDARD_PACKS = [
  { label: '1kg', pack_kg: 1 },
  { label: '500g', pack_kg: 0.5 },
  { label: '250g', pack_kg: 0.25 },
  { label: '100g', pack_kg: 0.1 },
  { label: '50g', pack_kg: 0.05 },
];

const RICE_PACKS = [
  { label: '2kg', pack_kg: 2 },
  ...STANDARD_PACKS,
];

/** Invoice ₹/kg from supplier; selling = round(invoice × 1.5) */
const ORGANIC_PRODUCTS = [
  {
    id: '1dc44b2d-13e7-4004-af6d-5632751b6727',
    slug: 'jaggery-6y9k2',
    name: 'Org Jaggery',
    local_name: 'అనకాపల్లి బెల్లం',
    sku_base: 'YAS-JAGGERY-6Y9K2',
    product_code: 'YAS-047',
    category: 'staples-and-sweeteners',
    sdr: 'D',
    invoice_per_kg: 78,
  },
  {
    id: '907fb0ca-7895-46ad-ad2f-bfb993cb02de',
    slug: 'dalchi-8kuqw',
    name: 'Org Cinnamon',
    local_name: 'దాల్చిన చెక్క',
    sku_base: 'YAS-DALCHI-8KUQW',
    product_code: 'YAS-048',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 599,
  },
  {
    id: '9313da57-59e6-46ac-87a5-1893cd6ee901',
    slug: 'dhaniya-78vmv',
    name: 'Org Dhaniya',
    local_name: 'ధనియాలు',
    sku_base: 'YAS-DHANIYA-78VMV',
    product_code: 'YAS-049',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 189,
  },
  {
    id: '74bbc839-571b-4d11-a6ad-a3fc3575f7d9',
    slug: 'fenugreek-7tbq6',
    name: 'Org Methi',
    local_name: 'మెంతులు',
    sku_base: 'YAS-FENUGREE-7TBQ6',
    product_code: 'YAS-050',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 119,
  },
  {
    id: '23758ba0-ef39-45a4-8153-5862013d5b37',
    slug: 'flax-seeds-aul9i',
    name: 'Org Flax',
    local_name: 'అవిసె గింజలు',
    sku_base: 'YAS-FLAXSEED-AUL9I',
    product_code: 'YAS-051',
    category: 'seeds-and-superfoods',
    sdr: 'D',
    invoice_per_kg: 249,
  },
  {
    id: 'f274c342-7317-4f75-b5f7-0bb4aefcda4d',
    slug: 'jeera-7f8dg',
    name: 'Org Jeera',
    local_name: 'జీలకర్ర',
    sku_base: 'YAS-JEERA-7F8DG',
    product_code: 'YAS-052',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 280,
  },
  {
    id: 'd875da72-ee5a-4f57-bf83-b11ebb591e09',
    slug: 'clove-bc2ly',
    name: 'Org Clove',
    local_name: 'కేరళ లవంగాలు',
    sku_base: 'YAS-CLOVE-BC2LY',
    product_code: 'YAS-053',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 1199,
  },
  {
    id: '74586e50-5e5d-45fd-8b6b-c8703361c608',
    slug: 'elachi-b693w',
    name: 'Org Elachi',
    local_name: 'కేరళ యాలకులు',
    sku_base: 'YAS-ELACHI-B693W',
    product_code: 'YAS-054',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 3800,
  },
  {
    id: 'd8aa7bc8-81d1-4f90-b579-a08fbf95c7a7',
    slug: 'kolli-hills-black-pepper-all8x',
    name: 'Org Pepper',
    local_name: 'కోల్లి హిల్స్ మిరప',
    sku_base: 'YAS-KOLLIHIL-ALL8X',
    product_code: 'YAS-055',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 1199,
  },
  {
    id: '50de3edf-2338-4d8b-aaad-99bc1eadbc33',
    slug: 'mustard-7z5ar',
    name: 'Org Mustard',
    local_name: 'ఆవాలు',
    sku_base: 'YAS-MUSTARD-7Z5AR',
    product_code: 'YAS-056',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 119,
  },
  {
    id: '12ad6e99-93de-442e-adaa-e4c1a7cd53ea',
    slug: 'seseme-8ue0n',
    name: 'Org Sesame',
    local_name: 'దేశీ నువ్వులు',
    sku_base: 'YAS-SESEME-8UE0N',
    product_code: 'YAS-057',
    category: 'seeds-and-superfoods',
    sdr: 'D',
    invoice_per_kg: 499,
  },
  {
    id: '2b2fd0e3-7c9d-4339-83a5-3027c27ab9ec',
    slug: 'natural-turmeric-powder-9ohi4',
    name: 'Org Turmeric',
    local_name: 'కొమ్ము పసుపు',
    sku_base: 'YAS-NATURALT-9OHI4',
    product_code: 'YAS-058',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 399,
  },
  {
    id: '59273e65-9f04-4f55-ba9b-2a9b19352c75',
    slug: 'pacha-karpuram-bk1fw',
    name: 'Org Karpuram',
    local_name: 'పచ్చ కర్పూరం',
    sku_base: 'YAS-PACHAKAR-BK1FW',
    product_code: 'YAS-059',
    category: 'spices-and-masalas',
    sdr: 'D',
    invoice_per_kg: 1399,
  },
  {
    id: '2b4b6a92-a764-4eef-8554-f5a3302b87f5',
    slug: 'sabudana-7mna1',
    name: 'Org Sabudana',
    local_name: 'సగ్గుబియ్యం',
    sku_base: 'YAS-SABUDANA-7MNA1',
    product_code: 'YAS-060',
    category: 'breakfast-essentials',
    sdr: 'D',
    invoice_per_kg: 98,
  },
  {
    id: '96c939f3-b9af-4fba-bdb9-8f199eea7f9f',
    slug: 'tamarind-6eqof',
    slug_was: 'homemade-lemon-pickle-copy-6eqof',
    name: 'Org Tamarind',
    local_name: 'చింతపండు',
    sku_base: 'YAS-TAMARIND-6EQOF',
    product_code: 'YAS-061',
    category: 'staples-and-sweeteners',
    sdr: 'D',
    invoice_per_kg: 149,
  },
  {
    id: '8192daf7-f6a8-4fbe-bb85-056230a62249',
    slug: 'thadka-mix-8hayo',
    name: 'Org Tadka Mix',
    local_name: 'తాలింపు గింజలు',
    sku_base: 'YAS-THADKAMI-8HAYO',
    product_code: 'YAS-062',
    category: 'spices-and-masalas',
    sdr: 'R',
    invoice_per_kg: 249,
  },
  {
    id: 'f144330c-1712-4643-a398-20b270d3fd37',
    slug: 'unpolished-moong-dal-aerf5',
    name: 'Org Moong Dal',
    local_name: 'పెసర పప్పు',
    sku_base: 'YAS-UNPOLISH-AERF5',
    product_code: 'YAS-063',
    category: 'dals-and-lentils',
    sdr: 'D',
    invoice_per_kg: 249,
  },
  {
    id: '559faf58-89ef-4620-b95b-94a009818089',
    slug: 'unpolished-toor-dal-a43cs',
    slug_was: 'roasted-unpolished-toor-dal-a43cs',
    name: 'Org Toor Dal R',
    local_name: 'వేయించిన కందిపప్పు',
    sku_base: 'YAS-ROASTEDU-A43CS',
    product_code: 'YAS-064',
    category: 'dals-and-lentils',
    sdr: 'R',
    invoice_per_kg: 249,
  },
  {
    id: '2a4c9a7d-3410-47fb-a9f6-6b5af97c567c',
    slug: 'vermicelli-8zu02',
    name: 'Org Semiya',
    local_name: 'సేమియా',
    sku_base: 'YAS-VERMICEL-8ZU02',
    product_code: 'YAS-065',
    category: 'breakfast-essentials',
    sdr: 'D',
    invoice_per_kg: 75,
  },
];

const RICE_UPDATE = {
  id: null, // resolved by slug
  slug: 'organic-red-rice',
  name: 'Org Red Rice',
  local_name: 'సేంద్రీయ ఎర్ర వరి',
  sku_base: 'YAS-045',
  product_code: 'YAS-045',
  category: 'rice-and-millets',
  sdr: 'D',
  invoice_per_kg: 95,
  rice: true,
};

function roundRetail(value) {
  return Math.round(value);
}

function variantSellingPrice(sellPerKg, packKg, margin = SMALL_PACK_MARGIN) {
  let price = sellPerKg * packKg;
  if (packKg < 1) price += margin;
  return roundRetail(price);
}

function buildQuickVariants(product, sellPerKg) {
  const packs = product.rice ? RICE_PACKS : STANDARD_PACKS;
  const skuBase = product.sku_base;

  const pricingMeta = {
    label: PRICING_META_LABEL,
    sku: PRICING_META_LABEL,
    notes: JSON.stringify({
      selling_price_per_kg: String(sellPerKg),
      price_inflate_percent: '',
      small_pack_margin_rs: String(SMALL_PACK_MARGIN),
      invoice_per_kg: String(product.invoice_per_kg),
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
    visible_stock_units: pack_kg >= 1 ? 20 : pack_kg >= 0.5 ? 20 : 40,
  }));

  return [pricingMeta, ...variants];
}

function buildProductPayload(product) {
  const sellPerKg = roundRetail(product.invoice_per_kg * 1.5);
  const sdrText = SDR_LABELS[product.sdr] || SDR_LABELS.D;
  const processingMethod = `Certified organic · ${sdrText}`;
  const purityBadges = ['Certified Organic', sdrText];
  const shortDescription = `${product.name} — certified organic, ${sdrText.toLowerCase()}. Fair pack pricing from ₹/kg rate.`;

  return {
    ...product,
    sell_per_kg: sellPerKg,
    category_id: CATEGORY_IDS[product.category],
    processing_method: processingMethod,
    yasvik_mark: processingMethod,
    purity_badges: purityBadges,
    short_description: shortDescription,
    price: sellPerKg,
    quick_variants: buildQuickVariants(product, sellPerKg),
    is_published: true,
    inventory_group: product.product_code,
    shared_stock_kg: 10,
    stock_quantity: 100,
  };
}

async function upsertProduct(payload) {
  const {
    id,
    slug,
    slug_was,
    name,
    local_name,
    sku_base,
    product_code,
    category_id,
    processing_method,
    yasvik_mark,
    short_description,
    price,
    quick_variants,
    purity_badges,
    inventory_group,
    shared_stock_kg,
    stock_quantity,
    sell_per_kg,
    invoice_per_kg,
  } = payload;

  if (slug_was && slug_was !== slug) {
    await client.query(
      `update public.products set slug = $1, updated_at = now() where slug = $2`,
      [slug, slug_was],
    );
  }

  const result = await client.query(
    `
      update public.products set
        name = $2,
        local_name = $3,
        sku = $4,
        product_code = $5,
        category_id = $6,
        processing_method = $7,
        yasvik_mark = $8,
        short_description = $9,
        price = $10,
        quick_variants = $11::jsonb,
        purity_badges = $12::jsonb,
        inventory_group = $13,
        shared_stock_kg = $14,
        stock_quantity = $15,
        is_published = true,
        updated_at = now()
      where id = $1::uuid
      returning id, slug, name, price
    `,
    [
      id,
      name,
      local_name,
      sku_base,
      product_code,
      category_id,
      processing_method,
      yasvik_mark,
      short_description,
      price,
      JSON.stringify(quick_variants),
      JSON.stringify(purity_badges),
      inventory_group,
      shared_stock_kg,
      stock_quantity,
    ],
  );

  if (result.rowCount === 0) {
    throw new Error(`Product not found: ${id} (${slug})`);
  }

  return { ...result.rows[0], sell_per_kg, invoice_per_kg };
}

async function resolveRiceId() {
  const { rows } = await client.query(
    `select id from public.products where slug = $1 limit 1`,
    [RICE_UPDATE.slug],
  );
  if (!rows[0]) throw new Error('Organic red rice not found');
  RICE_UPDATE.id = rows[0].id;
}

function sqlEscape(value) {
  return String(value ?? '').replace(/'/g, "''");
}

async function main() {
  const allProducts = [...ORGANIC_PRODUCTS, RICE_UPDATE];
  const preview = allProducts.map(buildProductPayload);

  if (emitSql) {
    for (const p of preview) {
      if (p.slug_was && p.slug_was !== p.slug) {
        console.log(`UPDATE public.products SET slug = '${sqlEscape(p.slug)}', updated_at = now() WHERE slug = '${sqlEscape(p.slug_was)}';`);
      }
    }
    for (const p of preview) {
      const where = p.id
        ? `id = '${p.id}'`
        : `slug = '${sqlEscape(p.slug)}'`;
      console.log(`UPDATE public.products SET
  name = '${sqlEscape(p.name)}',
  local_name = '${sqlEscape(p.local_name)}',
  sku = '${sqlEscape(p.sku_base)}',
  product_code = '${sqlEscape(p.product_code)}',
  category_id = '${p.category_id}',
  processing_method = '${sqlEscape(p.processing_method)}',
  yasvik_mark = '${sqlEscape(p.yasvik_mark)}',
  short_description = '${sqlEscape(p.short_description)}',
  price = ${p.price},
  quick_variants = '${sqlEscape(JSON.stringify(p.quick_variants))}'::jsonb,
  purity_badges = '${sqlEscape(JSON.stringify(p.purity_badges))}'::jsonb,
  inventory_group = '${sqlEscape(p.inventory_group)}',
  shared_stock_kg = ${p.shared_stock_kg},
  stock_quantity = ${p.stock_quantity},
  is_published = true,
  updated_at = now()
WHERE ${where};`);
    }
    return;
  }

  if (dryRun) {
    console.log(JSON.stringify(preview.map((p) => ({
      name: p.name,
      slug: p.slug,
      invoice: p.invoice_per_kg,
      sell_per_kg: p.sell_per_kg,
      variants: p.quick_variants.filter((v) => v.label !== PRICING_META_LABEL).map((v) => `${v.label}=₹${v.price}`),
    })), null, 2));
    return;
  }

  await client.connect();
  await client.query('begin');

  try {
    await resolveRiceId();
    const updated = [];

    for (const product of allProducts) {
      const payload = buildProductPayload(product);
      updated.push(await upsertProduct(payload));
    }

    await client.query('commit');
    console.log(`Updated ${updated.length} organic SDR products:`);
    for (const row of updated) {
      console.log(`  ${row.name} · invoice ₹${row.invoice_per_kg}/kg · sell ₹${row.sell_per_kg}/kg · 1kg ₹${row.price}`);
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
