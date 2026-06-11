import { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yasvik_wishlist') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('yasvik_wishlist', JSON.stringify(ids));
  }, [ids]);

  const toggle = (id) => setIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const isWishlisted = (id) => ids.includes(id);

  return (
    <WishlistContext.Provider value={{ ids, toggle, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);