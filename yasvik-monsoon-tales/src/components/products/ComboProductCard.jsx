import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import { getProductPath } from '@/lib/productUrls';
import { isSellableOnline } from '@/lib/productVisibility';
import { getVariantCartKey } from '@/lib/productVariantUtils';
import {
  formatComboMetaLine,
  formatComboIncludesPreview,
  getComboValuePresentation,
  getParentComboTitle,
  resolveComboParentImage,
} from '@/lib/comboVisualUtils';
import {
  getComboCartKey,
  getDefaultOptionChoice,
  resolveComboPresentation,
} from '@/lib/comboV2Utils';
import { computeBundleRetailValue, formatNetWeightLabel } from '@/lib/productBundleUtils';
import ComboMosaic from '@/components/products/ComboMosaic';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * Compact combo card — same rhythm as Yasvik ProductCard.
 * "+more" expands included product names on the card.
 */
export default function ComboProductCard({
  product,
  bundle = null,
  featured = false,
  index = 0,
  compact = false,
}) {
  const { items, addItem, updateQty, storeOffline } = useCart();
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();
  const location = useLocation();
  const [showAllIncludes, setShowAllIncludes] = useState(false);
  const detailLinkState = {
    from: `${location.pathname}${location.search || ''}`,
  };

  const presentation = useMemo(() => {
    if (!product?.id) return getComboValuePresentation({ comboPrice: 0 });
    if (bundle) {
      const defaultChoice = getDefaultOptionChoice(bundle);
      const v2 = resolveComboPresentation(bundle, product, defaultChoice);
      return v2.value;
    }
    return getComboValuePresentation({ comboPrice: product.price });
  }, [bundle, product]);

  const cardMeta = useMemo(() => {
    if (!bundle || !product?.id) return null;
    const defaultChoice = getDefaultOptionChoice(bundle);
    return resolveComboPresentation(bundle, product, defaultChoice);
  }, [bundle, product]);

  if (!product?.id) return null;

  const defaultChoice = bundle ? getDefaultOptionChoice(bundle) : null;
  const title = getParentComboTitle(product, bundle) || 'Combo';
  const badge = String(cardMeta?.purposeLabel || product.yasvik_mark || '').trim();
  const blurb = String(product.short_description || bundle?.bundle_description || '')
    .split('\n')[0]
    .trim()
    .slice(0, 72);
  const itemCount = cardMeta?.itemCount
    || Number(product.bundle_item_count || bundle?.item_count)
    || (bundle?.products || []).length;
  const weightLabel = cardMeta?.netWeightLabel
    || formatNetWeightLabel(product.bundle_net_weight_g || bundle?.total_net_weight_g);
  const meta = formatComboMetaLine({ itemCount, netWeightLabel: weightLabel });
  const allIncludeNames = (cardMeta?.groupedAll || cardMeta?.groupedIncluded || [])
    .flatMap((group) => group.lines || [])
    .map((line) => line.title)
    .filter(Boolean);
  const previewNames = allIncludeNames.length
    ? allIncludeNames
    : (cardMeta?.includedPreview || []);
  const moreCount = Math.max(0, previewNames.length - 2);
  const href = getProductPath(product);
  const hero = cardMeta?.heroImage || resolveComboParentImage(product, bundle);
  const mosaicProducts = bundle?.products || product.bundleProducts || [];
  const comboKey = defaultChoice ? getComboCartKey(product.id, defaultChoice) : null;
  const cartKey = getVariantCartKey(product.id, null, comboKey);
  const cartLine = items.find((row) => row.key === cartKey);
  const qty = cartLine?.qty || 0;

  const canAdd = !storeOffline
    && isSellableOnline(product)
    && Number(product.price) > 0
    && (
      product.subject_to_availability === true
      || product.availability === 'in_stock'
      || Number(product.stock ?? product.stock_quantity ?? 0) > 0
    );

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAdd) return;
    triggerPulse();
    addItem(product, null, 1, comboKey, { bundle, choice: defaultChoice });
  };

  const handleInc = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (storeOffline) return;
    triggerPulse();
    updateQty(cartKey, qty + 1);
  };

  const handleDec = (e) => {
    e.preventDefault();
    e.stopPropagation();
    triggerPulse();
    updateQty(cartKey, Math.max(0, qty - 1));
  };

  const showBlurb = Boolean(blurb) && !compact;
  const fallbackIncludes = formatComboIncludesPreview(bundle, 3);

  return (
    <article
      className="yasvik-product-card group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-soft-border bg-white text-deep-forest shadow-[0_10px_34px_rgba(31,61,43,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-deep-forest/20 hover:shadow-[0_16px_42px_rgba(31,61,43,0.1)]"
      data-combo-card={product.id}
      data-index={index}
      data-featured={featured ? 'true' : undefined}
    >
      <Link to={href} state={detailLinkState} className="relative block aspect-square overflow-hidden bg-warm-cream" aria-label={`Open ${title}`}>
        {product.hero_image || product.featured_image_url ? (
          <OptimizedImage
            src={hero || product.hero_image || product.featured_image_url}
            alt={title}
            preset="card"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="absolute inset-0 p-2.5">
            <ComboMosaic
              product={product}
              products={mosaicProducts}
              alt={title}
              totalCount={itemCount}
              className="h-full w-full overflow-hidden rounded-xl"
            />
          </div>
        )}
        {badge ? (
          <span className="absolute left-2.5 top-2.5 z-[2] max-w-[70%] truncate rounded-full bg-white/95 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-sun-dried-clay shadow-sm">
            {badge}
          </span>
        ) : null}
        {cardMeta?.hasFreeGift ? (
          <span className="absolute right-2.5 top-2.5 z-[2] rounded-full bg-amber-500 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
            Free gift
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3.5 md:p-4">
        <div className="min-w-0 text-left">
          <Link to={href} state={detailLinkState}>
            <h3 className="line-clamp-2 min-h-[2.75rem] font-inter text-[15px] font-bold leading-snug text-deep-forest md:min-h-[3rem] md:text-base">
              {title}
            </h3>
          </Link>
          {showBlurb ? (
            <p className="mt-1 hidden line-clamp-1 font-inter text-xs text-deep-forest/55 sm:block">
              {blurb}
            </p>
          ) : null}
          {meta ? (
            <p className="mt-1.5 font-inter text-xs font-medium text-deep-forest/55">{meta}</p>
          ) : null}
          {!compact && previewNames.length ? (
            <p className="mt-1 font-inter text-[11px] leading-snug text-deep-forest/50">
              Contains:
              {' '}
              {showAllIncludes
                ? previewNames.join(', ')
                : previewNames.slice(0, 2).join(', ')}
              {!showAllIncludes && moreCount > 0 ? (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAllIncludes(true);
                    }}
                    className="font-semibold text-deep-forest underline-offset-2 hover:underline"
                    aria-expanded={false}
                  >
                    +
                    {moreCount}
                    {' '}
                    more
                  </button>
                </>
              ) : null}
              {showAllIncludes && moreCount > 0 ? (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAllIncludes(false);
                    }}
                    className="font-semibold text-deep-forest underline-offset-2 hover:underline"
                    aria-expanded
                  >
                    Show less
                  </button>
                </>
              ) : null}
            </p>
          ) : (!compact && fallbackIncludes ? (
            <p className="mt-1 line-clamp-2 font-inter text-[11px] leading-snug text-deep-forest/50">
              {fallbackIncludes}
            </p>
          ) : null)}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-cormorant text-[1.65rem] font-semibold leading-none text-deep-forest md:text-[1.75rem]">
                {presentation.priceLabel || '—'}
              </span>
              {presentation.worthLabel ? (
                <span className="font-inter text-xs text-deep-forest/40 line-through">
                  Worth {presentation.worthLabel}
                </span>
              ) : null}
            </div>
            {presentation.saveLabel ? (
              <p className="mt-0.5 font-inter text-xs font-bold text-deep-forest/75">
                {presentation.saveLabel}
              </p>
            ) : null}
          </div>

          {qty === 0 ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className={`flex h-10 min-w-20 items-center justify-center rounded-md bg-deep-forest px-3 font-inter text-[11px] font-bold uppercase tracking-[0.1em] text-warm-cream transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                isPulseActive ? 'premium-haptic-pulse' : ''
              }`}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {storeOffline ? 'Restocking' : 'Add'}
            </button>
          ) : (
            <div className={`flex h-10 items-center overflow-hidden rounded-md bg-deep-forest text-warm-cream ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>
              <button type="button" onClick={handleDec} aria-label={`Decrease ${title}`} className="flex h-10 w-9 items-center justify-center hover:bg-white/12">
                <Minus className="h-3 w-3" />
              </button>
              <span className="min-w-6 text-center font-inter text-sm font-bold">{qty}</span>
              <button type="button" onClick={handleInc} aria-label={`Increase ${title}`} className="flex h-10 w-9 items-center justify-center hover:bg-white/12">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-soft-border pt-3">
          <Link
            to={href}
            state={detailLinkState}
            className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-deep-forest/60 hover:text-deep-forest"
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Build presentation from a catalogue bundle row (shop merchandising). */
export function ComboProductCardFromBundle({ bundle, featured = false, index = 0, compact = false }) {
  const parent = bundle?.parent_product;
  if (!parent?.id) return null;
  const enriched = {
    ...parent,
    title: parent.title || parent.name,
    name: parent.name || parent.title,
    hero_image: parent.hero_image || parent.featured_image_url,
    featured_image_url: parent.featured_image_url || parent.hero_image,
    bundle_item_count: parent.bundle_item_count || bundle.item_count,
    bundle_net_weight_g: parent.bundle_net_weight_g || bundle.total_net_weight_g,
  };
  return (
    <ComboProductCard
      product={enriched}
      bundle={bundle}
      featured={featured}
      index={index}
      compact={compact}
    />
  );
}

export function computeBundleCardRetail(bundle, parent) {
  const productsById = new Map((bundle?.products || []).map((row) => [row.id, row]));
  return computeBundleRetailValue({
    bundle,
    productsById,
    comboSellingPrice: parent?.price,
  });
}
