import { useSyncExternalStore } from 'react';

const KEY = 'yasvik_pos_sidebar_hidden';

function readHidden() {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(KEY);
    if (val === null) return true;
    return val === '1';
  } catch {
    return true;
  }
}

let snapshot = readHidden();
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getPosSidebarHidden() {
  return snapshot;
}

export function setPosSidebarHidden(hidden) {
  const next = Boolean(hidden);
  if (next === snapshot) return;
  snapshot = next;
  try {
    localStorage.setItem(KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
  emit();
}

export function togglePosSidebarHidden() {
  setPosSidebarHidden(!snapshot);
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY) return;
    snapshot = event.newValue === '1';
    emit();
  });
}

/** Shared hide/show state for POS counter focus (sidebar + bill layout). */
export function usePosSidebarHidden() {
  const hidden = useSyncExternalStore(subscribe, getPosSidebarHidden, () => true);
  return {
    hidden,
    setHidden: setPosSidebarHidden,
    toggle: togglePosSidebarHidden,
  };
}
