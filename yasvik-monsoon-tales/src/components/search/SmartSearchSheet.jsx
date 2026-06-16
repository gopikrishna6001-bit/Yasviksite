/**
 * SmartSearchSheet — Global Search
 * Full-screen on mobile, bottom-sheet feel.
 * Two states:
 *   IDLE   — emotional discovery: mood chips, recent searches, browse nav
 *   ACTIVE — live debounced results: foods, stories, journeys, people
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, ArrowRight, Compass, BookOpen, Mail } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { useDebounce } from '@/hooks/useDebounce';
import { resolveIntentTerms } from '@/lib/searchIntentMap';

// ─── Mood chips — evocative, not generic ────────────────────────────────────
const MOOD_CHIPS = [
  'Monsoon Rice', 'Forest Honey', 'Wild Pepper',
  'Heritage Spices', 'Bastar Foods', 'Cold Press Oil',
  'Native Grains', 'Rain-fed Fields',
];

// ─── Local storage: recent searches ─────────────────────────────────────────
const RECENT_KEY = 'yasvik_recent_searches';
const getRecents = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
const saveRecent = (q) => {
  const next = [q, ...getRecents().filter(r => r !== q)].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
};

// ─── Idle discovery panel ────────────────────────────────────────────────────
function IdlePanel({ recents, liveSuggestions, onSelect, onClose }) {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="px-5 pt-6 pb-10 overflow-y-auto flex-1"
    >
      {/* Atmospheric prompt */}
      <p className="font-cormorant text-[1.6rem] text-rain-cloud/20 font-light italic text-center mb-9 leading-snug px-4">
        What are you looking for?
      </p>

      {/* Recent searches */}
      {recents.length > 0 && (
        <div className="mb-7">
          <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-rain-cloud/25 mb-3">Recent</p>
          <div className="flex flex-wrap gap-2">
            {recents.map(r => (
              <button
                key={r}
                onClick={() => onSelect(r)}
                className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-rain-mist font-inter text-xs text-rain-cloud/55 active:scale-95 transition-transform"
              >
                <Clock className="w-3 h-3 text-rain-cloud/30 flex-shrink-0" />
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mood / discovery chips */}
      <div className="mb-8">
        <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-rain-cloud/25 mb-3">
          Try searching
        </p>
        <div className="flex flex-wrap gap-2">
          {(liveSuggestions.length >= 4 ? liveSuggestions : MOOD_CHIPS).map(term => (
            <button
              key={term}
              onClick={() => onSelect(term)}
              className="py-1.5 px-3.5 rounded-full border border-temple-stone/35 font-inter text-xs text-rain-cloud/55 hover:bg-temple-stone/15 hover:text-rain-cloud active:scale-95 transition-all"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Browse nav — editorial links */}
      <div>
        <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-rain-cloud/25 mb-3">Browse</p>
        <div className="space-y-px">
        {[
          { label: 'Shop', to: '/shop', icon: null },
          { label: 'Our Roots', to: '/our-roots', icon: BookOpen },
          { label: 'Contact', to: '/contact', icon: Mail },
          { label: 'Traceable Journeys', to: '/our-roots#roads', icon: Compass },
        ].map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={onClose}
              className="flex items-center justify-between py-3.5 border-b border-temple-stone/12 group"
            >
              <div className="flex items-center gap-2.5">
                {Icon && <Icon className="w-3.5 h-3.5 text-rain-cloud/25" strokeWidth={1.5} />}
                <span className="font-cormorant text-xl text-rain-cloud/55 font-light group-hover:text-rain-cloud transition-colors">
                  {label}
                </span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-rain-cloud/15 group-hover:text-rain-cloud/40 transition-colors" strokeWidth={1.5} />
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Result item row ─────────────────────────────────────────────────────────
function ResultRow({ to, label, meta, image, tag, roundImage, onClose }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="flex items-center gap-3.5 px-5 py-3 hover:bg-rain-mist/60 active:bg-rain-mist transition-colors"
    >
      <div className={`w-11 h-11 flex-shrink-0 overflow-hidden bg-temple-stone/15 ${roundImage ? 'rounded-full' : 'rounded-xl'}`}>
        {image && <img src={image} alt={label} className="w-full h-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-cormorant text-[1.05rem] text-rain-cloud font-light leading-tight truncate">{label}</p>
        {meta && <p className="font-inter text-[10px] text-rain-cloud/35 mt-0.5 truncate">{meta}</p>}
      </div>
      {tag && (
        <span className="font-inter text-[9px] tracking-[0.18em] uppercase text-rain-cloud/22 flex-shrink-0">{tag}</span>
      )}
    </Link>
  );
}

function ResultSection({ title, children }) {
  return (
    <div className="mb-1">
      <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-rain-cloud/25 px-5 pt-5 pb-2">{title}</p>
      {children}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function SmartSearchSheet({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState([]);
  const [suggIdx, setSuggIdx] = useState(0);
  const debouncedQuery = useDebounce(query, 280);
  const inputRef = useRef(null);

  // Prefetch real titles for suggestion chips
  const { data: allProducts = [] } = useQuery({
    queryKey: ['ss-all-products'],
    queryFn: () => appClient.entities.Product.filter({ is_published: true }, '-created_date', 50),
    staleTime: 5 * 60 * 1000,
  });
  const { data: allStories = [] } = useQuery({
    queryKey: ['ss-all-stories'],
    queryFn: () => appClient.entities.Story.filter({ is_published: true }, '-created_date', 20),
    staleTime: 5 * 60 * 1000,
  });

  const liveSuggestions = (() => {
    const names = allProducts.map(p => p.title).filter(Boolean);
    const storyTitles = allStories.filter(s => s.is_featured).map(s => s.title).filter(Boolean);
    const merged = [];
    const seen = new Set();
    const max = Math.max(names.length, storyTitles.length);
    for (let i = 0; i < max && merged.length < 8; i++) {
      if (names[i] && !seen.has(names[i])) { merged.push(names[i]); seen.add(names[i]); }
      if (storyTitles[i] && !seen.has(storyTitles[i])) { merged.push(storyTitles[i]); seen.add(storyTitles[i]); }
    }
    return merged.length >= 4 ? merged : MOOD_CHIPS;
  })();

  useEffect(() => {
    if (open) {
      setRecents(getRecents());
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [open]);

  // Rotate placeholder
  useEffect(() => {
    if (open && !query && liveSuggestions.length > 0) {
      const t = setInterval(() => setSuggIdx(i => (i + 1) % liveSuggestions.length), 2600);
      return () => clearInterval(t);
    }
  }, [open, query, liveSuggestions.length]);

  // Body scroll lock
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleClose = () => onClose();
  const selectSuggestion = (s) => {
    setQuery(s);
    saveRecent(s);
    setRecents(getRecents());
  };
  const handleBlur = () => {
    if (query.trim().length >= 2) { saveRecent(query.trim()); setRecents(getRecents()); }
  };

  const enabled = debouncedQuery.trim().length >= 2;
  const intentTerms = resolveIntentTerms(debouncedQuery);
  const searchTokens = [debouncedQuery.toLowerCase(), ...intentTerms.map((term) => term.toLowerCase())].filter(Boolean);
  const matchesAnyToken = (value = '') => searchTokens.some((token) => String(value).toLowerCase().includes(token));

  // Live results
  const { data: products = [] } = useQuery({
    queryKey: ['ss-products', debouncedQuery],
    queryFn: () => appClient.entities.Product.filter({ is_published: true }, '-created_date', 30),
    enabled,
    select: d => d.filter(p =>
      matchesAnyToken(p.title) ||
      matchesAnyToken(p.short_description) ||
      (p.tags || []).some((t) => matchesAnyToken(t))
    ).slice(0, 4),
  });
  const { data: stories = [] } = useQuery({
    queryKey: ['ss-stories', debouncedQuery],
    queryFn: () => appClient.entities.Story.filter({ is_published: true }, '-created_date', 30),
    enabled,
    select: d => d.filter(s =>
      matchesAnyToken(s.title) ||
      matchesAnyToken(s.excerpt)
    ).slice(0, 3),
  });
  const { data: journeys = [] } = useQuery({
    queryKey: ['ss-journeys', debouncedQuery],
    queryFn: () => appClient.entities.Journey.filter({ is_published: true }, '-created_date', 20),
    enabled,
    select: d => d.filter(j =>
      matchesAnyToken(j.title) ||
      matchesAnyToken(j.tagline)
    ).slice(0, 2),
  });
  const { data: people = [] } = useQuery({
    queryKey: ['ss-people', debouncedQuery],
    queryFn: () => appClient.entities.Person.filter({ is_published: true }, '-created_date', 20),
    enabled,
    select: d => d.filter(p =>
      matchesAnyToken(p.name) ||
      matchesAnyToken(p.role)
    ).slice(0, 2),
  });

  const hasResults = products.length > 0 || stories.length > 0 || journeys.length > 0 || people.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-rain-cloud/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 260 }}
            className="relative z-10 bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ maxHeight: '92vh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0.5 flex-shrink-0">
              <div className="w-9 h-[3px] rounded-full bg-temple-stone/30" />
            </div>

            {/* Input row — large, cinematic */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-temple-stone/12 flex-shrink-0">
              <Search className="w-4 h-4 text-rain-cloud/30 flex-shrink-0" strokeWidth={1.5} />
              <div className="flex-1 relative min-h-[1.75rem]">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full font-cormorant text-[1.25rem] text-rain-cloud bg-transparent outline-none font-light"
                />
                {/* Animated placeholder when empty */}
                {!query && (
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={suggIdx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.35, ease: 'easeOut' }}
                      className="absolute inset-0 font-cormorant text-[1.25rem] text-rain-cloud/22 pointer-events-none flex items-center font-light italic"
                    >
                      Try "{liveSuggestions[suggIdx % liveSuggestions.length]}"
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
              {query ? (
                <button
                  onClick={() => setQuery('')}
                  className="w-7 h-7 rounded-full bg-temple-stone/20 flex items-center justify-center text-rain-cloud/40 active:scale-90 transition-transform"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleClose}
                  className="font-inter text-xs text-wet-earth/70 hover:text-wet-earth transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Body — idle or results */}
            <AnimatePresence mode="wait">
              {!enabled ? (
                <IdlePanel
                  key="idle"
                  recents={recents}
                  liveSuggestions={liveSuggestions}
                  onSelect={selectSuggestion}
                  onClose={handleClose}
                />
              ) : (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-y-auto flex-1 pb-8"
                >
                  {!hasResults && (
                    <div className="py-16 text-center px-6">
                      <p className="font-cormorant text-2xl text-rain-cloud/25 italic font-light">
                        Nothing found for "{debouncedQuery}"
                      </p>
                      <p className="font-inter text-xs text-rain-cloud/20 mt-3">
                        Try a different word, or browse below
                      </p>
                    </div>
                  )}

                  {products.length > 0 && (
                    <ResultSection title="Foods">
                      {products.map(p => (
                        <ResultRow
                          key={p.id}
                          to={`/product/${p.id}`}
                          label={p.title}
                          meta={`₹${p.price}${p.unit ? ` · ${p.unit}` : ''}`}
                          image={p.hero_image}
                          tag={p.short_description?.slice(0, 30)}
                          onClose={handleClose}
                        />
                      ))}
                    </ResultSection>
                  )}

                  {journeys.length > 0 && (
                    <ResultSection title="Journeys">
                      {journeys.map(j => (
                        <ResultRow
                          key={j.id}
                          to={`/journeys/${j.id}`}
                          label={j.title}
                          meta={j.tagline}
                          image={j.cover_image}
                          onClose={handleClose}
                        />
                      ))}
                    </ResultSection>
                  )}

                  {stories.length > 0 && (
                    <ResultSection title="Stories">
                      {stories.map(s => (
                        <ResultRow
                          key={s.id}
                          to={`/stories/${s.id}`}
                          label={s.title}
                          meta={s.excerpt?.slice(0, 55)}
                          image={s.cover_image}
                          tag={s.story_type?.replace('_', ' ')}
                          onClose={handleClose}
                        />
                      ))}
                    </ResultSection>
                  )}

                  {people.length > 0 && (
                    <ResultSection title="People">
                      {people.map(p => (
                        <ResultRow
                          key={p.id}
                          to={`/people/${p.id}`}
                          label={p.name}
                          meta={p.role}
                          image={p.portrait_image}
                          roundImage
                          onClose={handleClose}
                        />
                      ))}
                    </ResultSection>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
