import { Link } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchActiveBundles } from '@/services/productRelationsApi';

export default function BundleStrip({
  location = 'home',
  productId = null,
  title = 'Curated combos',
  description = 'Practical kits — view items and add individually.',
  limit = 3,
  className = '',
}) {
  const { data: bundles = [] } = useQuery({
    queryKey: ['product-bundles', location, productId, limit],
    queryFn: () => fetchActiveBundles({ location, limit, productId }),
    staleTime: 5 * 60 * 1000,
  });

  if (!bundles.length) return null;

  return (
    <section className={className}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest md:text-3xl">{title}</h2>
          {description ? <p className="mt-1 font-inter text-sm text-deep-forest/55">{description}</p> : null}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {bundles.slice(0, limit).map((bundle) => (
          <Link
            key={bundle.id}
            to={`/bundles/${bundle.bundle_slug}`}
            className="group flex flex-col rounded-2xl border border-soft-border bg-white p-4 shadow-[0_10px_30px_rgba(31,61,43,0.05)] transition-transform hover:-translate-y-0.5"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-neon-paddy/12 text-neon-paddy">
              <Package className="h-5 w-5" />
            </div>
            <h3 className="font-cormorant text-xl font-semibold leading-snug text-deep-forest group-hover:text-neon-paddy">
              {bundle.bundle_name}
            </h3>
            {bundle.bundle_description ? (
              <p className="mt-2 flex-1 font-inter text-sm leading-6 text-deep-forest/60 line-clamp-3">
                {bundle.bundle_description}
              </p>
            ) : null}
            <span className="mt-4 inline-flex items-center gap-1 font-inter text-sm font-bold text-neon-paddy">
              View combo <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
