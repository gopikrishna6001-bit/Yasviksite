import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import { getStoreOfflineConfig } from '@/lib/storeOffline';

export function useStoreOffline() {
  const { data: settings = [], isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 30 * 1000,
  });

  const config = useMemo(() => getStoreOfflineConfig(resolveSettingsMap(settings)), [settings]);

  return { ...config, isLoading };
}
