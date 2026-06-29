import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { appClient } from '@/api/appClient';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { clearDeliveryZoneCache } from '@/lib/deliveryZones';
import { POSTAL_SOURCE } from '@/lib/postalPincode';

async function fetchDeliveryZones() {
  const { data, error } = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('is_active', true)
    .order('pincode', { ascending: true });
  if (error) throw error;
  return data || [];
}

export default function DeliveryZonesAdminPanel() {
  const queryClient = useQueryClient();
  const [syncLog, setSyncLog] = useState([]);

  const { data: zones = [], isLoading } = useQuery({
    queryKey: ['admin-delivery-zones'],
    queryFn: fetchDeliveryZones,
  });

  const syncMutation = useMutation({
    mutationFn: async ({ force = false, pincode = null } = {}) => {
      const res = await appClient.functions.invoke('syncDeliveryZones', { force, pincode });
      return res.data;
    },
    onSuccess: (data) => {
      clearDeliveryZoneCache();
      queryClient.invalidateQueries({ queryKey: ['admin-delivery-zones'] });
      setSyncLog(data?.results || []);
      toast({
        title: 'Postal sync complete',
        description: `${data?.synced || 0} updated · ${data?.skipped || 0} skipped · ${data?.failed || 0} failed`,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Postal sync failed',
        description: error?.message || 'Deploy the latest Cloudflare Worker and try again.',
      });
    },
  });

  const staleCount = zones.filter((z) => !z.postal_synced_at).length;

  return (
    <div className="mb-6 bg-white rounded-2xl shadow-sm border border-border/60 overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-forest-canopy" />
            <h2 className="font-cormorant text-xl text-rain-cloud">Delivery pincodes</h2>
          </div>
          <p className="font-inter text-xs text-rain-cloud/45 mt-1">
            Area names sync from the India Post directory via {POSTAL_SOURCE}. Stale zones refresh automatically at checkout (30-day cycle).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate({ force: false })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border font-inter text-xs text-rain-cloud/70 hover:border-forest-canopy/40 disabled:opacity-50"
          >
            {syncMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Sync stale ({staleCount || zones.length})
          </button>
          <button
            type="button"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate({ force: true })}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-wet-earth text-white font-inter text-xs hover:bg-wet-earth/90 disabled:opacity-50"
          >
            Force sync all
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 text-center font-inter text-sm text-rain-cloud/40">Loading zones…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/40 bg-muted/20">
                <th className="py-2.5 px-4 font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 font-normal">Pincode</th>
                <th className="py-2.5 px-4 font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 font-normal">Area (India Post)</th>
                <th className="py-2.5 px-4 font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 font-normal hidden sm:table-cell">District</th>
                <th className="py-2.5 px-4 font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 font-normal hidden md:table-cell">Last synced</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-border/30">
                  <td className="py-2.5 px-4 font-mono text-xs text-rain-cloud">{zone.pincode}</td>
                  <td className="py-2.5 px-4 font-inter text-sm text-rain-cloud">{zone.area_name}</td>
                  <td className="py-2.5 px-4 font-inter text-xs text-rain-cloud/55 hidden sm:table-cell">{zone.district || '—'}</td>
                  <td className="py-2.5 px-4 font-inter text-xs text-rain-cloud/45 hidden md:table-cell">
                    {zone.postal_synced_at
                      ? format(new Date(zone.postal_synced_at), 'dd MMM yyyy')
                      : <span className="text-sun-dried-clay">Not synced</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {syncLog.length > 0 && (
        <div className="px-6 py-3 border-t border-border/40 bg-muted/10">
          <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/40 mb-1">Last sync</p>
          <p className="font-inter text-xs text-rain-cloud/55">
            {syncLog.slice(0, 5).map((r) => `${r.pincode}: ${r.area_name || r.error || 'skipped'}`).join(' · ')}
            {syncLog.length > 5 ? ` · +${syncLog.length - 5} more` : ''}
          </p>
        </div>
      )}
    </div>
  );
}
