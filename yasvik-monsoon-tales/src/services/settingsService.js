import { supabase } from '@/api/supabaseClient';
import {
  buildLatestSettingsValueMap,
  getLatestSettingRecord,
  getLatestSettingValue,
} from '@/lib/settingsResolver';

export const SETTINGS_QUERY_KEYS = {
  all: ['settings', 'all'],
  public: ['settings', 'public'],
  announcement: ['settings', 'announcement'],
  brand: ['settings', 'brand'],
  splash: ['settings', 'splash'],
  home: ['settings', 'home'],
  roots: ['settings', 'roots'],
  seo: ['settings', 'seo'],
  theme: ['settings', 'theme'],
};

const SETTINGS_CACHE_KEY = 'yasvik_public_settings_cache_v1';

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function cacheSettings(settings = []) {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(buildLatestSettingsValueMap(settings)));
  } catch {
    // Local storage can be unavailable in private/strict browser modes.
  }
}

function updateCachedSetting(key, value) {
  if (!canUseLocalStorage()) return;
  try {
    const existing = JSON.parse(window.localStorage.getItem(SETTINGS_CACHE_KEY) || '{}');
    window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ ...existing, [key]: value }));
  } catch {
    // Ignore cache failures; Supabase remains the source of truth.
  }
}

export function getCachedSetting(key, fallback = undefined) {
  if (!canUseLocalStorage()) return fallback;
  try {
    const cached = JSON.parse(window.localStorage.getItem(SETTINGS_CACHE_KEY) || '{}');
    const value = cached?.[key];
    return value === undefined || value === null || value === '' ? fallback : value;
  } catch {
    return fallback;
  }
}

export function optimizeSupabasePublicImageUrl(url = '', width = 480) {
  const raw = String(url || '').trim();
  if (!raw.includes('/storage/v1/object/public/')) return raw;
  try {
    const parsed = new URL(raw);
    parsed.pathname = parsed.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
    parsed.searchParams.set('width', String(width));
    parsed.searchParams.set('quality', '90');
    parsed.searchParams.set('resize', 'contain');
    return parsed.toString();
  } catch {
    return raw;
  }
}

function normalizeSettingRow(row = {}) {
  const key = row.setting_key ?? row.key ?? '';
  const value = row.setting_value ?? row.value ?? null;
  return {
    id: row.id,
    key,
    value,
    setting_key: key,
    setting_value: value,
    label: row.label || key,
    description: row.description || '',
    data_type: row.data_type || inferSettingDataType(value),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    created_date: row.created_date ?? row.created_at ?? null,
    updated_date: row.updated_date ?? row.updated_at ?? null,
    modified_date: row.modified_date ?? row.updated_at ?? null,
  };
}

export async function fetchAllAppSettings() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1000);

  if (error) {
    throw error;
  }

  const normalized = (data || []).map(normalizeSettingRow);
  cacheSettings(normalized);
  return normalized;
}

export function resolveSettingsMap(settings = []) {
  return buildLatestSettingsValueMap(settings);
}

export function resolveSetting(settings = [], key, fallback = undefined) {
  return getLatestSettingValue(settings, key, fallback);
}

export function inferSettingDataType(value) {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (value && typeof value === 'object') return 'json';
  return 'string';
}

function isUuid(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function fetchLatestSettingByKey(key) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('setting_key', key)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data ? normalizeSettingRow(data) : null;
}

export async function upsertAppSetting(settings = [], key, value, meta = {}) {
  const cachedExisting = getLatestSettingRecord(settings, key);
  const existing = isUuid(cachedExisting?.id)
    ? cachedExisting
    : await fetchLatestSettingByKey(key);
  const payload = {
    setting_key: key,
    setting_value: value,
    description: meta.description ?? existing?.description ?? cachedExisting?.description ?? '',
    data_type: meta.data_type === 'theme-preset' ? 'string' : meta.data_type || inferSettingDataType(value),
  };

  if (isUuid(existing?.id)) {
    const { data, error } = await supabase
      .from('app_settings')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }
    const normalized = normalizeSettingRow(data);
    updateCachedSetting(key, normalized.value);
    return normalized;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }
  const normalized = normalizeSettingRow(data);
  updateCachedSetting(key, normalized.value);
  return normalized;
}
