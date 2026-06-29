import { useEffect, useState } from 'react';
import YasvikLogo from '@/components/brand/YasvikLogo';
import HeroYouTubeBackground from '@/components/home/HeroYouTubeBackground';
import HeroBackgroundVideo from '@/components/home/HeroBackgroundVideo';
import { getYouTubeId, isVideoUrl } from '@/lib/heroMediaUtils';

function HeroSlide({ url, poster, mobile, desktop, active, variant = 'auto' }) {
  const youtubeId = getYouTubeId(url);

  if (youtubeId) {
    return (
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden={!active}
      >
        <HeroYouTubeBackground url={url} />
      </div>
    );
  }

  if (isVideoUrl(url) || mobile?.mp4 || desktop?.mp4) {
    const mp4 =
      variant === 'desktop'
        ? desktop?.mp4 || mobile?.mp4 || url
        : variant === 'mobile'
          ? mobile?.mp4 || desktop?.mp4 || url
          : desktop?.mp4 || mobile?.mp4 || url;
    const webm =
      variant === 'desktop'
        ? desktop?.webm || mobile?.webm
        : variant === 'mobile'
          ? mobile?.webm || desktop?.webm
          : desktop?.webm || mobile?.webm;

    return (
      <HeroBackgroundVideo
        mp4={mp4}
        webm={webm}
        poster={poster}
        visible={active}
      />
    );
  }

  const imageUrl =
    variant === 'desktop'
      ? desktop || url
      : variant === 'mobile'
        ? mobile || url
        : url;

  return (
    <img
      src={imageUrl}
      alt=""
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}
      loading={active ? 'eager' : 'lazy'}
      decoding="async"
      aria-hidden={!active}
    />
  );
}

export default function HomeHeroMediaPanel({ mediaPlan, aspectClass, variant = 'auto' }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (mediaPlan?.mode !== 'slideshow' || mediaPlan.urls.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setSlideIndex((index) => (index + 1) % mediaPlan.urls.length);
    }, mediaPlan.intervalMs || 5000);
    return () => window.clearInterval(id);
  }, [mediaPlan]);

  if (!mediaPlan || mediaPlan.mode === 'placeholder') {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-warm-cream via-white to-[#F3EDE0] p-8 ${aspectClass ?? 'aspect-video md:aspect-[5/4]'}`}
        aria-hidden="true"
      >
        <YasvikLogo variant="symbol" imageClassName="h-16 w-auto opacity-80" />
        <p className="max-w-xs text-center font-inter text-sm leading-6 text-deep-forest/60">
          Upload a hero image, video, or slideshow in Admin → Settings → Hero Campaign.
        </p>
      </div>
    );
  }

  if (mediaPlan.mode === 'slideshow') {
    return (
      <div className={`relative w-full overflow-hidden ${aspectClass ?? 'aspect-video md:aspect-[5/4]'}`}>
        {mediaPlan.urls.map((url, index) => (
          <HeroSlide
            key={`${url}-${index}`}
            url={url}
            poster={mediaPlan.slides[index]?.poster}
            active={index === slideIndex}
          />
        ))}
        <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-1.5">
          {mediaPlan.urls.map((url, index) => (
            <button
              key={url}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              onClick={() => setSlideIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === slideIndex ? 'w-5 bg-white/85' : 'w-1.5 bg-white/35'
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  const resolvedVariant =
    variant !== 'auto' ? variant : isMobile ? 'mobile' : 'desktop';
  const imageUrl =
    mediaPlan.mode === 'image'
      ? resolvedVariant === 'mobile'
        ? mediaPlan.mobile || mediaPlan.url
        : mediaPlan.desktop || mediaPlan.url
      : mediaPlan.url;
  const videoSources = resolvedVariant === 'mobile' ? mediaPlan.mobile : mediaPlan.desktop;

  return (
    <div className={`relative w-full overflow-hidden ${aspectClass ?? 'aspect-video md:aspect-[5/4]'}`}>
      <HeroSlide
        url={imageUrl}
        poster={mediaPlan.poster}
        mobile={mediaPlan.mobile}
        desktop={mediaPlan.desktop || videoSources}
        variant={resolvedVariant}
        active
      />
    </div>
  );
}
