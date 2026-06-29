import { useEffect } from 'react';

/**
 * Warn before tab close/refresh when an open POS bill has items.
 */
export function usePosDraftGuard(cartLength) {
  useEffect(() => {
    if (!cartLength) return undefined;

    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [cartLength]);
}
