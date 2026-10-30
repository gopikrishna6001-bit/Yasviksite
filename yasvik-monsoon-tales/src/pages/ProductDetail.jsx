import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, MapPin, MessageCircle, Minus, Plus, Star, UserRound, X } from 'lucide-react';
import { products as productsApi, people as peopleApi, regions as regionsApi, journeys as journeysApi, reviews as reviewsApi } from '@/services/api';
import { fetchBundleForProduct, fetchBundlesContainingProduct } from '@/services/productRelationsApi';
import { isSellableBundleProduct } from '@/lib/productBundleUtils';
import { valueFromBundleAndParent } from '@/lib/comboVisualUtils';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useRecentlyViewed } from '@/lib/RecentlyViewedContext';
import { useTrending } from '@/lib/TrendingContext';
import { usePremiumHapticPulse } from '@/hooks/usePremiumHapticPulse';
import FrequentlyBoughtTogether from '@/components/crosssell/FrequentlyBoughtTogether';
import SuggestedCombos from '@/components/crosssell/SuggestedCombos';
import BundleWhatsInside from '@/components/products/BundleWhatsInside';
import ComboOptionSelector from '@/components/products/ComboOptionSelector';
import ComboFreeGiftHighlight from '@/components/products/ComboFreeGiftHighlight';
import ComboWhatsInsideGrouped from '@/components/products/ComboWhatsInsideGrouped';
import {
  bundleHasCustomerOptions,
  findOptionChoice,
  getComboCartKey,
  resolveComboPresentation,
  AUDIENCE_LABELS,
} from '@/lib/comboV2Utils';
import BundleValueCard from '@/components/products/BundleValueCard';
import AvailableInCombos from '@/components/products/AvailableInCombos';
import MobileStickyBuyBar from '@/components/commerce/MobileStickyBuyBar';
import DeliveryPromoStrip from '@/components/brand/DeliveryPromoStrip';
import ProductGalleryRetail from '@/components/retail/ProductGalleryRetail';
import ProductFeatureGrid from '@/components/retail/ProductFeatureGrid';
import ProductDetailTabs from '@/components/retail/ProductDetailTabs';
import RetailBadge from '@/components/retail/RetailBadge';
import RetailTrustLine from '@/components/retail/RetailTrustLine';
import ComboMosaic from '@/components/products/ComboMosaic';
import { retailClasses } from '@/brand/retailTheme';
import { buildProductAltText, buildProductSeoMeta } from '@/lib/productSeo';
import { resolveVariantComparePrice } from '@/lib/productPricingUtils';
import { normalizeProductVariant, sortVariantsForShop } from '@/lib/productVariantUtils';
import VariantPackPicker from '@/components/products/VariantPackPicker';
import PackSavingsBadge from '@/components/products/PackSavingsBadge';
import { computePackBulkSavings } from '@/lib/variantBulkSavings';
import { getProductTeluguName } from '@/lib/teluguProductNames';
import { getProductCanonicalUrl, getProductPath, isProductUuid } from '@/lib/productUrls';
import { applyProductSeoHead, clearProductSeoHead } from '@/lib/seoHead';
import { getCategoryDisplayName, getCategoryShopHref } from '@/lib/categoryDisplay';
import { findCategoryById } from '@/lib/categoryTree';
import { useAllActiveCategories } from '@/hooks/useStorefrontCategories';
import { formatDisplayTitle } from '@/lib/formatDisplayTitle';
import { isSellableOnline } from '@/lib/productVisibility';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';

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
const SOURCE_TYPE_LABELS = {
  direct: 'Direct from farmer',
  vendor: 'Trusted vendor',
  house_brand: 'Yasvik house brand',
};

function getSourceTypeLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  return SOURCE_TYPE_LABELS[key] || value || null;
}
function compactText(value = '') { return String(value || '').trim(); }

/** Remove internal draft/ops notes that must never show on the storefront. */
function sanitizeCustomerCopy(value = '') {
  return String(value || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      return !/(suggested draft|do not publish|inventory note:|pricing strategy|not live|component skus are not auto-deducted|until costing is confirmed|do not state a combined kg|proposed contents \(not final\))/i.test(line);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Bundle PDP already has What’s Inside — keep About as story, not a second contents list. */
function customerBundleAbout(description = '', shortDescription = '') {
  const clean = sanitizeCustomerCopy(description);
  const withoutContents = clean
    .replace(/\n*Total net weight:[^\n]*/gi, '')
    .replace(/\n*Number of items:[^\n]*/gi, '')
    .replace(/\n*Total products:[^\n]*/gi, '')
    .replace(/\n*Total weight:[^\n]*/gi, '')
    .replace(/\n*Contents:[\s\S]*?(?=\nContents may be packed|\nSubject to availability|$)/i, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (withoutContents) return withoutContents;
  return sanitizeCustomerCopy(shortDescription);
}
function getTitle(product) {
  return formatDisplayTitle(product?.title || product?.name, 'Yasvik product');
}
function getProcessingMethod(product) {
  return compactText(product?.processing_method || product?.process || product?.method || product?.traditional_process || product?.category_name) || 'Thoughtfully chosen';
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const { addItem, storeOffline, items: cartItems = [] } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const { track } = useRecentlyViewed();
  const { bump } = useTrending();
  const { isPulseActive, triggerPulse } = usePremiumHapticPulse();

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getBySlugOrId(id),
    enabled: !!id,
    retry: 1,
  });
  const isBundleParent = Boolean(product?.id && isSellableBundleProduct(product));
  const galleryBackTo = isBundleParent ? '/shop/combos' : '/shop';
  const handleGalleryBack = () => {
    const from = typeof location.state?.from === 'string' ? location.state.from : null;
    if (from && from !== location.pathname) {
      navigate(from);
      return;
    }
    // React Router sets history.state.idx for SPA stack depth.
    const idx = typeof window !== 'undefined' ? window.history.state?.idx : null;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }
    navigate(galleryBackTo);
  };
  const { data: productBundle = null, isLoading: bundleLoading } = useQuery({
    queryKey: ['product-bundle', product?.id],
    queryFn: () => fetchBundleForProduct(product.id, { includeDraftComponents: true }),
    enabled: isBundleParent,
    staleTime: 60 * 1000,
  });
  const { data: containingCombos = [] } = useQuery({
    queryKey: ['product-available-in-combos', product?.id],
    queryFn: () => fetchBundlesContainingProduct(product.id, { limit: 6 }),
    enabled: Boolean(product?.id && !isBundleParent),
    staleTime: 3 * 60 * 1000,
  });
  const comboAlreadyInCart = useMemo(() => {
    if (!containingCombos.length || !cartItems.length) return null;
    const cartIds = new Set(cartItems.map((row) => row.productId).filter(Boolean));
    for (const bundle of containingCombos) {
      const parentId = bundle.parent_product?.id;
      if (parentId && cartIds.has(parentId)) {
        return bundle.parent_product;
      }
    }
    return null;
  }, [containingCombos, cartItems]);
  const { data: allCategories = [] } = useAllActiveCategories();
  const productCategory = useMemo(() => {
    if (!product?.category_id) return null;
    return findCategoryById(product.category_id, allCategories);
  }, [product?.category_id, allCategories]);
  const { data: linkedPerson } = useQuery({ queryKey: ['product-trace-person', product?.person_id], queryFn: () => peopleApi.get(product.person_id), enabled: Boolean(product?.person_id), staleTime: 5 * 60 * 1000 });
  const { data: linkedRegion } = useQuery({ queryKey: ['product-trace-region', product?.region_id], queryFn: () => regionsApi.get(product.region_id), enabled: Boolean(product?.region_id), staleTime: 5 * 60 * 1000 });
  const { data: linkedJourney } = useQuery({ queryKey: ['product-trace-journey', product?.journey_id], queryFn: () => journeysApi.get(product.journey_id), enabled: Boolean(product?.journey_id), staleTime: 5 * 60 * 1000 });
  const { data: productReviews = [] } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: () => reviewsApi.filter({ product_id: product.id }, '-created_date', 100),
    enabled: Boolean(product?.id),
    staleTime: 5 * 60 * 1000,
  });
  const reviewStats = useMemo(() => {
    const approved = productReviews.filter((review) => review.is_approved !== false && review.rating);
    if (!approved.length) return null;
    const avg = approved.reduce((sum, review) => sum + Number(review.rating || 0), 0) / approved.length;
    return { count: approved.length, avg: Math.round(avg * 10) / 10 };
  }, [productReviews]);
  useEffect(() => { if (product) { track(product); bump(product.id, 'view'); } }, [product?.id]);
  useEffect(() => {
    if (!product?.slug || !id || id === product.slug) return;
    if (isProductUuid(id)) {
      window.history.replaceState(null, '', getProductPath(product));
    }
  }, [product, id]);

  const productVariants = useMemo(() => {
    const fullVariants = normalizeList(product?.variants).filter((variant) => variant && typeof variant === 'object');
    const quickVariants = normalizeList(product?.quick_variants).filter((variant) => variant && typeof variant === 'object');
    return sortVariantsForShop(
      (fullVariants.length ? fullVariants : quickVariants).map(normalizeProductVariant).filter(Boolean),
    );
  }, [product?.variants, product?.quick_variants]);
  useEffect(() => {
    if (productVariants.length) {
      setSelectedVariant((prev) => {
        if (prev && productVariants.some((variant) => variant.label === prev.label && (variant.sku || '') === (prev.sku || ''))) return prev;
        return productVariants[0];
      });
    } else {
      setSelectedVariant(null);
    }
  }, [product?.id, productVariants]);

  const selectedComboChoice = useMemo(() => (
    productBundle ? findOptionChoice(productBundle, selectedChoiceId) : null
  ), [productBundle, selectedChoiceId]);

  useEffect(() => {
    if (!productBundle || !bundleHasCustomerOptions(productBundle)) {
      setSelectedChoiceId(null);
      return;
    }
    const defaultChoice = findOptionChoice(productBundle);
    setSelectedChoiceId((prev) => prev || defaultChoice?.id || null);
  }, [productBundle?.id, productBundle?.has_customer_options]);

  const comboPresentation = useMemo(() => (
    productBundle && product
      ? resolveComboPresentation(productBundle, product, selectedComboChoice)
      : null
  ), [productBundle, product, selectedComboChoice]);

  const mediaItems = useMemo(() => {
    if (!product) return [];
    const optionGallery = comboPresentation?.gallery || [];
    const urls = [
      ...optionGallery,
      ...normalizeList(selectedVariant?.image_urls),
      selectedVariant?.image_url,
      ...normalizeList(product.images),
      product.front_label_image_url,
      product.label_image_url,
      product.hero_video,
      product.hero_image,
      product.featured_image_url,
      product.image_url,
    ].map((url) => String(url || '').trim()).filter((url) => url && !/picsum|source\.unsplash|placehold/i.test(url));
    return [...new Set(urls)].map((url) => {
      const youtubeId = getYouTubeId(url);
      if (youtubeId) return { type: 'youtube', url, youtubeId };
      if (isVideoUrl(url)) return { type: 'video', url };
      return { type: 'image', url };
    });
  }, [product, selectedVariant, comboPresentation?.gallery]);

  const visibleFaqs = useMemo(() => {
    if (!product) return [];
    const title = getTitle(product);
    const bestFor = compactText(product.best_for);
    const storageNote = compactText(product.storage_note);
    return [
      product.shelf_life_text
        ? { q: `How long does ${title} last?`, a: product.shelf_life_text }
        : null,
      storageNote
        ? { q: `How should ${title} be stored?`, a: storageNote }
        : null,
      bestFor
        ? { q: `What is ${title} best for?`, a: bestFor }
        : null,
      productVariants.length > 0
        ? {
            q: `What pack sizes are available for ${title}?`,
            a: productVariants.map((variant) => variant.label).filter(Boolean).join(', '),
          }
        : null,
    ].filter(Boolean);
  }, [product, productVariants]);

  const faqJsonLd = useMemo(() => {
    if (!product || !visibleFaqs.length) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${getProductCanonicalUrl(product)}#faq`,
      mainEntity: visibleFaqs.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    };
  }, [product, visibleFaqs]);

  useEffect(() => {
    if (!product) return;
    const price = comboPresentation?.priceRs ?? Number(selectedVariant?.price || product.price || 0);
    const inStock = product.subject_to_availability === true
      || product.availability === 'in_stock'
      || Number(product.stock ?? product.stock_quantity ?? 1) > 0;
    const seo = buildProductSeoMeta(product);
    const canonicalUrl = getProductCanonicalUrl(product);

    applyProductSeoHead({
      seo,
      canonicalUrl,
      price,
      inStock,
      product,
      reviewStats,
      faqJsonLd,
      categoryMeta: productCategory
        ? { name: getCategoryDisplayName(productCategory), path: getCategoryShopHref(productCategory) }
        : product.category_name
          ? { name: product.category_name, path: '/shop' }
          : null,
    });

    return () => clearProductSeoHead();
  }, [product, selectedVariant, reviewStats, productCategory, faqJsonLd, comboPresentation?.priceRs]);

  if (isLoading) return <div className="min-h-screen bg-[#F5F1E8] p-6"><div className="mx-auto h-[560px] max-w-[1200px] animate-pulse rounded-3xl bg-[#FFFAF0]" /></div>;
  if (error || !product) return (
    <div className="flex min-h-screen items-center justify-center bg-warm-cream px-6 text-center">
      <div>
        <h1 className="font-cormorant text-3xl font-semibold text-deep-forest">Product not found</h1>
        <p className="mt-2 font-inter text-sm text-deep-forest/60">This product may be unpublished or moved.</p>
        <Link to="/shop" className="mt-5 inline-block rounded-full bg-deep-forest px-5 py-3 font-inter text-sm font-bold text-warm-cream">Back to Shop</Link>
      </div>
    </div>
  );

  const activeMedia = mediaItems[activeImage] || null;
  const title = getTitle(product);
  const teluguName = getProductTeluguName(product);
  const productImageAlt = buildProductAltText(product);
  const price = comboPresentation?.priceRs ?? Number(selectedVariant?.price || product.price || 0);
  const comparePrice = Number(resolveVariantComparePrice(product, selectedVariant, price) || 0);
  const allergenInfo = product.allergen_info || product.allergens || '';
  const nutritionRows = normalizeList(product.nutrition_table).filter((row) => row && typeof row === 'object');
  const traceLocation = linkedRegion?.name || product.sourcing_location || linkedPerson?.location_label || '';
  const hasTraceability = Boolean(product.person_id || product.journey_id);
  const traceNote = hasTraceability ? compactText(product.sourcing_story || linkedJourney?.description || '') : '';
  const heroCopy = compactText(product.short_description || 'Chosen for everyday kitchens, with origin and process context added wherever it genuinely applies.');
  const fullDescription = isBundleParent
    ? customerBundleAbout(product.description || '', product.short_description || '')
    : sanitizeCustomerCopy(product.description || '');
  const showDescriptionAccordion = Boolean(
    fullDescription && fullDescription !== heroCopy && fullDescription !== traceNote,
  );
  const productWhatsappHref = `https://wa.me/${YASVIK_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi Yasvik, I have a question about ${getTitle(product)}.`)}`;
  const bestFor = compactText(product.best_for);
  const storageNote = compactText(product.storage_note);
  const yasvikMark = compactText(product.yasvik_mark);
  const sourceValue = compactText(linkedPerson?.name || product.farm_name || product.producer_name || product.vendor_name || product.supplier_name);
  const regionValue = compactText(traceLocation || product.origin_region || product.region_name);
  const processValue = compactText(product.processing_method || product.process || product.method || product.traditional_process);
  const journeyValue = compactText(linkedJourney?.title || (hasTraceability ? 'Linked sourcing journey' : ''));
  const tracePills = hasTraceability
    ? [
        { label: 'Source', value: sourceValue },
        { label: 'Region', value: regionValue },
        { label: 'Process', value: processValue },
        { label: 'Journey', value: journeyValue },
      ].filter((item) => item.value)
    : [];
  const hasSourceContext = tracePills.length > 0;
  const showNutritionSection = Boolean(allergenInfo || nutritionRows.length);
  const inStock = product.subject_to_availability === true
    || product.availability === 'in_stock'
    || Number(product.stock ?? product.stock_quantity ?? 1) > 0;
  const storeOnly = Boolean(product && !isSellableOnline(product));
  const canOrderOnline = !storeOffline && !storeOnly && inStock
    && (!isBundleParent || (!bundleLoading && Boolean(productBundle)));

  const handleAddToCart = () => {
    if (!canOrderOnline) return;
    triggerPulse();
    const comboKey = selectedComboChoice ? getComboCartKey(product.id, selectedComboChoice) : null;
    addItem(product, selectedVariant, quantity, comboKey, {
      bundle: productBundle,
      choice: selectedComboChoice,
    });
    bump(product.id, 'cart');
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleBuyNow = () => {
    if (!canOrderOnline) return;
    const comboKey = selectedComboChoice ? getComboCartKey(product.id, selectedComboChoice) : null;
    addItem(product, selectedVariant, quantity, comboKey, {
      bundle: productBundle,
      choice: selectedComboChoice,
    });
    bump(product.id, 'cart');
    navigate('/checkout');
  };

  const handleShare = async () => {
    const url = getProductCanonicalUrl(product);
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  };

  const discountPct = comparePrice > price ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;
  const comboValuePresentation = comboPresentation?.value
    || ((isBundleParent && productBundle)
      ? valueFromBundleAndParent(productBundle, product).presentation
      : null);
  const selectedBulkSavings = selectedVariant
    ? computePackBulkSavings(productVariants, selectedVariant)
    : null;
  const isFeatured = product?.is_featured || product?.featured_in_hero;
  const productSpecs = [
    processValue ? { label: 'Process', value: processValue } : null,
    getSourceTypeLabel(product?.source_type) ? { label: 'Source', value: getSourceTypeLabel(product.source_type) } : null,
    product?.origin_state ? { label: 'Origin state', value: product.origin_state } : null,
    regionValue ? { label: 'Region', value: regionValue } : null,
    product?.shelf_life_text ? { label: 'Shelf life', value: product.shelf_life_text } : null,
    storageNote ? { label: 'Storage', value: storageNote } : null,
    compactText(product?.ingredients) ? { label: 'Ingredients', value: compactText(product.ingredients) } : null,
    allergenInfo ? { label: 'Allergens', value: allergenInfo } : null,
  ].filter(Boolean);
  const featureLabels = isBundleParent
    ? [
        yasvikMark || 'Yasvik Combo',
        processValue || 'Quality checked',
        'Trusted by families',
      ].filter(Boolean)
    : [
        yasvikMark || 'Thoughtfully chosen',
        processValue || 'Quality checked',
        bestFor,
        'Trusted by families',
      ].filter(Boolean);
  return (
    <div className="min-h-screen bg-warm-cream pb-4 text-deep-forest md:pb-12">
      <div className={`${retailClasses.container} py-0 md:py-8`}>
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
          {mediaItems.length > 0 ? (
            <div className="min-h-0">
              <div className="lg:sticky lg:top-[calc(var(--yasvik-site-header-h,5.75rem)+1rem)]">
                <ProductGalleryRetail
                  title={productImageAlt}
                  mediaItems={mediaItems}
                  activeIndex={activeImage}
                  onSelect={setActiveImage}
                  backTo={galleryBackTo}
                  onBack={handleGalleryBack}
                  onWishlist={() => toggle(product.id)}
                  isWishlisted={isWishlisted(product.id)}
                  onShare={handleShare}
                />
              </div>
            </div>
          ) : isBundleParent ? (
            <div className="min-h-0">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-soft-border bg-white lg:sticky lg:top-[calc(var(--yasvik-site-header-h,5.75rem)+1rem)]">
                <ComboMosaic
                  product={product}
                  products={productBundle?.products || []}
                  alt={productImageAlt}
                  totalCount={Number(productBundle?.item_count) || (productBundle?.products || []).length}
                  className="h-full w-full min-h-[18rem]"
                />
              </div>
            </div>
          ) : (
            <div className="min-h-0">
              <div className="lg:sticky lg:top-[calc(var(--yasvik-site-header-h,5.75rem)+1rem)]">
                <ProductGalleryRetail
                  title={productImageAlt}
                  mediaItems={mediaItems}
                  activeIndex={activeImage}
                  onSelect={setActiveImage}
                  backTo={galleryBackTo}
                  onBack={handleGalleryBack}
                  onWishlist={() => toggle(product.id)}
                  isWishlisted={isWishlisted(product.id)}
                  onShare={handleShare}
                />
              </div>
            </div>
          )}

          <div className="px-0 py-4 md:rounded-2xl md:border md:border-soft-border md:bg-white md:p-6 lg:p-8">
            {isFeatured ? <RetailBadge className="mb-2">Best seller</RetailBadge> : null}
            {yasvikMark && isBundleParent ? (
              <RetailBadge className="mb-2 ml-2">{yasvikMark}</RetailBadge>
            ) : null}
            {product?.subject_to_availability === true ? (
              <RetailBadge className="mb-2 ml-2">Subject to Availability</RetailBadge>
            ) : null}
            <h1 className="font-cormorant text-xl font-semibold leading-snug text-deep-forest md:text-3xl">{title}</h1>
            {teluguName && !isBundleParent ? <p className="mt-1 font-cormorant text-base text-deep-forest/75">{teluguName}</p> : null}

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-inter text-xs text-deep-forest/60">
              {reviewStats ? (
                <span className="inline-flex items-center gap-1 text-[#c9a227]">
                  <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                  <span className="font-semibold text-deep-forest">{reviewStats.avg}</span>
                  <span>({reviewStats.count} review{reviewStats.count !== 1 ? 's' : ''})</span>
                </span>
              ) : null}
            </div>

            {isBundleParent && productBundle ? (
              <p className="mt-2 font-inter text-xs font-medium text-deep-forest/55">
                {Number(productBundle.item_count) || (productBundle.items || []).length} products
                {productBundle.total_net_weight_g
                  ? ` · ${Number(productBundle.total_net_weight_g) >= 1000
                    ? `${(Number(productBundle.total_net_weight_g) / 1000).toFixed(2).replace(/\.?0+$/, '')} kg`
                    : `${Math.round(Number(productBundle.total_net_weight_g))} g`}`
                  : ''}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-inter text-2xl font-bold text-deep-forest md:text-3xl">₹{price}</span>
              {isBundleParent && comboValuePresentation?.worthLabel ? (
                <span className="font-inter text-sm text-deep-forest/40 line-through">
                  {comboValuePresentation.worthLabel}
                </span>
              ) : comparePrice > price ? (
                <span className="font-inter text-sm text-deep-forest/40 line-through">₹{comparePrice}</span>
              ) : null}
            </div>
            {isBundleParent && comboValuePresentation?.saveLabel ? (
              <p className="mt-1 font-inter text-sm font-bold text-deep-forest">
                {comboValuePresentation.saveLabel}
                {comboValuePresentation.savePctLabel ? ` · ${comboValuePresentation.savePctLabel}` : ''}
                <span className="font-medium text-deep-forest/55"> vs buying separately</span>
              </p>
            ) : comparePrice > price && !isBundleParent ? (
              <span className="mt-1 inline-block font-inter text-xs font-bold text-deep-forest/70">{discountPct}% OFF</span>
            ) : null}
            {!isBundleParent ? (
              <PackSavingsBadge savings={selectedBulkSavings} qty={quantity} surface="detail" className="mt-1" />
            ) : null}

            {isBundleParent && productBundle && comboValuePresentation?.showSavings ? (
              <BundleValueCard
                bundle={productBundle}
                comboPrice={price}
                className="mt-4"
                compact
              />
            ) : null}

            <p className="mt-3 line-clamp-3 font-inter text-sm leading-6 text-deep-forest/70">{heroCopy}</p>

            <div className="mt-4">
              <ProductFeatureGrid items={featureLabels} />
            </div>

            {productVariants.length > 0 && !isBundleParent ? (
              <div className="mt-5">
                <p className={retailClasses.label}>Select size</p>
                <VariantPackPicker
                  className="mt-2"
                  variants={productVariants}
                  selectedVariant={selectedVariant}
                  onSelect={(v) => { setSelectedVariant(v); setActiveImage(0); }}
                />
                {productVariants.some((v) => computePackBulkSavings(productVariants, v)) ? (
                  <p className="mt-2 font-inter text-[11px] leading-relaxed text-deep-forest/50">
                    Kitchen and home stock packs are priced fairer per kg — Yasvik fair prices guaranteed.
                  </p>
                ) : null}
              </div>
            ) : null}

            {productBundle && bundleHasCustomerOptions(productBundle) ? (
              <ComboOptionSelector
                className="mt-5"
                bundle={productBundle}
                selectedChoiceId={selectedChoiceId}
                onSelect={(choice) => {
                  setSelectedChoiceId(choice.id);
                  setActiveImage(0);
                }}
              />
            ) : null}

            {comboPresentation?.audienceTags?.length ? (
              <section className="mt-5">
                <p className={retailClasses.label}>Who is this for?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {comboPresentation.audienceTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-soft-border bg-white px-3 py-1 font-inter text-xs text-deep-forest/75"
                    >
                      {AUDIENCE_LABELS[tag] || tag}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-4 hidden md:block">
              <DeliveryPromoStrip />
            </div>

            {storeOnly ? (
              <div className="mt-5 rounded-xl border border-wet-earth/25 bg-wet-earth/5 p-4">
                <p className="font-inter text-sm font-medium text-deep-forest">Available at our store only</p>
                <p className="mt-1 font-inter text-xs text-deep-forest/65 leading-relaxed">
                  This item is not sold online. Visit Yasvik or ask at the counter — it remains in our catalog for store billing and labels.
                </p>
                <a
                  href={`https://wa.me/${YASVIK_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi Yasvik, is ${title} available at the store today?`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-3 inline-flex items-center gap-2 ${retailClasses.btnOutline}`}
                >
                  <MessageCircle className="h-4 w-4" /> Ask on WhatsApp
                </a>
              </div>
            ) : storeOffline ? (
              <div className="mt-5 rounded-xl border border-soft-border bg-warm-cream p-4">
                <p className="font-inter text-sm text-deep-forest/70">Ordering is temporarily paused. Browse now — checkout opens again soon.</p>
                <Link to="/shop" className={`mt-3 ${retailClasses.btnPrimary}`}>Back to shop</Link>
              </div>
            ) : (
              <div className={`mt-5 hidden items-center gap-3 md:flex ${!canOrderOnline ? 'pointer-events-none opacity-50' : ''}`}>
                <div className="flex items-center overflow-hidden rounded-full border border-soft-border">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-11 w-10 items-center justify-center hover:bg-warm-cream"><Minus className="h-4 w-4" /></button>
                  <span className="min-w-8 text-center font-inter text-sm font-bold">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => q + 1)} className="flex h-11 w-10 items-center justify-center hover:bg-warm-cream"><Plus className="h-4 w-4" /></button>
                </div>
                <button type="button" onClick={handleAddToCart} className={`flex-1 ${retailClasses.btnPrimary} ${isPulseActive ? 'premium-haptic-pulse' : ''}`}>
                  {added ? 'Added to cart' : 'Add to cart'}
                </button>
                <button type="button" onClick={handleBuyNow} className={retailClasses.btnOutline}>Buy now</button>
              </div>
            )}

            {productBundle ? (
              <>
                {comboPresentation?.freeGifts?.length ? (
                  <ComboFreeGiftHighlight
                    gifts={comboPresentation.freeGifts}
                    className="mt-6"
                  />
                ) : null}
                {bundleHasCustomerOptions(productBundle) ? (
                  <ComboWhatsInsideGrouped
                    included={comboPresentation?.groupedIncluded?.flatMap((group) => group.lines) || []}
                    freeGifts={[]}
                    className="mt-6"
                  />
                ) : (
                  <BundleWhatsInside
                    bundle={productBundle}
                    parentProductId={product.id}
                    comboPrice={price}
                    className="mt-6"
                  />
                )}
                {!comboValuePresentation?.showSavings ? (
                  <BundleValueCard
                    bundle={productBundle}
                    comboPrice={price}
                    perfectFor={bestFor}
                    badge=""
                    className="mt-5"
                  />
                ) : null}
              </>
            ) : null}

            {comboAlreadyInCart ? (
              <div className="mt-5 rounded-2xl border border-deep-forest/20 bg-warm-cream px-4 py-3">
                <p className="font-inter text-sm font-semibold text-deep-forest">
                  ✓ Already Included in this Combo
                </p>
                <p className="mt-1 font-inter text-xs text-deep-forest/65">
                  {formatDisplayTitle(comboAlreadyInCart.title || comboAlreadyInCart.name)} is in your cart —
                  this product is already covered.
                </p>
                <Link
                  to={getProductPath(comboAlreadyInCart)}
                  className="mt-2 inline-block font-inter text-xs font-bold text-deep-forest"
                >
                  View combo
                </Link>
              </div>
            ) : null}

            {!isBundleParent ? (
              <AvailableInCombos
                productId={product.id}
                bundles={containingCombos}
                className="mt-6"
              />
            ) : null}

            {String(product?.product_kind) === 'true_mix' ? (
              <div className="mt-5 rounded-2xl border border-soft-border/80 bg-white p-4">
                <h3 className="font-inter text-sm font-semibold text-deep-forest">Composition</h3>
                <p className="mt-2 font-inter text-xs text-deep-forest/65 whitespace-pre-line">
                  {compactText(product.ingredients) || 'Ingredients pending confirmation.'}
                </p>
                {product.composition_status === 'unconfirmed' ? (
                  <p className="mt-2 font-inter text-[11px] text-amber-700">Composition unconfirmed — not ready to publish.</p>
                ) : null}
                {allergenInfo ? (
                  <p className="mt-2 font-inter text-[11px] text-deep-forest/55">Allergens: {allergenInfo}</p>
                ) : null}
              </div>
            ) : null}

            {!storeOffline && product?.id && !isBundleParent ? (
              <div className="mt-6 hidden md:block">
                <FrequentlyBoughtTogether productId={product.id} />
              </div>
            ) : null}

            <ProductDetailTabs
              about={fullDescription || heroCopy}
              specs={productSpecs}
              reviews={productReviews}
              reviewCount={reviewStats?.count || 0}
              reviewAverage={reviewStats?.avg || null}
              faq={bestFor ? `Best for: ${bestFor}.${storageNote ? ` Storage: ${storageNote}` : ''}` : storageNote || 'WhatsApp us for product questions.'}
            />
          </div>
        </div>

        {!storeOffline && product?.id && isBundleParent ? (
          <div className="mt-8 px-0">
            <SuggestedCombos excludeProductId={product.id} limit={4} />
          </div>
        ) : null}

        {!storeOffline && product?.id && !isBundleParent ? (
          <div className="mt-6 px-0 md:hidden">
            <p className="mb-3 font-cormorant text-lg font-semibold text-deep-forest">Frequently bought together</p>
            <FrequentlyBoughtTogether productId={product.id} />
          </div>
        ) : null}

        <RetailTrustLine className="mt-4" />

        {visibleFaqs.length > 0 ? (
          <section className="mt-6 rounded-2xl border border-soft-border bg-white p-5">
            <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Product FAQs</h2>
            <div className="mt-4 space-y-3">
              {visibleFaqs.map((item) => (
                <div key={item.q} className="rounded-xl border border-soft-border/80 bg-warm-cream/30 p-4">
                  <h3 className="font-inter text-sm font-semibold text-deep-forest">{item.q}</h3>
                  <p className="mt-1.5 font-inter text-sm leading-6 text-deep-forest/70">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <AnimatePresence>{traceOpen && hasTraceability && <TraceDrawer onClose={() => setTraceOpen(false)} linkedPerson={linkedPerson} linkedRegion={linkedRegion} linkedJourney={linkedJourney} location={traceLocation} harvestDate={product.harvest_date} testingDate={product.batch_tested_at} note={traceNote} />}</AnimatePresence>

      <MobileStickyBuyBar
        price={price}
        quantity={quantity}
        onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}
        onIncrement={() => setQuantity((q) => q + 1)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        added={added}
        inStock={inStock}
        storeOffline={storeOffline || storeOnly}
        isPulseActive={isPulseActive}
        saveLabel={comboValuePresentation?.saveLabel || null}
      />
    </div>
  );
}

function TraceDrawer({ onClose, linkedPerson, linkedRegion, linkedJourney, location, harvestDate, testingDate, note }) {
  const mapUrl = location ? `https://www.google.com/maps/search/${encodeURIComponent(location)}` : null;
  return <><motion.button type="button" aria-label="Close traceability drawer" className="fixed inset-0 z-[180] bg-black/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} /><motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }} className="fixed right-0 top-0 z-[190] h-full w-full max-w-md bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-soft-border px-5 py-4"><h3 className="font-cormorant text-2xl font-semibold text-deep-forest">Traceable Sourcing</h3><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-soft-border"><X className="h-4 w-4" /></button></div><div className="space-y-4 overflow-y-auto px-5 py-5">{linkedPerson?.name && <TraceRow icon={UserRound} label="Producer Partner" value={linkedPerson.name} />}{(location || linkedRegion?.name) && <TraceRow icon={MapPin} label="Origin" value={location || linkedRegion?.name} extra={mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer" className="text-[#2D7A3E] underline">View origin map</a> : null} />}{(harvestDate || testingDate) && <TraceRow icon={CalendarDays} label="Batch Dates" value={[harvestDate ? `Harvested: ${harvestDate}` : null, testingDate ? `Checked: ${testingDate}` : null].filter(Boolean).join(' · ')} />}<div className="rounded-2xl border border-soft-border bg-[#F5F1E8] p-4"><p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#9A9185]">Sourcing Note</p><p className="mt-2 font-inter text-sm leading-7 text-[#6F675D]">{note || 'This product has linked sourcing context. More details can be added from the admin console when available.'}</p>{linkedJourney?.id && <Link to={`/journeys/${linkedJourney.id}`} onClick={onClose} className="mt-3 inline-block font-inter text-sm font-bold text-[#2D7A3E]">Explore linked journey</Link>}</div></div></motion.aside></>;
}

function TraceRow({ icon: Icon, label, value, extra }) {
  return <div className="rounded-2xl border border-soft-border bg-[#F5F1E8] p-4"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 text-[#2D7A3E]" /><div><p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#9A9185]">{label}</p><p className="mt-1 font-inter text-sm leading-6 text-[#1A1814]">{value}</p>{extra && <div className="mt-1 font-inter text-sm">{extra}</div>}</div></div></div>;
}
