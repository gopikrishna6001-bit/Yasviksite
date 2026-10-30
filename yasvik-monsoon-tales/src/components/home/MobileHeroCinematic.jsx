import { motion } from 'framer-motion';
import { ChevronDown, Leaf, Tag, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import HomeAnchorLink from '@/components/home/HomeAnchorLink';
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
      delayChildren: 0.35,
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

const HERO_TRUST_ITEMS = [
  { icon: Leaf, label: 'Pure & Natural Ingredients' },
  { icon: Tag, label: 'Fair Prices Everyday' },
  { icon: Truck, label: 'Delivered to Your Home' },
];

function HeroHeadline({ lines = [] }) {
  if (!lines.length) return null;
  const accentLine = lines.length > 1 ? lines[lines.length - 1] : '';
  const leadLines = lines.length > 1 ? lines.slice(0, -1) : lines;

  return (
    <h1 className="mt-2 max-w-[22rem] font-cormorant text-[2.35rem] font-semibold leading-[1.06] text-white drop-shadow-sm">
      {leadLines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {index > 0 ? <br /> : null}
          {line}
        </span>
      ))}
      {accentLine ? (
        <>
          <br />
          <span className="font-cormorant text-[2.5rem] font-semibold italic text-neon-paddy">{accentLine}</span>
        </>
      ) : null}
    </h1>
  );
}

/* ── Component ── */
export default function MobileHeroCinematic({
  mediaPlan,
  eyebrow,
  headline,
  headlineLines,
  subheadline,
  primaryCta,
  secondaryCta,
  secondaryCtaPath,
}) {
  const lines = headlineLines?.length ? headlineLines : [headline].filter(Boolean);
  const secondaryHref = secondaryCtaPath || '/#featured';
  const streamUrl =
    mediaPlan?.mode === 'video' && isStreamableHeroUrl(mediaPlan?.url)
      ? mediaPlan.url
      : null;
  const youtubeId = streamUrl ? getYouTubeId(streamUrl) : null;
  const mp4Url = streamUrl && !youtubeId && isVideoUrl(streamUrl) ? streamUrl : null;

  return (
    <section className="relative flex min-h-[min(78svh,720px)] flex-col justify-end overflow-hidden bg-[#0a170d] pb-8 pt-0">

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
        <motion.div variants={fadeSlideUp}>
          <HeroHeadline lines={lines} />
        </motion.div>

        {subheadline ? (
          <motion.p
            variants={fadeSlideUp}
            className="mt-3 max-w-[21rem] font-inter text-[0.82rem] leading-6 text-white/75"
          >
            {subheadline}
          </motion.p>
        ) : null}

        <motion.div variants={fadeIn} className="mt-5 flex gap-5 overflow-x-auto hide-scrollbar">
          {HERO_TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex w-[5.5rem] flex-shrink-0 flex-col items-center gap-1.5 text-center">
              <Icon className="h-5 w-5 text-white/85" strokeWidth={1.5} aria-hidden="true" />
              <span className="font-inter text-[10px] font-semibold leading-tight text-white/80">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA buttons */}
        <motion.div variants={fadeIn} className="mt-6 flex gap-3">
          <Link
            to="/shop"
            className="flex-1 rounded-full bg-neon-paddy py-3.5 text-center font-inter text-sm font-bold text-white shadow-[0_4px_20px_rgba(67,160,71,0.40)] transition-transform active:scale-95"
          >
            {primaryCta}
          </Link>
          <HomeAnchorLink
            to={secondaryHref}
            className="flex-1 rounded-full border-2 border-white/35 py-3.5 text-center font-inter text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-white/65 active:scale-95"
          >
            {secondaryCta}
          </HomeAnchorLink>
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
