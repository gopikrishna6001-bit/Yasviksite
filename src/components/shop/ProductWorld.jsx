import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { categories as categoriesApi, products as productsApi } from '@/services/api';
import ProductDisplayCard from '../products/ProductDisplayCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const swipeConfidenceThreshold = 80;

export default function ProductWorld() {
  const [activeCategory, setActiveCategory] = useState(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.listActive(20),
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-world', activeCategory],
    queryFn: () =>
      activeCategory
        ? productsApi.listByCategory(activeCategory, 40)
        : productsApi.listPublished('-created_date', 40),
    staleTime: 3 * 60 * 1000,
  });

  // Reset index when category or products change
  useEffect(() => { setIndex(0); setDirection(0); }, [activeCategory]);
  useEffect(() => { setIndex(0); }, [products.length]);

  const total = products.length;
  const currentIndex = total > 0 ? ((index % total) + total) % total : 0;

  const paginate = (dir) => {
    setDirection(dir);
    setIndex(prev => prev + dir);
  };

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir < 0 ? 300 : -300, opacity: 0 }),
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 8rem)' }}>
      {/* Category Strip */}
      <div className="flex-shrink-0 bg-rain-mist/95 backdrop-blur-md pt-1.5 pb-3 px-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 h-8 px-4 rounded-full font-inter text-[11px] transition-all ${
              !activeCategory ? 'bg-wet-earth text-white shadow-sm' : 'bg-white text-rain-cloud/55 border border-temple-stone/25'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 h-8 px-4 rounded-full font-inter text-[11px] transition-all whitespace-nowrap ${
                activeCategory === cat.id ? 'bg-wet-earth text-white shadow-sm' : 'bg-white text-rain-cloud/55 border border-temple-stone/25'
              }`}
            >
              {cat.emotional_title || cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Carousel */}
      <div className="flex-grow relative overflow-hidden px-4 pb-4 pt-2">
        {isLoading ? (
          <div className="h-full rounded-2xl bg-white animate-pulse" />
        ) : total === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="font-inter text-sm text-rain-cloud/40">No products found.</p>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.8 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset }) => {
                  if (offset.x < -swipeConfidenceThreshold) paginate(1);
                  else if (offset.x > swipeConfidenceThreshold) paginate(-1);
                }}
                className="absolute inset-x-4 top-2 bottom-4"
                style={{ cursor: 'grab' }}
              >
                <ProductDisplayCard product={products[currentIndex]} />
              </motion.div>
            </AnimatePresence>

            {/* Dot indicators + nav */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20">
              <button
                onClick={() => paginate(-1)}
                className="w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center active:scale-90 transition-transform"
              >
                <ChevronLeft className="w-4 h-4 text-rain-cloud/60" />
              </button>

              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(total, 7) }).map((_, i) => {
                  const dotIndex = total <= 7 ? i : Math.round(i * (total - 1) / 6);
                  const isActive = total <= 7 ? i === currentIndex : currentIndex === dotIndex;
                  return (
                    <button
                      key={i}
                      onClick={() => { setDirection(dotIndex > currentIndex ? 1 : -1); setIndex(dotIndex); }}
                      className={`rounded-full transition-all duration-200 ${isActive ? 'w-4 h-1.5 bg-wet-earth' : 'w-1.5 h-1.5 bg-temple-stone/50'}`}
                    />
                  );
                })}
              </div>

              <button
                onClick={() => paginate(1)}
                className="w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm shadow flex items-center justify-center active:scale-90 transition-transform"
              >
                <ChevronRight className="w-4 h-4 text-rain-cloud/60" />
              </button>
            </div>

            {/* Product counter */}
            <div className="absolute top-4 right-6 z-20 bg-white/80 backdrop-blur-sm rounded-full px-2.5 py-1">
              <span className="font-inter text-[10px] text-rain-cloud/50">{currentIndex + 1} / {total}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}