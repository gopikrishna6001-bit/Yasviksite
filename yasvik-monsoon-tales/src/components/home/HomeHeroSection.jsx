import { useMemo } from 'react';
import HomeHeroRetail from '@/components/home/HomeHeroRetail';
import MobileHeroCinematic from '@/components/home/MobileHeroCinematic';
import HomeHeroMediaPanel from '@/components/home/HomeHeroMediaPanel';
import { HERO_COPY, heroHeadlineLines, normalizeHeroSubheadline } from '@/brand/monsoonTokens';
import { buildHomeHeroMediaPlan, isStreamableHeroUrl, parseHomeHeroSlides, safeHeroMedia } from '@/lib/heroMediaUtils';

function getSetting(settingsMap, key, fallback) {
  const value = settingsMap?.[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}

export default function HomeHeroSection({ settingsMap = {}, heroMedia = {} }) {
  const headline = String(getSetting(settingsMap, 'home_hero_headline', ''));
  const subheadline = getSetting(settingsMap, 'home_hero_subheadline', '');
  const eyebrow = String(getSetting(settingsMap, 'home_hero_eyebrow', HERO_COPY.eyebrow));
  const headlineLines = heroHeadlineLines(headline || 'Better Food.\nFound.');

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

  const desktopBg = safeHeroMedia(mediaPlan.desktop || mediaPlan.url || heroMedia.desktop || heroMedia.fallback);
  const mobileBg = safeHeroMedia(mediaPlan.mobile || mediaPlan.desktop || mediaPlan.url || heroMedia.mobile || heroMedia.desktop || heroMedia.fallback);
  const primaryStream = safeHeroMedia(mediaPlan.url || heroMedia.desktop || heroMedia.mobile);
  const isVideoHero =
    mediaPlan.mode === 'video' &&
    isStreamableHeroUrl(primaryStream || mediaPlan.url);

  if (isVideoHero) {
    return (
      <>
        <div className="md:hidden">
          <MobileHeroCinematic
            mediaPlan={mediaPlan}
            eyebrow={eyebrow}
            headline={headline || HERO_COPY.headline}
            headlineLines={headlineLines}
            subheadline={normalizeHeroSubheadline(subheadline || HERO_COPY.subheadline)}
            primaryCta={HERO_COPY.primaryCta}
            secondaryCta={HERO_COPY.secondaryCta}
            secondaryCtaPath={HERO_COPY.secondaryCtaPath}
          />
        </div>
        <section className="relative isolate hidden min-h-[min(52vh,540px)] overflow-hidden bg-[#0a170d] md:block">
          <div className="absolute inset-0">
            <HomeHeroMediaPanel mediaPlan={mediaPlan} aspectClass="h-full" variant="desktop" />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a170d]/70 via-[#0a170d]/35 to-transparent" />
        </section>
      </>
    );
  }

  return (
    <HomeHeroRetail
      desktopBg={desktopBg}
      mobileBg={mobileBg}
      slides={mediaPlan.mode === 'slideshow' ? (mediaPlan.slides || []) : slides.length === 1 ? slides : []}
      headline={headline}
      subheadline={subheadline}
    />
  );
}
