const DRAFT_KEY = 'yasvik_pos_draft_v1';
const LEGACY_SESSION_KEY = 'yasvik_pos_session';

const DEFAULT_SESSION = {
  cart: [],
  customerName: '',
  customerPhone: '',
  paymentMethod: 'cash',
  cashReceived: '',
  browseTab: 'browse',
  categoryId: 'all',
  scannerEnabled: true,
};

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadPosSession() {
  const fromLocal = readJson(localStorage, DRAFT_KEY);
  if (fromLocal?.cart) {
    return { ...DEFAULT_SESSION, ...fromLocal };
  }

  const legacy = readJson(sessionStorage, LEGACY_SESSION_KEY);
  if (legacy) {
    const merged = { ...DEFAULT_SESSION, ...legacy };
    savePosSession(merged);
    return merged;
  }

  return { ...DEFAULT_SESSION };
}

export function savePosSession(session) {
  const payload = {
    ...session,
    savedAt: new Date().toISOString(),
    version: 1,
  };
  writeJson(localStorage, DRAFT_KEY, payload);
  writeJson(sessionStorage, LEGACY_SESSION_KEY, payload);
}

export function clearPosSession() {
  try {
    localStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getPosDraftSummary() {
  const draft = loadPosSession();
  const itemCount = (draft.cart || []).reduce((s, line) => s + (line.qty || 1), 0);
  const lineCount = (draft.cart || []).length;
  const total = (draft.cart || []).reduce((s, line) => s + (line.price || 0) * (line.qty || 1), 0);
  return {
    hasDraft: lineCount > 0,
    lineCount,
    itemCount,
    total,
    savedAt: draft.savedAt || null,
  };
}

export { DEFAULT_SESSION };
