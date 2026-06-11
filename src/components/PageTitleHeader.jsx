import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { pageHeroes } from '@/services/api';

const routeToPageKey = {
  '/shop': 'shop',
  '/journeys': 'journeys',
  '/stories': 'stories',
  '/recipes': 'recipes',
  '/people': 'people',
  '/our-roots': 'our_roots',
  '/about': 'our_roots',
  '/farming-cycle': 'farming_cycle',
};

const pageQuotes = {
  shop: [
    '"Direct from the fields where heritage meets craft."',
    '"Sourced with intention. Crafted with care."',
    '"Every grain tells a story of soil, rain, and careful hands."',
  ],
  journeys: [
    '"Where earth, hands, and tradition intertwine."',
    '"Stories of origin. Landscapes of care."',
    '"Journey to the roots of every harvest."',
  ],
  stories: [
    '"Behind every product lies a human story."',
    '"Narratives of resilience, culture, and craft."',
    '"Stories that connect us to the land."',
  ],
  recipes: [
    '"Ancient wisdom meets modern taste."',
    '"Transform heritage ingredients into moments."',
    '"Recipes rooted in generations of care."',
  ],
  people: [
    '"The hands that grow. The hearts that nurture."',
    '"Meet the stewards of our heritage."',
    '"Faces and stories of dedicated farmers."',
  ],
  our_roots: [
    '"Building bridges between farmer and table."',
    '"Our mission: tradition with integrity."',
    '"Where commerce becomes community."',
  ],
  farming_cycle: [
    '"Following nature\'s rhythm. Honoring the seasons."',
    '"The cycle of care, growth, and gratitude."',
    '"From soil to soul: the farming timeline."',
  ],
};

export default function PageTitleHeader() {
  const location = useLocation();
  const [quoteIndex, setQuoteIndex] = useState(0);
  
  // Map current route to page key
  const pageKey = Object.entries(routeToPageKey).find(
    ([route]) => location.pathname.startsWith(route)
  )?.[1];

  const { data: heroList = [] } = useQuery({
    queryKey: ['page-hero', pageKey],
    queryFn: () => pageHeroes.getByPageKey(pageKey),
    enabled: !!pageKey,
    staleTime: 10 * 60 * 1000,
  });

  const hero = Array.isArray(heroList) ? heroList[0] : heroList;
  const title = hero?.title || pageKey?.replace(/_/g, ' ').toUpperCase() || '';
  const quotes = pageKey ? pageQuotes[pageKey] || [] : [];

  // Rotate quotes
  useEffect(() => {
    if (quotes.length === 0) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [quotes.length]);

  if (!title) return <div className="w-16" />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="text-center flex-1"
    >
      <h2 className="font-cormorant text-rain-cloud text-lg font-light tracking-[0.12em] uppercase">
        {title}
      </h2>
      {quotes.length > 0 && (
        <div className="relative h-6 mt-2 flex items-center justify-center">
          <motion.p
            key={`quote-${quoteIndex}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="font-cormorant text-xs font-light text-rain-cloud/50 italic absolute"
          >
            {quotes[quoteIndex]}
          </motion.p>
        </div>
      )}
    </motion.div>
  );
}
