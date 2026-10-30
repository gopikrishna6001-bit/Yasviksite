import { Link, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBundleBySlug } from '@/services/productRelationsApi';
import { products as productsApi } from '@/services/api';
import PublicPageShell from '@/components/brand/PublicPageShell';
import BundleWhatsInside from '@/components/products/BundleWhatsInside';
import BundleValueCard from '@/components/products/BundleValueCard';
import CrossSellProductCard from '@/components/crosssell/CrossSellProductCard';
import { getProductPath } from '@/lib/productUrls';
import { formatDisplayTitle } from '@/lib/formatDisplayTitle';

export default function BundleDetail() {
  const { slug } = useParams();
  const { data: bundle, isLoading, isError } = useQuery({
    queryKey: ['bundle-detail', slug],
    queryFn: () => fetchBundleBySlug(slug),
    enabled: Boolean(slug),
  });

  const parentId = bundle?.parent_product_id || null;
  const { data: parentProduct = null } = useQuery({
    queryKey: ['bundle-parent-product', parentId],
    queryFn: () => productsApi.get(parentId),
    enabled: Boolean(parentId),
    staleTime: 60 * 1000,
  });

  const title = useMemo(() => {
    if (parentProduct) return formatDisplayTitle(parentProduct.title || parentProduct.name || bundle?.bundle_name);
    return bundle?.bundle_name || 'Yasvik Combo';
  }, [parentProduct, bundle?.bundle_name]);

  if (isLoading) {
    return (
      <PublicPageShell>
        <div className="mx-auto max-w-[900px] px-4 py-16 md:px-8">
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-warm-cream" />
          <div className="mt-6 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-warm-cream" />
            ))}
          </div>
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

  // Prefer the sellable product PDP when the bundle is linked to a catalogue combo.
  if (parentProduct?.slug && parentProduct.is_published !== false) {
    return <Navigate to={getProductPath(parentProduct)} replace />;
  }

  return (
    <PublicPageShell>
      <div className="mx-auto max-w-[900px] px-4 py-10 md:px-8 md:py-14">
        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-sun-dried-clay">
          {String(parentProduct?.yasvik_mark || '').trim() || 'Yasvik combo'}
        </p>
        <h1 className="mt-2 font-cormorant text-4xl font-semibold text-deep-forest md:text-5xl">{title}</h1>
        {bundle.bundle_description ? (
          <p className="mt-4 max-w-2xl font-inter text-base leading-7 text-deep-forest/70">{bundle.bundle_description}</p>
        ) : null}

        <BundleValueCard
          bundle={bundle}
          comboPrice={parentProduct?.price || 0}
          perfectFor={parentProduct?.best_for || ''}
          badge={parentProduct?.yasvik_mark || ''}
          className="mt-8"
        />

        <BundleWhatsInside
          bundle={bundle}
          parentProductId={parentId}
          className="mt-6"
        />

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {(bundle.products || []).filter((p) => p?.is_published !== false).map((product) => (
            <CrossSellProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {parentProduct ? (
            <Link
              to={getProductPath(parentProduct)}
              className="rounded-full bg-deep-forest px-6 py-3 font-inter text-sm font-bold text-warm-cream hover:bg-neon-paddy"
            >
              Buy this combo
            </Link>
          ) : null}
          <Link
            to="/shop"
            className="rounded-full border border-soft-border bg-white px-6 py-3 font-inter text-sm font-bold text-deep-forest"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </PublicPageShell>
  );
}
