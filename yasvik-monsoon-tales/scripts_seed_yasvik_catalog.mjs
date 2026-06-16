import pg from 'pg';

const { Client } = pg;

const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
if (!SUPABASE_DB_PASSWORD) {
  console.error('Missing SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const connectionString = `postgresql://postgres.cpksnpuavywbmhrzglyh:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

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
  'Natural Sweeteners': [
    'Jaggery Powder','Jaggery Balls','Honey',
  ],
  'Healthy Instant Foods': [
    'Foxtail Millet Noodles','Ragi Noodles','Multimillet Noodles','Ragi Pasta','Multimillet Pasta',
  ],
  'Diabetes-Friendly Foods': [
    'Kodo Rice','Barnyard Rice','Little Millet','Black Rice','White Sorghum','Sorghum Flour','Red Rice',
  ],
  'Traditional Rice Collection': [
    'Red Rice','Matta Rice','Kaikuttal Rice','Black Rice','Kattuyanam Rice','Karunguruvai Rice',
  ],
  'Daily Grocery Essentials': [
    'Toor Dal','Moong Dal','Urad Dal','Chana Dal','Groundnut Oil','Sesame Oil','Cow Ghee','Spices','Groundnuts',
  ],
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
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function titleToPrice(name) {
  let base = 79;
  if (name.includes('Rice') || name.includes('Millet')) base = 119;
  if (name.includes('Oil')) base = 249;
  if (name.includes('Ghee')) base = 399;
  if (name.includes('Honey')) base = 289;
  if (name.includes('Mix') || name.includes('Flour')) base = 99;
  return base;
}

function placeholderImage(seed, w = 900, h = 900) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

async function run() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('BEGIN');

    const categoryIdByName = new Map();
    let sortOrder = 1;
    for (const cat of categorySpecs) {
      const res = await client.query(
        `INSERT INTO categories (name, slug, description, emotional_title, short_intro, cover_image, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             emotional_title = EXCLUDED.emotional_title,
             short_intro = EXCLUDED.short_intro,
             cover_image = EXCLUDED.cover_image,
             sort_order = EXCLUDED.sort_order,
             is_active = true
         RETURNING id`,
        [
          cat.name,
          cat.slug,
          'Natural, traditional, farmer-sourced everyday essentials for healthy family food.',
          cat.name,
          'Healthy family foods at reasonable prices.',
          placeholderImage(`category-${cat.slug}`, 1200, 800),
          sortOrder++,
        ]
      );
      categoryIdByName.set(cat.name, res.rows[0].id);
    }

    const insertedProducts = [];
    for (const [categoryName, names] of Object.entries(productsByCategory)) {
      const categoryId = categoryIdByName.get(categoryName);
      for (const productName of names) {
        const slug = slugify(productName);
        const price = titleToPrice(productName);
        const discountPrice = Math.max(59, price - Math.round(price * 0.15));
        const heroImage = placeholderImage(`product-${slug}`, 1200, 1200);
        const heroVideo = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4';

        const upsert = await client.query(
          `INSERT INTO products (
            name, slug, short_description, description, category_id,
            price, discount_price, currency, unit,
            is_published, is_featured, stock_quantity, featured_image_url, hero_video
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, 'INR', '1 kg',
            true, true, 100, $8, $9
          )
          ON CONFLICT (slug) DO UPDATE
          SET name = EXCLUDED.name,
              short_description = EXCLUDED.short_description,
              description = EXCLUDED.description,
              category_id = EXCLUDED.category_id,
              price = EXCLUDED.price,
              discount_price = EXCLUDED.discount_price,
              currency = 'INR',
              unit = EXCLUDED.unit,
              is_published = true,
              is_featured = true,
              stock_quantity = EXCLUDED.stock_quantity,
              featured_image_url = EXCLUDED.featured_image_url,
              hero_video = EXCLUDED.hero_video
          RETURNING id, slug`,
          [
            productName,
            slug,
            `Natural and traditional ${productName.toLowerCase()} sourced from trusted farmers.`,
            `Yasvik ${productName} is a healthy family essential, farmer-sourced and reasonably priced for everyday cooking.`,
            categoryId,
            price,
            discountPrice,
            heroImage,
            heroVideo,
          ]
        );

        insertedProducts.push({ id: upsert.rows[0].id, slug: upsert.rows[0].slug });
      }
    }

    for (const p of insertedProducts) {
      const images = [
        placeholderImage(`${p.slug}-1`, 1080, 1350),
        placeholderImage(`${p.slug}-2`, 1080, 1350),
        placeholderImage(`${p.slug}-3`, 1080, 1350),
      ];

      await client.query('DELETE FROM product_images WHERE product_id = $1', [p.id]);
      await client.query(
        `INSERT INTO product_images (product_id, image_url, sort_order, is_primary)
         VALUES
          ($1, $2, 0, true),
          ($1, $3, 1, false),
          ($1, $4, 2, false)`,
        [p.id, images[0], images[1], images[2]]
      );
    }

    let hSort = 10;
    for (const sectionTitle of homepageSections) {
      const slug = slugify(sectionTitle);
      const cta = '/shop';
      await client.query(
        `INSERT INTO homepage_sections (
          section_type, title, subtitle, body_text, cta_label, cta_url, media_url,
          media_type, sort_order, is_active, content
        ) VALUES (
          'products', $1, $2, $3, 'Shop Now', $4, $5, 'image', $6, true, '{}'::jsonb
        )
        ON CONFLICT (title) DO UPDATE
        SET subtitle = EXCLUDED.subtitle,
            body_text = EXCLUDED.body_text,
            cta_label = EXCLUDED.cta_label,
            cta_url = EXCLUDED.cta_url,
            media_url = EXCLUDED.media_url,
            media_type = EXCLUDED.media_type,
            sort_order = EXCLUDED.sort_order,
            is_active = true`,
        [
          sectionTitle,
          'Healthy family groceries for daily use',
          'Natural, traditional, farmer-sourced, reasonably priced everyday essentials.',
          cta,
          placeholderImage(`home-${slug}`, 1600, 900),
          hSort++,
        ]
      );
    }

    await client.query('COMMIT');
    console.log('Catalog seeded successfully.');
    console.log(`Categories: ${categorySpecs.length}`);
    console.log(`Products: ${insertedProducts.length}`);
    console.log(`Homepage sections: ${homepageSections.length}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();

