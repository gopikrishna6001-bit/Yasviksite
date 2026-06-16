import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { people as peopleApi, products as productsApi, recipes as recipesApi, stories as storiesApi } from '@/services/api';
import FooterSection from '@/components/home/FooterSection';
import YasvikLogo from '@/components/brand/YasvikLogo';
import ProductCard from '@/components/products/ProductCard';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const FALLBACK_PRODUCTS = [
  { id: 'yasvik-ragi-placeholder', title: 'Ragi Flour', price: 99, isFallback: true, unit: '500g', processing_method: 'Traditional grain' },
  { id: 'yasvik-honey-placeholder', title: 'Forest Honey', price: 249, isFallback: true, unit: '250g', sourcing_location: 'Regional harvest' },
  { id: 'yasvik-millet-placeholder', title: 'Little Millet', price: 119, isFallback: true, unit: '1kg', origin_region: 'Millet belt' },
  { id: 'yasvik-groundnut-oil-placeholder', title: 'Wood-Pressed Groundnut Oil', price: 399, isFallback: true, unit: '1L', processing_method: 'Wood-pressed' },
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
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url || ''));
}

function getYouTubeId(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  const match = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] || '';
}

function normalizeSlideHref(value = '/our-roots') {
  const href = String(value || '').trim();
  if (!href) return '/our-roots';
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
        title: String(slide.title || slide.headline || `Yasvik story ${index + 1}`).trim(),
        subtitle: String(slide.subtitle || slide.description || '').trim(),
        cta: String(slide.cta || slide.cta_label || 'Begin the Journey').trim(),
        href: normalizeSlideHref(slide.href || slide.link || slide.url || '/our-roots'),
        media: safeMedia(slide.media || slide.image || slide.image_url || slide.media_url || ''),
        mobileMedia: safeMedia(slide.mobile_media || slide.mobileMedia || slide.mobile_image || slide.mobile_image_url || ''),
        poster: safeMedia(slide.poster || slide.video_poster || slide.poster_url || ''),
      }))
      .filter((slide) => slide.media || slide.href || slide.cta);
  } catch {
    return [];
  }
}

function getProductImage(product) {
  const gallery = Array.isArray(product?.image_urls) ? product.image_urls : [];
  return safeMedia(product?.hero_image || product?.featured_image_url || product?.image_url || gallery[0] || '');
}

function getPersonImage(person) {
  return safeMedia(person?.portrait_image || person?.image_url || person?.photo_url || person?.hero_image || person?.media_url || '');
}

function getStoryImage(story) {
  return safeMedia(story?.hero_image || story?.image_url || story?.cover_image || story?.media_url || '');
}

function HeroMedia({ url, poster = '', alt = 'Yasvik traditional foods and roots', className = '' }) {
  const mediaUrl = safeMedia(url);
  if (!mediaUrl) return null;

  const youtubeId = getYouTubeId(mediaUrl);
  if (youtubeId) {
    return (
      <iframe
        title={alt}
        src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&playsinline=1&modestbranding=1&rel=0`}
        className={`absolute inset-0 h-full w-full scale-[1.02] object-cover ${className}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        loading="eager"
      />
    );
  }

  if (isVideoMedia(mediaUrl)) {
    return (
      <video
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
        src={mediaUrl}
        poster={poster || undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={mediaUrl}
      alt={alt}
      className={`absolute inset-0 h-full w-full object-cover ${className}`}
      loading="eager"
      decoding="sync"
      fetchPriority="high"
    />
  );
}

function BrandedFallback({ label = 'Yasvik' }) {
  return (
    <div className="relative flex h-full min-h-[260px] w-full items-center justify-center overflow-hidden bg-[#eee4cf]">
      <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 22% 18%, rgba(139,105,20,.18), transparent 34%), radial-gradient(circle at 80% 72%, rgba(74,103,65,.16), transparent 34%)' }} />
      <div className="relative flex flex-col items-center text-center">
        <YasvikLogo variant="symbol" imageClassName="h-14 w-auto opacity-65" />
        <p className="mt-3 max-w-[14rem] font-inter text-[10px] uppercase tracking-[0.22em] text-[#9a9185]">{label}</p>
      </div>
    </div>
  );
}

function EditorialHero({ slide, desktopMedia, mobileMedia }) {
  const media = safeMedia(mobileMedia || desktopMedia || slide?.mobileMedia || slide?.media || '');
  const desktop = safeMedia(desktopMedia || slide?.media || media);
  const mobile = safeMedia(mobileMedia || slide?.mobileMedia || media || desktop);
  const poster = safeMedia(slide?.poster || '');
  const hasSeparateMobile = mobile && desktop && mobile !== desktop;
  const cta = slide?.cta || 'Begin the Journey';
  const href = slide?.href || '/our-roots';

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#1e1c18]">
      {desktop || mobile ? (
        <div className="absolute inset-0 -z-20 h-full w-full">
          {hasSeparateMobile ? <HeroMedia url={mobile} poster={poster} className="md:hidden" /> : null}
          <HeroMedia url={desktop || mobile} poster={poster} className={hasSeparateMobile ? 'hidden md:block' : ''} />
        </div>
      ) : (
        <div className="absolute inset-0 -z-20"><BrandedFallback label="Everything begins at the roots" /></div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#1e1c18]/36 via-[#1e1c18]/8 to-transparent" />
      <div className="mx-auto flex min-h-[100svh] max-w-[1480px] items-end justify-center px-5 pb-10 pt-[7rem] md:px-8 md:pb-14">
        <div className="text-center">
          <Link to={href} className="yasvik-harvest-cta yasvik-pressable mt-8 min-w-[14rem] px-7 py-3 text-sm font-bold">
            {cta}<ArrowRight className="ml-3 h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ManifestoStrip() {
  return (
    <section className="bg-[#f5f1e8] px-5 py-16 md:px-8 md:py-24">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-cormorant text-3xl italic leading-snug text-[#1a1814] md:text-5xl">Food should not become anonymous.</p>
        <p className="mx-auto mt-6 max-w-2xl font-inter text-sm leading-7 text-[#6f675d] md:text-base">Yasvik exists to reconnect everyday staples with the people, places and traditional wisdom behind them, without turning practical food into luxury theatre.</p>
      </div>
    </section>
  );
}

function ProducerFeature({ person, story, reverse = false }) {
  const isPerson = Boolean(person?.id);
  const title = isPerson
    ? (person.name || person.title || 'People behind the harvest')
    : (story?.title || 'Behind every grain, a journey.');
  const body = isPerson
    ? (person.short_bio || person.bio || person.description || 'Some products come directly from producers. Some come through trusted regional specialists. What matters is that food does not become anonymous.')
    : (story?.excerpt || story?.summary || story?.description || 'Journeys, stories and producer notes help us show context where it genuinely adds trust.');
  const media = isPerson ? getPersonImage(person) : getStoryImage(story);
  const href = isPerson ? `/producers/${person.id}` : (story?.id ? `/stories/${story.id}` : '/our-roots');
  const kicker = isPerson ? 'Producer / Supplier Profile' : 'Yasvik Story';

  return (
    <section className="bg-[#fffaf0] px-4 py-12 md:px-8 md:py-20">
      <div className="mx-auto grid max-w-[1400px] overflow-hidden rounded-[2rem] border border-[#1a1814]/10 bg-[#f5f1e8] shadow-[0_24px_70px_rgba(26,24,20,.08)] md:grid-cols-2">
        <div className={`min-h-[360px] overflow-hidden md:min-h-[520px] ${reverse ? 'md:order-2' : ''}`}>
          {media ? <img src={media} alt={title} className="h-full w-full object-cover" loading="lazy" decoding="async" fetchPriority="low" /> : <BrandedFallback label={title} />}
        </div>
        <div className="flex flex-col justify-center p-8 md:p-14">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.24em] text-[#8b6914]">{kicker}</p>
          <h2 className="mt-4 font-cormorant text-5xl font-semibold leading-[0.95] text-[#1a1814] md:text-6xl">{title}</h2>
          <p className="mt-6 max-w-xl font-inter text-base leading-8 text-[#6f675d]">{body}</p>
          <Link to={href} className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-[#1e1c18] px-6 py-3 font-inter text-xs font-bold uppercase tracking-[0.16em] text-[#fffaf0] transition-transform hover:-translate-y-0.5">
            Read the context <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturedProducts({ products }) {
  if (!products.length) return null;
  return (
    <section id="featured" className="scroll-mt-32 bg-[#f5f1e8] px-4 py-12 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b6914]">Better everyday foods</p>
            <h2 className="font-cormorant text-4xl font-semibold leading-none text-[#1a1814] md:text-6xl">Featured for the pantry.</h2>
          </div>
          <Link to="/shop" className="hidden rounded-full border border-[#1a1814]/18 px-5 py-2 font-inter text-sm font-bold text-[#1a1814] transition-colors hover:bg-[#1e1c18] hover:text-[#fffaf0] md:inline-flex">Shop all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {products.slice(0, 6).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
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
    <section className="bg-[#fffaf0] px-4 py-12 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-8 flex flex-col gap-3 text-center">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b6914]">Kitchen notes</p>
          <h2 className="font-cormorant text-4xl font-semibold leading-none text-[#1a1814] md:text-6xl">Recipes worth returning to.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {cards.map((recipe) => {
            const fallbackRecipe = String(recipe.id || '').startsWith('seasonal-') || String(recipe.id || '').startsWith('jaggery-') || String(recipe.id || '').startsWith('native-');
            const href = fallbackRecipe ? '/recipes' : `/recipes/${recipe.id}`;
            const image = safeMedia(recipe.hero_image || recipe.image_url || recipe.media_url || '');
            return (
              <Link key={recipe.id} to={href} className="group overflow-hidden rounded-[1.8rem] border border-[#1a1814]/10 bg-[#f5f1e8] shadow-[0_14px_38px_rgba(26,24,20,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(26,24,20,.12)]">
                <div className="aspect-[4/3] overflow-hidden bg-[#eee4cf]">{image ? <img src={image} alt={recipe.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" fetchPriority="low" /> : <BrandedFallback label={recipe.title} />}</div>
                <div className="p-5">
                  <h3 className="font-cormorant text-2xl font-semibold leading-tight text-[#1a1814]">{recipe.title}</h3>
                  <p className="mt-2 line-clamp-2 font-inter text-sm leading-6 text-[#6f675d]">{recipe.excerpt || recipe.description || 'A Yasvik kitchen note for better everyday cooking.'}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.home, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const { data: products = [] } = useQuery({ queryKey: ['home-diaspora-products'], queryFn: () => productsApi.listPublished('-created_date', 80), staleTime: 3 * 60 * 1000 });
  const { data: recipes = [] } = useQuery({ queryKey: ['home-diaspora-recipes'], queryFn: () => recipesApi.listPublished(6), staleTime: 5 * 60 * 1000 });
  const { data: people = [] } = useQuery({ queryKey: ['home-diaspora-people'], queryFn: () => peopleApi.listPublished(4), staleTime: 5 * 60 * 1000 });
  const { data: stories = [] } = useQuery({ queryKey: ['home-diaspora-stories'], queryFn: () => storiesApi.listPublished(4), staleTime: 5 * 60 * 1000 });
  const getSetting = (key, fallback) => { const value = settingsMap[key]; return value === undefined || value === null || value === '' ? fallback : value; };

  const heroDesktopMedia = safeMedia(String(getSetting('home_hero_desktop_media_url', getSetting('home_hero_media_url', ''))));
  const heroMobileMedia = safeMedia(String(getSetting('home_hero_mobile_media_url', getSetting('home_hero_media_mobile_url', heroDesktopMedia))));
  const configuredHeroSlides = useMemo(() => parseConfiguredSlides(settingsMap.home_hero_slides_json), [settingsMap.home_hero_slides_json]);
  const visibleProducts = products.length ? products : FALLBACK_PRODUCTS;
  const firstProductImage = getProductImage(visibleProducts[0]);
  const heroSlide = configuredHeroSlides[0] || {
    title: String(getSetting('home_hero_headline', 'Taste What Was Lost.')),
    subtitle: String(getSetting('home_hero_subheadline', 'Traditional foods, fair prices and trusted quality for everyday family kitchens.')),
    cta: String(getSetting('home_hero_cta_label', 'Begin the Journey')),
    href: normalizeSlideHref(getSetting('home_hero_cta_url', '/our-roots')),
    media: heroMobileMedia || heroDesktopMedia || firstProductImage,
    mobileMedia: heroMobileMedia,
  };

  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.is_featured || product.featured_in_hero);
    const merged = [...featured, ...visibleProducts].filter((product, index, all) => all.findIndex((item) => item.id === product.id) === index);
    return merged.slice(0, 6);
  }, [products, visibleProducts]);

  useEffect(() => {
    const firstHeroMedia = heroMobileMedia || heroDesktopMedia || heroSlide.mobileMedia || heroSlide.media || '';
    if (!firstHeroMedia || isVideoMedia(firstHeroMedia) || getYouTubeId(firstHeroMedia)) return undefined;
    document.querySelectorAll('link[data-yasvik-lcp-preload="true"]').forEach((link) => link.remove());
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = firstHeroMedia;
    link.setAttribute('data-yasvik-lcp-preload', 'true');
    link.fetchPriority = 'high';
    document.head.appendChild(link);
    return () => link.remove();
  }, [heroDesktopMedia, heroMobileMedia, heroSlide.media, heroSlide.mobileMedia]);

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1a1814] transition-colors duration-300">
      <EditorialHero slide={heroSlide} desktopMedia={heroDesktopMedia || heroSlide.media} mobileMedia={heroMobileMedia || heroSlide.mobileMedia || heroSlide.media} />
      <ManifestoStrip />
      <ProducerFeature person={people[0]} story={stories[0]} />
      <FeaturedProducts products={featuredProducts} />
      <RecipesPreview recipes={recipes} />
      <ProducerFeature person={people[1]} story={stories[1]} reverse />
      <FooterSection />
    </div>
  );
}
