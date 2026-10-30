import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  buildBundleDisplayLines,
  computeBundleRetailValue,
  formatNetWeightLabel,
} from '@/lib/productBundleUtils';
import { useCart } from '@/lib/CartContext';

const COLLAPSE_AFTER = 6;
const PREVIEW_WHEN_COLLAPSED = 6;
/** Large discovery boxes: compact 3-line preview before expand. */
const LARGE_BUNDLE_PREVIEW = 3;
const LARGE_BUNDLE_ITEM_THRESHOLD = 15;
const SESSION_KEY = 'yasvik_bundle_whats_inside_expanded';

function AvailabilityPill({ line, alreadyInCombo }) {
  if (alreadyInCombo) {
    return (
      <span className="font-inter text-[10px] font-semibold text-deep-forest">
        ✓ Included in this combo
      </span>
    );
  }
  if (line.archived || line.missingLinked) {
    return <span className="font-inter text-[10px] font-medium text-amber-700">Unavailable to open</span>;
  }
  if (line.unavailable) {
    return <span className="font-inter text-[10px] font-medium text-red-600">Unavailable</span>;
  }
  if (line.product && line.product.is_published === false) {
    return <span className="font-inter text-[10px] font-medium text-amber-700">Coming soon</span>;
  }
  return (
    <span className="font-inter text-[10px] font-medium text-deep-forest/55">
      Included in this combo
    </span>
  );
}

function ContentRow({ line, alreadyInCombo }) {
  const quantityLabel = String(line.quantityLabel || '').trim();
  const priceLabel = Number.isFinite(Number(line.linePriceRs)) && Number(line.linePriceRs) > 0
    ? `₹${Math.round(Number(line.linePriceRs)).toLocaleString('en-IN')}`
    : null;

  const inner = (
    <div
      className={`flex items-center gap-3 rounded-xl border border-soft-border/70 bg-[#FFFAF0]/70 p-2.5 ${
        line.unavailable || line.linkDisabled ? 'opacity-80' : ''
      }`}
    >
      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-warm-cream sm:h-16 sm:w-16">
        {line.imageUrl ? (
          <OptimizedImage
            src={line.imageUrl}
            alt={line.title}
            preset="thumb"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-inter text-[9px] text-deep-forest/35">
            Yasvik
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-inter text-[13px] font-semibold leading-snug text-deep-forest">
            {line.title}
          </p>
          {priceLabel ? (
            <p className="shrink-0 font-inter text-[13px] font-bold text-deep-forest">
              {priceLabel}
            </p>
          ) : null}
        </div>
        {quantityLabel ? (
          <p className="mt-1 font-inter text-xs text-deep-forest/65">{quantityLabel}</p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <AvailabilityPill line={line} alreadyInCombo={alreadyInCombo} />
        </div>
      </div>
    </div>
  );

  if (line.href && !line.linkDisabled) {
    return (
      <Link to={line.href} className="block transition-opacity hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

/**
 * PDP What’s Inside.
 * >6 items: collapsed by default with first-6 preview + expand control.
 * ≤6 items: show all (compact).
 */
export default function BundleWhatsInside({
  bundle,
  className = '',
  showSubstitution = true,
  parentProductId = null,
  collapseAbove = COLLAPSE_AFTER,
  comboPrice = null,
}) {
  const panelId = useId();
  const { items: cartItems = [] } = useCart();
  const bundleKey = bundle?.id || parentProductId || 'bundle';
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (map[bundleKey] === true) setExpanded(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [bundleKey]);

  const persistExpanded = (next) => {
    setExpanded(next);
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[bundleKey] = next;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  };

  if (!bundle) return null;

  const cartProductIds = new Set(cartItems.map((row) => row.productId).filter(Boolean));
  const comboInCart = Boolean(parentProductId && cartProductIds.has(parentProductId));

  const productsById = new Map((bundle.products || []).map((row) => [row.id, row]));
  const lines = buildBundleDisplayLines(bundle, productsById);
  const retail = computeBundleRetailValue({
    bundle,
    productsById,
    comboSellingPrice: comboPrice,
  });
  if (!lines.length) {
    if (bundle.bundle_status === 'unresolved' || bundle.has_unresolved_components) {
      return (
        <div className={`rounded-2xl border border-amber-700/25 bg-amber-50/80 p-4 ${className}`}>
          <h3 className="font-inter text-sm font-semibold text-deep-forest">What&apos;s inside</h3>
          <p className="mt-2 font-inter text-xs leading-relaxed text-deep-forest/70">
            Contents are being confirmed. This combo is not ready for purchase yet.
          </p>
        </div>
      );
    }
    return null;
  }

  const itemCount = Number(bundle.item_count) || lines.length;
  const totalPacks = lines.reduce((sum, row) => sum + (Number(row.packCount) || 1), 0);
  const weightLabel = formatNetWeightLabel(bundle.total_net_weight_g)
    || formatNetWeightLabel(lines.reduce((sum, row) => sum + row.netWeightGrams, 0));
  const shouldCollapse = lines.length > collapseAbove;
  const previewCount = itemCount >= LARGE_BUNDLE_ITEM_THRESHOLD || lines.length >= LARGE_BUNDLE_ITEM_THRESHOLD
    ? LARGE_BUNDLE_PREVIEW
    : PREVIEW_WHEN_COLLAPSED;
  // Until session hydration finishes, keep large lists collapsed to avoid flash of full content.
  const isOpen = shouldCollapse ? (hydrated && expanded) : true;
  const visibleLines = shouldCollapse && !isOpen
    ? lines.slice(0, previewCount)
    : lines;

  return (
    <section className={`rounded-2xl border border-soft-border/80 bg-white p-4 sm:p-5 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-inter text-sm font-semibold tracking-wide text-deep-forest">
            What&apos;s inside
          </h3>
          <p className="mt-1 font-inter text-xs text-deep-forest/55">
            {itemCount} product{itemCount === 1 ? '' : 's'}
            {weightLabel ? ` · Total net weight: ${weightLabel}` : ''}
            {shouldCollapse && !isOpen ? ` · showing ${visibleLines.length}` : ''}
          </p>
        </div>
      </div>

      <div id={panelId} className="mt-4 space-y-2.5" hidden={false}>
        {visibleLines.map((line) => {
          const alreadyInCombo = comboInCart || (line.productId && cartProductIds.has(line.productId));
          return (
            <ContentRow
              key={line.id}
              line={line}
              alreadyInCombo={alreadyInCombo}
            />
          );
        })}
      </div>

      {shouldCollapse ? (
        <button
          type="button"
          onClick={() => persistExpanded(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="mt-3 w-full rounded-full border border-deep-forest/20 py-2.5 font-inter text-xs font-bold text-deep-forest hover:border-deep-forest"
        >
          {isOpen ? 'Hide contents' : `View all ${itemCount} products`}
        </button>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-soft-border/70 pt-3">
        <div>
          <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">Products</p>
          <p className="mt-0.5 font-inter text-sm font-semibold text-deep-forest">{itemCount}</p>
        </div>
        <div>
          <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">Packs</p>
          <p className="mt-0.5 font-inter text-sm font-semibold text-deep-forest">{totalPacks}</p>
        </div>
        <div>
          <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">Net weight</p>
          <p className="mt-0.5 font-inter text-sm font-semibold text-deep-forest">{weightLabel || '—'}</p>
        </div>
      </div>

      {retail.hasRealSave ? (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-deep-forest/5 px-3 py-2.5">
          <div>
            <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">
              Separate
            </p>
            <p className="font-inter text-sm font-semibold text-deep-forest/50 line-through">
              ₹{Math.round(retail.separateTotalRs).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">
              Combo
            </p>
            <p className="font-inter text-sm font-bold text-deep-forest">
              ₹{Math.round(retail.comboPriceRs).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-right">
            <p className="font-inter text-[10px] font-bold uppercase tracking-wider text-deep-forest/45">
              You save
            </p>
            <p className="font-inter text-sm font-bold text-deep-forest">
              ₹{Math.round(retail.saveAmountRs).toLocaleString('en-IN')}
              {retail.savePct != null && retail.savePct >= 1 ? (
                <span className="ml-1 font-medium text-deep-forest/60">
                  ({Math.round(retail.savePct)}%)
                </span>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      {showSubstitution && bundle.substitution_policy ? (
        <p className="mt-3 font-inter text-[11px] leading-relaxed text-deep-forest/50">
          {bundle.substitution_policy}
        </p>
      ) : null}
    </section>
  );
}

export function BundleCardMeta({ bundle, className = '' }) {
  if (!bundle) return null;
  const itemCount = Number(bundle.item_count) || (bundle.items || []).length;
  const weightLabel = formatNetWeightLabel(bundle.total_net_weight_g);
  if (!itemCount && !weightLabel) return null;

  return (
    <div className={`font-inter text-[11px] text-deep-forest/60 ${className}`}>
      {itemCount ? (
        <span>
          {itemCount} product{itemCount === 1 ? '' : 's'}
        </span>
      ) : null}
      {itemCount && weightLabel ? <span> · </span> : null}
      {weightLabel ? <span>{weightLabel}</span> : null}
    </div>
  );
}
