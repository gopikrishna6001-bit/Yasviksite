const CHECKOUT_DRAFT_KEY = 'yasvik_checkout_address_draft_v1';

export function saveCheckoutDraft(address = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(address));
  } catch {
    // ignore quota / private mode
  }
}

export function loadCheckoutDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCheckoutDraft() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // ignore
  }
}
