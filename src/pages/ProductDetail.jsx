import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, ChevronDown, Heart, MapPin, Minus, Plus, ShieldCheck, Star, Truck, UserRound, X } from 'lucide-react';
import { products as productsApi, people as peopleApi, regions as regionsApi, journeys as journeysApi } from '@/services/api';
import { fetchAllAppSettings, resolveSetting, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useRecentlyViewed } from '@/lib/RecentlyViewedContext';
import { useTrending } from '@/lib/TrendingContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import ProductCard from '@/components/products/ProductCard';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { buildProductAltText, buildProductSeoMeta } from '@/lib/productSeo';

function getYouTubeId(url) {
  if (!url) return null;
  const match = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function isVideoUrl(url) { return /\.(mp4|webm|mov)(\?|$)/i.test(String(url || '')); }
function normalizeList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try { const parsed = JSON.parse(trimmed); return Array.isArray(parsed) ? parsed : []; } catch { return [trimmed]; }
  }
  return [];
}
function getTitle(product) { return product?.title || product?.name || 'Yasvik product'; }
function safeMedia(url = '') { const v = String(url || '').trim(); return /picsum|source\.unsplash|placehold/i.test(v) ? '' : v; }
function compactText(value = '') { return String(value || '').trim(); }
function getProcessingMethod(product) {
  return compactText(product?.processing_method || product?.process || product?.method || product?.traditional_process || product?.category_name) || 'Thoughtfully chosen';
}
function cleanPublicLicense(value = '') {
  const text = String(value || '').trim();
  return /pending|to be confirmed|license number/i.test(text) ? '' : text;
}

function upsertMeta(name, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[name="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertPropertyMeta(property, content) {
  if (!content) return;
  let meta = document.querySelector(`meta[property="${property}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function upsertCanonical(href) {
  if (!href) return;
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function upsertProductJsonLd(product, seo, price, inStock) {
  const id = 'yasvik-product-jsonld';
  document.getElementById(id)?.remove();
  const seoImage = seo.image || `${window.location.origin}/brand-logos/primary-logo-original.png`;
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.text = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: getTitle(product),
    image: [seoImage],
    description: seo.description,
    brand: { '@type': 'Brand', name: 'Yasvik Foods' },
    sku: product.sku || undefined,
    offers: {
      '@type': 'Offer',
      url: `${window.location.origin}/product/${product.id}`,
      priceCurrency: 'INR',
      price: Number(price || product.price || 0),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  });
  document.head.appendChild(script);
}

function ProductFallback({ title }) {
  return <div className="flex h-full w-full items-center justify-center bg-[#F1E9D3]"><div className="text-center"><YasvikLogo variant="symbol" imageClassName="mx-auto h-16 w-auto opacity-60" /><p className="mt-3 font-inter text-[10px] uppercase tracking-[0.18em] text-[#96947B]">{title}</p></div></div>;
}

function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#D9D0B0]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between py-4 text-left"><span className="font-syne text-lg font-bold text-[#122615]">{title}</span><ChevronDown className={`h-4 w-4 text-[#6E735D] transition-transform ${open ? 'rotate-180' : ''}`} /></button>
      <AnimatePresence initial={false}>{open && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden"><div className="pb-5 font-inter text-sm leading-7 text-[#6E735D]">{children}</div></motion.div>}</AnimatePresence>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { track } = useRecentlyViewed();
  const { bump } = useTrending();
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();

  const { data: product, isLoading, error } = useQuery({ queryKey: ['product', id], queryFn: async () => { try { return await productsApi.get(id); } catch { const all = await productsApi.listPublished('-created_date', 300); return all.find((p) => p.id === id) || null; } }, enabled: !!id, retry: 1 });
  const { data: related = [] } = useQuery({ queryKey: ['related-product-card', product?.category_id, product?.id], queryFn: () => product?.category_id ? productsApi.listByCategory(product.category_id, 8) : productsApi.listPublished('-created_date', 8), enabled: Boolean(product?.id), staleTime: 5 * 60 * 1000 });
  const { data: linkedPerson } = useQuery({ queryKey: ['product-trace-person', product?.person_id], queryFn: () => peopleApi.get(product.person_id), enabled: Boolean(product?.person_id), staleTime: 5 * 60 * 1000 });
  const { data: linkedRegion } = useQuery({ queryKey: ['product-trace-region', product?.region_id], queryFn: () => regionsApi.get(product.region_id), enabled: Boolean(product?.region_id), staleTime: 5 * 60 * 1000 });
  const { data: linkedJourney } = useQuery({ queryKey: ['product-trace-journey', product?.journey_id], queryFn: () => journeysApi.get(product.journey_id), enabled: Boolean(product?.journey_id), staleTime: 5 * 60 * 1000 });
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.public, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });

  useEffect(() => { if (product) { track(product); bump(product.id, 'view'); } }, [product?.id]);
  useEffect(() => {
    if (!product) return;
    const price = Number(selectedVariant?.price || product.price || 0);
    const inStock = product.availability === 'in_stock' || Number(product.stock ?? product.stock_quantity ?? 1) > 0;
    const seo = buildProductSeoMeta(product);
    const canonicalUrl = `${window.location.origin}/product/${product.id}`;
    const seoImage = seo.image || `${window.location.origin}/brand-logos/primary-logo-original.png`;

    document.title = seo.title;
    upsertMeta('description', seo.description);
    upsertMeta('keywords', seo.keywords);
    upsertMeta('robots', 'index,follow');
    upsertCanonical(canonicalUrl);
    upsertPropertyMeta('og:title', seo.title);
    upsertPropertyMeta('og:description', seo.description);
    upsertPropertyMeta('og:type', 'product');
    upsertPropertyMeta('og:url', canonicalUrl);
    upsertPropertyMeta('og:site_name', 'Yasvik Foods');
    upsertPropertyMeta('og:image', seoImage);
    upsertPropertyMeta('og:image:alt', seo.imageAlt);
    upsertPropertyMeta('product:price:amount', String(price));
    upsertPropertyMeta('product:price:currency', 'INR');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', seo.title);
    upsertMeta('twitter:description', seo.description);
    upsertMeta('twitter:image', seoImage);
    upsertProductJsonLd(product, seo, price, inStock);

    return () => document.getElementById('yasvik-product-jsonld')?.remove();
  }, [product, selectedVariant]);

  const productVariants = normalizeList(product?.variants).filter((variant) => variant && typeof variant === 'object');
  useEffect(() => { if (productVariants.length && !selectedVariant) setSelectedVariant(productVariants[0]); }, [product?.id, productVariants.length]);

  const mediaItems = useMemo(() => {
    if (!product) return [];
    const urls = [
      ...normalizeList(selectedVariant?.image_urls),
      selectedVariant?.image_url,
      ...normalizeList(product.images),
      product.front_label_image_url,
      product.label_image_url,
      product.hero_video,
      product.hero_image,
      product.featured_image_url,
      product.image_url,
    ].map(safeMedia).filter(Boolean);
    return [...new Set(urls)].map((url) => {
      const youtubeId = getYouTubeId(url);
      if (youtubeId) return { type: 'youtube', url, youtubeId };
      if (isVideoUrl(url)) return { type: 'video', url };
      return { type: 'image', url };
    });
  }, [product, selectedVariant]);

  if (isLoading) return <div className="min-h-screen bg-[#F8F4E7] p-6"><div className="mx-auto h-[560px] max-w-[1200px] animate-pulse rounded-3xl bg-[#FFFDF3]" /></div>;
  if (error || !product) return <div className="flex min-h-screen items-center justify-center bg-[#F8F4E7] px-6 text-center"><div><h1 className="font-syne text-3xl font-bold text-[#122615]">Product not found</h1><p className="mt-2 font-inter text-sm text-[#6E735D]">This product may be unpublished or moved.</p><Link to="/shop" className="mt-5 inline-block rounded-xl bg-[#0B4F2F] px-5 py-3 font-inter text-sm font-bold text-white">Back to Shop</Link></div></div>;

  const activeMedia = mediaItems[activeImage] || null;
  const title = getTitle(product);
  const productImageAlt = buildProductAltText(product);
  const price = Number(selectedVariant?.price || product.price || 0);
  const comparePrice = Number(selectedVariant?.compare_price || product.compare_price || 0);
  const discount = comparePrice && comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : null;
  const fssaiLicense = cleanPublicLicense(product.fssai_license || resolveSetting(settings, 'fssai_license_number', ''));
  const allergenInfo = product.allergen_info || product.allergens || '';
  const nutritionRows = normalizeList(product.nutrition_table).filter((row) => row && typeof row === 'object');
  const traceLocation = linkedRegion?.name || product.sourcing_location || linkedPerson?.location_label || '';
  const traceNote = product.sourcing_story || product.story_description || product.short_description || linkedJourney?.description || '';
  const hasTraceability = Boolean(product.person_id || product.journey_id);
  const tracePills = [
    { label: 'Source', value: linkedPerson?.name || product.farm_name || product.vendor_name || 'Trusted Yasvik shelf' },
    { label: 'Region', value: traceLocation || product.origin_region || product.region_name || 'Origin added where available' },
    { label: 'Process', value: getProcessingMethod(product) },
    { label: 'Journey', value: linkedJourney?.title || (hasTraceability ? 'Linked sourcing journey' : 'Context where applicable') },
  ].filter((item) => item.value);
  const hasPackComplianceDetails = Boolean(fssaiLicense || allergenInfo || product.front_label_image_url || product.label_image_url);
  const inStock = product.availability === 'in_stock' || Number(product.stock ?? product.stock_quantity ?? 1) > 0;

  const handleAddToCart = () => {
    triggerPulse();
    addItem(product, selectedVariant, quantity);
    bump(product.id, 'cart');
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="min-h-screen bg-[#F8F4E7] pb-20 text-[#1F1710]">
      <div className="mx-auto max-w-[1320px] px-4 py-6 md:px-8 md:py-10">
        <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr]">
          <div>
            <div className="overflow-hidden rounded-[34px] border border-[#E4D7B9] bg-[#FFFDF3] shadow-[0_20px_60px_rgba(43,33,24,.08)]">
              <div className="relative aspect-[4/3] bg-[#F3F3EB] md:aspect-[16/10]">
                <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(0deg,rgba(31,23,16,.10),transparent_44%)]" />
                <AnimatePresence mode="wait">
                  {activeMedia?.type === 'image' && <motion.img key={activeMedia.url} src={activeMedia.url} alt={productImageAlt} className="h-full w-full object-contain" initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} exit={{ opacity: 0.2 }} transition={{ duration: 0.22 }} loading="eager" decoding="sync" fetchPriority="high" />}
                  {activeMedia?.type === 'video' && <motion.video key={activeMedia.url} src={activeMedia.url} className="h-full w-full object-cover" controls playsInline autoPlay muted loop initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} />}
                  {activeMedia?.type === 'youtube' && <motion.iframe key={activeMedia.url} src={`https://www.youtube-nocookie.com/embed/${activeMedia.youtubeId}?controls=1&rel=0&modestbranding=1`} className="h-full w-full border-0" allow="encrypted-media; picture-in-picture" initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} />}
                  {!activeMedia && <ProductFallback title={title} />}
                </AnimatePresence>
              </div>
              {mediaItems.length > 1 && <div className="flex gap-2 overflow-x-auto border-t border-[#E4D7B9] p-3 hide-scrollbar">{mediaItems.map((item, i) => <button key={`${item.url}-${i}`} onClick={() => setActiveImage(i)} className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border ${i === activeImage ? 'border-[#5F873F]' : 'border-[#E4D7B9]'}`}>{item.type === 'image' ? <img src={item.url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" fetchPriority="low" /> : <div className="flex h-full w-full items-center justify-center bg-[#EAF1D8] font-inter text-[10px] font-bold text-[#0B4F2F]">{item.type === 'youtube' ? 'YT' : 'VID'}</div>}</button>)}</div>}
            </div>
          </div>

          <div className="rounded-[34px] border border-[#E4D7B9] bg-[#FFFDF3] p-5 shadow-[0_20px_60px_rgba(43,33,24,.08)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div><p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-[#9A6B32]">{product.vendor_name || 'Yasvik Foods'}</p><h1 className="mt-2 font-cormorant text-5xl font-semibold leading-[0.95] text-[#1F1710] md:text-6xl">{title}</h1></div>
              <button onClick={() => toggle(product.id)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-[#D9D0B0] hover:bg-[#FBF7EA]"><Heart className={`h-5 w-5 ${isWishlisted(product.id) ? 'fill-[#B96A2E] text-[#B96A2E]' : 'text-[#6E735D]'}`} /></button>
            </div>
            <div className="mt-4 flex items-center gap-2 font-inter text-sm text-[#6E604C]"><span className="flex text-[#B96A2E]"><Star className="h-4 w-4 fill-current" /></span><span>4.8 customer confidence</span>{hasTraceability && <span className="rounded-full bg-[#EAF1D8] px-2 py-1 text-[10px] font-bold uppercase text-[#31582F]">Traceable</span>}</div>
            <div className="mt-5 flex flex-wrap gap-2 rounded-2xl border border-[#E4D7B9] bg-[#F8F4E7] p-3">
              {tracePills.map((pill) => <span key={`${pill.label}-${pill.value}`} className="yasvik-trace-ribbon px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em]"><span className="mr-1 opacity-70">{pill.label}:</span>{pill.value}</span>)}
            </div>
            <p className="mt-5 font-cormorant text-2xl italic leading-snug text-[#4A3726]">{traceNote || 'Chosen for everyday kitchens, with origin and process context added wherever it genuinely applies.'}</p>
            <div className="mt-6 flex items-baseline gap-3"><span className="font-cormorant text-5xl font-semibold text-[#1F1710]">₹{price}</span>{comparePrice > price && <span className="font-inter text-lg text-[#96947B] line-through">₹{comparePrice}</span>}{discount && <span className="rounded-md bg-[#F5E1CE] px-2 py-1 font-inter text-xs font-bold text-[#B96A2E]">Save {discount}%</span>}</div>
            <p className="mt-1 font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A6B32]">fair price</p>
            <p className="mt-5 max-w-[65ch] font-inter text-[17px] leading-[1.75] text-[#6E604C]">{product.short_description || product.description || 'Natural Yasvik grocery selected for everyday family kitchens.'}</p>

            {productVariants.length > 0 && <div className="mt-5"><p className="mb-2 font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#96947B]">Select size</p><div className="flex flex-wrap gap-2">{productVariants.map((v, i) => <button key={`${v.label}-${i}`} onClick={() => { setSelectedVariant(v); setActiveImage(0); }} className={`rounded-full border px-4 py-2 font-inter text-xs font-bold ${selectedVariant === v ? 'border-[#0B4F2F] bg-[#0B4F2F] text-white' : 'border-[#D9D0B0] bg-[#F8F4E7] text-[#6E735D] hover:border-[#A8CF45]'}`}>{v.label || v.title}</button>)}</div></div>}

            <div className={`mt-6 flex items-center gap-3 ${!inStock ? 'pointer-events-none opacity-50' : ''}`}>
              <div className="flex items-center overflow-hidden rounded-xl border border-[#D9D0B0] bg-[#FBF7EA]"><button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-12 w-11 items-center justify-center hover:bg-white"><Minus className="h-4 w-4" /></button><span className="min-w-9 text-center font-inter text-sm font-bold">{quantity}</span><button onClick={() => setQuantity((q) => q + 1)} className="flex h-12 w-11 items-center justify-center hover:bg-white"><Plus className="h-4 w-4" /></button></div>
              <button onClick={handleAddToCart} className={`yasvik-harvest-cta flex h-12 flex-1 items-center justify-center rounded-xl font-inter text-sm font-bold uppercase tracking-[0.14em] active:scale-[0.98] ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>{added ? 'Added to Harvest Bag' : 'Add to Harvest Bag'}</button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <InfoTile icon={Truck} title="Delivery" text="Fresh route packing" />
              {fssaiLicense ? (
                <InfoTile icon={ShieldCheck} title="FSSAI" text={fssaiLicense} />
              ) : (
                <InfoTile icon={ShieldCheck} title="Pack info" text="Veg mark and label details" />
              )}
              {hasTraceability ? (
                <button onClick={() => setTraceOpen(true)} className="rounded-xl border border-[#DAEABA] bg-[#EAF1D8] p-4 text-left"><ShieldCheck className="mb-2 h-5 w-5 text-[#0B4F2F]" /><p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#2D7A3E]">Trace sourcing</p><p className="mt-1 font-inter text-xs leading-5 text-[#0B4F2F]">Farmer or journey details</p></button>
              ) : (
                <InfoTile icon={ShieldCheck} title="Sourcing" text="Hybrid trusted sourcing" />
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-[#D9D0B0] px-4">
              <Accordion title="Description" defaultOpen><div className="max-w-[65ch] text-[17px] leading-[1.75]">{product.description || product.short_description || 'Detailed product story will appear here when added in admin.'}</div></Accordion>
              <Accordion title="Nutrition & Allergens">{allergenInfo && <p className="mb-3"><strong>Allergen:</strong> {allergenInfo}</p>}{nutritionRows.length ? <div className="divide-y divide-[#D9D0B0] rounded-xl border border-[#D9D0B0]">{nutritionRows.slice(0, 8).map((row, index) => <div key={index} className="flex justify-between px-3 py-2 text-sm"><span>{row.label || row.name}</span><span className="font-semibold">{row.value || row.amount}</span></div>)}</div> : <p>{allergenInfo ? 'Nutrition table will display here when added in the product record.' : 'Nutrition and allergen details will display here when added in admin.'}</p>}</Accordion>
              <Accordion title="Statutory Label"><div className="flex items-center gap-3"><span className="flex h-6 w-6 items-center justify-center border border-[#009a44] bg-white"><span className="h-3 w-3 rounded-full bg-[#009a44]" /></span><span>Vegetarian food product</span></div>{hasPackComplianceDetails ? <p className="mt-3">{fssaiLicense ? `FSSAI: ${fssaiLicense}. ` : ''}Front label panel and declared product information are shown when added to this record.</p> : <p className="mt-3">Public compliance details will appear here only after they are added in the product/admin record.</p>}</Accordion>
            </div>
          </div>
        </div>

        {related.filter((item) => item.id !== product.id).length > 0 && <section className="mt-10"><div className="mb-5 flex items-baseline justify-between"><h2 className="font-syne text-2xl font-bold text-[#122615]">You may also like</h2><Link to="/shop" className="font-inter text-sm font-bold text-[#2D7A3E]">View all</Link></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">{related.filter((item) => item.id !== product.id).slice(0, 5).map((item, index) => <ProductCard key={item.id} product={item} index={index} />)}</div></section>}
      </div>

      <AnimatePresence>{traceOpen && hasTraceability && <TraceDrawer onClose={() => setTraceOpen(false)} linkedPerson={linkedPerson} linkedRegion={linkedRegion} linkedJourney={linkedJourney} location={traceLocation} harvestDate={product.harvest_date} testingDate={product.batch_tested_at} note={traceNote} />}</AnimatePresence>
    </div>
  );
}

function InfoTile({ icon: Icon, title, text }) {
  return <div className="rounded-xl border border-[#D9D0B0] bg-[#F8F4E7] p-4"><Icon className="mb-2 h-5 w-5 text-[#2D7A3E]" /><p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#96947B]">{title}</p><p className="mt-1 line-clamp-2 font-inter text-xs leading-5 text-[#6E735D]">{text}</p></div>;
}

function TraceDrawer({ onClose, linkedPerson, linkedRegion, linkedJourney, location, harvestDate, testingDate, note }) {
  const mapUrl = location ? `https://www.google.com/maps/search/${encodeURIComponent(location)}` : null;
  return <><motion.button type="button" aria-label="Close traceability drawer" className="fixed inset-0 z-[180] bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="fixed right-0 top-0 z-[190] h-full w-full max-w-md bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#D9D0B0] px-5 py-4"><h3 className="font-syne text-2xl font-bold text-[#122615]">Traceable Sourcing</h3><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9D0B0]"><X className="h-4 w-4" /></button></div><div className="space-y-4 overflow-y-auto px-5 py-5">{linkedPerson?.name && <TraceRow icon={UserRound} label="Farmer Partner" value={linkedPerson.name} />}{(location || linkedRegion?.name) && <TraceRow icon={MapPin} label="Origin" value={location || linkedRegion?.name} extra={mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="text-[#2D7A3E] underline">View origin map</a> : null} />}{(harvestDate || testingDate) && <TraceRow icon={CalendarDays} label="Batch Dates" value={[harvestDate ? `Harvested: ${harvestDate}` : null, testingDate ? `Checked: ${testingDate}` : null].filter(Boolean).join(' · ')} />}<div className="rounded-2xl border border-[#D9D0B0] bg-[#F8F4E7] p-4"><p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#96947B]">Sourcing Note</p><p className="mt-2 font-inter text-sm leading-7 text-[#6E735D]">{note || 'This product has linked sourcing context. More details can be added from the admin console when available.'}</p>{linkedJourney?.id && <Link to={`/journeys/${linkedJourney.id}`} onClick={onClose} className="mt-3 inline-block font-inter text-sm font-bold text-[#2D7A3E]">Explore linked journey</Link>}</div></div></motion.aside></>;
}

function TraceRow({ icon: Icon, label, value, extra }) {
  return <div className="rounded-2xl border border-[#D9D0B0] bg-[#F8F4E7] p-4"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 text-[#2D7A3E]" /><div><p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#96947B]">{label}</p><p className="mt-1 font-inter text-sm leading-6 text-[#122615]">{value}</p>{extra && <div className="mt-1 font-inter text-sm">{extra}</div>}</div></div></div>;
}
