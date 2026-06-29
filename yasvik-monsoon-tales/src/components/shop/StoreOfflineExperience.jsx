import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, BookOpen, Leaf, MessageCircle, Sprout } from 'lucide-react';
import PageHeaderBanner from '@/components/brand/atmosphere/PageHeaderBanner';
import IndianFarmingLandscape from '@/components/brand/atmosphere/IndianFarmingLandscape';
import { DEFAULT_STORE_OFFLINE_MESSAGE } from '@/lib/storeOffline';

const PREP_LINES = [
  'Hand-picking the freshest millets',
  'Restocking cold-pressed oils',
  'Sorting spices the traditional way',
  'Checking every pack before it reaches you',
  'Getting the harvest bag ready for you',
];

const EXPLORE_LINKS = [
  { label: 'Read our stories', path: '/stories', icon: BookOpen },
  { label: 'Meet our farmers', path: '/farmers', icon: Sprout },
  { label: 'Our roots', path: '/our-roots', icon: Leaf },
];

export default function StoreOfflineExperience({ message = DEFAULT_STORE_OFFLINE_MESSAGE, whatsappHref }) {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1) % PREP_LINES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-warm-cream pb-24 text-deep-forest">
      <PageHeaderBanner page="shop" />

      <section className="relative mx-auto max-w-[720px] px-4 pt-8 md:px-8 md:pt-12">
        <div className="relative overflow-hidden rounded-[2rem] border border-soft-border bg-white px-6 py-10 shadow-[0_20px_60px_rgba(31,61,43,0.07)] md:px-10 md:py-14">
          {/* Soft ambient glow */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-neon-paddy/10 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-sun-dried-clay/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="relative mb-6 flex h-20 w-20 items-center justify-center"
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-neon-paddy/30"
                animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute inset-2 rounded-full border border-neon-paddy/20"
                animate={{ scale: [1, 1.2, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-neon-paddy/15 to-sun-dried-clay/10">
                <Sprout className="h-8 w-8 text-neon-paddy" strokeWidth={1.6} />
              </div>
            </motion.div>

            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.2em] text-sun-dried-clay">
              Shop is resting
            </p>
            <h1 className="mt-3 font-cormorant text-[2rem] font-semibold leading-tight text-deep-forest md:text-[2.75rem]">
              Making things ready
              <br />
              <span className="text-neon-paddy">for your health</span>
            </h1>
            <p className="mt-4 max-w-md font-inter text-sm leading-7 text-deep-forest/70 md:text-base">
              {message}
            </p>

            <div className="mt-6 flex h-8 items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={lineIndex}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="font-inter text-sm font-medium text-deep-forest/55"
                >
                  {PREP_LINES[lineIndex]}…
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-8 w-full border-t border-soft-border pt-8">
              <p className="font-inter text-xs font-bold uppercase tracking-[0.16em] text-deep-forest/45">
                Meanwhile, explore Yasvik
              </p>
              <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
                {EXPLORE_LINKS.map(({ label, path, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-soft-border bg-warm-cream/60 px-5 py-2.5 font-inter text-sm font-semibold text-deep-forest transition-colors hover:border-neon-paddy/35 hover:bg-white"
                  >
                    <Icon className="h-4 w-4 text-neon-paddy" strokeWidth={1.8} />
                    {label}
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-60" />
                  </Link>
                ))}
              </div>
            </div>

            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-deep-forest px-6 py-3 font-inter text-sm font-bold text-warm-cream transition-colors hover:bg-neon-paddy"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp us for help
              </a>
            )}

            <Link
              to="/"
              className="mt-4 font-inter text-sm font-semibold text-deep-forest/55 transition-colors hover:text-neon-paddy"
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <div className="relative mt-4 h-[min(220px,28vh)]">
        <IndianFarmingLandscape />
      </div>
    </div>
  );
}
