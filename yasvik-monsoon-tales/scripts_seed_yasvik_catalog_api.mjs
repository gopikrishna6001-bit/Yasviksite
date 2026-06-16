import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cpksnpuavywbmhrzglyh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const categorySpecs = [
  { name: 'Rice & Millets', slug: 'rice-and-millets' },
  { name: 'Healthy Flours & Chapati Mixes', slug: 'healthy-flours-and-chapati-mixes' },
  { name: 'Kids Health & Nutrition', slug: 'kids-health-and-nutrition' },
  { name: 'Breakfast Essentials', slug: 'breakfast-essentials' },
  { name: 'Natural Sweeteners', slug: 'natural-sweeteners' },
  { name: 'Healthy Instant Foods', slug: 'healthy-instant-foods' },
  { name: 'Diabetes-Friendly Foods', slug: 'diabetes-friendly-foods' },
  { name: 'Traditional Rice Collection', slug: 'traditional-rice-collection' },
  { name: 'Daily Grocery Essentials', slug: 'daily-grocery-essentials' },
];

const productsByCategory = {
  'Rice & Millets': [
    'Foxtail Rice','Kodo Rice','Barnyard Rice','Little Millet','Ragi','White Sorghum','Red Sorghum',
    'Red Rice','Matta Rice','Idly Rice','Kaikuttal Rice','Black Rice','Kattuyanam Rice','Karunguruvai Rice',
  ],
  'Healthy Flours & Chapati Mixes': [
    'Ragi Flour','Foxtail Flour','Multimillet Flour','Pearl Flour / Bajra Flour','White Sorghum Flour',
  ],
  'Kids Health & Nutrition': [
    'Sprouted Ragi Malt Powder','Multimillet Health Mix','Ragi Flakes','Foxtail Flakes','Millet Noodles','Millet Pasta',
  ],
  'Breakfast Essentials': [
    'Multimillet Dosa Mix','Ragi Rava','Foxtail Flakes','Ragi Flakes','Red Rice Flakes',
  ],
  'Natural Sweeteners': ['Jaggery Powder','Jaggery Balls','Honey'],
  'Healthy Instant Foods': ['Foxtail Millet Noodles','Ragi Noodles','Multimillet Noodles','Ragi Pasta','Multimillet Pasta'],
  'Diabetes-Friendly Foods': ['Kodo Rice','Barnyard Rice','Little Millet','Black Rice','White Sorghum','Sorghum Flour','Red Rice'],
  'Traditional Rice Collection': ['Red Rice','Matta Rice','Kaikuttal Rice','Black Rice','Kattuyanam Rice','Karunguruvai Rice'],
  'Daily Grocery Essentials': ['Toor Dal','Moong Dal','Urad Dal','Chana Dal','Groundnut Oil','Sesame Oil','Cow Ghee','Spices','Groundnuts'],
};

const homepageSections = [
  'Everyday Healthy Staples',
  'Kids Health Essentials',
  'Diabetes-Friendly Foods',
  'Breakfast & Dinner Essentials',
  'Natural Sweeteners',
  'Traditional Rice Collection',
  'Healthy Instant Foods',
];

function slugify(s) {
  return s.toLowerCase().replace(/&/g, 'and').replace(/\//g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function img(seed, w = 1200, h = 1200) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}
function priceFor(name) {
  if (name.includes('Ghee')) return 399;
  if (name.includes('Oil')) return 249;
  if (name.includes('Honey')) return 289;
  if (name.includes('Rice') || name.includes('Millet')) return 119;
  return 99;
}

function makeSku(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return `YAS-${hash.toString(36).toUpperCase()}`;
}

async function main() {
  const categoryIdByName = new Map();
  for (let i = 0; i < categorySpecs.length; i += 1) {
    const c = categorySpecs[i];
    const row = {
      name: c.name,
      slug: c.slug,
      description: 'Natural, traditional, farmer-sourced everyday essentials for healthy family food.',
      emotional_title: c.name,
      short_intro: 'Healthy family foods at reasonable prices.',
      cover_image: img(`cat-${c.slug}`, 1600, 1000),
      sort_order: i + 1,
      is_active: true,
    };
    const { data, error } = await supabase.from('categories').upsert(row, { onConflict: 'slug' }).select('id').single();
    if (error) throw error;
    categoryIdByName.set(c.name, data.id);
  }

  const productsToEnsure = [];
  const seenSlugs = new Set();
  for (const [catName, names] of Object.entries(productsByCategory)) {
    const categoryId = categoryIdByName.get(catName);
    for (const name of names) {
      const slug = slugify(name);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      const price = priceFor(name);
      productsToEnsure.push({
        name,
        slug,
        short_description: `Natural and traditional ${name.toLowerCase()} sourced from trusted farmers.`,
        description: `Yasvik ${name} is a healthy family essential, farmer-sourced and reasonably priced for everyday cooking.`,
        category_id: categoryId,
        sku: makeSku(slug),
        price,
        discount_price: Math.max(59, price - Math.round(price * 0.15)),
        currency: 'INR',
        is_published: true,
        is_featured: true,
        stock_quantity: 100,
        featured_image_url: img(`product-${slug}`),
      });
    }
  }

  const { error: prodErr } = await supabase.from('products').upsert(productsToEnsure, { onConflict: 'slug' });
  if (prodErr) throw prodErr;

  const slugs = productsToEnsure.map((p) => p.slug);
  const { data: insertedProducts, error: qErr } = await supabase.from('products').select('id,slug').in('slug', slugs);
  if (qErr) throw qErr;

  for (const p of insertedProducts || []) {
    const mediaRows = [
      { product_id: p.id, image_url: img(`${p.slug}-1`, 1080, 1350), sort_order: 0, is_primary: true },
      { product_id: p.id, image_url: img(`${p.slug}-2`, 1080, 1350), sort_order: 1, is_primary: false },
      { product_id: p.id, image_url: img(`${p.slug}-3`, 1080, 1350), sort_order: 2, is_primary: false },
      { product_id: p.id, image_url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', sort_order: 3, is_primary: false },
    ];
    await supabase.from('product_images').delete().eq('product_id', p.id);
    const { error: mediaErr } = await supabase.from('product_images').insert(mediaRows);
    if (mediaErr) throw mediaErr;
  }

  const { data: existingSections, error: hsErr } = await supabase
    .from('homepage_sections')
    .select('id,title')
    .in('title', homepageSections);
  if (hsErr) throw hsErr;

  const byTitle = new Map((existingSections || []).map((s) => [s.title, s]));
  for (let i = 0; i < homepageSections.length; i += 1) {
    const title = homepageSections[i];
    const row = {
      section_type: 'products',
      title,
      subtitle: 'Healthy family groceries for daily use',
      body_text: 'Natural, traditional, farmer-sourced, reasonably priced everyday essentials.',
      cta_label: 'Shop Now',
      cta_url: '/shop',
      media_url: img(`home-${slugify(title)}`, 1600, 900),
      media_type: 'image',
      sort_order: 10 + i,
      is_active: true,
      content: {},
    };
    if (byTitle.has(title)) {
      const { error } = await supabase.from('homepage_sections').update(row).eq('id', byTitle.get(title).id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('homepage_sections').insert(row);
      if (error) throw error;
    }
  }

  console.log(`Seed complete: ${categorySpecs.length} categories, ${productsToEnsure.length} products, ${homepageSections.length} homepage sections.`);
}

main().catch((err) => {
  console.error('Seed failed:', err?.message || err);
  process.exit(1);
});
