import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { appClient } from '@/api/appClient';
import { CUSTOMER_FILTERS } from '@/lib/customerCrmUtils';

/**
 * Marketing prep only — builds segments and exports consented phones.
 * Does not send WhatsApp messages.
 */
export default function AdminCampaigns() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [filterId, setFilterId] = useState('marketing_consent');
  const [exportResult, setExportResult] = useState(null);

  const { data: segmentsData } = useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listCustomerSegments', {});
      return res.data?.segments || [];
    },
  });

  const saveSeg = useMutation({
    mutationFn: async () => {
      const res = await appClient.functions.invoke('upsertCustomerSegment', {
        name,
        filter: { id: filterId },
        description: 'Draft segment for future WhatsApp campaigns',
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      setName('');
      qc.invalidateQueries(['customer-segments']);
    },
  });

  const exportAudience = async () => {
    const res = await appClient.functions.invoke('exportConsentAudience', { filter: filterId });
    setExportResult(res.data);
  };

  const downloadPhones = () => {
    if (!exportResult?.phones?.length) return;
    const lines = ['phone,name,tags', ...exportResult.phones.map((p) =>
      `${p.phone},"${(p.name || '').replace(/"/g, '')}","${(p.tags || []).join('|')}"`
    )];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yasvik-wa-audience-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <AdminPageHeader
        title="WhatsApp campaigns"
        description="Draft segments and export consented audiences. Sending is not enabled yet."
      />

      <div className="mt-4 bg-amber-50 border border-amber-200/60 rounded-2xl p-4 font-inter text-xs text-amber-900/80">
        Automatic marketing messages are intentionally disabled. Use exports with your WhatsApp Business tools when ready.
      </div>

      <div className="mt-4 bg-white rounded-2xl border border-border/40 p-4 space-y-3">
        <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45">Save segment draft</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Segment name"
          className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
        />
        <select
          value={filterId}
          onChange={(e) => setFilterId(e.target.value)}
          className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm"
        >
          <option value="marketing_consent">Marketing consent only</option>
          {CUSTOMER_FILTERS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={!name.trim() || saveSeg.isPending}
          onClick={() => saveSeg.mutate()}
          className="rounded-full bg-wet-earth text-white px-4 py-2 font-inter text-xs disabled:opacity-40"
        >
          Save draft segment
        </button>
      </div>

      <div className="mt-4 bg-white rounded-2xl border border-border/40 p-4 space-y-3">
        <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45">Export audience</p>
        <button
          type="button"
          onClick={exportAudience}
          className="rounded-full border border-border px-4 py-2 font-inter text-xs"
        >
          Build export (consent-filtered)
        </button>
        {exportResult ? (
          <div className="font-inter text-xs text-rain-cloud/60 space-y-2">
            <p>{exportResult.count} consented phones · {exportResult.note}</p>
            <button
              type="button"
              onClick={downloadPhones}
              disabled={!exportResult.count}
              className="rounded-full bg-[#25D366] text-white px-4 py-2 disabled:opacity-40"
            >
              Download CSV
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-4 bg-white rounded-2xl border border-border/40 p-4">
        <p className="font-inter text-xs uppercase tracking-wider text-rain-cloud/45 mb-2">Saved segments</p>
        <ul className="space-y-2">
          {(segmentsData || []).map((s) => (
            <li key={s.id} className="font-inter text-sm text-rain-cloud">
              {s.name}
              <span className="text-rain-cloud/40 text-xs"> · {JSON.stringify(s.filter)}</span>
            </li>
          ))}
          {!segmentsData?.length && (
            <li className="font-inter text-xs text-rain-cloud/40">No drafts yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}
