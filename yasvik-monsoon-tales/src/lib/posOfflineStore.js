const CATALOG_KEY = 'yasvik_pos_catalog_v1';
const PENDING_KEY = 'yasvik_pos_pending_sales_v1';

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadPosCatalogCache() {
  const data = readJson(CATALOG_KEY, null);
  if (!data?.products?.length) return null;
  return {
    products: data.products,
    categories: data.categories || [],
    syncedAt: data.syncedAt || null,
  };
}

export function savePosCatalogCache({ products = [], categories = [] }) {
  writeJson(CATALOG_KEY, {
    products,
    categories,
    syncedAt: new Date().toISOString(),
    version: 1,
  });
}

export function hasPosCatalogCache() {
  return Boolean(loadPosCatalogCache()?.products?.length);
}

export function updateCachedProducts(products) {
  const existing = loadPosCatalogCache();
  if (!existing) return false;
  savePosCatalogCache({ products, categories: existing.categories });
  return true;
}

export function loadPendingPosSales() {
  return readJson(PENDING_KEY, []);
}

export function savePendingPosSales(sales) {
  writeJson(PENDING_KEY, sales);
}

export function enqueuePendingPosSale(sale) {
  const list = loadPendingPosSales();
  list.push(sale);
  savePendingPosSales(list);
  return sale;
}

export function updatePendingPosSale(saleId, patch) {
  const list = loadPendingPosSales().map((sale) =>
    sale.id === saleId ? { ...sale, ...patch } : sale
  );
  savePendingPosSales(list);
}

export function removePendingPosSale(saleId) {
  savePendingPosSales(loadPendingPosSales().filter((sale) => sale.id !== saleId));
}

export function getPendingPosSalesSummary() {
  const list = loadPendingPosSales();
  const pending = list.filter((s) => s.status !== 'synced');
  const failed = pending.filter((s) => s.status === 'failed');
  const waiting = pending.filter((s) => s.status !== 'failed');
  const totalPendingAmount = waiting.reduce((sum, s) => sum + (s.total || 0), 0);
  return {
    count: waiting.length,
    failedCount: failed.length,
    totalPendingAmount,
    sales: list,
  };
}

export function newOfflineSaleId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pos_offline_${crypto.randomUUID()}`;
  }
  return `pos_offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
