import { Link } from 'react-router-dom';
import { HERO_COPY } from '@/brand/monsoonTokens';

function HeroCtaOverlay({ primaryCta, secondaryCta }) {
  return (
    <div className="absolute inset-x-0 bottom-[6%] z-10 flex flex-wrap items-center justify-center gap-3 px-4 md:bottom-[8%] md:gap-4">
      <Link
        to="/shop"
        className="rounded-full bg-neon-paddy px-7 py-3 font-inter text-sm font-bold text-white shadow-[0_4px_18px_rgba(67,160,71,0.45)] transition-transform hover:scale-[1.02] active:scale-95"
      >
        {primaryCta}
      </Link>
      <Link
        to="/#home-categories-heading"
        className="rounded-full border-2 border-white/75 bg-black/20 px-7 py-3 font-inter text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-white hover:bg-black/30 active:scale-95"
      >
        {secondaryCta}
      </Link>
    </div>
  );
}

function DesignedHeroFrame({ src, primaryCta, secondaryCta, className = '' }) {
  if (!src) return null;

  return (
    <section className={`relative w-full overflow-hidden bg-[#120c08] ${className}`}>
      <img
        src={src}
        alt="Yasvik — Conscious foods for modern living"
        className="block h-auto w-full"
        decoding="async"
        fetchPriority="high"
      />
      <HeroCtaOverlay primaryCta={primaryCta} secondaryCta={secondaryCta} />
    </section>
  );
}

/**
 * Pre-designed hero — sits below the nav bar, image fills width,
 * CTAs centered at the bottom of the artwork.
 */
export default function HomeHeroDesigned({
  desktopSrc = '',
  mobileSrc = '',
  primaryCta = HERO_COPY.primaryCta,
  secondaryCta = HERO_COPY.secondaryCta,
}) {
  const desktop = desktopSrc || mobileSrc;
  const mobile = mobileSrc || desktopSrc;

  if (!desktop && !mobile) return null;

  return (
    <>
      <DesignedHeroFrame
        src={desktop}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
        className="hidden md:block"
      />
      <DesignedHeroFrame
        src={mobile}
        primaryCta={primaryCta}
        secondaryCta={secondaryCta}
        className="md:hidden"
      />
    </>
  );
}
