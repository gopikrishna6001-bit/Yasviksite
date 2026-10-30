import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, CreditCard, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCart } from '@/lib/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import PackSavingsBadge from '@/components/products/PackSavingsBadge';
import { sumCartBulkSavings } from '@/lib/variantBulkSavings';
import CartForgotThese from '@/components/crosssell/CartForgotThese';
import YasvikButton from '@/components/brand/YasvikButton';
import { safeMedia } from '@/lib/mediaUrl';
import { formatCartLineVariant, getCartLineSavings } from '@/lib/cartDisplayUtils';
import { MIN_DELIVERY_ORDER_RS } from '@/lib/commerceCopy';
import {
  isCartBundleLine,
  formatComboMetaLine,
  formatComboQtySummary,
  formatScaledComponentQuantity,
  formatRupee,
  buildBundleCartSnapshot,
} from '@/lib/comboVisualUtils';
import { fetchBundleForProduct } from '@/services/productRelationsApi';
import { formatNetWeightLabel } from '@/lib/productBundleUtils';
import ComboMosaic from '@/components/products/ComboMosaic';

function CartBundleContents({ item }) {
  const [open, setOpen] = useState(false);
  const stored = Array.isArray(item.bundleContents) ? item.bundleContents : [];
  const legacy = Array.isArray(item.products) ? item.products : [];
  const needsFetch = open && !stored.length && item.type !== 'combo' && item.productId;
  const comboQty = Math.max(1, Number(item.qty) || 1);

  const { data: bundle } = useQuery({
    queryKey: ['cart-bundle-contents', item.productId],
    queryFn: () => fetchBundleForProduct(item.productId, { includeDraftComponents: true }),
    enabled: Boolean(needsFetch),
    staleTime: 5 * 60 * 1000,
  });

  const lines = (() => {
    if (stored.length) return stored;
    if (legacy.length) {
      return legacy.map((row) => ({
        id: row.id,
        title: row.title || row.name,
        quantityLabel: row.qty > 1 ? `× ${row.qty}` : '',
        imageUrl: null,
      }));
    }
    if (!bundle) return [];
    return buildBundleCartSnapshot(
      { id: item.productId, title: item.title, slug: item.productSlug },
      bundle,
      bundle.items,
      bundle.products,
    ).bundleContents || [];
  })();

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-warm-cream/80 px-2.5 py-1.5 text-left"
      >
        <span className="font-inter text-[11px] font-semibold text-deep-forest/70">View contents</span>
        <ChevronDown className={`h-3.5 w-3.5 text-deep-forest/45 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <ul className="mt-2 space-y-1.5 rounded-xl border border-soft-border/70 bg-white p-2">
              {lines.length ? lines.map((line) => {
                const quantityLabel = line.quantityValue != null
                  ? formatScaledComponentQuantity({
                    quantityValue: line.quantityValue,
                    quantityUnit: line.quantityUnit,
                    packCount: line.packCount,
                    comboQty,
                  })
                  : line.quantityLabel;
                return (
                  <li key={line.id || line.productId || line.title} className="flex items-center gap-2">
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-lg bg-warm-cream">
                      {line.imageUrl ? (
                        <img src={safeMedia(line.imageUrl, 'thumb')} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      {line.href && !line.linkDisabled ? (
                        <Link to={line.href} className="block truncate font-inter text-xs font-semibold text-deep-forest hover:underline">
                          {line.title}
                        </Link>
                      ) : (
                        <p className="truncate font-inter text-xs font-semibold text-deep-forest">{line.title}</p>
                      )}
                      {quantityLabel ? (
                        <p className="font-inter text-[10px] text-deep-forest/50">{quantityLabel}</p>
                      ) : null}
                    </div>
                  </li>
                );
              }) : (
                <li className="px-1 py-2 font-inter text-[11px] text-deep-forest/50">Loading contents…</li>
              )}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function CartDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, totalPrice, totalItems, storeOffline } = useCart();
  const totalBulkSavings = sumCartBulkSavings(items);

  const handleCheckout = () => {
    if (storeOffline) return;
    onClose();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-deep-forest/25 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-soft-border bg-warm-cream text-deep-forest shadow-[0_24px_64px_rgba(31,61,43,0.16)]"
            aria-label="Shopping cart"
          >
            <div className="flex items-center justify-between border-b border-soft-border bg-white/90 px-5 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-deep-forest" strokeWidth={1.7} />
                <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">
                  My Cart
                  {totalItems > 0 && (
                    <span className="ml-2 font-inter text-sm font-medium text-deep-forest/55">({totalItems})</span>
                  )}
                </h2>
              </div>
              <button type="button" onClick={onClose} aria-label="Close cart" className="yasvik-icon-button h-9 w-9">
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="mb-4 h-12 w-12 text-deep-forest/20" strokeWidth={1.5} />
                  <p className="font-cormorant text-2xl font-semibold text-deep-forest">Your cart is empty</p>
                  <p className="mt-2 font-inter text-sm text-deep-forest/65">
                    Add millets, staples and pantry essentials, then check out on the website.
                  </p>
                  <YasvikButton to="/shop" onClick={onClose} variant="primary" className="mt-5">
                    Start shopping
                  </YasvikButton>
                </div>
              ) : (
                items.map((item) => {
                  const isBundle = isCartBundleLine(item);
                  const variantLabel = isBundle ? null : formatCartLineVariant(item);
                  const savings = getCartLineSavings(item);
                  const metaLine = isBundle
                    ? formatComboQtySummary({
                      comboQty: item.qty,
                      itemCount: item.bundleItemCount || item.products?.length,
                      packCount: item.bundlePackCount || item.bundleItemCount,
                      netWeightG: item.bundleNetWeightG,
                    })
                    || item.bundleMetaLine
                    || formatComboMetaLine({
                      itemCount: item.bundleItemCount || item.products?.length,
                      netWeightG: item.bundleNetWeightG,
                      netWeightLabel: formatNetWeightLabel(item.bundleNetWeightG),
                    })
                    : null;
                  const lineTotal = Number(item.price) * Number(item.qty || 1);
                  const mosaicProducts = (item.bundleContents || [])
                    .filter((row) => row?.imageUrl)
                    .map((row) => ({
                      id: row.id || row.productId,
                      hero_image: row.imageUrl,
                      featured_image_url: row.imageUrl,
                    }));

                  return (
                    <div key={item.key} className="rounded-2xl border border-soft-border bg-white p-3 shadow-[0_8px_24px_rgba(31,61,43,0.04)]">
                      <div className="flex gap-3">
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-soft-border bg-warm-cream">
                          {item.hero_image ? (
                            <img src={safeMedia(item.hero_image, 'thumb')} alt={item.title || 'Cart item'} className="h-full w-full object-cover" />
                          ) : isBundle ? (
                            <ComboMosaic
                              products={mosaicProducts}
                              totalCount={item.bundleItemCount}
                              className="h-full w-full"
                              alt={item.title || 'Combo'}
                            />
                          ) : (
                            <ShoppingBag className="h-6 w-6 text-deep-forest/25" strokeWidth={1.5} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          {isBundle ? (
                            <p className="font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-sun-dried-clay">
                              {item.yasvikMark || 'Combo'}
                            </p>
                          ) : null}
                          <p className="font-inter text-sm font-semibold leading-snug text-deep-forest">
                            {item.title || 'Yasvik product'}
                          </p>
                          {isBundle && item.comboOption?.label ? (
                            <p className="mt-0.5 font-inter text-[11px] font-medium text-deep-forest/65">
                              Option:
                              {' '}
                              {item.comboOption.label}
                            </p>
                          ) : null}
                          {isBundle && metaLine ? (
                            <p className="mt-0.5 font-inter text-[11px] text-deep-forest/55">{metaLine}</p>
                          ) : null}
                          {variantLabel ? (
                            <p className="mt-0.5 font-inter text-[11px] font-medium text-deep-forest/60">{variantLabel}</p>
                          ) : null}
                          <PackSavingsBadge savings={item.bulk_savings} qty={item.qty} surface="cart" className="mt-0.5" />
                          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-inter text-base font-bold text-deep-forest">
                              {formatRupee(lineTotal) || `₹${lineTotal}`}
                            </span>
                            {savings ? (
                              <>
                                <span className="font-inter text-xs text-deep-forest/40 line-through">
                                  MRP ₹{savings.compare * item.qty}
                                </span>
                                <span className="rounded-full bg-deep-forest/8 px-2 py-0.5 font-inter text-[10px] font-bold text-deep-forest">
                                  Save ₹{savings.saveTotal}
                                </span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.title || 'item'}`}
                          className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-deep-forest/45 hover:bg-warm-cream hover:text-sun-dried-clay"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center overflow-hidden rounded-lg border border-soft-border bg-warm-cream">
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, item.qty - 1)}
                            className="flex h-8 w-8 items-center justify-center hover:bg-white"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-7 text-center font-inter text-sm font-bold">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.key, item.qty + 1)}
                            className="flex h-8 w-8 items-center justify-center hover:bg-white"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {isBundle ? <CartBundleContents item={item} /> : null}
                    </div>
                  );
                })
              )}
            </div>

            {items.length > 0 ? (
              <CartForgotThese cartProductIds={items.map((item) => item.productId || item.id).filter(Boolean)} />
            ) : null}

            {items.length > 0 && (
              <div className="shrink-0 space-y-2 border-t border-soft-border bg-white/90 px-5 py-3 backdrop-blur-sm">
                <div className="space-y-1 font-inter text-sm">
                  {totalBulkSavings > 0 ? (
                    <div className="flex justify-between text-deep-forest/70">
                      <span>Fair pricing benefit</span>
                      <span>₹{totalBulkSavings}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-cormorant text-xl font-semibold text-deep-forest">
                    <span>Total</span>
                    <span>₹{totalPrice}</span>
                  </div>
                  <p className="font-inter text-[10px] text-deep-forest/45">
                    {totalPrice < MIN_DELIVERY_ORDER_RS
                      ? `Add ₹${Math.ceil(MIN_DELIVERY_ORDER_RS - totalPrice)} more for home delivery · or pick up free at our store`
                      : 'Delivery extra · standard Porter / Rapido / courier charges'}
                  </p>
                </div>
                {storeOffline && (
                  <p className="rounded-xl border border-deep-forest/20 bg-warm-cream px-3 py-2 font-inter text-xs font-semibold text-deep-forest/75">
                    We&apos;re restocking the shop — checkout will open again soon.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={storeOffline}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-deep-forest py-3 font-inter text-sm font-bold text-warm-cream disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" /> Proceed to checkout
                </button>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
