import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBundleBySlug } from '@/services/productRelationsApi';
import CrossSellProductCard from '@/components/crosssell/CrossSellProductCard';
import PublicPageShell from '@/components/brand/PublicPageShell';

export default function BundleDetail() {
  const { slug } = useParams();
  const { data: bundle, isLoading, isError } = useQuery({
    queryKey: ['bundle-detail', slug],
    queryFn: () => fetchBundleBySlug(slug),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <PublicPageShell>
        <div className="mx-auto max-w-[900px] px-4 py-16 md:px-8">
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-warm-cream" />
          <div className="mt-6 h-24 animate-pulse rounded-2xl bg-warm-cream" />
        </div>
      </PublicPageShell>
    );
  }

  if (isError || !bundle) {
    return (
      <PublicPageShell>
        <div className="mx-auto max-w-[900px] px-4 py-16 text-center md:px-8">
          <h1 className="font-cormorant text-3xl font-semibold text-deep-forest">Combo not found</h1>
          <Link to="/shop" className="mt-4 inline-block font-inter text-sm font-bold text-neon-paddy">Back to shop</Link>
        </div>
      </PublicPageShell>
    );
  }

  return (
    <PublicPageShell>
      <div className="mx-auto max-w-[900px] px-4 py-10 md:px-8 md:py-14">
        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">Yasvik combo</p>
        <h1 className="mt-2 font-cormorant text-4xl font-semibold text-deep-forest md:text-5xl">{bundle.bundle_name}</h1>
        {bundle.bundle_description ? (
          <p className="mt-4 max-w-2xl font-inter text-base leading-7 text-deep-forest/70">{bundle.bundle_description}</p>
        ) : null}
        <p className="mt-3 font-inter text-sm text-deep-forest/50">
          Add items individually — no bundle discount applied unless shown at checkout.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(bundle.products || []).map((product) => (
            <CrossSellProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/shop"
            className="rounded-full bg-deep-forest px-6 py-3 font-inter text-sm font-bold text-warm-cream hover:bg-neon-paddy"
          >
            Add items individually
          </Link>
          <Link
            to="/shop"
            className="rounded-full border border-soft-border px-6 py-3 font-inter text-sm font-bold text-deep-forest hover:border-neon-paddy/40"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
}
