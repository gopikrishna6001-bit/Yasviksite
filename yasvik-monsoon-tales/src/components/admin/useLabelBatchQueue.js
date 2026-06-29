import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { appClient } from '@/api/appClient';
import { searchLabelProducts } from '@/lib/labelProductSearch';
import {
  defaultLabelPickerDraft,
  mergeLabelQueueRows,
  newLabelQueueRowId,
  todayInputValue,
} from '@/lib/labelBatchQueue';
import { generateBatchNo } from '@/lib/priceLabelGenerator';

export function useLabelBatchQueue({ initialPackedDate } = {}) {
  const [search, setSearch] = useState('');
  const [pickerDraft, setPickerDraft] = useState({});
  const [variantTouched, setVariantTouched] = useState(() => new Set());
  const [queueRows, setQueueRows] = useState([]);
  const [batchNumbers, setBatchNumbers] = useState({});
  const [packedDate, setPackedDate] = useState(initialPackedDate || todayInputValue());

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-label-products'],
    queryFn: () => appClient.entities.Product.list('-created_date', 500),
  });

  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products]
  );

  const searchResults = useMemo(
    () => searchLabelProducts(products, search, 12),
    [products, search]
  );

  const printLines = useMemo(
    () => mergeLabelQueueRows(queueRows, productsById),
    [queueRows, productsById]
  );

  const activeRowCount = queueRows.filter((r) => Number(r.quantity) > 0).length;

  const handleSearchChange = (value) => {
    setSearch(value);
    setVariantTouched(new Set());
  };

  const ensureBatchForProduct = (productId) => {
    setBatchNumbers((prev) => {
      if (prev[productId]) return prev;
      const seq = Object.keys(prev).length + 1;
      return { ...prev, [productId]: generateBatchNo(packedDate, seq) };
    });
  };

  const getPickerDraft = (productId, suggestedVariantIndex = 0) => {
    const stored = pickerDraft[productId];
    const variantIndex = variantTouched.has(productId)
      ? (stored?.variantIndex ?? suggestedVariantIndex)
      : suggestedVariantIndex;
    return {
      variantIndex,
      quantity: stored?.quantity ?? 1,
    };
  };

  const updatePickerDraft = (productId, patch) => {
    if (patch.variantIndex != null) {
      setVariantTouched((prev) => new Set(prev).add(productId));
    }
    setPickerDraft((prev) => ({
      ...prev,
      [productId]: { ...defaultLabelPickerDraft(), ...prev[productId], ...patch },
    }));
  };

  const addProductRow = (productId, variantIndex = 0, quantity = 1) => {
    if (!productsById[productId]) return;
    const qty = Math.max(1, Number(quantity) || 1);
    ensureBatchForProduct(productId);
    setQueueRows((prev) => {
      const existing = prev.find(
        (row) => row.productId === productId && row.variantIndex === variantIndex
      );
      if (existing) {
        return prev.map((row) =>
          row.id === existing.id ? { ...row, quantity: row.quantity + qty } : row
        );
      }
      return [...prev, { id: newLabelQueueRowId(), productId, variantIndex, quantity: qty }];
    });
  };

  const addFirstSearchResult = () => {
    if (!searchResults[0]) return;
    const { product, variantIndex: suggestedVariantIndex } = searchResults[0];
    const draft = getPickerDraft(product.id, suggestedVariantIndex);
    addProductRow(product.id, draft.variantIndex, draft.quantity);
  };

  const updateRow = (rowId, patch) => {
    setQueueRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const removeRow = (rowId) => {
    setQueueRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const duplicateRow = (row) => {
    setQueueRows((prev) => [
      ...prev,
      {
        id: newLabelQueueRowId(),
        productId: row.productId,
        variantIndex: row.variantIndex,
        quantity: row.quantity,
      },
    ]);
  };

  const regenerateBatchNumbers = () => {
    const productIds = [...new Set(queueRows.map((r) => r.productId))];
    const next = {};
    productIds.forEach((id, index) => {
      next[id] = generateBatchNo(packedDate, index + 1);
    });
    setBatchNumbers(next);
  };

  return {
    products,
    productsById,
    isLoading,
    search,
    handleSearchChange,
    searchResults,
    queueRows,
    printLines,
    packedDate,
    setPackedDate,
    batchNumbers,
    activeRowCount,
    getPickerDraft,
    updatePickerDraft,
    addProductRow,
    addFirstSearchResult,
    updateRow,
    removeRow,
    duplicateRow,
    regenerateBatchNumbers,
  };
}
