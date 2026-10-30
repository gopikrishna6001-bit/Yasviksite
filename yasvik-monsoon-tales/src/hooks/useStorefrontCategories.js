import { useQuery } from '@tanstack/react-query';
import { categories as categoriesApi, products as productsApi } from '@/services/api';
import { categoryHasTaggedProducts } from '@/lib/categoryTree';
import { filterStorefrontRootCategories } from '@/lib/storefrontCategories';
import {
  listHomepageFeaturedCategories,
  listHomepageHeroCategories,
} from '@/lib/homepageCategoryMerchandising';

/** Shop / nav / search — launch roots with products (tree sort_order). */
export const STOREFRONT_CATEGORIES_QUERY_KEY = ['categories', 'storefront', 'active'];
/** Homepage merchandising — independent of shop order. */
export const HOMEPAGE_CATEGORIES_QUERY_KEY = ['categories', 'homepage', 'merchandising'];
const STOREFRONT_CATEGORIES_LIMIT = 80;

async function fetchActiveCategories() {
  return categoriesApi.listActive(STOREFRONT_CATEGORIES_LIMIT);
}

export function useStorefrontCategories() {
  return useQuery({
    queryKey: STOREFRONT_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const [rows, productRows] = await Promise.all([
        fetchActiveCategories(),
        productsApi.filter({ is_published: true, sell_online: true }, 'sort_order', 500),
      ]);
      const roots = filterStorefrontRootCategories(rows);
      return roots.filter((cat) => categoryHasTaggedProducts(cat.id, rows, productRows));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Homepage hero + featured placements.
 * Does not require products for eligibility (allows pre-launch merchandising when status=active).
 */
export function useHomepageCategoryMerchandising() {
  return useQuery({
    queryKey: HOMEPAGE_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const rows = await fetchActiveCategories();
      return {
        all: rows,
        hero: listHomepageHeroCategories(rows),
        featured: listHomepageFeaturedCategories(rows, 3),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** All active categories including subcategories (admin, product pickers). */
export function useAllActiveCategories() {
  return useQuery({
    queryKey: ['categories', 'active', 'all'],
    queryFn: () => categoriesApi.listActive(STOREFRONT_CATEGORIES_LIMIT),
    staleTime: 5 * 60 * 1000,
  });
}
