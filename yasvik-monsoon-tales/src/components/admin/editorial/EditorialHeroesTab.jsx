import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { assessHeroLaunchReadiness } from '@/lib/editorialLaunchReadiness';

const HERO_SELECT = `
  id, name, slug, featured_image_url, short_description, primary_customer_benefit,
  ingredients, allergen_info, process_method, processing_method, best_for,
  storage_note, shelf_life_text, natural_variation_note, origin_state, source_type,
  seo_title, seo_description, merchandising_tier, merchandising_priority, image_status
`.replace(/\s+/g, ' ').trim();

async function loadHeroProducts() {
  const { data: products, error } = await supabase
    .from('products')
    .select(HERO_SELECT)
    .eq('merchandising_tier', 'hero')
    .order('merchandising_priority', { ascending: true });
  if (error) throw error;

  const ids = (products || []).map((p) => p.id);
  const [{ data: images }, { data: stories }] = await Promise.all([
    ids.length
      ? supabase.from('product_images').select('product_id, image_url, is_primary, sort_order').in('product_id', ids).order('sort_order')
      : Promise.resolve({ data: [] }),
    supabase.from('storefront_stories').select('id, title, slug, related_product_id, status').order('display_priority'),
  ]);

  const imagesByProduct = {};
  (images || []).forEach((row) => {
    if (!imagesByProduct[row.product_id]) imagesByProduct[row.product_id] = [];
    imagesByProduct[row.product_id].push(row.image_url);
  });

  return (products || []).map((product) => {
    const galleryUrls = (imagesByProduct[product.id] || []).filter((url) => url && url !== product.featured_image_url);
    const related = (stories || []).find((s) => s.related_product_id === product.id);
    return {
      ...product,
      galleryUrls,
      relatedStoryId: related?.id || '',
      relatedStoryTitle: related?.title || '',
    };
  });
}

export default function EditorialHeroesTab() {
  const { data: heroes = [], isLoading, error } = useQuery({
    queryKey: ['admin-editorial-heroes'],
    queryFn: loadHeroProducts,
  });

  if (isLoading) return <p className="font-inter text-sm text-deep-forest/50">Loading Hero products…</p>;
  if (error) return <p className="font-inter text-sm text-red-600">{error.message}</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-soft-border bg-white p-4">
        <p className="font-inter text-sm text-deep-forest/70">
          Product content and media live in the existing Products admin (R2 upload). This console only lists launch gaps and deep-links — it does not replace the product editor.
        </p>
      </div>

      {heroes.map((hero) => {
        const readiness = assessHeroLaunchReadiness(hero);
        const missing = readiness.results.filter((r) => !r.ok);
        return (
          <article key={hero.id} className="rounded-2xl border border-soft-border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {hero.featured_image_url ? (
                  <img src={hero.featured_image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-stone-100 text-deep-forest/30">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-cormorant text-xl font-semibold text-deep-forest">{hero.name}</h3>
                  <p className="mt-0.5 font-inter text-[11px] text-deep-forest/50">/{hero.slug}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-inter text-2xl font-bold text-deep-forest">{readiness.percent}%</p>
                <p className="font-inter text-[10px] uppercase tracking-wider text-deep-forest/45">
                  {readiness.passed}/{readiness.total} checks
                </p>
              </div>
            </div>

            {missing.length ? (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <li key={item.key} className="rounded-lg bg-amber-50 px-2.5 py-1 font-inter text-[11px] text-amber-900">
                    Missing: {item.label}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 font-inter text-xs text-emerald-800">All launch fields present.</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/admin/products?edit=${hero.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-deep-forest px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-warm-cream"
              >
                Edit product content
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <Link
                to={`/admin/products?edit=${hero.id}&tab=media`}
                className="inline-flex items-center gap-1.5 rounded-full border border-soft-border px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest"
              >
                Edit media / gallery
              </Link>
              {hero.relatedStoryId ? (
                <Link
                  to={`/admin/storefront-stories?edit=${hero.relatedStoryId}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-soft-border px-4 py-2 font-inter text-[11px] font-bold uppercase tracking-wider text-deep-forest"
                >
                  Related Story
                </Link>
              ) : null}
            </div>
          </article>
        );
      })}

      {!heroes.length ? (
        <p className="font-inter text-sm text-deep-forest/50">
          No products with merchandising_tier = hero. Set tier in Merchandising Review or Products admin.
        </p>
      ) : null}
    </div>
  );
}
