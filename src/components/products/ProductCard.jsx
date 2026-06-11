import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Flame, Heart, Minus, Plus, ShieldCheck, Star, Tag, Zap } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { buildProductAltText } from '@/lib/productSeo';

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

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
  return {
    url,
    isVideo: explicitType === 'video' || isVideoUrl(url),
  };
}

function normalizeVariant(variant = {}) {
  const label = String(variant?.label || variant?.title || variant?.name || '').trim();
  if (!label) return null;
  const price = Number(variant?.price);
  const comparePrice = Number(variant?.compare_price || variant?.comparePrice);
  return {
    label,
    price: Number.isFinite(price) ? price : undefined,
    compare_price: Number.isFinite(comparePrice) ? comparePrice : undefined,
    image_url: safeMedia(variant?.image_url || ''),
    image_urls: normalizeList(variant?.image_urls).map(safeMedia).filter(Boolean),
  };
}

function getProductTitle(product) {
  return product?.title || product?.name || 'Yasvik product';
}

function isTraceableProduct(product) {
  return Boolean(product?.person_id || product?.journey_id || product?.source_person_id);
}

function isNewLaunch(product) {
  const rawDate = product?.created_date || product?.created_at || product?.published_at;
  if (!rawDate) return false;
  const created = new Date(rawDate);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() < 1000 * 60 * 60 * 24 * 45;
}

function getProductBadge(product, traceable) {
  const explicit = product?.badge || product?.product_badge || product?.ribbon_label || product?.highlight_badge;
  if (explicit) return String(explicit);
  if (product?.is_bestseller || product?.best_seller || product?.is_featured || product?.featured_in_hero) return 'Best Seller';
  if (traceable) return 'Traceable';
  if (product?.selling_fast || Number(product?.sold_count || product?.popularity_score || 0) > 25) return 'Selling Fast';
  if (isNewLaunch(product)) return 'New Launch';
  return '';
}

function getValueStrip(product, price, comparePrice, traceable) {
  const explicit = product?.coupon_text || product?.best_price_text || product?.offer_text;
  if (explicit) return String(explicit);
  if (comparePrice > price && price > 0) return `Best price ₹${price} with offer`;
  if (traceable) return 'Traceability where applicable';
  return product?.unit ? `${product.unit} everyday staple` : 'Thoughtfully chosen everyday food';
}

function getBadgeIcon(badge) {
  const normalized = String(badge || '').toLowerCase();
  if (normalized.includes('trace')) return ShieldCheck;
  if (normalized.includes('fast')) return Flame;
  if (normalized.includes('new')) return Zap;
  return BadgeCheck;
}

function ProductImagePlaceholder({ title }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[color-mix(in_srgb,var(--action-primary)_10%,var(--bg-card))]">
      <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 30% 25%, color-mix(in srgb, var(--action-primary) 24%, transparent), transparent 34%), radial-gradient(circle at 80% 70%, color-mix(in srgb, var(--theme-accent) 16%, transparent), transparent 32%)' }} />
      <div className="relative flex flex-col items-center text-center">
        <YasvikLogo variant="symbol" imageClassName="h-12 w-auto opacity-70" />
        <p className="mt-3 max-w-[9rem] font-inter text-[10px] uppercase tracking-[0.18em] text-[var(--theme-muted)]">{title}</p>
      </div>
    </div>
  );
}

export default function ProductCard({ product, index = 0, onQuickView }) {
  const { items, addItem, updateQty } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [selectedVariantLabel, setSelectedVariantLabel] = useState('');
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();
  const title = getProductTitle(product);
  const productImageAlt = buildProductAltText(product);

  const variantOptions = useMemo(() => {
    const fromQuick = normalizeList(product?.quick_variants).map(normalizeVariant).filter(Boolean);
    if (fromQuick.length > 0) return fromQuick;
    return normalizeList(product?.variants).map(normalizeVariant).filter(Boolean);
  }, [product?.quick_variants, product?.variants]);

  useEffect(() => {
    if (variantOptions.length > 0) {
      setSelectedVariantLabel((prev) => (prev && variantOptions.some((variant) => variant.label === prev) ? prev : variantOptions[0].label));
      return;
    }
    setSelectedVariantLabel('');
  }, [variantOptions, product?.id]);

  const selectedVariant = variantOptions.find((variant) => variant.label === selectedVariantLabel) || null;
  const cartKey = `${product.id}__${selectedVariant?.label || 'default'}`;
  const cartItem = items.find((c) => c.key === cartKey);
  const qty = cartItem?.qty || 0;
  const activePrice = Number(selectedVariant?.price ?? product.price ?? 0);
  const activeComparePrice = Number(selectedVariant?.compare_price ?? product.compare_price ?? 0);
  const discount = activeComparePrice && activeComparePrice > activePrice ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100) : null;
  const traceable = isTraceableProduct(product);
  const productBadge = getProductBadge(product, traceable);
  const BadgeIcon = getBadgeIcon(productBadge);
  const valueStrip = getValueStrip(product, activePrice, activeComparePrice, traceable);
  const detailUrl = product.isFallback ? '/shop' : `/product/${product.id}`;

  const defaultMediaUrl = safeMedia(selectedVariant?.image_url || selectedVariant?.image_urls?.[0] || product.hero_image || product.featured_image_url || product.image_url || '');
  const primaryMedia = useMemo(() => toMediaDescriptor(defaultMediaUrl), [defaultMediaUrl]);
  const hoverMedia = useMemo(() => {
    const explicitHover = normalizeList(product?.hover_media).map(toMediaDescriptor).find(Boolean);
    if (explicitHover) return explicitHover;

    const variantGallery = normalizeList(selectedVariant?.image_urls).map(safeMedia).filter(Boolean);
    const productGallery = normalizeList(product?.images || product?.image_urls).map(safeMedia).filter(Boolean);
    const galleryCandidate = [...variantGallery, ...productGallery]
      .find((url) => url && url !== defaultMediaUrl);
    if (galleryCandidate) return toMediaDescriptor(galleryCandidate);

    return toMediaDescriptor(product?.hero_video);
  }, [defaultMediaUrl, product?.hero_video, product?.hover_media, product?.image_urls, product?.images, selectedVariant?.image_urls]);

  useEffect(() => {
    setImgLoaded(false);
  }, [primaryMedia?.url, product?.id]);

  const addPayload = { id: product.id, title, price: activePrice, hero_image: selectedVariant?.image_url || product.hero_image || product.featured_image_url || product.image_url, unit: selectedVariant?.label || product.unit };

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

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  };

  const handlePreview = (e) => {
    if (!onQuickView) return;
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.34, delay: Math.min(index * 0.03, 0.18), ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[18px] border border-[var(--theme-border)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-[0_10px_32px_rgba(6,53,31,.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--action-primary)_54%,var(--theme-border))] hover:shadow-[0_16px_42px_rgba(6,53,31,.13)]"
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse' || event.pointerType === 'pen') setIsHovering(true);
      }}
      onPointerLeave={() => setIsHovering(false)}
    >
      <div className="relative aspect-[1.08/1] overflow-hidden bg-[color-mix(in_srgb,var(--action-primary)_10%,var(--bg-card))]">
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
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
            style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        ) : primaryMedia?.url && primaryMedia.isVideo ? (
          <video src={primaryMedia.url} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]" style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} autoPlay loop muted playsInline />
        ) : (
          <ProductImagePlaceholder title={title} />
        )}
        {hoverMedia?.url && !hoverMedia.isVideo && (
          <img
            data-hover-media="image"
            src={hoverMedia.url}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${isHovering ? 'scale-100 opacity-100' : 'scale-[1.025] opacity-0'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        )}
        {hoverMedia?.url && hoverMedia.isVideo && isHovering && (
          <video
            data-hover-media="video"
            src={hoverMedia.url}
            className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-300"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        )}
        {hoverMedia?.url && (
          <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/18 to-transparent transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-0'}`} />
        )}
        <div className="absolute left-2 top-2 z-[3] flex flex-col gap-1.5">
          {discount ? (
            <span className="flex min-h-12 min-w-12 flex-col items-center justify-center rounded-b-2xl rounded-t-md bg-[var(--theme-header)] px-2 py-1 text-center font-inter text-[10px] font-extrabold uppercase leading-none text-[var(--theme-header-text)] shadow-sm">
              <span>Flat</span>
              <span className="text-[13px]">{discount}%</span>
              <span>Off</span>
            </span>
          ) : null}
        </div>
        {productBadge && (
          <div className="absolute right-2 top-2 z-[3]">
            <span className="inline-flex items-center gap-1.5 rounded-bl-xl rounded-tr-xl bg-[color-mix(in_srgb,var(--theme-accent)_78%,var(--bg-card))] px-2.5 py-1.5 font-inter text-[10px] font-extrabold text-white shadow-sm">
              <BadgeIcon className="h-3.5 w-3.5" />
              {productBadge}
            </span>
          </div>
        )}
        {!product.isFallback && (
          <button onClick={handleWishlist} aria-label={`Save ${title}`} className={`absolute ${productBadge ? 'right-2 top-12' : 'right-2 top-2'} z-[4] flex h-8 w-8 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--bg-card)]/95 text-[var(--text-main)] opacity-100 shadow-sm transition-all hover:scale-105 md:opacity-0 md:group-hover:opacity-100`}>
            <Heart className={`h-4 w-4 ${isWishlisted(product.id) ? 'fill-[var(--theme-accent)] text-[var(--theme-accent)]' : 'text-[var(--theme-muted)]'}`} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <Link to={detailUrl} onClick={onQuickView ? handlePreview : undefined} className="block text-left">
          <p className="font-inter text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--theme-muted)]">{product.brand || product.vendor_name || 'Yasvik Foods'}</p>
          <h3 className="mt-1 line-clamp-2 min-h-[38px] font-inter text-[13.5px] font-semibold leading-snug text-[var(--text-main)]">{title}</h3>
        </Link>
        <div className="mt-1.5 flex items-center gap-1.5 font-inter text-[11px] text-[var(--theme-muted)]"><Star className="h-3 w-3 fill-[var(--theme-accent)] text-[var(--theme-accent)]" /><span>{traceable ? 'Traceability where applicable' : 'Trusted shelf'}</span></div>
        {product.unit && <p className="mt-1 font-inter text-[11px] text-[var(--theme-muted)]">{product.unit}</p>}
        {variantOptions.length > 0 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 hide-scrollbar">
            {variantOptions.map((variant) => (
              <button
                key={variant.label}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedVariantLabel(variant.label); }}
                className={`flex-shrink-0 rounded-full px-2.5 py-1 font-inter text-[10px] transition-colors ${selectedVariant?.label === variant.label ? 'bg-[var(--action-primary)] text-[var(--action-text)]' : 'border border-[var(--theme-border)] bg-[var(--bg-canvas)] text-[var(--theme-muted)] hover:border-[var(--action-primary)]'}`}
              >
                {variant.label}
              </button>
            ))}
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div>
            <div className="font-syne text-[17px] font-bold text-[var(--text-main)]">₹{activePrice || product.price || 0}</div>
            {activeComparePrice > activePrice && <div className="font-inter text-[11px] text-[var(--theme-muted)] line-through">₹{activeComparePrice}</div>}
          </div>
          {product.isFallback ? (
            <Link to="/shop" className="flex h-9 min-w-16 items-center justify-center rounded-lg border border-[var(--action-primary)] px-3 font-inter text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--action-primary)]">View</Link>
          ) : qty === 0 ? (
            <button onClick={handleAdd} className={`flex h-9 min-w-16 items-center justify-center rounded-lg bg-[var(--action-primary)] px-3 font-inter text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--action-text)] transition-all hover:brightness-95 active:scale-95 ${isPulseActive ? 'premium-haptic-pulse' : ''}`}><Plus className="mr-1 h-3.5 w-3.5" />ADD</button>
          ) : (
            <div className={`flex h-9 items-center overflow-hidden rounded-lg bg-[var(--action-primary)] text-[var(--action-text)] ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>
              <button onClick={handleDec} className="flex h-9 w-8 items-center justify-center hover:bg-white/15"><Minus className="h-3.5 w-3.5" /></button>
              <span className="min-w-6 text-center font-inter text-sm font-bold">{qty}</span>
              <button onClick={handleInc} className="flex h-9 w-8 items-center justify-center hover:bg-white/15"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
        {valueStrip && (
          <div className="mt-2 flex min-h-6 items-center gap-1.5 rounded-md bg-[color-mix(in_srgb,var(--action-primary)_12%,var(--bg-card))] px-2 py-1 font-inter text-[10.5px] font-bold text-[var(--theme-accent)]">
            <Tag className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{valueStrip}</span>
          </div>
        )}
          <Link to={detailUrl} className="mt-2 block text-center font-inter text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--theme-muted)] hover:text-[var(--action-primary)]">View details</Link>
      </div>
    </motion.article>
  );
}
