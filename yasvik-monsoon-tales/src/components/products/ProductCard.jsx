import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { buildProductAltText } from '@/lib/productSeo';
import { getVariantCartKey, normalizeList, normalizeProductVariant } from '@/lib/productVariantUtils';

function isVideoUrl(url) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(String(url || ''));
}

function isRandomPlaceholder(url = '') {
  return /picsum\.photos|source\.unsplash\.com|placehold/i.test(String(url));
}

function safeMedia(url = '') {
  const value = String(url || '').trim();
  return value && !isRandomPlaceholder(value) ? value : '';
}

function toMediaDescriptor(media) {
  if (!media) return null;
  const url = typeof media === 'string' ? safeMedia(media) : safeMedia(media?.url || media?.media_url || media?.image_url || '');
  if (!url) return null;
  const explicitType = typeof media === 'object' ? String(media.type || media.media_type || '').toLowerCase() : '';
  return { url, isVideo: explicitType === 'video' || isVideoUrl(url) };
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

export default function ProductCard({ product, index = 0, onQuickView }) {
  const { items, addItem, updateQty } = useCart();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedVariantLabel, setSelectedVariantLabel] = useState('');
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();
  const title = getProductTitle(product);
  const productImageAlt = buildProductAltText(product);

  const variantOptions = useMemo(() => {
    const cleanVariant = (variant) => {
      const normalized = normalizeProductVariant(variant);
      if (!normalized) return null;
      return {
        ...normalized,
        image_url: safeMedia(normalized.image_url || ''),
        image_urls: normalizeList(normalized.image_urls).map(safeMedia).filter(Boolean),
      };
    };
    const fromQuick = normalizeList(product?.quick_variants).map(cleanVariant).filter(Boolean);
    if (fromQuick.length > 0) return fromQuick;
    return normalizeList(product?.variants).map(cleanVariant).filter(Boolean);
  }, [product?.quick_variants, product?.variants]);

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
  const activeComparePrice = Number(selectedVariant?.compare_price ?? product.compare_price ?? 0);
  const sourceContext = getSourceContext(product);
  const detailUrl = product.isFallback ? '/shop' : `/product/${product.id}`;
  const unitLabel = selectedVariant?.label || product.unit || product.weight || product.pack_size || '';

  const defaultMediaUrl = safeMedia(selectedVariant?.image_url || selectedVariant?.image_urls?.[0] || product.hero_image || product.featured_image_url || product.image_url || '');
  const primaryMedia = useMemo(() => toMediaDescriptor(defaultMediaUrl), [defaultMediaUrl]);
  const hoverMedia = useMemo(() => {
    const explicitHover = normalizeList(product?.hover_media).map(toMediaDescriptor).find(Boolean);
    if (explicitHover) return explicitHover;
    const variantGallery = normalizeList(selectedVariant?.image_urls).map(safeMedia).filter(Boolean);
    const productGallery = normalizeList(product?.images || product?.image_urls).map(safeMedia).filter(Boolean);
    const galleryCandidate = [...variantGallery, ...productGallery].find((url) => url && url !== defaultMediaUrl);
    return galleryCandidate ? toMediaDescriptor(galleryCandidate) : toMediaDescriptor(product?.hero_video);
  }, [defaultMediaUrl, product?.hero_video, product?.hover_media, product?.image_urls, product?.images, selectedVariant?.image_urls]);

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
    if (product.isFallback) return;
    triggerPulse();
    addItem(addPayload, selectedVariant);
  };

  const handleInc = (e) => {
    e.preventDefault();
    e.stopPropagation();
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

  const whatsappHref = `https://wa.me/917842938998?text=${encodeURIComponent(`Hi Yasvik, I want to know more about ${title}.`)}`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.34, delay: Math.min(index * 0.03, 0.18), ease: [0.22, 1, 0.36, 1] }}
      className="yasvik-product-card group relative flex h-full flex-col overflow-hidden rounded-[1.45rem] border border-[#1a1814]/10 bg-[#fffaf0] text-[#1a1814] shadow-[0_16px_42px_rgba(26,24,20,.07)] transition-all duration-300 hover:-translate-y-1 hover:border-[#8b6914]/30 hover:shadow-[0_24px_62px_rgba(26,24,20,.13)]"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') setIsHovering(true);
      }}
      onPointerLeave={() => setIsHovering(false)}
    >
      <div className="relative aspect-[1.02/1] overflow-hidden bg-[#eee4cf]">
        {onQuickView ? (
          <button type="button" onClick={handlePreview} className="absolute inset-0 z-[1]" aria-label={`Preview ${title}`} />
        ) : (
          <Link to={detailUrl} className="absolute inset-0 z-[1]" aria-label={`Open ${title}`} />
        )}

        {primaryMedia?.url && !primaryMedia.isVideo ? (
          <motion.img
            src={primaryMedia.url}
            alt={productImageAlt}
            onLoad={() => setImgLoaded(true)}
            animate={{ opacity: imgLoaded ? 1 : 0, scale: imgLoaded ? 1 : 1.025 }}
            transition={{ duration: 0.28 }}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
            style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        ) : primaryMedia?.url && primaryMedia.isVideo ? (
          <video src={primaryMedia.url} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} autoPlay loop muted playsInline />
        ) : (
          <ProductImagePlaceholder title={title} />
        )}

        {hoverMedia?.url && !hoverMedia.isVideo && (
          <img
            src={hoverMedia.url}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${isHovering ? 'scale-100 opacity-100' : 'scale-[1.025] opacity-0'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        )}
        {hoverMedia?.url && hoverMedia.isVideo && isHovering && (
          <video src={hoverMedia.url} className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-500" autoPlay loop muted playsInline preload="metadata" />
        )}
        {sourceContext && (
          <div className="absolute left-3 top-3 z-[3] max-w-[calc(100%-1.5rem)] rounded-full bg-[#1e1c18]/82 px-3 py-1.5 font-inter text-[10px] font-bold uppercase tracking-[0.13em] text-[#f5f1e8] backdrop-blur">
            <span className="line-clamp-1">{sourceContext}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link to={detailUrl} onClick={onQuickView ? handlePreview : undefined} className="block text-left">
          <h3 className="line-clamp-2 min-h-[3.2rem] font-cormorant text-[24px] font-semibold leading-[1.05] tracking-[-0.01em] text-[#1a1814] md:text-[26px]">{title}</h3>
        </Link>
        {sourceContext ? (
          <p className="mt-2 line-clamp-1 font-inter text-[12px] leading-5 text-[#6f675d]">{sourceContext}</p>
        ) : (
          <p className="mt-2 line-clamp-1 font-inter text-[12px] leading-5 text-[#9a9185]">Thoughtfully chosen for everyday kitchens</p>
        )}

        {variantOptions.length > 0 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
            {variantOptions.map((variant) => (
              <button
                key={variant.label}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedVariantLabel(variant.label); }}
                className={`flex-shrink-0 rounded-full px-3 py-1.5 font-inter text-[10px] font-bold transition-colors ${selectedVariant?.label === variant.label ? 'bg-[#1e1c18] text-[#f5f1e8]' : 'border border-[#1a1814]/10 bg-[#f5f1e8] text-[#6f675d] hover:border-[#8b6914]/35'}`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            {unitLabel && <div className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a9185]">{unitLabel}</div>}
            <div className="mt-1 font-cormorant text-[28px] font-semibold leading-none text-[#1a1814]">₹{activePrice || product.price || 0}</div>
            {activeComparePrice > activePrice && <div className="font-inter text-[11px] text-[#9a9185] line-through">₹{activeComparePrice}</div>}
          </div>
          {product.isFallback ? (
            <Link to="/shop" className="flex h-10 min-w-20 items-center justify-center rounded-full border border-[#1a1814]/20 px-4 font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-[#1a1814]">View</Link>
          ) : qty === 0 ? (
            <button onClick={handleAdd} className={`flex h-10 min-w-20 items-center justify-center rounded-full bg-[#1e1c18] px-4 font-inter text-[11px] font-bold uppercase tracking-[0.13em] text-[#f5f1e8] transition-all hover:bg-[#4a6741] active:scale-95 ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </button>
          ) : (
            <div className={`flex h-10 items-center overflow-hidden rounded-full bg-[#1e1c18] text-[#f5f1e8] ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>
              <button onClick={handleDec} aria-label={`Decrease ${title}`} className="flex h-10 w-9 items-center justify-center hover:bg-white/12"><Minus className="h-3.5 w-3.5" /></button>
              <span className="min-w-7 text-center font-inter text-sm font-bold">{qty}</span>
              <button onClick={handleInc} aria-label={`Increase ${title}`} className="flex h-10 w-9 items-center justify-center hover:bg-white/12"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>

        {!product.isFallback && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#1a1814]/8 pt-3">
            <Link to={detailUrl} className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f675d] hover:text-[#1a1814]">View details</Link>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-[#4a6741] hover:text-[#1a1814]" onClick={(event) => event.stopPropagation()}>
              <MessageCircle className="h-3.5 w-3.5" /> Ask
            </a>
          </div>
        )}
      </div>
    </motion.article>
  );
}
