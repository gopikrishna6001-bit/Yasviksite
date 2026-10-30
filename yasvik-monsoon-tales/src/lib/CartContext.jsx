import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getLineItemStockKg, getVariantCartKey, normalizeProductVariant } from '@/lib/productVariantUtils';
import { parseProductVariants } from '@/lib/productStockUtils';
import { computePackBulkSavings } from '@/lib/variantBulkSavings';
import { useStoreOffline } from '@/hooks/useStoreOffline';
import { isSellableOnline } from '@/lib/productVisibility';
import { isSellableBundleProduct } from '@/lib/productBundleUtils';
import { buildBundleCartSnapshot } from '@/lib/comboVisualUtils';
import { buildComboV2CartSnapshot, bundleHasCustomerOptions, findOptionChoice, getComboCartKey } from '@/lib/comboV2Utils';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yasvik_cart') || '[]'); } catch { return []; }
  });
  const { enabled: storeOffline } = useStoreOffline();

  useEffect(() => {
    localStorage.setItem('yasvik_cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((product, variant = null, qty = 1, comboKey = null, extras = {}) => {
    if (storeOffline || !isSellableOnline(product)) return;
    const normalizedVariant = normalizeProductVariant(variant || {}) || null;
    const bundle = extras.bundle || null;
    const selectedChoice = extras.choice
      || (bundle && bundleHasCustomerOptions(bundle)
        ? findOptionChoice(bundle, extras.choiceId, extras.choiceSlug)
        : null);
    const resolvedComboKey = comboKey
      || (selectedChoice ? getComboCartKey(product.id, selectedChoice) : null);
    const key = getVariantCartKey(product.id, normalizedVariant, resolvedComboKey);
    setItems(prev => {
      const existing = prev.find(i => i.key === key);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, qty: i.qty + qty } : i);
      }
      const packKg = normalizedVariant?.pack_kg ?? null;
      const sellPrice = selectedChoice?.price_override_paise != null
        ? Number(selectedChoice.price_override_paise) / 100
        : (normalizedVariant?.price || product.price);
      const comparePrice = normalizedVariant?.compare_price ?? product.discount_price ?? product.compare_price ?? null;
      const productVariants = parseProductVariants(product);
      const bulkSavings = normalizedVariant
        ? computePackBulkSavings(productVariants, normalizedVariant)
        : null;
      const bundleSnap = isSellableBundleProduct(product)
        ? (
          bundleHasCustomerOptions(bundle)
            ? buildComboV2CartSnapshot({ parentProduct: product, bundle, choice: selectedChoice })
            : buildBundleCartSnapshot(
              product,
              bundle,
              bundle?.items || extras.bundleItems || null,
              bundle?.products || extras.products || null,
            )
        )
        : null;
      const resolvedTitle = bundleSnap?.title
        || product.title
        || product.name
        || 'Yasvik product';
      const resolvedImage = bundleSnap?.imageUrl
        || normalizedVariant?.image_url
        || product.hero_image
        || product.featured_image_url
        || product.image_url
        || (bundleSnap?.mosaicUrls || [])[0]
        || null;
      return [...prev, {
        key,
        productId: product.id,
        productSlug: bundleSnap?.productSlug || product.slug || null,
        title: resolvedTitle,
        sku: normalizedVariant?.sku || product.sku || null,
        price: sellPrice,
        compare_price: comparePrice,
        hero_image: resolvedImage,
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
        bulk_savings: bulkSavings,
        stock_deduction_kg: packKg ? Number((packKg * qty).toFixed(3)) : null,
        qty,
        comboKey: resolvedComboKey || null,
        ...(bundleSnap ? {
          isBundle: true,
          isComboV2: bundleSnap.isComboV2 === true,
          productKind: bundleSnap.productKind,
          productGroup: bundleSnap.productGroup,
          inventoryMode: bundleSnap.inventoryMode,
          yasvikMark: bundleSnap.yasvikMark,
          bundleItemCount: bundleSnap.bundleItemCount,
          bundlePackCount: bundleSnap.bundlePackCount,
          bundleNetWeightG: bundleSnap.bundleNetWeightG,
          bundleMetaLine: bundleSnap.bundleMetaLine,
          bundleContents: bundleSnap.bundleContents,
          mosaicUrls: bundleSnap.mosaicUrls,
          comboOption: bundleSnap.comboOption || null,
          freeGifts: bundleSnap.freeGifts || [],
          purposeLabel: bundleSnap.purposeLabel || null,
          merchCategory: bundleSnap.merchCategory || null,
          worthLabel: bundleSnap.worthLabel || null,
          saveLabel: bundleSnap.saveLabel || null,
        } : {}),
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
