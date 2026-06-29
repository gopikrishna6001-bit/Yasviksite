import { useCallback, useEffect, useRef } from 'react';

const INTER_CHAR_MS = 80;
const MIN_SCAN_LEN = 2;

/**
 * Captures USB barcode wedge input at document level so staff never need to
 * click the search box before each scan.
 */
export function usePosBarcodeScanner({ enabled, onScan }) {
  const bufferRef = useRef('');
  const lastKeyRef = useRef(0);
  const timerRef = useRef(null);
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const isTypingAllowed = useCallback((el) => {
    if (!el) return false;
    return Boolean(el.closest?.('[data-pos-allow-typing="true"]'));
  }, []);

  const refocusScanner = useCallback(() => {
    if (!enabled) return;
    requestAnimationFrame(() => {
      if (isTypingAllowed(document.activeElement)) return;
      scannerRef.current?.focus({ preventScroll: true });
    });
  }, [enabled, isTypingAllowed]);

  useEffect(() => {
    if (!enabled) return undefined;

    refocusScanner();

    const onKeyDown = (e) => {
      if (isTypingAllowed(e.target)) return;

      const now = Date.now();
      if (now - lastKeyRef.current > INTER_CHAR_MS && bufferRef.current) {
        bufferRef.current = '';
      }
      lastKeyRef.current = now;

      if (e.key === 'Enter') {
        const fromBuffer = bufferRef.current.trim();
        const fromHidden = scannerRef.current?.value?.trim() || '';
        const code = fromBuffer || fromHidden;
        bufferRef.current = '';
        if (scannerRef.current) scannerRef.current.value = '';
        if (code.length >= MIN_SCAN_LEN) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        bufferRef.current += e.key;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, INTER_CHAR_MS * 4);
      }
    };

    const onPointerDown = (e) => {
      if (isTypingAllowed(e.target)) return;
      refocusScanner();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('focus', refocusScanner);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('focus', refocusScanner);
      clearTimeout(timerRef.current);
    };
  }, [enabled, isTypingAllowed, refocusScanner]);

  return { scannerRef, refocusScanner };
}
