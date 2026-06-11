import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { stories as storiesApi, products as productsApi, people as peopleApi, journeys as journeysApi } from '@/services/api';
import { useDebounce } from '@/hooks/useDebounce';

const MOOD_SEARCHES = [
  'Monsoon Rice', 'Forest Honey', 'Heritage Spices',
  'Bastar Foods', 'Wild Harvested', 'Cold Press Oils',
];

function IdleState({ onMoodSearch }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="px-6 pt-4 pb-10"
    >
      {/* Atmospheric idle prompt */}
      <p className="font-cormorant text-[1.4rem] text-rain-cloud/25 font-light italic text-center mt-6 mb-10 leading-relaxed">
        What are you looking for?
      </p>

      {/* Mood search chips */}
      <div className="mb-8">
        <p className="font-inter text-[9px] tracking-[0.32em] uppercase text-rain-cloud/25 mb-4">
          Try searching
        </p>
        <div className="flex flex-wrap gap-2">
          {MOOD_SEARCHES.map(term => (
            <button
              key={term}
              onClick={() => onMoodSearch(term)}
              className="px-3.5 py-1.5 rounded-full bg-temple-stone/20 font-inter text-xs text-rain-cloud/60 hover:bg-temple-stone/35 hover:text-rain-cloud transition-all active:scale-95"
            >
              {term}
            </button>
          ))}
        </div>
      </div>

      {/* Quick nav links */}
      <div className="space-y-px">
        <p className="font-inter text-[9px] tracking-[0.32em] uppercase text-rain-cloud/25 mb-4">
          Browse
        </p>
        {[
          { label: 'Shop', to: '/shop' },
          { label: 'Our Roots', to: '/our-roots' },
          { label: 'Contact', to: '/contact' },
          { label: 'Traceable Journeys', to: '/our-roots#roads' },
        ].map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center justify-between py-3 border-b border-temple-stone/15 group"
          >
            <span className="font-cormorant text-lg text-rain-cloud/60 font-light group-hover:text-rain-cloud transition-colors">
              {label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-rain-cloud/20 group-hover:text-rain-cloud/50 transition-colors" strokeWidth={1.5} />
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

function ResultRow({ to, label, meta, image, tag, onClose }) {
  return (
    <Link
      to={to}
      onClick={onClose}
      className="flex items-center gap-3.5 px-6 py-3 hover:bg-rain-mist/50 transition-colors group"
    >
      <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-temple-stone/15">
        {image && <img src={image} alt={label} className="w-full h-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-cormorant text-base text-rain-cloud font-light leading-tight truncate">
          {label}
        </p>
        {meta && (
          <p className="font-inter text-[10px] text-rain-cloud/35 mt-0.5 truncate">{meta}</p>
        )}
      </div>
      {tag && (
        <span className="font-inter text-[9px] tracking-[0.2em] uppercase text-rain-cloud/25 flex-shrink-0">
          {tag}
        </span>
      )}
    </Link>
  );
}

function ResultSection({ title, children }) {
  return (
    <div className="mb-2">
      <p className="font-inter text-[9px] tracking-[0.3em] uppercase text-rain-cloud/25 px-6 pt-5 pb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 280);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const enabled = debouncedQuery.trim().length >= 2;

  const { data: stories = [] } = useQuery({
    queryKey: ['search-stories', debouncedQuery],
    queryFn: () => storiesApi.listPublished(20),
    enabled,
    select: data => data.filter(s =>
      s.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      s.excerpt?.toLowerCase().includes(debouncedQuery.toLowerCase())
    ).slice(0, 3),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['search-products', debouncedQuery],
    queryFn: () => productsApi.listPublished('-created_date', 30),
    enabled,
    select: data => data.filter(p =>
      p.title?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      p.short_description?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      (p.tags || []).some(t => t.toLowerCase().includes(debouncedQuery.toLowerCase()))
    ).slice(0, 4),
  });

  const { data: people = [] } = useQuery({
    queryKey: ['search-people', debouncedQuery],
    queryFn: () => peopleApi.listPublished(20),
    enabled,
    select: data => data.filter(p =>
      p.name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      p.role?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      p.location_label?.toLowerCase().includes(debouncedQuery.toLowerCase())
    ).slice(0, 2),
  });

  const hasResults = stories.length > 0 || products.length > 0 || people.length > 0;
  const showEmpty = enabled && !hasResults;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          {/* Full-screen backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-white/98 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — full height on mobile, centered on desktop */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-lg mx-auto flex flex-col h-full md:h-auto md:max-h-[88vh] md:mt-16 md:rounded-2xl md:shadow-xl md:overflow-hidden bg-white"
          >
            {/* Input row */}
            <div className="flex items-center gap-3 px-5 py-5 border-b border-temple-stone/15 flex-shrink-0"
              style={{ paddingTop: 'max(1.25rem, calc(env(safe-area-inset-top) + 1rem))' }}
            >
              <Search className="w-4 h-4 text-rain-cloud/30 flex-shrink-0" strokeWidth={1.5} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search stories, foods, people…"
                className="flex-1 font-cormorant text-xl text-rain-cloud bg-transparent outline-none placeholder:text-rain-cloud/20 font-light"
              />
              <button
                onClick={query ? () => setQuery('') : onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-temple-stone/15 text-rain-cloud/40 hover:bg-temple-stone/30 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Scrollable results area */}
            <div className="overflow-y-auto flex-1">
              <AnimatePresence mode="wait">
                {!enabled ? (
                  <IdleState key="idle" onMoodSearch={term => setQuery(term)} />
                ) : showEmpty ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-6 py-16 text-center"
                  >
                    <p className="font-cormorant text-2xl text-rain-cloud/25 font-light italic">
                      Nothing found for "{debouncedQuery}"
                    </p>
                    <p className="font-inter text-xs text-rain-cloud/20 mt-3">
                      Try a different word or browse below
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="pb-8"
                  >
                    {products.length > 0 && (
                      <ResultSection title="Foods">
                        {products.map(p => (
                          <ResultRow
                            key={p.id}
                            to={`/product/${p.id}`}
                            label={p.title}
                            meta={p.short_description?.slice(0, 55)}
                            image={p.hero_image}
                            tag={p.unit}
                            onClose={onClose}
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
                            onClose={onClose}
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
                            tag={p.location_label}
                            onClose={onClose}
                          />
                        ))}
                      </ResultSection>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
