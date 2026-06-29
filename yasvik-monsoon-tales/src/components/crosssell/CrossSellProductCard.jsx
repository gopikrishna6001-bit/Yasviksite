import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { getProductTeluguName } from '@/lib/teluguProductNames';
import { normalizeProductVariant } from '@/lib/productVariantUtils';
import { parseProductVariants } from '@/lib/productStockUtils';
import { productCardImageUrl } from '@/lib/mediaUrl';
import { getProductPath } from '@/lib/productUrls';
import OptimizedImage from '@/components/ui/OptimizedImage';

function getTitle(product) {
  return product?.title || product?.name || 'Product';
}

function getDefaultVariant(product) {
  const variants = parseProductVariants(product);
  if (!variants.length) return null;
  return normalizeProductVariant(variants[0]);
}

function getDisplayPrice(product, variant) {
  const price = Number(variant?.price ?? product?.price ?? 0);
  return Number.isFinite(price) ? price : 0;
}

export default function CrossSellProductCard({ product, compact = false }) {
  const { addItem, storeOffline } = useCart();
  const [added, setAdded] = useState(false);
  const variant = getDefaultVariant(product);
  const title = getTitle(product);
  const telugu = getProductTeluguName(product);
  const packLabel = variant?.label || '';
  const price = getDisplayPrice(product, variant);
  const image = productCardImageUrl(product, variant, 'thumb');

  const handleAdd = () => {
    if (storeOffline) return;
    addItem(product, variant, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  };

  return (
    <article className={`flex gap-3 rounded-2xl border border-soft-border bg-white p-3 ${compact ? '' : 'sm:p-4'}`}>
      <Link to={getProductPath(product)} className="block h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-warm-cream sm:h-24 sm:w-24">
        {image ? (
          <OptimizedImage src={image} alt={title} preset="thumb" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-inter text-[10px] text-deep-forest/35">Yasvik</div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <Link to={getProductPath(product)} className="font-inter text-sm font-semibold leading-snug text-deep-forest line-clamp-2 hover:text-neon-paddy">
            {title}
          </Link>
          {telugu ? <p className="mt-0.5 font-inter text-xs text-deep-forest/55 line-clamp-1">{telugu}</p> : null}
          {packLabel ? <p className="mt-1 font-inter text-[11px] font-medium uppercase tracking-wide text-deep-forest/45">{packLabel}</p> : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-cormorant text-xl font-semibold text-deep-forest">₹{price}</span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={storeOffline}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-inter text-xs font-bold transition-colors ${
              added ? 'bg-forest-canopy text-white' : 'bg-deep-forest text-warm-cream hover:bg-neon-paddy'
            } disabled:opacity-50`}
          >
            {added ? <><Check className="h-3.5 w-3.5" /> Added</> : <><Plus className="h-3.5 w-3.5" /> Add</>}
          </button>
        </div>
      </div>
    </article>
  );
}
