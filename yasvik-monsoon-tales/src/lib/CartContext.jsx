import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getLineItemStockKg, getVariantCartKey, normalizeProductVariant } from '@/lib/productVariantUtils';
import { useStoreOffline } from '@/hooks/useStoreOffline';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yasvik_cart') || '[]'); } catch { return []; }
  });
  const { enabled: storeOffline } = useStoreOffline();

  useEffect(() => {
    localStorage.setItem('yasvik_cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, variant = null, qty = 1, comboKey = null) => {
    if (storeOffline) return;
    const normalizedVariant = normalizeProductVariant(variant || {}) || null;
    const key = getVariantCartKey(product.id, normalizedVariant, comboKey);
    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      const packKg = normalizedVariant?.pack_kg ?? null;
      return [...prev, {
        key,
        productId: product.id,
        productSlug: product.slug || null,
        title: product.title || product.name || 'Yasvik product',
        sku: normalizedVariant?.sku || product.sku || null,
        price: normalizedVariant?.price || product.price,
        hero_image: normalizedVariant?.image_url || product.hero_image,
        unit: normalizedVariant?.label || product.unit,
        variant: normalizedVariant?.label || null,
        variantSku: normalizedVariant?.sku || null,
        variantMeta: normalizedVariant ? {
          sku: normalizedVariant.sku || null,
          label: normalizedVariant.label,
          pack_kg: packKg,
          weight_grams: normalizedVariant.weight_grams || null,
        } : null,
        pack_kg: packKg,
        stock_deduction_kg: packKg ? Number((packKg * qty).toFixed(3)) : null,
        qty,
        comboKey: comboKey || null,
      }];
    });
  }, [storeOffline]);

  const addCombo = useCallback((combo, products) => {
    if (storeOffline) return;
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
  }, [storeOffline]);

  const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));

  const updateQty = (key, qty) => {
    if (qty < 1) { removeItem(key); return; }
    setItems(prev => prev.map(i => {
      if (i.key !== key) return i;
      const packKg = Number(i.pack_kg ?? i.variantMeta?.pack_kg);
      return {
        ...i,
        qty,
        stock_deduction_kg: Number.isFinite(packKg) && packKg > 0 ? Number((packKg * qty).toFixed(3)) : null,
      };
    }));
  };

  const clearCart = () => {
    setItems([]);
    localStorage.removeItem('yasvik_cart');
  };

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);
  const totalStockKg = items.reduce((s, i) => s + getLineItemStockKg(i), 0);

  return (
    <CartContext.Provider value={{ items, addItem, addCombo, removeItem, updateQty, clearCart, totalItems, totalPrice, totalStockKg, storeOffline }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
