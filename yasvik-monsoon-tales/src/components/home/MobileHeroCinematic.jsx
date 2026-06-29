import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroBackgroundBanner from '@/components/brand/atmosphere/HeroBackgroundBanner';
import HeroYouTubeBackground from '@/components/home/HeroYouTubeBackground';
import HeroBackgroundVideo from '@/components/home/HeroBackgroundVideo';
import { getYouTubeId, isStreamableHeroUrl, isVideoUrl } from '@/lib/heroMediaUtils';

/* ── Animation variants ── */
const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.42,
      delayChildren: 1.1, // let video breathe before text arrives
    },
  },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 26 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 1.0, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.85, ease: 'easeOut' },
  },
};

/* ── Component ── */
export default function MobileHeroCinematic({
  mediaPlan,
  eyebrow,
  headline,
  headlineLines,
  subheadline,
  primaryCta,
  secondaryCta,
}) {
  const lines = headlineLines?.length ? headlineLines : [headline].filter(Boolean);
  const streamUrl =
    mediaPlan?.mode === 'video' && isStreamableHeroUrl(mediaPlan?.url)
      ? mediaPlan.url
      : null;
  const youtubeId = streamUrl ? getYouTubeId(streamUrl) : null;
  const mp4Url = streamUrl && !youtubeId && isVideoUrl(streamUrl) ? streamUrl : null;

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[#0a170d] pb-12 pt-0">

      {/* ── Background ── */}
      {youtubeId ? (
        <HeroYouTubeBackground url={streamUrl} />
      ) : mediaPlan?.mode === 'video' || mp4Url ? (
        <HeroBackgroundVideo
          mp4={mediaPlan?.mobile?.mp4 || mp4Url}
          webm={mediaPlan?.mobile?.webm}
          poster={mediaPlan?.poster}
        />
      ) : mediaPlan?.mode === 'image' && (mediaPlan?.mobile || mediaPlan?.desktop) ? (
        <img
          src={mediaPlan.mobile || mediaPlan.desktop}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* Illustration / uploaded photos fill the full section */
        <HeroBackgroundBanner noFade />
      )}

      {/* ── Cinematic overlay gradients ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(0, 20, 10, 0.55) 0%, rgba(0, 20, 10, 0.28) 48%, transparent 72%)',
        }}
      />
      {/* Bottom — dark rich fade for text legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e1e10]/85 via-[#0e1e10]/30 to-transparent" />
      {/* Top — soft shade so navbar area reads well */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#0e1e10]/50 to-transparent" />

      {/* ── Staggered animated content ── */}
      <motion.div
        className="relative z-10 translate-y-[6%] px-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Eyebrow */}
        <motion.p
          variants={fadeSlideUp}
          className="font-inter text-[10px] font-bold uppercase tracking-[0.30em] text-white/55"
        >
          {eyebrow}
        </motion.p>

        {/* Headline */}
        <motion.h1
          variants={fadeSlideUp}
          className="mt-2 max-w-[22rem] font-cormorant text-[2.35rem] font-semibold leading-[1.06] text-white drop-shadow-sm"
        >
          {lines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
        </motion.h1>

        {subheadline ? (
          <motion.p
            variants={fadeSlideUp}
            className="mt-3 max-w-[21rem] font-inter text-[0.82rem] leading-6 text-white/75"
          >
            {subheadline}
          </motion.p>
        ) : null}

        {/* CTA buttons */}
        <motion.div variants={fadeIn} className="mt-6 flex gap-3">
          <Link
            to="/shop"
            className="flex-1 rounded-full bg-neon-paddy py-3.5 text-center font-inter text-sm font-bold text-white shadow-[0_4px_20px_rgba(67,160,71,0.40)] transition-transform active:scale-95"
          >
            {primaryCta}
          </Link>
          <Link
            to="/#home-categories-heading"
            className="flex-1 rounded-full border-2 border-white/35 py-3.5 text-center font-inter text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-white/65 active:scale-95"
          >
            {secondaryCta}
          </Link>
        </motion.div>
      </motion.div>

      {/* ── Scroll nudge ── */}
      <motion.div
        className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 text-white/35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2, duration: 1.0 }}
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
