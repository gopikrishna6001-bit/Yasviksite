import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Home as HomeIcon, MapPin, ShieldCheck, Sparkles, Wheat } from 'lucide-react';
import { categories as categoriesApi, products as productsApi, recipes as recipesApi } from '@/services/api';
import FooterSection from '@/components/home/FooterSection';
import YasvikLogo from '@/components/brand/YasvikLogo';
import ProductCard from '@/components/products/ProductCard';
import CategoryArtwork from '@/components/categories/CategoryArtwork';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const FALLBACK_PRODUCTS = [
  { id: 'yasvik-ragi-placeholder', title: 'Yasvik Ragi Flour', price: 99, isFallback: true, unit: '500g', sourcing_location: 'Traditional grains', processing_method: 'Stone-ground' },
  { id: 'yasvik-honey-placeholder', title: 'Forest Honey', price: 249, isFallback: true, unit: '250g', sourcing_location: 'Regional harvest', processing_method: 'Raw honey' },
  { id: 'yasvik-millet-placeholder', title: 'Little Millet', price: 119, isFallback: true, unit: '1kg', sourcing_location: 'Millet belt', processing_method: 'Unpolished grain' },
  { id: 'yasvik-groundnut-oil-placeholder', title: 'Wood-Pressed Groundnut Oil', price: 399, isFallback: true, unit: '1L', sourcing_location: 'Trusted mill', processing_method: 'Wood-pressed' },
];

const FALLBACK_CATEGORIES = [
  { id: 'oils', name: 'Oils', emotional_title: 'Wood-Pressed Oils' },
  { id: 'spices', name: 'Spices', emotional_title: 'Whole Spices' },
  { id: 'grains', name: 'Grains', emotional_title: 'Native Rice & Grains' },
  { id: 'ghee', name: 'Ghee', emotional_title: 'Ghee' },
  { id: 'pulses', name: 'Pulses', emotional_title: 'Pulses' },
  { id: 'regional', name: 'Regional', emotional_title: 'Regional Foods' },
];

const TRUST_SIGNALS = ['Wood-pressed', 'Seasonally sourced', 'Farmer-linked where real', 'No anonymous food'];

const DEFAULT_TRUST_CARDS = [
  { title: 'Thoughtfully Chosen', body: 'Everyday staples selected for usefulness, quality and real family kitchens.', icon: 'thoughtful' },
  { title: 'Traditional Alternatives', body: 'Millets, native rice, whole spices and slow-processed foods that fit modern routines.', icon: 'traditional' },
  { title: 'Quality Checked Where Applicable', body: 'We show sourcing, label and compliance context where it genuinely exists.', icon: 'quality' },
  { title: 'Neighborhood Essentials', body: 'Better choices without turning the pantry into an expensive lifestyle project.', icon: 'neighborhood' },
];

const DEFAULT_STORY_CARDS = [
  { title: 'Native grains, everyday meals.', body: 'Traditional rice and millet choices for modern family cooking.', href: '/shop', cta: 'Shop grains' },
  { title: 'Better alternatives, not empty labels.', body: 'One practical pantry switch at a time: oils, jaggery, pulses, grains and spices.', href: '/shop', cta: 'Shop essentials' },
  { title: 'Stories where they add trust.', body: 'Journeys and people support products that genuinely need origin context.', href: '/our-roots', cta: 'Explore roots' },
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
        cta: String(slide.cta || slide.cta_label || 'Begin the Journey').trim(),
        href: normalizeSlideHref(slide.href || slide.link || slide.url || '/our-roots'),
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
    <div className="relative flex h-full min-h-[220px] w-full items-center justify-center overflow-hidden bg-[#F5EBD2]">
      <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 22% 18%, rgba(95, 135, 63, .20), transparent 36%), radial-gradient(circle at 80% 72%, rgba(185, 106, 46, .18), transparent 34%)' }} />
      <div className="relative flex flex-col items-center text-center">
        <YasvikLogo variant="symbol" imageClassName="h-14 w-auto opacity-65" />
        <p className="mt-3 max-w-[14rem] font-inter text-[10px] uppercase tracking-[0.2em] text-[#6E735D]">{label}</p>
      </div>
    </div>
  );
}

function CinematicHero({ slide, desktopMedia, mobileMedia }) {
  const media = safeMedia(mobileMedia || desktopMedia || slide?.media || '');
  const desktop = safeMedia(desktopMedia || slide?.media || media);
  const mobile = safeMedia(mobileMedia || media || desktop);
  const cta = slide?.cta || 'Begin the Journey';
  const href = slide?.href || '/our-roots';

  return (
    <section className="relative isolate min-h-[78svh] overflow-hidden bg-[#15100B] md:min-h-[calc(100svh-var(--yasvik-content-top-no-nav,120px))]">
      {desktop || mobile ? (
        <picture className="absolute inset-0 -z-20 h-full w-full">
          {mobile && <source media="(max-width: 767px)" srcSet={mobile} />}
          <img src={desktop || mobile} alt={slide?.title || 'Yasvik traditional foods'} className="h-full w-full object-cover" loading="eager" decoding="sync" fetchPriority="high" />
        </picture>
      ) : (
        <div className="absolute inset-0 -z-20"><BrandedFallback label="Everything begins at the roots" /></div>
      )}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(21,16,11,.78),rgba(21,16,11,.46)_43%,rgba(21,16,11,.16)),linear-gradient(0deg,rgba(248,244,231,.22),transparent_34%)]" />
      <div className="mx-auto flex min-h-[78svh] max-w-[1400px] items-end px-5 pb-14 pt-16 md:min-h-[calc(100svh-var(--yasvik-content-top-no-nav,120px))] md:px-8 md:pb-20">
        <div className="max-w-3xl text-[#FFFDF3]">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.28em] text-[#F4D9A4]">Traditional Foods • Fair Prices • Trusted Quality</p>
          <h1 className="mt-5 font-cormorant text-6xl font-semibold leading-[0.88] tracking-[0.03em] text-[#FFFDF3] md:text-8xl lg:text-9xl">Taste What Was Lost</h1>
          <p className="mt-6 max-w-2xl font-inter text-base leading-8 text-[#FFFDF3]/82 md:text-lg">Food should not become anonymous. Yasvik reconnects everyday staples with soil, seasons, hands and heritage.</p>
          <Link to={href} className="yasvik-harvest-cta yasvik-pressable mt-8 min-w-[14rem] px-7 py-3 text-sm font-bold">{cta}<ArrowRight className="ml-3 h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

function PhilosophyStrip() {
  return (
    <section className="bg-[#F8F4E7] px-5 py-14 md:px-8 md:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-cormorant text-3xl italic leading-snug text-[#2B2118] md:text-5xl">Food is never just food. It is memory, culture, livelihood and care.</p>
        <p className="mx-auto mt-6 max-w-2xl font-inter text-sm leading-7 text-[#6E604C] md:text-base">We help families make better everyday choices through thoughtfully chosen foods, with stories and journeys where they deepen trust.</p>
      </div>
    </section>
  );
}

function CategoryRibbon({ categories, onSelect }) {
  const visibleCategories = (categories.length ? categories : FALLBACK_CATEGORIES).slice(0, 8);
  return (
    <section className="bg-[#FFFDF3] px-4 py-10 md:px-8 md:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A6B32]">Begin with the pantry</p>
            <h2 className="font-cormorant text-4xl font-semibold leading-none text-[#1F1710] md:text-5xl">Choose a food journey.</h2>
          </div>
          <Link to="/shop" className="hidden items-center gap-2 font-inter text-sm font-bold text-[#2D5C35] md:flex">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 hide-scrollbar">
          {visibleCategories.map((category) => {
            const image = safeMedia(category.image_url || category.media_url || '');
            return (
              <button key={category.id} onClick={() => onSelect(category.id)} className="group relative min-h-[180px] w-[66vw] max-w-[250px] flex-shrink-0 snap-start overflow-hidden rounded-[28px] border border-[#E4D7B9] bg-[#F4ECD8] p-5 text-left shadow-[0_16px_36px_rgba(43,33,24,.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(43,33,24,.14)] md:w-[220px]">
                <div className="absolute inset-0 opacity-70 transition-transform duration-700 group-hover:scale-105">
                  {image ? <img src={image} alt={getCategoryName(category)} className="h-full w-full object-cover" loading="lazy" decoding="async" fetchPriority="low" /> : <CategoryArtwork title={getCategoryName(category)} />}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1B130B]/72 via-[#1B130B]/18 to-transparent" />
                <div className="relative z-[1] flex h-full min-h-[140px] flex-col justify-end">
                  <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFDF3]/90 text-[#2D5C35]"><Wheat className="h-4 w-4" /></span>
                  <h3 className="font-cormorant text-2xl font-semibold leading-tight text-[#FFFDF3]">{getCategoryName(category)}</h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts({ products }) {
  if (!products.length) return null;
  return (
    <section id="featured" className="scroll-mt-44 bg-[#F8F4E7] px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A6B32]">Fair price staples</p>
            <h2 className="font-cormorant text-4xl font-semibold leading-none text-[#1F1710] md:text-5xl">Featured harvests.</h2>
          </div>
          <Link to="/shop" className="hidden rounded-full border border-[#2D5C35]/30 px-5 py-2 font-inter text-sm font-bold text-[#2D5C35] transition-colors hover:bg-[#2D5C35] hover:text-[#FFFDF3] md:inline-flex">See all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {products.slice(0, 6).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
        </div>
      </div>
    </section>
  );
}

function StoryTeaser({ cards, media }) {
  const card = cards[0] || DEFAULT_STORY_CARDS[0];
  return (
    <section className="bg-[#FFFDF3] px-4 py-12 md:px-8 md:py-18">
      <div className="mx-auto grid max-w-[1400px] overflow-hidden rounded-[36px] border border-[#E4D7B9] bg-[#F7EED8] shadow-[0_24px_70px_rgba(43,33,24,.09)] md:grid-cols-[1.05fr_0.95fr]">
        <div className="min-h-[360px] overflow-hidden">
          {media ? <img src={media} alt="Yasvik sourcing journey" className="h-full w-full object-cover" loading="lazy" decoding="async" fetchPriority="low" /> : <BrandedFallback label="Behind every grain" />}
        </div>
        <div className="flex flex-col justify-center p-8 md:p-12">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#9A6B32]">Our Roots</p>
          <h2 className="mt-4 font-cormorant text-5xl font-semibold leading-[0.95] text-[#1F1710] md:text-6xl">Behind every grain — a journey.</h2>
          <p className="mt-6 max-w-xl font-inter text-base leading-8 text-[#6E604C]">{card.body || 'Some foods come from farmers, some from trusted regional specialists. What matters is that food does not become anonymous.'}</p>
          <Link to="/our-roots" className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#1F1710] px-6 py-3 font-inter text-xs font-bold uppercase tracking-[0.16em] text-[#FFFDF3] transition-transform hover:-translate-y-0.5">Explore Our Roots <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}

function RecipesPreview({ recipes }) {
  const fallback = [
    { id: 'seasonal-millet', title: 'Millet breakfast for busy mornings', excerpt: 'Simple ways to bring better staples into daily meals.', hero_image: '' },
    { id: 'jaggery-kitchen', title: 'Choosing jaggery with care', excerpt: 'What to look for when replacing refined sweetness.', hero_image: '' },
    { id: 'native-rice', title: 'Native rice, familiar plates', excerpt: 'Traditional grains without making cooking complicated.', hero_image: '' },
  ];
  const cards = (recipes.length ? recipes : fallback).slice(0, 3);
  return (
    <section className="bg-[#F8F4E7] px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-7 text-center">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A6B32]">Seasonal cooking</p>
          <h2 className="font-cormorant text-4xl font-semibold leading-none text-[#1F1710] md:text-5xl">Recipes worth making.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((recipe) => {
            const href = recipe.id?.startsWith('seasonal-') || recipe.id?.startsWith('jaggery-') || recipe.id?.startsWith('native-') ? '/recipes' : `/recipes/${recipe.id}`;
            const image = safeMedia(recipe.hero_image || recipe.image_url || recipe.media_url || '');
            return (
              <Link key={recipe.id} to={href} className="group overflow-hidden rounded-[28px] border border-[#E4D7B9] bg-[#FFFDF3] shadow-[0_14px_38px_rgba(43,33,24,.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(43,33,24,.13)]">
                <div className="aspect-[4/3] overflow-hidden bg-[#F4ECD8]">{image ? <img src={image} alt={recipe.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" fetchPriority="low" /> : <BrandedFallback label={recipe.title} />}</div>
                <div className="p-5">
                  <h3 className="font-cormorant text-2xl font-semibold leading-tight text-[#1F1710]">{recipe.title}</h3>
                  <p className="mt-2 line-clamp-2 font-inter text-sm leading-6 text-[#6E604C]">{recipe.excerpt || recipe.description || 'A Yasvik kitchen note for better everyday cooking.'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const TRUST_ICON_MAP = { thoughtful: BadgeCheck, traditional: Wheat, quality: ShieldCheck, neighborhood: HomeIcon, story: Sparkles };

function WhyYasvik({ cards }) {
  return (
    <section className="bg-[#FFFDF3] px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-[1400px] text-center">
        <p className="font-inter text-[11px] font-bold uppercase tracking-[0.2em] text-[#9A6B32]">Why Yasvik</p>
        <h2 className="mt-2 font-cormorant text-4xl font-semibold leading-none text-[#1F1710] md:text-5xl">Quiet trust, not noisy claims.</h2>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.slice(0, 4).map((card) => {
            const Icon = TRUST_ICON_MAP[card.icon] || BadgeCheck;
            return (
              <article key={card.title} className="rounded-[28px] border border-[#E4D7B9] bg-[#FFFDF3] p-6 text-center shadow-[0_14px_36px_rgba(43,33,24,.05)]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4D8] text-[#2D5C35]"><Icon className="h-8 w-8" strokeWidth={1.6} /></div>
                <h3 className="mt-5 font-cormorant text-2xl font-semibold leading-tight text-[#1F1710]">{card.title}</h3>
                <p className="mt-3 font-inter text-sm leading-6 text-[#6E604C]">{card.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TrustSignalBand() {
  return (
    <section className="bg-[#1F1710] px-4 py-7 text-[#FFFDF3] md:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center font-inter text-[12px] font-bold uppercase tracking-[0.18em]">
        {TRUST_SIGNALS.map((signal) => <span key={signal} className="inline-flex items-center gap-3"><span className="h-1.5 w-1.5 rounded-full bg-[#B96A2E]" />{signal}</span>)}
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.home, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const { data: categories = [] } = useQuery({ queryKey: ['home-editorial-categories'], queryFn: () => categoriesApi.listActive(24), staleTime: 5 * 60 * 1000 });
  const { data: products = [] } = useQuery({ queryKey: ['home-editorial-products'], queryFn: () => productsApi.listPublished('-created_date', 80), staleTime: 3 * 60 * 1000 });
  const { data: recipes = [] } = useQuery({ queryKey: ['home-editorial-recipes'], queryFn: () => recipesApi.listPublished(6), staleTime: 5 * 60 * 1000 });
  const getSetting = (key, fallback) => { const value = settingsMap[key]; return value === undefined || value === null || value === '' ? fallback : value; };

  const heroDesktopMedia = safeMedia(String(getSetting('home_hero_desktop_media_url', getSetting('home_hero_media_url', ''))));
  const heroMobileMedia = safeMedia(String(getSetting('home_hero_mobile_media_url', getSetting('home_hero_media_mobile_url', heroDesktopMedia))));
  const configuredHeroSlides = useMemo(() => parseConfiguredSlides(settingsMap.home_hero_slides_json), [settingsMap.home_hero_slides_json]);
  const visibleProducts = products.length ? products : FALLBACK_PRODUCTS;
  const firstProductImage = getProductImage(visibleProducts[0]);
  const heroSlide = configuredHeroSlides[0] || {
    title: String(getSetting('home_hero_headline', 'Taste What Was Lost')),
    cta: String(getSetting('home_hero_cta_label', 'Begin the Journey')),
    href: normalizeSlideHref(getSetting('home_hero_cta_url', '/our-roots')),
    media: heroMobileMedia || heroDesktopMedia || firstProductImage,
  };

  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.is_featured || product.featured_in_hero);
    const merged = [...featured, ...visibleProducts].filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index);
    return merged.slice(0, 6);
  }, [products, visibleProducts]);

  const trustCards = useMemo(() => parseConfiguredCards(settingsMap.home_trust_cards_json, DEFAULT_TRUST_CARDS), [settingsMap.home_trust_cards_json]);
  const storyMediaFallbacks = useMemo(() => normalizeList(settingsMap.home_story_panel_media_urls).map(safeMedia).filter(Boolean), [settingsMap.home_story_panel_media_urls]);
  const storyCards = useMemo(() => parseConfiguredCards(settingsMap.home_story_cards_json, DEFAULT_STORY_CARDS), [settingsMap.home_story_cards_json]);
  const storyMedia = storyCards.find((card) => card.media)?.media || storyMediaFallbacks[0] || getProductImage(visibleProducts[1]);

  useEffect(() => {
    const firstHeroMedia = heroMobileMedia || heroDesktopMedia || heroSlide.media || '';
    if (!firstHeroMedia || isVideoMedia(firstHeroMedia)) return undefined;
    document.querySelectorAll('link[data-yasvik-lcp-preload="true"]').forEach((link) => link.remove());
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = firstHeroMedia;
    link.setAttribute('data-yasvik-lcp-preload', 'true');
    link.fetchPriority = 'high';
    document.head.appendChild(link);
    return () => link.remove();
  }, [heroDesktopMedia, heroMobileMedia, heroSlide.media]);

  const handleCategorySelect = (id) => {
    const categoryExists = categories.some((category) => category.id === id);
    navigate(categoryExists ? `/shop?category=${id}` : '/shop');
  };

  return (
    <div className="min-h-screen bg-[#F8F4E7] text-[#1F1710] transition-colors duration-300">
      <CinematicHero slide={heroSlide} desktopMedia={heroDesktopMedia || heroSlide.media} mobileMedia={heroMobileMedia || heroSlide.media} />
      <PhilosophyStrip />
      <CategoryRibbon categories={categories} onSelect={handleCategorySelect} />
      <FeaturedProducts products={featuredProducts} />
      <StoryTeaser cards={storyCards} media={storyMedia} />
      <RecipesPreview recipes={recipes} />
      <WhyYasvik cards={trustCards} />
      <TrustSignalBand />
      <FooterSection />
    </div>
  );
}
