import { Link } from 'react-router-dom';
import { Award, Heart, Leaf, ShieldCheck, Sparkles } from 'lucide-react';
import { heroHeadlineLines, normalizeHeroSubheadline } from '@/brand/monsoonTokens';
import ImageSlideshow from '@/components/ui/ImageSlideshow';

const HERO_TRUST_BAR = [
  { icon: Leaf, label: 'Thoughtful Selection' },
  { icon: ShieldCheck, label: 'Responsible Sourcing' },
  { icon: Award, label: 'Honest Information' },
  { icon: Sparkles, label: 'Everyday Usefulness' },
  { icon: Heart, label: 'Local Hyderabad Store' },
];

const RETAIL_DEFAULTS = {
  headline: 'Better Food.\nFound.',
  subheadline: 'We travel, meet makers and choose everyday foods we can stand behind — then make them easier to bring into modern homes.',
  primaryCta: 'Shop now',
};

function HeroBackground({ src, className = '', vivid = false }) {
  if (!src) {
    return (
      <div
        className={`absolute inset-0 ${className}`}
        style={{
          background:
            'linear-gradient(135deg, #faf7ef 0%, #f3ede0 45%, #e8e1d5 100%)',
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className={`absolute inset-0 z-0 h-full w-full object-cover ${vivid ? 'brightness-[1.05] contrast-[1.12] saturate-[1.14]' : ''} ${className}`}
      decoding="async"
      fetchPriority="high"
    />
  );
}

function HeroCopyBlock({ headline, subheadline, compact = false }) {
  const lines = heroHeadlineLines(headline);
  const textShadow = compact
    ? '0 1px 2px rgba(255, 255, 255, 0.95), 0 0 12px rgba(255, 255, 255, 0.75)'
    : '0 1px 2px rgba(255, 255, 255, 0.95), 0 0 16px rgba(255, 255, 255, 0.7)';

  return (
    <div className={`relative ${compact ? 'max-w-[20rem]' : 'max-w-xl px-1 py-2'}`}>
      <h1
        className={`font-cormorant font-semibold leading-[1.12] text-deep-forest ${
          compact ? 'text-[1.85rem]' : 'text-4xl lg:text-[2.85rem]'
        }`}
        style={{ textShadow }}
      >
        {lines.map((line, index) => (
          <span key={`${line}-${index}`}>
            {index > 0 ? <br /> : null}
            {line}
          </span>
        ))}
      </h1>
      <p
        className={`mt-3 font-inter leading-relaxed text-deep-forest/85 ${
          compact ? 'text-base' : 'text-base lg:text-lg'
        }`}
        style={{ textShadow }}
      >
        {subheadline}
      </p>
      <Link
        to="/shop"
        className={`mt-5 inline-flex items-center justify-center bg-deep-forest font-inter font-bold uppercase tracking-[0.12em] text-warm-cream transition-colors hover:bg-deep-forest/90 active:scale-[0.98] ${
          compact ? 'rounded-md px-7 py-3 text-xs' : 'rounded-md px-9 py-3.5 text-sm'
        }`}
      >
        {RETAIL_DEFAULTS.primaryCta}
      </Link>
    </div>
  );
}

function HeroTrustBar() {
  return (
    <div className="border-t border-deep-forest/8 bg-white">
      <div className="mx-auto flex max-w-[1400px] gap-4 overflow-x-auto px-4 py-3.5 hide-scrollbar md:justify-center md:gap-10 md:px-8 md:py-4">
        {HERO_TRUST_BAR.map(({ icon: Icon, label }) => (
          <div key={label} className="flex w-[5.25rem] flex-shrink-0 flex-col items-center gap-1.5 text-center md:w-auto md:min-w-[6.5rem] md:flex-row md:gap-2.5">
            <Icon className="h-5 w-5 text-deep-forest/70 md:h-6 md:w-6" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-inter text-xs font-semibold leading-tight text-deep-forest/80 md:text-sm">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaLayer({ slides, desktopBg, mobileBg, variant }) {
  if (Array.isArray(slides) && slides.length > 1) {
    return (
      <ImageSlideshow
        slides={slides}
        variant={variant}
        vivid
        imageClassName={variant === 'mobile' ? 'object-[center_35%]' : 'object-[center_40%]'}
        showDots
        intervalMs={5000}
      />
    );
  }

  const single = Array.isArray(slides) && slides.length === 1 ? slides[0] : null;
  const desktop = single?.media || desktopBg;
  const mobile = single?.mobileMedia || single?.media || mobileBg;
  return (
    <HeroBackground
      src={variant === 'mobile' ? (mobile || desktop) : (desktop || mobile)}
      className={variant === 'mobile' ? 'object-[center_35%]' : 'object-[center_40%]'}
      vivid
    />
  );
}

export default function HomeHeroRetail({
  desktopBg = '',
  mobileBg = '',
  slides = [],
  headline = '',
  subheadline = '',
}) {
  const resolvedHeadline = headline || RETAIL_DEFAULTS.headline;
  const resolvedSubheadline = normalizeHeroSubheadline(subheadline || RETAIL_DEFAULTS.subheadline);

  return (
    <>
      <section className="relative hidden overflow-hidden bg-neutral-900 md:block">
        <div className="relative isolate min-h-[min(52vh,540px)] max-h-[560px]">
          <MediaLayer slides={slides} desktopBg={desktopBg} mobileBg={mobileBg} variant="desktop" />
          <div className="relative z-10 mx-auto flex h-full min-h-[inherit] max-w-[1400px] items-center px-6 py-8 lg:px-8">
            <HeroCopyBlock headline={resolvedHeadline} subheadline={resolvedSubheadline} />
          </div>
        </div>
        <HeroTrustBar />
      </section>

      <section className="relative overflow-hidden bg-neutral-900 md:hidden">
        <div className="relative isolate min-h-[min(68svh,520px)]">
          <MediaLayer slides={slides} desktopBg={desktopBg} mobileBg={mobileBg} variant="mobile" />
          <div className="relative z-10 mx-auto flex min-h-[min(68svh,520px)] max-w-[1400px] flex-col justify-end px-4 pb-6 pt-24">
            <HeroCopyBlock headline={resolvedHeadline} subheadline={resolvedSubheadline} compact />
          </div>
        </div>
        <HeroTrustBar />
      </section>
    </>
  );
}
