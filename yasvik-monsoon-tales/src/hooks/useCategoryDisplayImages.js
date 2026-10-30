import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import { buildCategoryProductImageMap, resolveCategoryDisplayImage } from '@/lib/categoryDisplayImages';

export function useCategoryDisplayImages(categories = []) {
  const { data: products = [] } = useQuery({
    queryKey: ['category-display-products'],
    queryFn: () => productsApi.listPublished('sort_order', 120),
    staleTime: 10 * 60 * 1000,
  });

  const imageMap = useMemo(() => buildCategoryProductImageMap(products), [products]);

  const enriched = useMemo(
    () =>
      categories.map((cat) => ({
        ...cat,
        displayImage: resolveCategoryDisplayImage(cat, imageMap),
      })),
    [categories, imageMap],
  );

  return { categories: enriched, imageMap };
}
