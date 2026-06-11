import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Home as HomeIcon, MapPin, ShieldCheck, Sparkles, Wheat } from 'lucide-react';
import { categories as categoriesApi, products as productsApi } from '@/services/api';
import FooterSection from '@/components/home/FooterSection';
import YasvikLogo from '@/components/brand/YasvikLogo';
import ProductCard from '@/components/products/ProductCard';
import CategoryArtwork from '@/components/categories/CategoryArtwork';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const FALLBACK_PRODUCTS = [
  { id: 'yasvik-ragi-placeholder', title: 'Yasvik Ragi Flour', price: 99, isFallback: true, unit: '500g' },
  { id: 'yasvik-honey-placeholder', title: 'Forest Honey', price: 249, isFallback: true, unit: '250g' },
  { id: 'yasvik-millet-placeholder', title: 'Little Millet', price: 119, isFallback: true, unit: '1kg' },
  { id: 'yasvik-groundnut-oil-placeholder', title: 'Wood-Pressed Groundnut Oil', price: 399, isFallback: true, unit: '1L' },
];

const DEFAULT_TRUST_CARDS = [
  {
    title: 'Thoughtfully Chosen',
    body: 'Everyday foods selected for usefulness, quality and family kitchens.',
    icon: 'thoughtful',
  },
  {
    title: 'Traditional Alternatives',
    body: 'Millets, native rice, wood-pressed oils and pantry staples that fit real routines.',
    icon: 'traditional',
  },
  {
    title: 'Quality Checked Where Applicable',
    body: 'Clear product information, sourcing notes and compliance details where they apply.',
    icon: 'quality',
  },
  {
    title: 'Neighborhood Essentials',
    body: 'Better everyday choices without the premium-store complexity.',
    icon: 'neighborhood',
  },
];

const DEFAULT_STORY_CARDS = [
  {
    title: 'Native grains, everyday meals.',
    body: 'Traditional rice and millet choices for modern family cooking.',
    href: '/shop',
    cta: 'Shop grains',
  },
  {
    title: 'Better alternatives, not empty labels.',
    body: 'We choose foods that help one practical pantry switch at a time.',
    href: '/shop',
    cta: 'Shop essentials',
  },
  {
    title: 'Stories where they add trust.',
    body: 'Journeys and people support products that genuinely need context.',
    href: '/our-roots',
    cta: 'Explore roots',
  },
  {
    title: 'Thoughtful sourcing, honestly explained.',
    body: 'Some products are direct, some are from trusted regional specialists. We keep that distinction clear.',
    href: '/our-roots#hands',
    cta: 'Read more',
  },
];

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return trimmed.split(/\n|\|/).map((item) => item.trim()).filter(Boolean);
    }
  }
  return [];
}

function isRandomPlaceholder(url = '') {
  return /picsum\.photos|source\.unsplash\.com|placehold/i.test(String(url));
}

function safeMedia(url = '') {
  const value = String(url || '').trim();
  return value && !isRandomPlaceholder(value) ? value : '';
}

function isVideoMedia(url = '') {
  return /\.(mp4|webm|mov)(\?|$)/i.test(String(url || ''));
}

function getProductTitle(product) {
  return product?.title || product?.name || 'Yasvik product';
}

function getProductImage(product) {
  const gallery = Array.isArray(product?.image_urls) ? product.image_urls : [];
  return safeMedia(product?.hero_image || product?.featured_image_url || product?.image_url || gallery[0] || '');
}

function getCategoryName(category) {
  return category?.emotional_title || category?.name || category?.title || 'Shop';
}

function productBelongsTo(product, category) {
  if (!category?.id) return false;
  return product?.category_id === category.id || product?.category === category.id || product?.categoryId === category.id;
}

function normalizeSlideHref(value = '/shop') {
  const href = String(value || '').trim();
  if (!href) return '/shop';
  if (href.startsWith('#')) return `/${href}`;
  if (href.startsWith('/') || href.startsWith('http')) return href;
  return `/${href}`;
}

function parseConfiguredSlides(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((slide, index) => ({
        eyebrow: String(slide.eyebrow || slide.kicker || 'Yasvik').trim(),
        title: String(slide.title || slide.alt || slide.label || `Yasvik campaign ${index + 1}`).trim(),
        subtitle: String(slide.subtitle || slide.description || '').trim(),
        cta: String(slide.cta || slide.cta_label || 'Shop Now').trim(),
        href: normalizeSlideHref(slide.href || slide.link || slide.url || '/shop'),
        media: safeMedia(slide.media || slide.image || slide.image_url || slide.media_url || ''),
      }))
      .filter((slide) => slide.media || slide.href || slide.cta);
  } catch {
    return [];
  }
}

function parseConfiguredCards(value, fallbackCards = []) {
  if (!value) return fallbackCards;
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return fallbackCards;
    const cards = parsed
      .map((card, index) => ({
        title: String(card.title || card.heading || fallbackCards[index]?.title || '').trim(),
        body: String(card.body || card.description || card.copy || fallbackCards[index]?.body || '').trim(),
        icon: String(card.icon || fallbackCards[index]?.icon || 'thoughtful').trim(),
        href: card.href || card.link ? normalizeSlideHref(card.href || card.link) : fallbackCards[index]?.href,
        cta: String(card.cta || card.cta_label || fallbackCards[index]?.cta || 'Explore').trim(),
        media: safeMedia(card.media || card.image || card.image_url || card.media_url || ''),
      }))
      .filter((card) => card.title);
    return cards.length ? cards : fallbackCards;
  } catch {
    return fallbackCards;
  }
}

function BrandedFallback({ label = 'Yasvik' }) {
  return (
    <div className="relative flex h-full min-h-[160px] w-full items-center justify-center overflow-hidden bg-[var(--theme-soft)]">
      <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 25% 20%, color-mix(in srgb, var(--action-primary) 34%, transparent), transparent 34%), radial-gradient(circle at 80% 75%, color-mix(in srgb, var(--theme-accent) 18%, transparent), transparent 34%)' }} />
      <div className="relative flex flex-col items-center text-center">
        <YasvikLogo variant="symbol" imageClassName="h-14 w-auto opacity-70" />
        <p className="mt-3 max-w-[12rem] font-inter text-[10px] uppercase tracking-[0.18em] text-[var(--theme-muted)]">{label}</p>
      </div>
    </div>
  );
}

function CategoryStrip({ categories, onSelect }) {
  if (!categories.length) return null;
  return (
    <section className="border-b border-[var(--theme-border)] bg-[var(--theme-section)] px-4 py-6 md:px-8 md:py-7">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-muted)]">Browse faster</p>
            <h2 className="font-syne text-2xl font-bold tracking-[-0.03em] text-[var(--text-main)]">Shop by Category</h2>
          </div>
          <button onClick={() => onSelect('featured')} className="flex items-center gap-1 font-inter text-sm font-semibold text-[var(--theme-accent)] transition-all hover:gap-2">View all <ArrowRight className="h-4 w-4" /></button>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 hide-scrollbar md:snap-none">
          {categories.slice(0, 12).map((category) => {
            const image = safeMedia(category.image_url || category.media_url || '');
            return (
              <button key={category.id} onClick={() => onSelect(category.id)} className="group flex w-[136px] flex-shrink-0 snap-start flex-col items-center gap-3 rounded-2xl bg-[var(--theme-soft)] p-4 text-center transition-all duration-200 hover:-translate-y-1 hover:bg-[var(--theme-soft-strong)] hover:shadow-md md:w-[128px]">
                <div className="flex h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-full bg-[var(--bg-card)] transition-all duration-200 group-hover:scale-[1.03] md:h-[78px] md:w-[78px] md:border md:border-[var(--theme-border)]">
                  {image ? <img src={image} alt={getCategoryName(category)} className="h-full w-full object-cover" loading="lazy" decoding="async" fetchPriority="low" /> : <CategoryArtwork title={getCategoryName(category)} />}
                </div>
                <span className="line-clamp-2 font-inter text-[14px] font-semibold leading-tight text-[var(--text-main)] md:text-[12px]">{getCategoryName(category)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HeroCampaignRail({ slides }) {
  const railRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const next = (current + 1) % slides.length;
        const rail = railRef.current;
        const card = rail?.querySelector(`[data-hero-slide="${next}"]`);
        if (rail && card) rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft, behavior: 'smooth' });
        return next;
      });
    }, 4600);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    const cards = [...rail.querySelectorAll('[data-hero-slide]')];
    const center = rail.scrollLeft + rail.clientWidth / 2;
    const nearest = cards.reduce((best, card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - center);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity });
    setActive(nearest.index);
  };

  return (
    <section className="bg-[var(--bg-canvas)] px-4 pb-3 pt-5 md:px-8 md:pb-5 md:pt-7">
      <div className="mx-auto max-w-[1400px]">
        <div ref={railRef} onScroll={handleScroll} className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2 hide-scrollbar md:gap-5">
          {slides.map((slide, index) => <HeroCampaignCard key={`${slide.title}-${index}`} slide={slide} index={index} />)}
        </div>
        <div className="mt-2 flex justify-center gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={`${slide.title}-dot-${index}`}
              type="button"
              aria-label={`Show ${slide.title}`}
              onClick={() => {
                const rail = railRef.current;
                const card = rail?.querySelector(`[data-hero-slide="${index}"]`);
                if (rail && card) rail.scrollTo({ left: card.offsetLeft - rail.offsetLeft, behavior: 'smooth' });
                setActive(index);
              }}
              className={`h-1.5 rounded-full transition-all ${active === index ? 'w-6 bg-[var(--theme-accent)]' : 'w-1.5 bg-[var(--theme-border)]'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroCampaignCard({ slide, index }) {
  const wide = index === 0;
  const isExternal = /^https?:\/\//i.test(slide.href);
  const className = `group relative h-[330px] flex-shrink-0 snap-center overflow-hidden rounded-[28px] bg-[var(--theme-header)] text-[var(--theme-header-text)] shadow-sm md:h-[430px] ${wide ? 'w-[78vw] md:w-[64%] lg:w-[63%]' : 'w-[68vw] md:w-[32.5%] lg:w-[32%]'}`;
  const content = (
    <>
      {slide.media ? (
        <img
          src={slide.media}
          alt={slide.title}
          className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
          loading={index === 0 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'low'}
          decoding={index === 0 ? 'sync' : 'async'}
          sizes={wide ? '(min-width: 1024px) 63vw, (min-width: 768px) 64vw, 78vw' : '(min-width: 1024px) 32vw, (min-width: 768px) 33vw, 68vw'}
        />
      ) : (
        <BrandedFallback label={slide.title} />
      )}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/28 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-[1] flex h-full items-end p-5 md:p-7">
        <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--action-primary)] px-4 py-2 font-inter text-xs font-bold uppercase tracking-[0.12em] text-[var(--action-text)] shadow-[0_10px_24px_rgba(0,0,0,.18)] backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-1 md:text-sm">
          {slide.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </>
  );

  if (isExternal) {
    return <a href={slide.href} target="_blank" rel="noreferrer" data-hero-slide={index} className={className}>{content}</a>;
  }

  return <Link to={slide.href} data-hero-slide={index} className={className}>{content}</Link>;
}

function ProductShelf({ id, products, title, eyebrow, cta = 'See all', href = '/shop' }) {
  if (!products.length) return null;
  return (
    <section id={id} className="scroll-mt-44 px-4 py-9 md:px-8 md:py-11">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <div>
            {eyebrow && <p className="font-inter text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--theme-muted)]">{eyebrow}</p>}
            <h2 className="mt-1 font-syne text-2xl font-bold tracking-[-0.03em] text-[var(--text-main)] md:text-3xl">{title}</h2>
          </div>
          {cta && <Link to={href} className="hidden items-center gap-1 rounded-full border border-[var(--theme-border)] px-4 py-2 font-inter text-sm font-semibold text-[var(--theme-accent)] transition-all hover:gap-2 hover:border-[var(--theme-accent)] md:flex">{cta} <ArrowRight className="h-4 w-4" /></Link>}
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 hide-scrollbar md:-mx-2 md:gap-4 md:px-2">
          {products.slice(0, 10).map((product, index) => (
            <div key={product.id} className="w-[76vw] max-w-[19rem] flex-shrink-0 snap-start sm:w-[44vw] md:w-[18rem] xl:w-[19rem]">
              <ProductCard product={product} index={index} />
            </div>
          ))}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--theme-soft)] md:max-w-[48%]">
          <div className="h-full w-2/5 rounded-full bg-[var(--theme-header)] opacity-80" />
        </div>
      </div>
    </section>
  );
}

const TRUST_ICON_MAP = {
  thoughtful: BadgeCheck,
  traditional: Wheat,
  quality: ShieldCheck,
  neighborhood: HomeIcon,
  story: Sparkles,
};

function TrustStrip({ cards }) {
  return (
    <section className="bg-[var(--bg-canvas)] px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-[1400px] text-center">
        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">Why Yasvik</p>
        <h2 className="mt-2 font-syne text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-main)] md:text-4xl">Better everyday foods, honestly chosen.</h2>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.slice(0, 4).map((card) => {
            const Icon = TRUST_ICON_MAP[card.icon] || BadgeCheck;
            return (
              <article key={card.title} className="rounded-3xl border border-[var(--theme-border)] bg-[var(--bg-card)] p-6 text-center shadow-[0_14px_36px_rgba(6,53,31,.05)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--action-primary)_14%,var(--bg-card))] text-[var(--theme-accent)]">
                  <Icon className="h-8 w-8" strokeWidth={1.6} />
                </div>
                <h3 className="mt-5 font-syne text-xl font-bold leading-tight text-[var(--text-main)]">{card.title}</h3>
                <p className="mt-3 font-inter text-sm leading-6 text-[var(--theme-muted)]">{card.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function StoryCard({ card, index, fallbackMedia }) {
  const media = safeMedia(card.media || fallbackMedia || '');
  const content = (
    <article className="group relative min-h-[360px] overflow-hidden rounded-[28px] border border-[var(--theme-border)] bg-[var(--theme-soft)] shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(6,53,31,.12)]">
      {media ? (
        <img src={media} alt={card.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" decoding="async" fetchPriority="low" />
      ) : (
        <BrandedFallback label={card.title} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/58 via-black/18 to-transparent" />
      <div className="relative z-[1] flex min-h-[360px] flex-col justify-end p-6 text-white">
        <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/16 px-3 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md">
          <MapPin className="h-3.5 w-3.5" /> {index === 0 ? 'Native & traditional' : 'Yasvik proof'}
        </p>
        <h3 className="font-syne text-2xl font-extrabold leading-tight tracking-[-0.03em]">{card.title}</h3>
        <p className="mt-3 font-inter text-sm leading-6 text-white/82">{card.body}</p>
        <p className="mt-5 inline-flex items-center gap-2 font-inter text-sm font-bold">{card.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></p>
      </div>
    </article>
  );

  return card.href ? <Link to={card.href}>{content}</Link> : content;
}

function NativeStorySection({ cards, mediaFallbacks }) {
  return (
    <section className="relative overflow-hidden bg-[color-mix(in_srgb,var(--action-primary)_8%,var(--bg-canvas))] px-4 py-12 md:px-8 md:py-16">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 20% 15%, var(--theme-accent) 0 2px, transparent 2px), radial-gradient(circle at 75% 65%, var(--action-primary) 0 2px, transparent 2px)', backgroundSize: '54px 54px' }} />
      <div className="relative mx-auto max-w-[1400px]">
        <div className="mb-8 text-center">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--theme-muted)]">Native & Traditional Foods</p>
          <h2 className="mt-2 font-syne text-3xl font-extrabold tracking-[-0.04em] text-[var(--text-main)] md:text-4xl">Practical foods with deeper context.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {cards.slice(0, 4).map((card, index) => <StoryCard key={card.title} card={card} index={index} fallbackMedia={mediaFallbacks[index]} />)}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.home, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const { data: categories = [] } = useQuery({ queryKey: ['home-clove-categories'], queryFn: () => categoriesApi.listActive(24), staleTime: 5 * 60 * 1000 });
  const { data: products = [] } = useQuery({ queryKey: ['home-clove-products'], queryFn: () => productsApi.listPublished('-created_date', 80), staleTime: 3 * 60 * 1000 });
  const getSetting = (key, fallback) => { const value = settingsMap[key]; return value === undefined || value === null || value === '' ? fallback : value; };

  const heroHeadline = String(getSetting('home_hero_headline', 'Better choices for everyday living.'));
  const heroSubheadline = String(getSetting('home_hero_subheadline', 'Thoughtfully chosen foods and essentials inspired by traditional wisdom and modern family needs.'));
  const heroDesktopMedia = safeMedia(String(getSetting('home_hero_desktop_media_url', getSetting('home_hero_media_url', ''))));
  const heroMobileMedia = safeMedia(String(getSetting('home_hero_mobile_media_url', getSetting('home_hero_media_mobile_url', heroDesktopMedia))));
  const heroCtaLabel = String(getSetting('home_hero_cta_label', 'Shop Now'));
  const heroCtaUrl = normalizeSlideHref(getSetting('home_hero_cta_url', '#featured'));
  const heroProductId = String(getSetting('home_hero_product_id', ''));
  const configuredHeroSlides = useMemo(() => parseConfiguredSlides(settingsMap.home_hero_slides_json), [settingsMap.home_hero_slides_json]);
  const visibleProducts = products.length ? products : FALLBACK_PRODUCTS;
  const heroProduct = useMemo(() => products.find((product) => product.id === heroProductId) || products.find((product) => product.is_featured || product.featured_in_hero) || visibleProducts[0], [heroProductId, products, visibleProducts]);
  const heroProductImage = getProductImage(heroProduct);
  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.is_featured || product.featured_in_hero);
    const merged = [...featured, ...visibleProducts].filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index);
    return merged.slice(0, 10);
  }, [products, visibleProducts]);
  const heroSlides = useMemo(() => {
    if (configuredHeroSlides.length) return configuredHeroSlides;
    const productSlides = featuredProducts.slice(0, 3).map((product, index) => ({
      eyebrow: index === 0 ? 'Shop bestsellers' : 'Featured essentials',
      title: getProductTitle(product),
      subtitle: product.short_description || product.description || 'A better everyday staple selected for family kitchens.',
      cta: 'Shop Now',
      href: product.isFallback ? '/shop' : `/product/${product.id}`,
      media: getProductImage(product),
    }));
    return [
      {
        eyebrow: 'Yasvik Essentials',
        title: heroHeadline,
        subtitle: heroSubheadline,
        cta: heroCtaLabel,
        href: heroCtaUrl,
        media: heroMobileMedia || heroDesktopMedia || heroProductImage,
      },
      ...productSlides,
      {
        eyebrow: 'Weekly essentials',
        title: 'Millets, native rice, oils, pulses and groceries.',
        subtitle: 'Better everyday foods in one trusted neighborhood store.',
        cta: 'Explore Shop',
        href: '/shop',
        media: getProductImage(visibleProducts[1]) || heroProductImage,
      },
    ].filter((slide, index, all) => index === all.findIndex((item) => item.title === slide.title));
  }, [configuredHeroSlides, featuredProducts, heroCtaLabel, heroCtaUrl, heroDesktopMedia, heroHeadline, heroMobileMedia, heroProductImage, heroSubheadline, visibleProducts]);
  const firstHeroMedia = heroSlides[0]?.media || '';
  const trustCards = useMemo(() => parseConfiguredCards(settingsMap.home_trust_cards_json, DEFAULT_TRUST_CARDS), [settingsMap.home_trust_cards_json]);
  const storyMediaFallbacks = useMemo(() => normalizeList(settingsMap.home_story_panel_media_urls).map(safeMedia).filter(Boolean), [settingsMap.home_story_panel_media_urls]);
  const storyCards = useMemo(() => parseConfiguredCards(settingsMap.home_story_cards_json, DEFAULT_STORY_CARDS).map((card, index) => ({ ...card, media: card.media || storyMediaFallbacks[index] || '' })), [settingsMap.home_story_cards_json, storyMediaFallbacks]);
  const focusTitle = String(getSetting('home_product_focus_title', 'Product in Focus: Better everyday staples'));
  const focusCategoryId = String(getSetting('home_product_focus_category_id', ''));
  const focusCategory = useMemo(() => categories.find((category) => category.id === focusCategoryId) || categories[0], [categories, focusCategoryId]);
  const focusProducts = useMemo(() => {
    const matched = focusCategory ? products.filter((product) => productBelongsTo(product, focusCategory)) : [];
    return (matched.length ? matched : featuredProducts).slice(0, 10);
  }, [featuredProducts, focusCategory, products]);

  useEffect(() => {
    if (!firstHeroMedia || isVideoMedia(firstHeroMedia)) return undefined;
    const existing = [...document.querySelectorAll('link[rel="preload"][as="image"]')].find((link) => link.href === firstHeroMedia);
    if (existing) return undefined;
    document.querySelectorAll('link[data-yasvik-lcp-preload="true"]').forEach((link) => link.remove());
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = firstHeroMedia;
    link.setAttribute('data-yasvik-lcp-preload', 'true');
    link.fetchPriority = 'high';
    document.head.appendChild(link);
    return () => link.remove();
  }, [firstHeroMedia]);

  const handleCategorySelect = (id) => {
    if (id === 'featured') {
      document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate(`/shop?category=${id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-main)] transition-colors duration-300">
      <HeroCampaignRail slides={heroSlides} />
      <CategoryStrip categories={categories} onSelect={handleCategorySelect} />
      <ProductShelf id="featured" products={featuredProducts} eyebrow="Better everyday foods" title="Thoughtfully chosen Yasvik essentials." cta="See all" href="/shop" />
      <TrustStrip cards={trustCards} />
      <NativeStorySection cards={storyCards} mediaFallbacks={storyMediaFallbacks} />
      <ProductShelf id="product-focus" products={focusProducts} eyebrow={focusCategory ? getCategoryName(focusCategory) : 'Product focus'} title={focusTitle} cta="See all" href={focusCategory ? `/shop?category=${focusCategory.id}` : '/shop'} />
      <FooterSection />
    </div>
  );
}
