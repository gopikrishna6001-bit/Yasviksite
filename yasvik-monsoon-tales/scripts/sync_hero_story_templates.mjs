#!/usr/bin/env node
/**
 * Sync six Hero product-linked Stories from live product images + template copy.
 * Prefer pack shots over *-gallery* URLs. Use any .mp4 gallery asset as video_url.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync_hero_story_templates.mjs
 *   node scripts/sync_hero_story_templates.mjs --publish
 */
import { createClient } from '@supabase/supabase-js';

const PUBLISH = process.argv.includes('--publish');

const HERO_STORY_TEMPLATES = [
  {
    productId: '486919f8-f0e7-4911-8b8c-8471e6a6d795',
    slug: 'following-groundnut-oil-back-to-the-seed',
    title: 'Following Groundnut Oil Back to the Seed',
    short_hook: 'Before it is oil, it is seed.',
    captions: 'Cold-pressed groundnut oil — seed, press, aroma, everyday cooking.',
    cta_label: 'Shop Groundnut Oil',
    display_priority: 10,
  },
  {
    productId: '2f47f4cf-2002-4e8a-89ed-0400fc91a618',
    slug: 'sesame-oil-for-pickles-podis-and-traditional-cooking',
    title: 'Sesame Oil for Pickles, Podis and Traditional Cooking',
    short_hook: 'Sesame oil is not only for finishing.',
    captions: 'Cold-pressed white sesame oil for pickles, podis and everyday South Indian cooking.',
    cta_label: 'Shop Sesame Oil',
    display_priority: 20,
  },
  {
    productId: '4c4396d8-c1e4-4359-90fb-778105fd2c3f',
    slug: 'inside-an-avakaya-batch',
    title: 'Inside an Avakaya Batch',
    short_hook: 'Avakaya is a batch, not a factory flavour.',
    captions: 'Mango pickle / Avakaya — homemade-style batch character for Hyderabad tables.',
    cta_label: 'Shop Avakaya',
    display_priority: 30,
  },
  {
    productId: '9bd19447-45d6-4c37-be1a-9849030365d0',
    slug: 'why-jaggery-does-not-always-look-identical',
    title: 'Why Jaggery Does Not Always Look Identical',
    short_hook: 'Real jaggery is not factory-identical.',
    captions: 'Organic jaggery powder — natural colour variation, traditional sweetener.',
    cta_label: 'Shop Jaggery Powder',
    display_priority: 40,
  },
  {
    productId: '25873e11-436e-43e4-b2dd-acb9e1b9eb0e',
    slug: 'how-multi-floral-honey-reaches-the-jar',
    title: 'How Multi Floral Honey Reaches the Jar',
    short_hook: 'From forage to jar — real flower honey, not syrup.',
    captions: 'Multi floral honey for tea, cooking and everyday sweetness.',
    cta_label: 'Shop Multi Floral Honey',
    display_priority: 50,
  },
  {
    productId: '9153896a-27dd-47b9-a1a1-e608a8ef870a',
    slug: 'cooking-kattuyanam-for-the-first-time',
    title: 'Cooking Kattuyanam for the First Time',
    short_hook: 'Heritage rice needs a little patience.',
    captions: 'Organic Kattuyanam — heritage rice with character for conscious cooking.',
    cta_label: 'Shop Kattuyanam',
    display_priority: 60,
  },
];

function isWeakImage(url = '') {
  return /[-_/]gallery(\.|$)/i.test(String(url || '')) || /\.mp4($|\?)/i.test(String(url || ''));
}

function pickPoster(featured = '', images = []) {
  const urls = [featured, ...images.map((r) => r.image_url)].filter(Boolean);
  const unique = [...new Set(urls)];
  return unique.find((u) => !isWeakImage(u)) || unique.find((u) => !/\.mp4/i.test(u)) || unique[0] || '';
}

function pickVideo(images = []) {
  const hit = images.find((r) => /\.mp4($|\?)/i.test(String(r.image_url || '')));
  return hit?.image_url || null;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, key);

  const productIds = HERO_STORY_TEMPLATES.map((t) => t.productId);
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, name, slug, featured_image_url, short_description')
    .in('id', productIds);
  if (pErr) throw pErr;

  const { data: imageRows, error: iErr } = await supabase
    .from('product_images')
    .select('product_id, image_url, is_primary, sort_order')
    .in('product_id', productIds)
    .order('sort_order', { ascending: true });
  if (iErr) throw iErr;

  const byProduct = new Map((products || []).map((p) => [p.id, p]));
  const imagesByProduct = new Map();
  (imageRows || []).forEach((row) => {
    const list = imagesByProduct.get(row.product_id) || [];
    list.push(row);
    imagesByProduct.set(row.product_id, list);
  });

  const now = new Date().toISOString();
  const results = [];

  for (const tpl of HERO_STORY_TEMPLATES) {
    const product = byProduct.get(tpl.productId);
    if (!product) {
      results.push({ slug: tpl.slug, ok: false, error: 'product missing' });
      continue;
    }
    const images = imagesByProduct.get(tpl.productId) || [];
    const poster = pickPoster(product.featured_image_url, images);
    const video = pickVideo(images);
    const row = {
      title: tpl.title,
      slug: tpl.slug,
      short_hook: tpl.short_hook,
      captions: tpl.captions,
      poster_image_url: poster || null,
      video_url: video,
      related_product_id: tpl.productId,
      cta_label: tpl.cta_label,
      cta_destination: `/product/${product.slug}`,
      display_priority: tpl.display_priority,
      show_on_homepage: true,
      show_on_product_page: true,
      show_on_category_page: false,
      duration_seconds: video ? 30 : 6,
      language: 'en',
      status: PUBLISH ? 'published' : 'draft',
      published_at: PUBLISH ? now : null,
      updated_at: now,
    };

    const { data: existing } = await supabase
      .from('storefront_stories')
      .select('id')
      .eq('slug', tpl.slug)
      .maybeSingle();

    let error;
    if (existing?.id) {
      ({ error } = await supabase.from('storefront_stories').update(row).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('storefront_stories').insert(row));
    }

    results.push({
      slug: tpl.slug,
      product: product.name,
      poster: poster ? poster.split('/').pop() : null,
      video: video ? video.split('/').pop() : null,
      status: row.status,
      ok: !error,
      error: error?.message || null,
    });
  }

  console.log(JSON.stringify({ publish: PUBLISH, results }, null, 2));
  if (results.some((r) => !r.ok)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
