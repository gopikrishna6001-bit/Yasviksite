import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { journeys as journeysApi, stories as storiesApi, people as peopleApi } from '@/services/api';
import YasvikLogo from '@/components/brand/YasvikLogo';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

const DEFAULT_FOUNDER_NOTE_TITLE = 'A Note from Our Founder';
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

const CORE_VALUES = [
  {
    eyebrow: 'Conscious living aesthetic',
    title: 'Conscious Food',
    body: 'Tailored for modern living, offering practical choices that align with your lifestyle without compromising on integrity.',
  },
  {
    eyebrow: 'Responsible sourcing texture',
    title: 'Responsible Sourcing',
    body: 'We go to the source, guided by careful verification and a commitment to understanding exactly where our food comes from.',
  },
  {
    eyebrow: 'Honest quality detail',
    title: 'Honest Quality',
    body: 'No shortcuts. Just accessible everyday utility shaped by modern design, clear information and practical purpose.',
  },
];

const STORE_HOURS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function CoreValuesSection() {
  return (
    <section id="core-values" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8 text-center">
          <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-sun-dried-clay/80">What guides us</p>
          <h2 className="mt-4 font-cormorant text-4xl leading-[0.95] text-rain-cloud md:text-6xl">Our Core Values</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {CORE_VALUES.map((value) => (
            <article key={value.title} className="rounded-[1.8rem] border border-temple-stone/35 bg-[#fffaf0] p-6 shadow-[0_18px_50px_rgba(42,38,32,.06)]">
              <div className="mb-6 h-28 rounded-[1.25rem] bg-[radial-gradient(circle_at_18%_18%,rgba(196,98,16,.18),transparent_34%),linear-gradient(135deg,#f8f0dd,#ffffff)]" />
              <p className="font-inter text-[10px] uppercase tracking-[0.22em] text-rain-cloud/40">{value.eyebrow}</p>
              <h3 className="mt-3 font-cormorant text-3xl leading-none text-rain-cloud">{value.title}</h3>
              <p className="mt-4 font-inter text-sm leading-7 text-rain-cloud/66">{value.body}</p>
            </article>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

function ConnectWithYasvik() {
  return (
    <section id="connect" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.6 }}
        className="grid overflow-hidden rounded-[2rem] border border-temple-stone/35 bg-[#fffaf0] shadow-[0_24px_70px_rgba(42,38,32,.08)] md:grid-cols-[1.05fr_0.95fr]"
      >
        <div className="p-6 md:p-10">
          <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-sun-dried-clay/80">Connect With Yasvik</p>
          <h2 className="mt-4 font-cormorant text-4xl leading-[0.95] text-rain-cloud md:text-6xl">We are here to help.</h2>
          <p className="mt-5 max-w-xl font-inter text-sm leading-8 text-rain-cloud/70">
            We are always here to answer your questions and share our passion for conscious food.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-temple-stone/35 bg-white/70 p-4">
              <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-rain-cloud/42">Visit our store</p>
              <p className="mt-3 font-inter text-sm leading-7 text-rain-cloud/70">
                Yasvik Store, Bavanipuram Colony Road no4,<br />
                Ashok Nagar, Chanda Nagar, Hyderabad,<br />
                Telangana, 500050, IN
              </p>
            </div>
            <div className="rounded-2xl border border-temple-stone/35 bg-white/70 p-4">
              <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-rain-cloud/42">Contact details</p>
              <a href="tel:+918801196998" className="mt-3 block font-inter text-sm font-semibold text-rain-cloud hover:text-sun-dried-clay">088011 96998</a>
              <a href="mailto:yasvikfoods@gmail.com" className="mt-2 block font-inter text-sm font-semibold text-rain-cloud hover:text-sun-dried-clay">yasvikfoods@gmail.com</a>
            </div>
          </div>

          <Link to="/shop" className="mt-8 inline-flex rounded-full bg-rain-cloud px-6 py-3 font-inter text-xs font-bold uppercase tracking-[0.16em] text-white transition-transform hover:-translate-y-0.5">
            Shop Online Now
          </Link>
        </div>

        <div className="border-t border-temple-stone/35 bg-rain-cloud p-6 text-[#fffaf0] md:border-l md:border-t-0 md:p-10">
          <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-[#d9c88d]">Operating Hours</p>
          <div className="mt-6 space-y-2">
            {STORE_HOURS.map((day) => (
              <div key={day} className="flex items-center justify-between gap-4 border-b border-white/10 py-2 font-inter text-sm">
                <span className="text-white/68">{day}</span>
                <span className="font-semibold text-white">9:00 AM - 9:00 PM</span>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/6 p-5">
            <YasvikLogo variant="horizontal" imageClassName="h-12 w-auto brightness-0 invert" />
            <p className="mt-5 font-cormorant text-3xl leading-none text-white">Conscious Food for Modern Living.</p>
            <p className="mt-3 font-inter text-sm leading-6 text-white/62">Responsible Sourcing, Honest Quality.</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function useSettingsMap() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.roots,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  return useMemo(() => {
    return resolveSettingsMap(settings);
  }, [settings]);
}

export default function OurRoots() {
  const settings = useSettingsMap();

  const { data: journeys = [] } = useQuery({
    queryKey: ['our-roots-journeys'],
    queryFn: () => journeysApi.listPublished(80),
    staleTime: 5 * 60 * 1000,
  });

  const { data: stories = [] } = useQuery({
    queryKey: ['our-roots-stories'],
    queryFn: () => storiesApi.listPublished(80),
    staleTime: 5 * 60 * 1000,
  });

  const { data: people = [] } = useQuery({
    queryKey: ['our-roots-people'],
    queryFn: () => peopleApi.listPublished(80),
    staleTime: 5 * 60 * 1000,
  });

  const philosophyTitle = String(settings.roots_philosophy_title || 'THE STORY OF OUR ROOTS');
  const philosophyBody = String(
    settings.roots_philosophy_body ||
      'Food should not become anonymous. Yasvik exists to reconnect everyday essentials with the people, places and traditions behind them, carrying inherited food wisdom into modern family life with honesty, practicality and care.'
  );

  const roadsTitle = String(settings.roots_roads_title || 'THE ROADS WE TRAVEL');
  const handsTitle = String(settings.roots_hands_title || 'THE PEOPLE BEHIND THE HARVEST');
  const founderNoteTitle = String(settings.roots_founder_note_title || DEFAULT_FOUNDER_NOTE_TITLE);
  const founderNoteBody = String(settings.roots_founder_note_body || DEFAULT_FOUNDER_NOTE_BODY);

  return (
    <div className="min-h-screen bg-rain-mist pb-16">
      <section id="philosophy" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 pt-14 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-rain-cloud/45">Our Roots</p>
          <h1 className="mt-5 font-cormorant text-4xl md:text-6xl leading-[0.95] text-rain-cloud">{philosophyTitle}</h1>
          <p className="mx-auto mt-8 max-w-3xl font-inter text-sm md:text-base leading-relaxed text-rain-cloud/70">
            {philosophyBody}
          </p>
          <div className="mt-12 md:mt-16 mb-10 md:mb-14 flex justify-center opacity-85">
            <YasvikLogo variant="symbol" imageClassName="h-12 w-auto" />
          </div>
        </motion.div>
      </section>

      <CoreValuesSection />
      <ConnectWithYasvik />

      <section id="founder-note" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
          className="overflow-hidden rounded-[2rem] border border-temple-stone/35 bg-[#fffaf0] p-6 shadow-[0_24px_70px_rgba(42,38,32,.08)] md:p-10"
        >
          <div className="mx-auto max-w-4xl">
            <p className="font-inter text-[10px] uppercase tracking-[0.28em] text-sun-dried-clay/80">Founder Note</p>
            <h2 className="mt-4 font-cormorant text-4xl leading-[0.95] text-rain-cloud md:text-6xl">{founderNoteTitle}</h2>
            <FounderNoteContent body={founderNoteBody} />
          </div>
        </motion.div>
      </section>

      <section id="roads" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-cormorant text-3xl md:text-5xl text-rain-cloud text-center">{roadsTitle}</h2>
          <div className="mt-9 space-y-5">
            {journeys.map((journey, i) => (
              <Link
                key={journey.id}
                to={`/journeys/${journey.id}`}
                className="group block rounded-2xl border border-temple-stone/35 bg-white/70 p-4 md:p-5 hover:bg-white transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 h-7 w-7 rounded-full border border-sun-dried-clay/60 text-sun-dried-clay flex items-center justify-center font-inter text-[10px]">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-[10px] uppercase tracking-[0.2em] text-rain-cloud/45">{journey.location_label || 'Origin Trail'}</p>
                    <h3 className="mt-1 font-cormorant text-2xl text-rain-cloud">{journey.title}</h3>
                    {journey.tagline ? (
                      <p className="mt-1 font-inter text-sm text-rain-cloud/65">{journey.tagline}</p>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
            {journeys.length === 0 ? (
              <p className="text-center font-inter text-sm text-rain-cloud/45 py-6">Published journeys will appear here.</p>
            ) : null}
          </div>
        </motion.div>
      </section>

      <section id="hands" className="scroll-mt-28 md:scroll-mt-44 mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-cormorant text-3xl md:text-5xl text-rain-cloud text-center">{handsTitle}</h2>
          <div className="mt-9 grid grid-cols-1 md:grid-cols-2 gap-5">
            {people.slice(0, 8).map((person) => (
              <Link
                key={person.id}
                to={`/people/${person.id}`}
                className="group rounded-2xl border border-temple-stone/35 bg-white/75 p-4 flex gap-4 hover:bg-white transition-colors"
              >
                <div className="h-20 w-20 rounded-2xl overflow-hidden bg-temple-stone/20 flex-shrink-0">
                  {person.portrait_image ? <img src={person.portrait_image} alt={person.name} className="w-full h-full object-cover" /> : null}
                </div>
                <div className="min-w-0">
                  <h3 className="font-cormorant text-2xl text-rain-cloud leading-tight">{person.name}</h3>
                  <p className="font-inter text-xs text-rain-cloud/60 mt-1">{person.role || 'Producer / Regional Partner'}</p>
                  {person.short_bio ? <p className="font-inter text-xs text-rain-cloud/55 mt-2 line-clamp-2">{person.short_bio}</p> : null}
                </div>
              </Link>
            ))}
            {stories.slice(0, 4).map((story) => (
              <Link
                key={story.id}
                to={`/stories/${story.id}`}
                className="group rounded-2xl border border-temple-stone/35 bg-white/75 p-4 hover:bg-white transition-colors"
              >
                <div className="aspect-[16/9] rounded-xl overflow-hidden bg-temple-stone/20">
                  {story.cover_image ? <img src={story.cover_image} alt={story.title} className="w-full h-full object-cover" /> : null}
                </div>
                <h3 className="mt-3 font-cormorant text-2xl text-rain-cloud leading-tight">{story.title}</h3>
                {story.excerpt ? <p className="mt-2 font-inter text-xs text-rain-cloud/60 line-clamp-2">{story.excerpt}</p> : null}
              </Link>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
