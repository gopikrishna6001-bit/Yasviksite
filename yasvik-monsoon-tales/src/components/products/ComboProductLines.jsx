import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { getProductPath } from '@/lib/productUrls';
import { isComboLineUnavailable } from '@/lib/comboDisplayUtils';

function ComboProductRow({ line, compact = false, size = 'default' }) {
  const unavailable = isComboLineUnavailable(line.product);
  const href = getProductPath(line.product);
  const large = size === 'large';
  const imageClass = compact
    ? 'h-14 w-14'
    : large
      ? 'h-24 w-24 sm:h-28 sm:w-28'
      : 'h-[4.25rem] w-[4.25rem]';

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-soft-border/80 bg-white ${
        compact ? 'p-2' : large ? 'p-3' : 'p-2.5'
      } ${unavailable ? 'opacity-60' : ''}`}
    >
      <Link
        to={href}
        className={`relative flex-shrink-0 overflow-hidden rounded-xl bg-warm-cream ${imageClass}`}
      >
        {line.imageUrl ? (
          <OptimizedImage
            src={line.imageUrl}
            alt={line.title}
            preset={large ? 'card' : 'thumb'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-inter text-[9px] text-deep-forest/35">
            Yasvik
          </div>
        )}
        {line.quantity > 1 ? (
          <span className="absolute bottom-1 right-1 rounded-md bg-deep-forest/90 px-1.5 py-0.5 font-inter text-[9px] font-bold text-warm-cream">
            ×{line.quantity}
          </span>
        ) : null}
      </Link>

      <div className="min-w-0 flex-1">
        <Link to={href} className={`line-clamp-2 font-inter font-semibold leading-snug text-deep-forest hover:text-neon-paddy ${large ? 'text-[15px]' : 'text-[13px]'}`}>
          {line.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {line.packLabel ? (
            <span className="rounded-full border border-soft-border bg-warm-cream px-2 py-0.5 font-inter text-[10px] font-bold uppercase tracking-wide text-deep-forest/70">
              {line.packLabel}
            </span>
          ) : null}
          <span className={`font-inter font-semibold text-deep-forest ${large ? 'text-sm' : 'text-xs'}`}>
            ₹{line.price}
            {line.quantity > 1 ? (
              <span className="ml-1 font-normal text-deep-forest/45">each</span>
            ) : null}
          </span>
          {unavailable ? (
            <span className="font-inter text-[10px] font-medium text-red-500">Unavailable</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ComboProductLines({
  lineItems = [],
  defaultExpanded = true,
  previewCount = 2,
  className = '',
  size = 'default',
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const items = Array.isArray(lineItems) ? lineItems : [];
  if (!items.length) return null;

  const hiddenCount = Math.max(0, items.length - previewCount);
  const previewItems = expanded ? items : items.slice(0, previewCount);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="mb-2 flex w-full items-center justify-between gap-2 rounded-xl border border-soft-border/70 bg-warm-cream/70 px-3 py-2 text-left transition-colors hover:bg-warm-cream"
      >
        <span className="font-inter text-xs font-bold uppercase tracking-[0.12em] text-deep-forest/55">
          What&apos;s inside · {items.length} product{items.length === 1 ? '' : 's'}
        </span>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-deep-forest/45" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        <motion.div
          key={expanded ? 'open' : 'closed'}
          initial={{ opacity: 0.96 }}
          animate={{ opacity: 1 }}
          className="space-y-2.5"
        >
          {previewItems.map((line) => (
            <ComboProductRow
              key={`${line.productId}-${line.packLabel}`}
              line={line}
              size={size}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      {!expanded && hiddenCount > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 w-full rounded-xl border border-dashed border-soft-border py-2 font-inter text-xs font-bold text-neon-paddy hover:border-neon-paddy/40"
        >
          Show {hiddenCount} more product{hiddenCount === 1 ? '' : 's'}
        </button>
      ) : null}
    </div>
  );
}
