import { createContext, useContext, useState, useEffect } from 'react';

const RecentlyViewedContext = createContext(null);

export function RecentlyViewedProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yasvik_recently_viewed') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('yasvik_recently_viewed', JSON.stringify(items));
  }, [items]);

  const track = (product) => {
    setItems(prev => {
      const filtered = prev.filter(i => i.id !== product.id);
      return [{ id: product.id, title: product.title, hero_image: product.hero_image, price: product.price, unit: product.unit }, ...filtered].slice(0, 10);
    });
  };

  return (
    <RecentlyViewedContext.Provider value={{ items, track }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export const useRecentlyViewed = () => useContext(RecentlyViewedContext);