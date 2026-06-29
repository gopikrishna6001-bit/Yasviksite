import { useQuery } from '@tanstack/react-query';
import { CreditCard, Loader2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { appClient } from '@/api/appClient';

async function fetchRazorpayHealth() {
  const res = await appClient.functions.invoke('razorpayHealth', {});
  return res.data;
}

export default function RazorpayPaymentsAdminPanel() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-razorpay-health'],
    queryFn: fetchRazorpayHealth,
    retry: false,
    staleTime: 60_000,
  });

  const configured = data?.configured === true;
  const apiOk = data?.api_ok === true;
  const mode = data?.mode || '—';

  return (
    <div className="mb-6 bg-white rounded-2xl shadow-sm border border-border/60 overflow-hidden">
      <div className="px-6 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-forest-canopy" />
            <h2 className="font-cormorant text-xl text-rain-cloud">Razorpay payments</h2>
          </div>
          <p className="font-inter text-xs text-rain-cloud/45 mt-1">
            Key secret stays on Cloudflare Worker only. Checkout uses server-created orders + signature verification.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border font-inter text-xs text-rain-cloud/70 hover:border-forest-canopy/40 disabled:opacity-50"
        >
          {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Test connection
        </button>
      </div>

      <div className="px-6 py-5 space-y-4">
        {isLoading ? (
          <p className="font-inter text-sm text-rain-cloud/45 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking Razorpay…
          </p>
        ) : isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-inter text-sm text-red-800 font-medium">Could not reach payment API</p>
              <p className="font-inter text-xs text-red-700/80 mt-0.5">{error?.message || 'Deploy worker and try again.'}</p>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/50 bg-rain-mist/30 px-4 py-3">
              <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Status</p>
              <p className={`font-inter text-sm font-medium mt-1 flex items-center gap-1.5 ${configured && apiOk ? 'text-forest-canopy' : 'text-amber-700'}`}>
                {configured && apiOk ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {!configured ? 'Not configured' : apiOk ? 'Connected' : 'Keys set — API error'}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-rain-mist/30 px-4 py-3">
              <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Mode</p>
              <p className="font-inter text-sm font-medium mt-1 text-rain-cloud capitalize">{mode}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-rain-mist/30 px-4 py-3">
              <p className="font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Key ID</p>
              <p className="font-mono text-xs mt-1 text-rain-cloud/70">{data?.key_id_masked || '—'}</p>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-temple-stone/25 bg-rain-mist/40 px-4 py-4 font-inter text-xs text-rain-cloud/60 space-y-2">
          <p className="font-medium text-rain-cloud/75">One-time setup (from your machine)</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy Razorpay <strong>Key ID</strong> and <strong>Key Secret</strong> from the Razorpay Dashboard → API Keys.</li>
            <li>Run in terminal (never commit secrets):</li>
          </ol>
          <pre className="mt-2 rounded-lg bg-rain-cloud/90 text-white/90 p-3 text-[11px] overflow-x-auto">
{`cd yasvik-monsoon-tales
RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=your_secret npm run setup:razorpay
npx wrangler deploy`}
          </pre>
          <p>Use <code className="text-[10px] bg-white/60 px-1 rounded">rzp_test_</code> keys on a test worker first. Key secret is never stored in the app or Supabase.</p>
        </div>
      </div>
    </div>
  );
}
