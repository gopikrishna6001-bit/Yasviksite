import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { appClient } from '@/api/appClient';
import OptimizedImage from '@/components/ui/OptimizedImage';
import ComboMosaic from '@/components/products/ComboMosaic';
import {
  buildComboLineItems,
  isComboLineUnavailable,
  sumComboLineTotals,
} from '@/lib/comboDisplayUtils';

/**
 * Legacy marketing Combo entity card — compact product-card rhythm.
 * Does not expand What’s Inside on shop surfaces.
 */
export default function ComboCard({ combo, defaultExpandedProducts = false, compact = true }) {
  const { addCombo, storeOffline } = useCart();
  const [added, setAdded] = useState(false);

  const productIds = combo?.product_ids || [];

  const { data: comboProducts = [], isLoading } = useQuery({
    queryKey: ['combo-products', combo?.id, productIds.join(',')],
    queryFn: async () => {
      if (!productIds.length) return [];
      const uniqueIds = [...new Set(productIds)];
      return appClient.entities.Product.filter(
        { id: uniqueIds, is_published: true, sell_online: true },
        'sort_order',
        uniqueIds.length,
      );
    },
    enabled: Boolean(combo?.id && productIds.length),
    staleTime: 5 * 60 * 1000,
  });

  const lineItems = useMemo(
    () => buildComboLineItems(productIds, comboProducts),
    [productIds, comboProducts],
  );

  const comboWithProductData = useMemo(
    () => ({ ...combo, product_details: comboProducts }),
    [combo, comboProducts],
  );

  const individualTotal = useMemo(() => sumComboLineTotals(lineItems), [lineItems]);
  const bundlePrice = Number(combo?.combo_price || 0);
  const comparePrice = Number(combo?.original_price || combo?.regular_price || individualTotal || 0);
  const savings = comparePrice > bundlePrice ? comparePrice - bundlePrice : 0;

  const isUnavailable = storeOffline
    || lineItems.some((line) => isComboLineUnavailable(line.product))
    || lineItems.length === 0;

  const title = combo?.title || combo?.name || 'Yasvik Combo';
  const blurb = String(combo?.description || '').split('\n')[0].trim().slice(0, 72);
  const itemCount = lineItems.length || productIds.length;
  const heroImage = combo?.hero_image || '';

  const handleAddCombo = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (isUnavailable) return;
    addCombo(comboWithProductData, comboProducts);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  void defaultExpandedProducts;
  void compact;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="yasvik-product-card group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-soft-border bg-white text-deep-forest shadow-[0_10px_34px_rgba(31,61,43,0.06)]"
    >
      <div className="relative aspect-square overflow-hidden bg-warm-cream">
        {heroImage ? (
          <OptimizedImage src={heroImage} alt={title} preset="card" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 p-2.5">
            <ComboMosaic
              products={lineItems.map((line) => ({
                id: line.productId,
                hero_image: line.imageUrl,
              }))}
              alt={title}
              totalCount={itemCount}
              className="h-full w-full overflow-hidden rounded-xl"
            />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-sun-dried-clay shadow-sm">
          Yasvik Combo
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5 md:p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] font-inter text-[15px] font-bold leading-snug text-deep-forest md:text-base">
          {title}
        </h3>
        {blurb ? (
          <p className="mt-1 hidden line-clamp-1 font-inter text-xs text-deep-forest/55 sm:block">{blurb}</p>
        ) : null}
        {itemCount ? (
          <p className="mt-1.5 font-inter text-xs font-medium text-deep-forest/55">
            {itemCount} product{itemCount === 1 ? '' : 's'}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-cormorant text-[1.65rem] font-semibold leading-none text-deep-forest">
                ₹{Math.round(bundlePrice).toLocaleString('en-IN')}
              </span>
              {comparePrice > bundlePrice ? (
                <span className="font-inter text-xs text-deep-forest/40 line-through">
                  Worth ₹{Math.round(comparePrice).toLocaleString('en-IN')}
                </span>
              ) : null}
            </div>
            {savings > 0 ? (
              <p className="mt-0.5 font-inter text-xs font-bold text-deep-forest/75">
                Save ₹{Math.round(savings).toLocaleString('en-IN')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={handleAddCombo}
            disabled={isUnavailable || isLoading}
            className="flex h-10 min-w-20 items-center justify-center rounded-md bg-deep-forest px-3 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-warm-cream disabled:opacity-40"
          >
            {added ? 'Added' : (<><Plus className="mr-1 h-3.5 w-3.5" /> Add</>)}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
