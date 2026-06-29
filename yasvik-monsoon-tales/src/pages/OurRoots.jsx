import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Instagram, Youtube, ArrowRight } from 'lucide-react';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';
import PageHeaderBanner from '@/components/brand/atmosphere/PageHeaderBanner';

const FOUNDER_INSTAGRAM = 'https://www.instagram.com/gopikrishna_bhuvanam/?hl=en';
const FOUNDER_YOUTUBE = 'https://www.youtube.com/@GopikrishnaBhuvanam';

const DEFAULT_FOUNDER_NOTE_TITLE = 'A Note from Yasvik';
const DEFAULT_FOUNDER_NOTE_BODY = `Every single day, my team and I ask ourselves one question: **Where does the best come from?**

Notice I did not say the cheapest. Or the most convenient. I mean the absolute best.

When we started Yasvik, we made a conscious choice not to build this business from behind a desk. We did not want to sit in a boardroom looking at spreadsheets of industrial food suppliers. Instead, we packed our bags and took to the road.

We realized early on that the finest things in life do not just show up at your doorstep. You have to go find them. So, we traveled across the country to trace our cold-pressed oils, heritage rice, raw honey, pure ghee, and dry fruits straight back to their roots.

Along the way, we discovered something beautiful: behind every extraordinary product is a person, a family, or a community that has spent a lifetime perfecting their craft. We met incredible farming families who treat their land with deep respect, and traditional suppliers who are just as obsessed with purity as we are.

Finding them is a lot of work. But for us, compromising on the source is never an option. Ever.

Once we find the right source, we put every single product through three strict personal filters before it ever reaches your kitchen:

* **Passionate Sourcing:** We visit the fields, ask the hard questions, and verify the methods ourselves. If it is not something I would proudly put on my own family's dining table, we do not sell it.
* **Uncompromising Quality:** Everything is handpicked where it matters, traditionally processed, and handled in small batches. No shortcuts, no fillers, no corporate compromises to save a buck.
* **Honest Presentation:** I promise you that what you see is exactly what you get. True quality does not need exaggerated health claims or fancy, wasteful packaging. We give you full transparency and honest food, exactly as nature intended.

We are building Yasvik one product at a time - slowly, carefully, and without cutting corners. We are not interested in being the biggest or the fastest; we just want to be the most trusted.

Thank you for bringing us into your home and letting us share this journey with you.

This is not just business for us. And this is definitely not just food.

**This is Yasvik.**`;

function renderStrongText(text) {
  return String(text || '').split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-rain-cloud">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function FounderNoteContent({ body }) {
  const lines = String(body || '').split('\n');
  const blocks = [];
  let bullets = [];

  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`bullets-${blocks.length}`} className="my-7 space-y-4">
        {bullets.map((line, index) => (
          <li key={index} className="rounded-2xl border border-temple-stone/35 bg-white/70 p-4">
            <p className="font-inter text-sm leading-7 text-rain-cloud/70">{renderStrongText(line.replace(/^\*\s*/, ''))}</p>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushBullets();
      return;
    }
    if (trimmed.startsWith('* ')) {
      bullets.push(trimmed);
      return;
    }
    flushBullets();
    blocks.push(
      <p key={`p-${blocks.length}`} className="font-inter text-sm leading-8 text-rain-cloud/70 md:text-base">
        {renderStrongText(trimmed)}
      </p>
    );
  });
  flushBullets();

  return <div className="mt-8 space-y-5">{blocks}</div>;
}

function useSettingsMap() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.roots,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  return useMemo(() => resolveSettingsMap(settings), [settings]);
}

export default function OurRoots() {
  const settings = useSettingsMap();
  const founderNoteTitle = String(settings.roots_founder_note_title || DEFAULT_FOUNDER_NOTE_TITLE);
  const founderNoteBody = String(settings.roots_founder_note_body || DEFAULT_FOUNDER_NOTE_BODY);

  return (
    <div className="min-h-screen bg-warm-cream pb-16 text-deep-forest transition-colors duration-300">
      <PageHeaderBanner page="our_roots" />
      <div>

        {/* Founder Note */}
        <section id="founder-note" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 pt-14 md:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-[2rem] border border-temple-stone/35 bg-[#fffaf0] p-6 shadow-[0_24px_70px_rgba(42,38,32,.08)] md:p-10"
          >
            <div className="mx-auto max-w-4xl">
              <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-sun-dried-clay/80">A Note from Yasvik</p>
              <h2 className="mt-4 font-cormorant text-4xl leading-[0.95] text-rain-cloud md:text-6xl">{founderNoteTitle}</h2>
              <FounderNoteContent body={founderNoteBody} />

              <div className="mt-10 flex flex-col items-start gap-5 border-t border-temple-stone/30 pt-8 sm:flex-row sm:items-center sm:gap-7">
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-temple-stone/40 bg-temple-stone/20 shadow-sm">
                  <img
                    src="https://www.instagram.com/gopikrishna_bhuvanam/profile_pic"
                    alt="Gopikrishna Bhuvanam"
                    className="h-full w-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center font-cormorant text-3xl text-rain-cloud/40">G</span>
                </div>
                <div className="flex-1">
                  <p className="font-cormorant text-2xl font-medium text-rain-cloud">Gopikrishna Bhuvanam</p>
                  <p className="mt-0.5 font-inter text-xs text-rain-cloud/55">Founder, Yasvik</p>
                  <div className="mt-3 flex items-center gap-3">
                    <a
                      href={FOUNDER_INSTAGRAM}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Gopikrishna on Instagram"
                      className="inline-flex items-center gap-1.5 rounded-full border border-temple-stone/40 bg-white px-3 py-1.5 font-inter text-[11px] font-semibold text-rain-cloud/75 transition-colors hover:border-[#E1306C]/40 hover:text-[#E1306C]"
                    >
                      <Instagram className="h-3.5 w-3.5" />
                      Instagram
                    </a>
                    <a
                      href={FOUNDER_YOUTUBE}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Gopikrishna on YouTube"
                      className="inline-flex items-center gap-1.5 rounded-full border border-temple-stone/40 bg-white px-3 py-1.5 font-inter text-[11px] font-semibold text-rain-cloud/75 transition-colors hover:border-[#FF0000]/40 hover:text-[#FF0000]"
                    >
                      <Youtube className="h-3.5 w-3.5" />
                      YouTube
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Our Stories */}
        <section id="our-stories" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-10 md:py-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-[2rem] border border-temple-stone/35 bg-white/70 p-6 shadow-[0_12px_40px_rgba(42,38,32,.06)] md:p-10"
          >
            <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-sun-dried-clay/80">Our Stories</p>
            <h2 className="mt-3 font-cormorant text-4xl leading-[0.95] text-rain-cloud md:text-5xl">The roads we travel, the people we meet.</h2>
            <p className="mt-5 max-w-2xl font-inter text-sm leading-8 text-rain-cloud/70">
              Every product on Yasvik has a story — a journey to the source, a producer who cares, a reason it exists. Read about what drives us, where we go, and why it matters.
            </p>
            <Link
              to="/stories"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-rain-cloud px-6 py-3 font-inter text-xs font-bold uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5"
            >
              Read Our Stories
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </section>

      </div>
    </div>
  );
}
