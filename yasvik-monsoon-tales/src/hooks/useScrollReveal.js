import { useInView } from 'framer-motion';
import { useRef } from 'react';

/**
 * Lightweight hook for scroll-triggered reveal.
 * Returns { ref, isInView } — attach ref to the element you want to watch.
 */
export function useScrollReveal({ once = true, margin = '-80px' } = {}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin });
  return { ref, isInView };
}