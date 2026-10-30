import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { formatComboMetaLine, formatComboQtySummary, formatScaledComponentQuantity } from '@/lib/comboVisualUtils';
import ComboMosaic from '@/components/products/ComboMosaic';

/**
 * Compact expand/collapse for combo contents.
 * Never shows component selling prices — parent combo price is the payable line.
 */
export default function BundleItemDetail({
  item,
  product_details = [],
  defaultExpanded = false,
  showPrices = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const comboQty = Math.max(1, Number(item?.qty) || 1);

  const lineItems = useMemo(() => {
    if (Array.isArray(item?.bundleContents) && item.bundleContents.length) {
      return item.bundleContents.map((row) => ({
        productId: row.id || row.productId,
        title: row.title,
        packLabel: row.quantityValue != null
          ? formatScaledComponentQuantity({
            quantityValue: row.quantityValue,
            quantityUnit: row.quantityUnit,
            packCount: row.packCount,
            comboQty,
          })
          : (row.quantityLabel || ''),
        quantity: 1,
        imageUrl: row.imageUrl,
        href: row.href && !row.linkDisabled ? row.href : null,
        price: null,
      }));
    }
    void product_details;
    return [];
  }, [item?.bundleContents, comboQty, product_details]);

  const metaLine = formatComboQtySummary({
    comboQty,
    itemCount: item?.bundleItemCount || lineItems.length,
    packCount: item?.bundlePackCount || item?.bundleItemCount,
    netWeightG: item?.bundleNetWeightG,
  })
    || item?.bundleMetaLine
    || formatComboMetaLine({
      itemCount: item?.bundleItemCount || lineItems.length,
      netWeightG: item?.bundleNetWeightG,
    });

  if (!lineItems.length && !metaLine) return null;

  return (
    <div className="mt-2 space-y-2">
      {metaLine ? (
        <p className="font-inter text-xs text-deep-forest/55">{metaLine}</p>
      ) : null}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-soft-border/70 bg-warm-cream/70 px-3 py-2 text-left"
      >
        <span className="font-inter text-xs font-bold uppercase tracking-[0.12em] text-deep-forest/55">
          View contents · {lineItems.length || item?.bundleItemCount || 0} product{(lineItems.length || item?.bundleItemCount || 0) === 1 ? '' : 's'}
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-deep-forest/45" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 rounded-xl border border-soft-border/70 bg-white p-2">
              {lineItems.map((line) => (
                <div key={`${line.productId}-${line.packLabel}`} className="flex items-center gap-2.5 rounded-lg p-1.5">
                  {line.href ? (
                    <Link to={line.href} className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-warm-cream">
                      {line.imageUrl ? (
                        <OptimizedImage src={line.imageUrl} alt={line.title || ''} preset="thumb" className="h-full w-full object-cover" />
                      ) : null}
                    </Link>
                  ) : (
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-warm-cream">
                      {line.imageUrl ? (
                        <OptimizedImage src={line.imageUrl} alt={line.title || ''} preset="thumb" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-inter text-xs font-semibold text-deep-forest">{line.title}</p>
                    <p className="mt-0.5 font-inter text-[10px] font-bold uppercase tracking-wide text-deep-forest/50">
                      {line.packLabel || 'Included'}
                    </p>
                  </div>
                  {showPrices && line.price != null ? (
                    <span className="font-inter text-xs font-semibold text-deep-forest">₹{line.price}</span>
                  ) : null}
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function CheckoutComboThumb({ item }) {
  if (item?.hero_image) {
    return (
      <OptimizedImage
        src={item.hero_image}
        alt={item.title || 'Combo'}
        preset="thumb"
        className="h-full w-full object-cover"
      />
    );
  }
  const mosaicProducts = (item?.bundleContents || [])
    .filter((row) => row?.imageUrl)
    .map((row) => ({ id: row.id || row.productId, hero_image: row.imageUrl }));
  if (mosaicProducts.length) {
    return (
      <ComboMosaic
        products={mosaicProducts}
        totalCount={item.bundleItemCount}
        alt={item.title || 'Combo'}
        className="h-full w-full"
      />
    );
  }
  return null;
}
