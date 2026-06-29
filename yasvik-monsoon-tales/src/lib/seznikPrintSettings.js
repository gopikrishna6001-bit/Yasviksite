export const SEZNIK_SETTINGS_KEY = 'yasvik-seznik-print-settings';

export const DEFAULT_SEZNIK_SETTINGS = {
  labelWidthMm: 50,
  labelHeightMm: 25,
  topOffsetMm: 0,
  leftOffsetMm: 0,
  fontScale: 1,
  marginInsetMm: 0,
};

export function loadSeznikPrintSettings() {
  try {
    const raw = localStorage.getItem(SEZNIK_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SEZNIK_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SEZNIK_SETTINGS,
      ...parsed,
      labelWidthMm: Number(parsed.labelWidthMm) || DEFAULT_SEZNIK_SETTINGS.labelWidthMm,
      labelHeightMm: Number(parsed.labelHeightMm) || DEFAULT_SEZNIK_SETTINGS.labelHeightMm,
      topOffsetMm: Number(parsed.topOffsetMm) || 0,
      leftOffsetMm: Number(parsed.leftOffsetMm) || 0,
      fontScale: Number(parsed.fontScale) || DEFAULT_SEZNIK_SETTINGS.fontScale,
      rightInsetMm: Number(parsed.rightInsetMm) ?? 0,
      marginInsetMm: Number(parsed.marginInsetMm) ?? 0,
      borderInsetMm: Number(parsed.borderInsetMm) ?? 0,
    };
  } catch {
    return { ...DEFAULT_SEZNIK_SETTINGS };
  }
}

export function saveSeznikPrintSettings(settings) {
  localStorage.setItem(SEZNIK_SETTINGS_KEY, JSON.stringify({
    ...DEFAULT_SEZNIK_SETTINGS,
    ...settings,
  }));
}

export function resetSeznikPrintSettings() {
  localStorage.removeItem(SEZNIK_SETTINGS_KEY);
  return { ...DEFAULT_SEZNIK_SETTINGS };
}
