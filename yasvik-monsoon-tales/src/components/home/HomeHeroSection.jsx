import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HeroBackgroundBanner from '@/components/brand/atmosphere/HeroBackgroundBanner';
import HomeHeroMediaPanel from '@/components/home/HomeHeroMediaPanel';
import MobileHeroCinematic from '@/components/home/MobileHeroCinematic';
import { HERO_COPY, heroHeadlineLines, normalizeHeroSubheadline } from '@/brand/monsoonTokens';
import HomeHeroDesigned from '@/components/home/HomeHeroDesigned';
import { buildHomeHeroMediaPlan, isDesignedImageHero, parseHomeHeroSlides } from '@/lib/heroMediaUtils';

/* ── Shared animation variants ── */
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.40, delayChildren: 1.1 } },
};
const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.95, ease: [0.16, 1, 0.3, 1] } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.85, ease: 'easeOut' } },
};

function getSetting(settingsMap, key, fallback) {
  const value = settingsMap?.[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}

export default function HomeHeroSection({ settingsMap = {}, heroMedia = {} }) {
  const headline = String(getSetting(settingsMap, 'home_hero_headline', HERO_COPY.headline));
  const subheadline = normalizeHeroSubheadline(
    getSetting(settingsMap, 'home_hero_subheadline', HERO_COPY.subheadline),
  );
  const eyebrow = String(getSetting(settingsMap, 'home_hero_eyebrow', HERO_COPY.eyebrow));
  const headlineLines = heroHeadlineLines(headline);

  const slides = parseHomeHeroSlides(getSetting(settingsMap, 'home_hero_slides_json', ''));
  const mediaPlan = useMemo(
    () =>
      buildHomeHeroMediaPlan({
        slides,
        desktopUrl: heroMedia.desktop,
        mobileUrl: heroMedia.mobile,
        fallbackUrl: heroMedia.fallback,
      }),
    [slides, heroMedia.desktop, heroMedia.mobile, heroMedia.fallback],
  );

  const hasMedia = mediaPlan?.mode !== 'placeholder';
  const designedHero = isDesignedImageHero(mediaPlan, {
    desktopUrl: heroMedia.desktop,
    mobileUrl: heroMedia.mobile,
  });

  if (designedHero) {
    return (
      <HomeHeroDesigned
        desktopSrc={mediaPlan.desktop || mediaPlan.url}
        mobileSrc={mediaPlan.mobile || mediaPlan.desktop || mediaPlan.url}
        primaryCta={HERO_COPY.primaryCta}
        secondaryCta={HERO_COPY.secondaryCta}
      />
    );
  }

  return (
    <>
      {/* ── Mobile: cinematic full-screen (hidden md+) ── */}
      <div className="md:hidden">
        <MobileHeroCinematic
          mediaPlan={mediaPlan}
          eyebrow={eyebrow}
          headline={headline}
          headlineLines={headlineLines}
          subheadline={subheadline}
          primaryCta={HERO_COPY.primaryCta}
          secondaryCta={HERO_COPY.secondaryCta}
        />
      </div>

      {/* ── Desktop: full-bleed cinematic (hidden on mobile) ── */}
      <section className="relative isolate hidden overflow-hidden bg-[#0a170d] md:flex md:min-h-screen md:flex-col md:justify-center">

        {/* Full-bleed background: uploaded media or illustration fallback */}
        {hasMedia ? (
          <div className="absolute inset-0 overflow-hidden">
            <HomeHeroMediaPanel mediaPlan={mediaPlan} aspectClass="h-full" variant="desktop" />
          </div>
        ) : (
          <HeroBackgroundBanner noFade />
        )}

        {/* Left-side legibility gradient — stronger on text side */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(0, 20, 10, 0.55) 0%, rgba(0, 20, 10, 0.28) 42%, transparent 68%)',
          }}
        />
        {/* Bottom + top edge shading */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#0a170d]/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0a170d]/38 to-transparent" />

        {/* Staggered content — left, slightly below vertical center */}
        <motion.div
          className="relative z-10 mx-auto w-full max-w-[1400px] translate-y-[10%] px-12 py-8"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={fadeSlideUp}
            className="font-inter text-[10px] font-bold uppercase tracking-[0.30em] text-white/55"
          >
            {eyebrow}
          </motion.p>

          <motion.h1
            variants={fadeSlideUp}
            className="mt-2.5 max-w-[800px] font-cormorant text-[3.35rem] font-semibold leading-[1.08] text-white lg:text-[3.95rem]"
          >
            {headlineLines.map((line, index) => (
              <span key={`${line}-${index}`}>
                {index > 0 ? <br /> : null}
                {line}
              </span>
            ))}
          </motion.h1>

          <motion.p
            variants={fadeSlideUp}
            className="mt-3.5 max-w-[560px] font-inter text-[1rem] leading-7 text-white/75"
          >
            {subheadline}
          </motion.p>

          <motion.div variants={fadeIn} className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="rounded-full bg-neon-paddy px-7 py-3.5 font-inter text-sm font-bold text-white shadow-[0_4px_22px_rgba(67,160,71,0.42)] transition-transform hover:scale-[1.02] active:scale-95"
            >
              {HERO_COPY.primaryCta}
            </Link>
            <Link
              to="/#home-categories-heading"
              className="rounded-full border-2 border-white/35 px-7 py-3.5 font-inter text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-white/65 active:scale-95"
            >
              {HERO_COPY.secondaryCta}
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
