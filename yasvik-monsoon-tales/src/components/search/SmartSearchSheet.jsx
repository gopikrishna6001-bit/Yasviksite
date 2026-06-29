/**
 * SmartSearchSheet — Global Search
 * Full-screen on mobile, bottom-sheet feel.
 * Two states:
 *   IDLE   — emotional discovery: mood chips, recent searches, browse nav
 *   ACTIVE — live debounced results: foods, stories, journeys, people
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, Grid3X3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { appClient } from '@/api/appClient';
import { categories as categoriesApi } from '@/services/api';
import { getProductTeluguName } from '@/lib/teluguProductNames';
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
function IdlePanel({ recents, liveSuggestions, categories, featuredProducts, onSelect, onClose }) {
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 overflow-y-auto px-5 pb-10 pt-6"
    >
      <p className="mb-8 text-center font-cormorant text-[1.75rem] font-medium leading-snug text-deep-forest/80">
        What does your kitchen need today?
      </p>

      {recents.length > 0 && (
        <div className="mb-7">
          <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-sun-dried-clay">Recent</p>
          <div className="flex flex-wrap gap-2">
            {recents.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onSelect(r)}
                className="flex items-center gap-1.5 rounded-full border border-soft-border bg-warm-cream px-3.5 py-1.5 font-inter text-xs text-deep-forest/70 transition-colors hover:border-neon-paddy/30"
              >
                <Clock className="h-3 w-3 text-deep-forest/35" />
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-sun-dried-clay">Try searching</p>
        <div className="flex flex-wrap gap-2">
          {(liveSuggestions.length >= 4 ? liveSuggestions : MOOD_CHIPS).map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => onSelect(term)}
              className="rounded-full border border-soft-border bg-white px-3.5 py-1.5 font-inter text-xs text-deep-forest/70 transition-colors hover:border-neon-paddy/35 hover:text-deep-forest"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="mb-8">
          <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-sun-dried-clay">Browse categories</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.id}`}
                onClick={onClose}
                className="flex items-center gap-2 rounded-xl border border-soft-border bg-warm-cream/60 px-3 py-2.5 font-inter text-xs font-semibold text-deep-forest transition-colors hover:border-neon-paddy/30 hover:bg-white"
              >
                <Grid3X3 className="h-3.5 w-3.5 shrink-0 text-neon-paddy" />
                <span className="line-clamp-2">{cat.emotional_title || cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {featuredProducts.length > 0 && (
        <div>
          <p className="mb-3 font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-sun-dried-clay">Popular picks</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {featuredProducts.slice(0, 6).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                onClick={onClose}
                className="overflow-hidden rounded-xl border border-soft-border bg-white transition-colors hover:border-neon-paddy/30"
              >
                <div className="aspect-square bg-warm-cream">
                  {product.hero_image ? (
                    <img src={product.hero_image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="px-2.5 py-2">
                  <p className="line-clamp-2 font-inter text-[11px] font-semibold leading-snug text-deep-forest">{product.title}</p>
                  {getProductTeluguName(product) ? (
                    <p className="mt-0.5 line-clamp-1 font-cormorant text-[11px] text-deep-forest/55">{getProductTeluguName(product)}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
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
        <p className="truncate font-cormorant text-lg font-semibold leading-tight text-deep-forest">{label}</p>
        {meta && <p className="mt-0.5 truncate font-inter text-[11px] text-deep-forest/45">{meta}</p>}
      </div>
      {tag && (
        <span className="flex-shrink-0 font-inter text-[9px] font-bold uppercase tracking-[0.14em] text-sun-dried-clay">{tag}</span>
      )}
    </Link>
  );
}

function ResultSection({ title, children }) {
  return (
    <div className="mb-1">
      <p className="px-5 pb-2 pt-5 font-inter text-[10px] font-bold uppercase tracking-[0.2em] text-sun-dried-clay">{title}</p>
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

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.listActive(12),
    staleTime: 5 * 60 * 1000,
  });

  const featuredProducts = allProducts.filter((p) => p.is_featured || p.featured_in_hero).slice(0, 6);
  const popularProducts = featuredProducts.length ? featuredProducts : allProducts.slice(0, 6);

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
            className="absolute inset-0 bg-deep-forest/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 260 }}
            className="relative z-10 flex max-h-[92vh] flex-col rounded-t-3xl bg-warm-cream shadow-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-0.5 flex-shrink-0">
              <div className="w-9 h-[3px] rounded-full bg-temple-stone/30" />
            </div>

            {/* Input row — large, cinematic */}
            <div className="flex flex-shrink-0 items-center gap-3 border-b border-soft-border px-5 py-4">
              <Search className="h-4 w-4 flex-shrink-0 text-deep-forest/40" strokeWidth={1.5} />
              <div className="flex-1 relative min-h-[1.75rem]">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onBlur={handleBlur}
                  className="w-full bg-transparent font-cormorant text-[1.25rem] font-medium text-deep-forest outline-none"
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
                      className="pointer-events-none absolute inset-0 flex items-center font-cormorant text-[1.25rem] italic text-deep-forest/30"
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
                  categories={categories}
                  featuredProducts={popularProducts}
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
                          meta={[getProductTeluguName(p), `₹${p.price}${p.unit ? ` · ${p.unit}` : ''}`].filter(Boolean).join(' · ')}
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
