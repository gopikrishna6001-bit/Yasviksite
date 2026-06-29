import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = path.resolve(import.meta.dirname, '..');
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbPassword) {
  console.error('Missing SUPABASE_DB_PASSWORD — set it to upsert the three core value stories into Supabase.');
  process.exit(1);
}

const client = new Client({
  host: process.env.SUPABASE_DB_HOST || 'db.cpksnpuavywbmhrzglyh.supabase.co',
  user: 'postgres',
  password: dbPassword,
  database: 'postgres',
  port: 5432,
  ssl: { rejectUnauthorized: false },
});

const { CORE_VALUE_STORY_SAMPLES } = await import(
  pathToFileURL(path.join(rootDir, 'src/content/coreValueStories.js')).href
);

const COVER_FALLBACK =
  'https://cpksnpuavywbmhrzglyh.supabase.co/storage/v1/object/public/media-assets/1781516610532-xylu0hqz5a.png';

async function upsertStory(story) {
  const id = randomUUID();
  const result = await client.query(
    `
      insert into public.stories (
        id, title, slug, excerpt, content, cover_image, read_time_minutes,
        is_featured, is_published, sort_order, created_at, updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,now(),now())
      on conflict (slug) do update set
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image = coalesce(nullif(excluded.cover_image, ''), stories.cover_image),
        read_time_minutes = excluded.read_time_minutes,
        is_featured = excluded.is_featured,
        is_published = true,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id, slug, title
    `,
    [
      id,
      story.title,
      story.slug,
      story.excerpt,
      story.body,
      story.cover_image || COVER_FALLBACK,
      story.read_time_minutes || 4,
      true,
      story.core_value_id === 'conscious-food' ? 1 : story.core_value_id === 'responsible-sourcing' ? 2 : 3,
    ]
  );
  return result.rows[0];
}

await client.connect();

try {
  const rows = [];
  for (const story of Object.values(CORE_VALUE_STORY_SAMPLES)) {
    const row = await upsertStory(story);
    rows.push(row);
    console.log(`✓ ${row.slug} → ${row.title} (${row.id})`);
  }
  console.log(`\nSeeded ${rows.length} core value stories. Homepage cards will use these once published slugs match.`);
} finally {
  await client.end();
}
