import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { buildProductAltText } from '@/lib/productSeo';
import { getProductTeluguName } from '@/lib/teluguProductNames';
import { resolveVariantComparePrice } from '@/lib/productPricingUtils';
import { getVariantCartKey, normalizeList, normalizeProductVariant } from '@/lib/productVariantUtils';
import { isVideoMediaUrl, productPrimaryImageUrl, safeMedia } from '@/lib/mediaUrl';
import { getProductPath } from '@/lib/productUrls';
import OptimizedImage from '@/components/ui/OptimizedImage';

function toMediaDescriptor(media, preset = 'thumb') {
  if (!media) return null;
  const url = typeof media === 'string' ? safeMedia(media, preset) : safeMedia(media?.url || media?.media_url || media?.image_url || '', preset);
  if (!url) return null;
  const explicitType = typeof media === 'object' ? String(media.type || media.media_type || '').toLowerCase() : '';
  return { url, isVideo: explicitType === 'video' || isVideoMediaUrl(url) };
}

function getProductTitle(product) {
  return product?.title || product?.name || 'Yasvik product';
}

function compactText(value = '') {
  return String(value || '').trim();
}

function getSourceContext(product) {
  const producer = compactText(product?.farmer_name || product?.person_name || product?.producer_name || product?.farm_name);
  const vendor = compactText(product?.vendor_name || product?.supplier_name || product?.source_vendor);
  const location = compactText(product?.sourcing_location || product?.origin_region || product?.region_name || product?.location_label || product?.source_region);
  const process = compactText(product?.processing_method || product?.process || product?.method || product?.traditional_process);
  const direct = Boolean(product?.person_id || product?.source_person_id || producer);

  if (direct && producer && location) return `Producer ${producer} - ${location}`;
  if (direct && producer) return `Producer ${producer}`;
  if (direct && location) return `Producer-linked - ${location}`;
  if (vendor && location) return `Verified supplier - ${location}`;
  if (vendor) return `Verified supplier - ${vendor}`;
  if (location && process) return `${location} - ${process}`;
  if (location) return location;
  if (process) return process;
  return '';
}

function ProductImagePlaceholder({ title }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#eee4cf]">
      <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 28% 22%, rgba(139,105,20,.18), transparent 34%), radial-gradient(circle at 82% 72%, rgba(74,103,65,.16), transparent 34%)' }} />
      <div className="relative flex flex-col items-center text-center">
        <YasvikLogo variant="symbol" imageClassName="h-12 w-auto opacity-65" />
        <p className="mt-3 max-w-[9rem] font-inter text-[10px] uppercase tracking-[0.18em] text-[#9a9185]">{title}</p>
      </div>
    </div>
  );
}

export default function ProductCard({ product, index = 0, onQuickView, variant = 'default' }) {
  const isCommerce = variant === 'homepage' || variant === 'shop';
  const isShop = variant === 'shop';
  const { items, addItem, updateQty, storeOffline } = useCart();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedVariantLabel, setSelectedVariantLabel] = useState('');
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();
  const title = getProductTitle(product);
  const teluguName = getProductTeluguName(product);
  const productImageAlt = buildProductAltText(product);

  const imagePreset = isCommerce ? 'thumb' : 'card';
  const imageEager = isCommerce && index < 4;

  const variantOptions = useMemo(() => {
    const cleanVariant = (variant) => {
      const normalized = normalizeProductVariant(variant);
      if (!normalized) return null;
      return {
        ...normalized,
        image_url: safeMedia(normalized.image_url || normalized.image_urls?.[0] || '', imagePreset),
        image_urls: [],
      };
    };
    const fromQuick = normalizeList(product?.quick_variants).map(cleanVariant).filter(Boolean);
    if (fromQuick.length > 0) return fromQuick;
    return normalizeList(product?.variants).map(cleanVariant).filter(Boolean);
  }, [product?.quick_variants, product?.variants, imagePreset]);

  useEffect(() => {
    if (variantOptions.length > 0) {
      setSelectedVariantLabel((prev) => (prev && variantOptions.some((variant) => variant.label === prev) ? prev : variantOptions[0].label));
      return;
    }
    setSelectedVariantLabel('');
  }, [variantOptions, product?.id]);

  const selectedVariant = variantOptions.find((variant) => variant.label === selectedVariantLabel) || null;
  const cartKey = getVariantCartKey(product.id, selectedVariant);
  const cartItem = items.find((c) => c.key === cartKey);
  const qty = cartItem?.qty || 0;
  const activePrice = Number(selectedVariant?.price ?? product.price ?? 0);
  const activeComparePrice = Number(
    resolveVariantComparePrice(product, selectedVariant, activePrice) ?? 0,
  );
  const sourceContext = getSourceContext(product);
  const detailUrl = product.isFallback ? '/shop' : getProductPath(product);
  const unitLabel = selectedVariant?.label || product.unit || product.weight || product.pack_size || '';

  const primaryRawUrl = useMemo(
    () => productPrimaryImageUrl(product, selectedVariant),
    [product, selectedVariant],
  );
  const defaultMediaUrl = primaryRawUrl;
  const primaryMedia = useMemo(() => toMediaDescriptor(defaultMediaUrl, imagePreset), [defaultMediaUrl, imagePreset]);
  const hoverMedia = useMemo(() => {
    if (!isHovering) return null;
    const explicitHover = normalizeList(product?.hover_media).map((m) => toMediaDescriptor(m, imagePreset)).find(Boolean);
    if (explicitHover) return explicitHover;
    const galleryCandidate = normalizeList(product?.images || product?.image_urls)
      .map((u) => safeMedia(u, null))
      .find((url) => url && url !== defaultMediaUrl);
    return galleryCandidate ? toMediaDescriptor(galleryCandidate, imagePreset) : toMediaDescriptor(product?.hero_video, imagePreset);
  }, [defaultMediaUrl, imagePreset, isHovering, product?.hero_video, product?.hover_media, product?.image_urls, product?.images]);

  useEffect(() => {
    setImgLoaded(false);
  }, [primaryMedia?.url, product?.id]);

  const addPayload = {
    id: product.id,
    title,
    price: activePrice,
    hero_image: selectedVariant?.image_url || product.hero_image || product.featured_image_url || product.image_url,
    unit: unitLabel,
    sku: product.sku,
  };

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.isFallback || storeOffline) return;
    triggerPulse();
    addItem(addPayload, selectedVariant);
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

  const handlePreview = (e) => {
    if (!onQuickView) return;
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };

  const cardClass = isCommerce
    ? 'yasvik-product-card group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-soft-border bg-white text-deep-forest shadow-[0_10px_34px_rgba(31,61,43,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-neon-paddy/25 hover:shadow-[0_16px_42px_rgba(31,61,43,0.1)]'
    : 'yasvik-product-card group relative flex h-full flex-col overflow-hidden rounded-[1.45rem] border border-[#1a1814]/10 bg-[#fffaf0] text-[#1a1814] shadow-[0_16px_42px_rgba(26,24,20,.07)] transition-all duration-300 hover:-translate-y-1 hover:border-[#8b6914]/30 hover:shadow-[0_24px_62px_rgba(26,24,20,.13)]';

  const imageWrapClass = isCommerce ? 'relative aspect-square overflow-hidden bg-warm-cream' : 'relative aspect-square overflow-hidden bg-[#eee4cf]';

  const titleClass = isCommerce
    ? 'line-clamp-2 min-h-[2.75rem] font-inter text-[15px] font-bold leading-snug text-deep-forest md:min-h-[3rem] md:text-base'
    : 'line-clamp-2 min-h-[3.2rem] font-cormorant text-[24px] font-semibold leading-[1.05] tracking-[-0.01em] text-[#1a1814] md:text-[26px]';

  const showSourceBadge = sourceContext && !isCommerce;
  const showSourceSubtitle = sourceContext && !isCommerce;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.34, delay: Math.min(index * 0.03, 0.18), ease: [0.22, 1, 0.36, 1] }}
      className={cardClass}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') setIsHovering(true);
      }}
      onPointerLeave={() => setIsHovering(false)}
    >
      <div className={imageWrapClass}>
        {onQuickView ? (
          <button type="button" onClick={handlePreview} className="absolute inset-0 z-[1]" aria-label={`Preview ${title}`} />
        ) : (
          <Link to={detailUrl} className="absolute inset-0 z-[1]" aria-label={`Open ${title}`} />
        )}

        {primaryMedia?.url && !primaryMedia.isVideo ? (
          <OptimizedImage
            src={defaultMediaUrl}
            alt={productImageAlt}
            preset={imagePreset}
            eager={imageEager}
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035] ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
          />
        ) : primaryMedia?.url && primaryMedia.isVideo ? (
          <video src={primaryMedia.url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} autoPlay loop muted playsInline />
        ) : (
          <ProductImagePlaceholder title={title} />
        )}

        {hoverMedia?.url && !hoverMedia.isVideo && (
          <OptimizedImage
            src={hoverMedia.url}
            alt=""
            preset={imagePreset}
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${isHovering ? 'scale-100 opacity-100' : 'scale-[1.025] opacity-0'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
          />
        )}
        {hoverMedia?.url && hoverMedia.isVideo && isHovering && (
          <video src={hoverMedia.url} className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-500" autoPlay loop muted playsInline preload="metadata" />
        )}
        {showSourceBadge && (
          <div className="absolute left-3 top-3 z-[3] max-w-[calc(100%-1.5rem)] rounded-full bg-[#1e1c18]/82 px-3 py-1.5 font-inter text-[10px] font-bold uppercase tracking-[0.13em] text-[#f5f1e8] backdrop-blur">
            <span className="line-clamp-1">{sourceContext}</span>
          </div>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${isCommerce ? 'p-3.5 md:p-4' : 'p-4'}`}>
        <Link to={detailUrl} onClick={onQuickView ? handlePreview : undefined} className="block text-left">
          <h3 className={titleClass}>{title}</h3>
          {teluguName ? (
            <p className="mt-1 line-clamp-2 font-cormorant text-sm leading-snug text-deep-forest/60">{teluguName}</p>
          ) : null}
        </Link>
        {showSourceSubtitle ? (
          <p className="mt-2 line-clamp-1 font-inter text-[12px] leading-5 text-[#6f675d]">{sourceContext}</p>
        ) : !isCommerce ? (
          <p className="mt-2 line-clamp-1 font-inter text-[12px] leading-5 text-[#9a9185]">Thoughtfully chosen for everyday kitchens</p>
        ) : null}

        {variantOptions.length > 0 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
            {variantOptions.map((variant) => (
              <button
                key={variant.label}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedVariantLabel(variant.label); }}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 font-inter text-[10px] font-bold transition-colors ${selectedVariant?.label === variant.label ? (isCommerce ? 'bg-deep-forest text-warm-cream' : 'bg-[#1e1c18] text-[#f5f1e8]') : (isCommerce ? 'border border-soft-border bg-warm-cream text-deep-forest/70 hover:border-neon-paddy/30' : 'border border-[#1a1814]/10 bg-[#f5f1e8] text-[#6f675d] hover:border-[#8b6914]/35')}`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        )}

        <div className={`mt-auto flex items-end justify-between gap-3 ${isCommerce ? 'pt-3' : 'pt-4'}`}>
          <div>
            <div className={`font-cormorant font-semibold leading-none text-deep-forest ${isCommerce ? 'text-[1.65rem] md:text-[1.75rem]' : 'mt-1 text-[28px] text-[#1a1814]'}`}>
              ₹{activePrice || product.price || 0}
            </div>
            {activeComparePrice > activePrice && (
              <div className={`font-inter line-through ${isCommerce ? 'mt-0.5 text-[11px] text-deep-forest/45' : 'text-[11px] text-[#9a9185]'}`}>
                ₹{activeComparePrice}
              </div>
            )}
            {unitLabel && (
              <div className={`font-inter ${isCommerce ? 'mt-1 text-[11px] font-medium text-deep-forest/55' : 'text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a9185]'}`}>
                {unitLabel}
              </div>
            )}
          </div>
          {product.isFallback ? (
            <Link
              to="/shop"
              className={`flex h-10 min-w-20 items-center justify-center rounded-full px-4 font-inter text-[11px] font-bold uppercase tracking-[0.12em] ${isCommerce ? 'border border-soft-border text-deep-forest hover:border-neon-paddy/30' : 'border border-[#1a1814]/20 text-[#1a1814]'}`}
            >
              View
            </Link>
          ) : qty === 0 ? (
            <button
              onClick={handleAdd}
              disabled={storeOffline}
              className={`flex h-10 min-w-20 items-center justify-center rounded-full px-4 font-inter text-[11px] font-bold uppercase tracking-[0.13em] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${isCommerce ? 'bg-neon-paddy text-white hover:bg-deep-forest' : 'bg-[#1e1c18] text-[#f5f1e8] hover:bg-[#4a6741]'} ${isPulseActive ? 'premium-haptic-pulse' : ''}`}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> {storeOffline ? 'Restocking' : 'Add'}
            </button>
          ) : (
            <div className={`flex h-10 items-center overflow-hidden rounded-full ${isCommerce ? 'bg-deep-forest text-warm-cream' : 'bg-[#1e1c18] text-[#f5f1e8]'} ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>
              <button onClick={handleDec} aria-label={`Decrease ${title}`} className="flex h-10 w-9 items-center justify-center hover:bg-white/12"><Minus className="h-3.5 w-3.5" /></button>
              <span className="min-w-7 text-center font-inter text-sm font-bold">{qty}</span>
              <button onClick={handleInc} aria-label={`Increase ${title}`} className="flex h-10 w-9 items-center justify-center hover:bg-white/12"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>

        {!product.isFallback && (
          <div className={`mt-3 border-t pt-3 ${isCommerce ? 'border-soft-border' : 'border-[#1a1814]/8'}`}>
            <Link to={detailUrl} className={`font-inter text-[10px] font-bold uppercase tracking-[0.16em] ${isCommerce ? 'text-deep-forest/60 hover:text-deep-forest' : 'text-[#6f675d] hover:text-[#1a1814]'}`}>View details</Link>
          </div>
        )}
      </div>
    </motion.article>
  );
}
