/** Invalidate storefront product caches after admin catalog edits. */
export function invalidatePublicProductQueries(queryClient) {
  const exactKeys = [
    'home-diaspora-products',
    'home-featured-hero-products',
    'shop-products',
    'products-world',
    'featured-products-fallback',
    'products-featured',
    'from-the-fields-products',
    'category-peek-products',
    'trending-section-products',
    'ss-all-products',
    'home-trust-products',
    'pos-scan-products',
    'pos-products',
    'seo-products',
  ];

  exactKeys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key] });
  });

  queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'product'
      || queryKey[0] === 'search-products'
      || queryKey[0] === 'ss-products'
      || queryKey[0] === 'wishlist-products'
      || queryKey[0] === 'related-products'
      || queryKey[0] === 'person-products'
      || queryKey[0] === 'journey-products',
  });
}
