import { useCallback, useEffect, useState } from 'react';
import {
  getPendingPosSalesSummary,
  hasPosCatalogCache,
  loadPosCatalogCache,
  savePosCatalogCache,
} from '@/lib/posOfflineStore';
import { syncPendingPosSales } from '@/lib/posOfflineSync';

export function usePosOffline() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [pendingSummary, setPendingSummary] = useState(() => getPendingPosSalesSummary());
  const [catalogCache, setCatalogCache] = useState(() => loadPosCatalogCache());

  const refreshState = useCallback(() => {
    setPendingSummary(getPendingPosSalesSummary());
    setCatalogCache(loadPosCatalogCache());
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      refreshState();
    };
    const onOffline = () => {
      setOnline(false);
      refreshState();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshState]);

  const cacheCatalog = useCallback((products, categories) => {
    if (!products?.length) return;
    savePosCatalogCache({ products, categories });
    refreshState();
  }, [refreshState]);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncMessage('No internet — connect and try again');
      return { synced: 0, failed: 0, errors: [{ message: 'Offline' }] };
    }
    setSyncing(true);
    setSyncMessage('');
    try {
      const result = await syncPendingPosSales();
      refreshState();
      if (result.synced && !result.failed) {
        setSyncMessage(`Synced ${result.synced} sale${result.synced === 1 ? '' : 's'}`);
      } else if (result.synced && result.failed) {
        setSyncMessage(`Synced ${result.synced} · ${result.failed} need attention`);
      } else if (result.failed) {
        setSyncMessage(`${result.failed} sale(s) could not sync — check stock`);
      } else {
        setSyncMessage('Nothing to sync');
      }
      return result;
    } finally {
      setSyncing(false);
    }
  }, [refreshState]);

  useEffect(() => {
    if (!online || pendingSummary.count === 0) return undefined;
    const timer = setTimeout(() => {
      syncNow();
    }, 1500);
    return () => clearTimeout(timer);
  }, [online, pendingSummary.count, syncNow]);

  const offlineReady = hasPosCatalogCache();
  const catalogAge = catalogCache?.syncedAt
    ? new Date(catalogCache.syncedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return {
    online,
    offlineReady,
    catalogCache,
    catalogAge,
    pendingSummary,
    syncing,
    syncMessage,
    cacheCatalog,
    syncNow,
    refreshState,
  };
}
