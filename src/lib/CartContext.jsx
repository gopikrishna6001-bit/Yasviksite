import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yasvik_cart') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('yasvik_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product, variant = null, qty = 1, comboKey = null) => {
    const key = comboKey
      ? `${comboKey}__${product.id}__${variant?.label || 'default'}`
      : `${product.id}__${variant?.label || 'default'}`;
    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, {
        key,
        productId: product.id,
        title: product.title,
        price: variant?.price || product.price,
        hero_image: variant?.image_url || product.hero_image,
        unit: product.unit,
        variant: variant?.label || null,
        qty,
        comboKey: comboKey || null,
      }];
    });
  };

  const addCombo = (combo, products) => {
    const key = `combo__${combo.id}`;
    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        key,
        type: 'combo',
        productId: combo.id,
        title: combo.title,
        price: combo.combo_price,
        original_price: combo.original_price,
        hero_image: combo.hero_image,
        qty: 1,
        products: products.map(p => ({
          id: p.id,
          title: p.title,
          qty: combo.product_ids.filter(id => id === p.id).length,
        })),
      }];
    });
  };

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));

  const updateQty = (key, qty) => {
    if (qty < 1) { removeItem(key); return; }
    setItems(prev => prev.map(i => i.key === key ? { ...i, qty } : i));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('yasvik_cart');
  };

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, addCombo, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);