/** Shared React Query config for admin media library — one cache, fewer refetches. */
export const MEDIA_LIBRARY_QUERY_KEY = ['admin-media'];
export const MEDIA_LIBRARY_STALE_MS = 5 * 60 * 1000;
export const MEDIA_LIBRARY_LIMIT = 500;

export function mediaLibraryQueryOptions() {
  return {
    queryKey: MEDIA_LIBRARY_QUERY_KEY,
    staleTime: MEDIA_LIBRARY_STALE_MS,
    gcTime: 30 * 60 * 1000,
  };
}
