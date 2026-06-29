import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { products } from '@/services/api';
import { parsePosScanCode } from '@/lib/posScanCode';
import { buildVariantOptions } from '@/lib/labelProductOptions';
import { Loader2, ShoppingBag, Store } from 'lucide-react';

export default function PosScan() {
  const [params] = useSearchParams();
  const raw = params.get('c') || params.get('code') || '';
  const skuParam = params.get('sku') || '';
  const priceParam = params.get('p') || '';

  const posCode = useMemo(() => {
    if (raw) return decodeURIComponent(raw);
    if (skuParam) return priceParam ? `YV:${skuParam}:${priceParam}` : `YV:${skuParam}`;
    return '';
  }, [raw, skuParam, priceParam]);

  const parsed = useMemo(() => parsePosScanCode(posCode), [posCode]);

  const { data: productList = [], isLoading } = useQuery({
    queryKey: ['pos-scan-products'],
    queryFn: () => products.list('-created_date', 500),
    enabled: Boolean(parsed),
    staleTime: 5 * 60 * 1000,
  });

  const match = useMemo(() => {
    if (!parsed || !productList.length) return null;
    if (parsed.productId) {
      const product = productList.find((p) => p.id === parsed.productId);
      return product ? { product, variant: null } : null;
    }
    if (parsed.sku) {
      const skuLower = parsed.sku.toLowerCase();
      for (const product of productList) {
        if (String(product.sku || '').toLowerCase() === skuLower) {
          return { product, variant: null };
        }
        const variants = buildVariantOptions(product);
        const variant = variants.find((v) => String(v.sku || '').toLowerCase() === skuLower);
        if (variant) return { product, variant };
      }
    }
    return null;
  }, [parsed, productList]);

  const displayPrice = parsed?.price
    ?? match?.variant?.price
    ?? match?.product?.price
    ?? null;

  const title = match?.product?.title || match?.product?.name || 'Yasvik product';

  if (!posCode) {
    return (
      <div className="min-h-screen bg-rain-mist flex items-center justify-center px-6 py-16">
        <div className="max-w-sm text-center bg-white rounded-2xl p-8 shadow-sm border border-border/30">
          <Store className="w-10 h-10 text-wet-earth mx-auto mb-4" />
          <h1 className="font-cormorant text-2xl text-rain-cloud mb-2">Yasvik label scan</h1>
          <p className="font-inter text-sm text-rain-cloud/55">
            Scan a product QR from a Yasvik price label to view details.
          </p>
          <Link to="/shop" className="inline-block mt-6 px-6 py-3 bg-wet-earth text-white rounded-full font-inter text-sm">
            Browse shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rain-mist flex items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full bg-white rounded-2xl p-8 shadow-sm border border-border/30 text-center">
        <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-rain-cloud/40 mb-2">Yasvik · Ashok Nagar</p>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-rain-cloud/40" />
          </div>
        ) : (
          <>
            <h1 className="font-cormorant text-2xl text-rain-cloud font-medium mb-1">{title}</h1>
            {match?.variant?.label && (
              <p className="font-inter text-sm text-rain-cloud/50 mb-3">{match.variant.label}</p>
            )}
            {displayPrice != null && (
              <p className="font-cormorant text-3xl text-wet-earth font-semibold mb-4">₹{displayPrice}</p>
            )}
            {!match && (
              <p className="font-inter text-xs text-sun-dried-clay/80 mb-4">
                Product code: {parsed?.sku || parsed?.productId || posCode}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {match?.product?.id && (
                <Link
                  to={`/product/${match.product.id}`}
                  className="inline-flex items-center justify-center gap-2 py-3 bg-wet-earth text-white rounded-full font-inter text-sm font-medium"
                >
                  <ShoppingBag className="w-4 h-4" />
                  View product
                </Link>
              )}
              <Link to="/shop" className="py-3 border border-border rounded-full font-inter text-sm text-rain-cloud/70">
                Browse all products
              </Link>
              <Link
                to="/admin/pos"
                className="py-2 font-inter text-xs text-forest-canopy"
              >
                Store staff: open Counter POS
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
