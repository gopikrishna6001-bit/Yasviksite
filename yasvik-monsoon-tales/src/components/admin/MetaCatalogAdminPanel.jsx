import { useMemo } from 'react';
import { Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getMetaCatalogFeedUrls } from '@/lib/metaCatalogFeed';

const SETUP_STEPS = [
  'Open Meta Commerce Manager → Catalog → Add catalog → Data feed → Scheduled feed.',
  'Paste the live feed URL below (recommended — always up to date when you edit products).',
  'Set currency to INR and schedule: every hour or daily.',
  'In WhatsApp Manager → Commerce → connect this catalog to your WhatsApp Business number.',
  'Turn on catalog in WhatsApp Business app → Shopping → Manage catalog.',
];

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  } catch {
    toast({ variant: 'destructive', title: `Could not copy ${label}` });
  }
}

export default function MetaCatalogAdminPanel() {
  const feeds = useMemo(() => getMetaCatalogFeedUrls(), []);

  return (
    <section className="rounded-2xl border border-soft-border bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#E8F5E9] p-2 text-[#1B5E20]">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-deep-forest/50">
            Meta / WhatsApp catalog
          </p>
          <h3 className="mt-1 font-cormorant text-2xl font-semibold text-deep-forest">
            Sync website products to WhatsApp
          </h3>
          <p className="mt-2 font-inter text-sm leading-7 text-deep-forest/70">
            Yasvik publishes a Meta-compatible CSV from your live product catalog — titles, prices, pack sizes, images, and product links. Update products in Admin → Products; Meta refreshes on its schedule.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-soft-border bg-warm-cream/60 p-4">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-deep-forest/45">
            Live feed (recommended)
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-xs text-deep-forest">
              {feeds.liveFeedUrl}
            </code>
            <button
              type="button"
              onClick={() => copyText(feeds.liveFeedUrl, 'Live feed URL')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold text-deep-forest hover:bg-warm-cream"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <a
              href={feeds.liveFeedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-deep-forest px-4 py-2 font-inter text-xs font-bold text-white hover:brightness-95"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-soft-border bg-white p-4">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.16em] text-deep-forest/45">
            Static backup feed
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-lg bg-warm-cream/70 px-3 py-2 font-mono text-xs text-deep-forest">
              {feeds.staticFeedUrl}
            </code>
            <button
              type="button"
              onClick={() => copyText(feeds.staticFeedUrl, 'Static feed URL')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold text-deep-forest hover:bg-warm-cream"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <p className="mt-2 font-inter text-xs leading-6 text-deep-forest/55">
            Regenerated on each site deploy. Use the live feed for day-to-day product edits.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-2">
        {SETUP_STEPS.map((step) => (
          <li key={step} className="flex gap-2 font-inter text-sm leading-6 text-deep-forest/75">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neon-paddy" aria-hidden="true" />
            {step}
          </li>
        ))}
      </ol>

      <p className="mt-4 font-inter text-xs leading-6 text-deep-forest/55">
        Meta docs:{' '}
        <a
          href="https://www.facebook.com/business/help/120325381656392"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-neon-paddy hover:underline"
        >
          Product feed specifications
        </a>
        . Each pack size is exported as its own catalog item with image, price, and link back to yasvik.com.
      </p>
    </section>
  );
}
