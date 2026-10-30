import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Minus, Plus, Star } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';
import { getProductPath } from '@/lib/productUrls';
import { resolveVariantComparePrice } from '@/lib/productPricingUtils';
import { computePackBulkSavings, formatPackRateLine } from '@/lib/variantBulkSavings';
import { PackSavingsChip } from '@/components/products/PackSavingsBadge';
import { getVariantCartKey, normalizeList, normalizeProductVariant, sortVariantsForShop } from '@/lib/productVariantUtils';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import { formatDisplayTitle } from '@/lib/formatDisplayTitle';
import YasvikLogo from '@/components/brand/YasvikLogo';

function getTitle(product) {
  return formatDisplayTitle(product?.title || product?.name, 'Yasvik product');
}

function getUnit(product, variant) {
  return variant?.label || product?.unit || product?.weight || product?.pack_size || '';
}

export default function ProductListRow({ product, index = 0 }) {
  const { items, addItem, updateQty, storeOffline } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();
  const title = getTitle(product);
  const imageUrl = productPrimaryImageUrl(product);

  const variantOptions = useMemo(() => {
    const clean = (v) => normalizeProductVariant(v);
    const fromQuick = normalizeList(product?.quick_variants).map(clean).filter(Boolean);
    if (fromQuick.length) return sortVariantsForShop(fromQuick);
    return sortVariantsForShop(normalizeList(product?.variants).map(clean).filter(Boolean));
  }, [product]);

  const [selectedLabel, setSelectedLabel] = useState('');
  const selectedVariant = variantOptions.find((v) => v.label === selectedLabel) || variantOptions[0] || null;
  const unit = getUnit(product, selectedVariant);
  const price = Number(selectedVariant?.price ?? product?.price ?? 0);
  const comparePrice = Number(resolveVariantComparePrice(product, selectedVariant, price) || 0);
  const discount = comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const selectedBulkSavings = selectedVariant
    ? computePackBulkSavings(variantOptions, selectedVariant)
    : null;
  const cartKey = getVariantCartKey(product.id, selectedVariant);
  const qty = items.find((item) => item.key === cartKey)?.qty || 0;
  const isFeatured = product?.is_featured || product?.featured_in_hero;
  const ratingAvg = Number(product?.average_rating || product?.review_avg || 0);
  const ratingCount = Number(product?.review_count || 0);
  const wishlisted = isWishlisted(product.id);

  const handleAdd = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (storeOffline) return;
    triggerPulse();
    addItem(product, selectedVariant);
  };

  return (
    <article className="flex items-center gap-3 rounded-xl border border-soft-border/80 bg-white p-2.5">
      <Link to={getProductPath(product)} className="relative flex h-[5.5rem] w-[5.5rem] flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f5f1e8]">
        {imageUrl ? (
          <OptimizedImage src={imageUrl} alt="" preset="thumb" eager={index < 2} fadeOnLoad={false} className="h-full w-full object-cover object-center" />
        ) : (
          <div className="flex flex-col items-center px-1 text-center">
            <YasvikLogo variant="symbol" imageClassName="h-7 w-auto opacity-50" />
            <span className="mt-1 line-clamp-2 font-inter text-[8px] leading-tight text-deep-forest/45">{title}</span>
          </div>
        )}
      </Link>

      <div className="min-w-0 flex-1">
        {isFeatured ? (
          <span className="inline-block rounded bg-neon-paddy/15 px-1.5 py-0.5 font-inter text-[8px] font-bold uppercase tracking-wider text-neon-paddy">
            Best seller
          </span>
        ) : null}
        <Link to={getProductPath(product)}>
          <p className="line-clamp-2 font-inter text-[13px] font-bold leading-snug text-deep-forest">{title}</p>
        </Link>
        {variantOptions.length > 1 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {variantOptions.map((variant) => {
              const savings = computePackBulkSavings(variantOptions, variant);
              const active = selectedVariant?.label === variant.label;
              return (
                <button
                  key={variant.label}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedLabel(variant.label); }}
                  className={`rounded-full border px-2 py-0.5 font-inter text-[9px] font-bold ${active ? 'border-deep-forest bg-deep-forest text-warm-cream' : 'border-soft-border text-deep-forest/60'}`}
                >
                  {variant.label}
                  {savings ? <span className="ml-1"><PackSavingsChip savings={savings} className={active ? 'bg-warm-cream/15 text-warm-cream' : ''} /></span> : null}
                </button>
              );
            })}
          </div>
        ) : unit ? <p className="font-inter text-[10px] text-deep-forest/50">{unit}</p> : null}
        {ratingCount > 0 && ratingAvg > 0 ? (
          <div className="mt-0.5 flex items-center gap-1 text-[#c9a227]">
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            <span className="font-inter text-[10px] font-semibold text-deep-forest/70">{ratingAvg.toFixed(1)}</span>
          </div>
        ) : null}
        <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
          <span className="font-inter text-base font-bold text-deep-forest">₹{price}</span>
          {comparePrice > price ? (
            <>
              <span className="font-inter text-xs text-deep-forest/40 line-through">MRP ₹{comparePrice}</span>
              <span className="rounded-full bg-neon-paddy/12 px-1.5 py-0.5 font-inter text-[9px] font-bold text-neon-paddy">
                {discount}% off
              </span>
            </>
          ) : null}
          {selectedBulkSavings ? (
            <span className="font-inter text-[10px] text-deep-forest/55">
              {formatPackRateLine(selectedBulkSavings)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-shrink-0 flex-col items-end gap-2">
        <button
          type="button"
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
          className={wishlisted ? 'text-neon-paddy' : 'text-deep-forest/35'}
        >
          <Heart className={`h-4 w-4 ${wishlisted ? 'fill-current' : ''}`} strokeWidth={1.6} />
        </button>
        {qty === 0 ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={storeOffline}
            className={`rounded-md bg-deep-forest px-4 py-1.5 font-inter text-[10px] font-bold uppercase tracking-wide text-warm-cream disabled:opacity-50 ${isPulseActive ? 'premium-haptic-pulse' : ''}`}
          >
            Add
          </button>
        ) : (
          <div className={`flex items-center overflow-hidden rounded-md bg-deep-forest text-warm-cream ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>
            <button type="button" onClick={(e) => { e.stopPropagation(); triggerPulse(); updateQty(cartKey, qty - 1); }} className="px-2 py-1.5">
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-5 text-center font-inter text-xs font-bold">{qty}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); triggerPulse(); updateQty(cartKey, qty + 1); }} className="px-2 py-1.5">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
