import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Power, Store } from 'lucide-react';
import { getLatestSettingRecord } from '@/lib/settingsResolver';
import { DEFAULT_STORE_OFFLINE_MESSAGE, parseStoreOfflineEnabled } from '@/lib/storeOffline';
import {
  fetchAllAppSettings,
  SETTINGS_QUERY_KEYS,
  upsertAppSetting,
} from '@/services/settingsService';
import { toast } from '@/components/ui/use-toast';

function readOfflineFromSettings(settings = []) {
  const enabledRecord = getLatestSettingRecord(settings, 'store_offline_enabled');
  const messageRecord = getLatestSettingRecord(settings, 'store_offline_message');
  return {
    enabled: parseStoreOfflineEnabled(enabledRecord?.value),
    message: String(messageRecord?.value || '').trim() || DEFAULT_STORE_OFFLINE_MESSAGE,
  };
}

export default function StoreOfflineAdminPanel() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState(DEFAULT_STORE_OFFLINE_MESSAGE);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.all,
    queryFn: fetchAllAppSettings,
  });

  useEffect(() => {
    const next = readOfflineFromSettings(settings);
    setEnabled(next.enabled);
    setMessage(next.message);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async ({ nextEnabled, nextMessage }) => {
      const latest = queryClient.getQueryData(SETTINGS_QUERY_KEYS.all) || settings;
      await upsertAppSetting(latest, 'store_offline_enabled', nextEnabled, {
        data_type: 'boolean',
        description: 'When on, the shop page shows an offline message and blocks new orders.',
      });
      await upsertAppSetting(latest, 'store_offline_message', nextMessage, {
        data_type: 'string',
        description: 'Customer-facing message on the shop page while offline.',
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'settings',
      });
      toast({
        title: enabled ? 'Store is now offline' : 'Store is live',
        description: enabled
          ? 'Customers see the restocking page on Shop and cannot place new orders.'
          : 'Customers can browse and order again.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not update offline mode',
        description: error?.message || 'Please try again.',
      });
    },
  });

  const handleToggle = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    saveMutation.mutate({ nextEnabled, nextMessage: message });
  };

  const handleSaveMessage = () => {
    saveMutation.mutate({ nextEnabled: enabled, nextMessage: message });
  };

  if (isLoading) {
    return (
      <div className="mb-6 rounded-2xl border border-border/60 bg-white p-5">
        <div className="h-16 animate-pulse rounded-xl bg-rain-mist/60" />
      </div>
    );
  }

  return (
    <div
      className={`mb-6 overflow-hidden rounded-2xl border shadow-sm transition-colors ${
        enabled ? 'border-sun-dried-clay/50 bg-sun-dried-clay/8' : 'border-border/60 bg-white'
      }`}
    >
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Store className={`h-5 w-5 ${enabled ? 'text-sun-dried-clay' : 'text-rain-cloud/45'}`} />
            <h2 className="font-cormorant text-xl text-rain-cloud">Store offline mode</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 font-inter text-[10px] font-bold uppercase tracking-[0.14em] ${
                enabled ? 'bg-sun-dried-clay text-warm-cream' : 'bg-forest-canopy/12 text-forest-canopy'
              }`}
            >
              {enabled ? 'Offline' : 'Live'}
            </span>
          </div>
          <p className="mt-1 font-inter text-xs text-rain-cloud/50">
            Turn off ordering instantly. The shop page shows a restocking message; the rest of the site stays open.
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={saveMutation.isPending}
          className={`inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 font-inter text-sm font-semibold transition-colors disabled:opacity-60 ${
            enabled
              ? 'bg-forest-canopy text-white hover:bg-forest-canopy/90'
              : 'bg-sun-dried-clay text-warm-cream hover:bg-sun-dried-clay/90'
          }`}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Power className="h-4 w-4" />
          )}
          {enabled ? 'Bring store online' : 'Take store offline'}
        </button>
      </div>

      <div className="border-t border-border/50 px-5 py-4">
        <label className="block font-inter text-sm text-rain-cloud/80 mb-1">Customer message</label>
        <p className="font-inter text-xs text-rain-cloud/45 mb-2">
          Shown on the shop page while offline. Home, stories, and other pages stay normal.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full flex-1 rounded-xl border border-border px-4 py-2 font-inter text-sm text-rain-cloud focus:outline-none focus:border-forest-canopy"
            placeholder={DEFAULT_STORE_OFFLINE_MESSAGE}
          />
          <button
            type="button"
            onClick={handleSaveMessage}
            disabled={saveMutation.isPending}
            className="rounded-full border border-border px-5 py-2.5 font-inter text-sm text-rain-cloud hover:bg-rain-mist disabled:opacity-60"
          >
            Save message
          </button>
        </div>
      </div>
    </div>
  );
}
