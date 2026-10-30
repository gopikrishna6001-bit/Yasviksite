import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Package } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import OpsMarginControlPanel from '@/components/admin/ops/OpsMarginControlPanel';

const TABS = [
  { id: 'margin', label: 'Pricing & Margin', ready: true, hint: 'Safe price · profit · Bonus stress' },
  { id: 'batches', label: 'Batch & Labels', ready: false, hint: 'Next — packed lots + print' },
  { id: 'fulfililment', label: 'Fulfilment board', ready: false, hint: 'Next — pick → deliver' },
  { id: 'media', label: 'Media Inbox', ready: false, hint: 'Optional — raw uploads' },
];

function ComingSoon({ title, body, links = [] }) {
  return (
    <div className="rounded-2xl border border-dashed border-soft-border bg-white p-8">
      <h2 className="font-cormorant text-xl font-semibold text-deep-forest">{title}</h2>
      <p className="mt-2 max-w-xl font-inter text-sm text-deep-forest/65">{body}</p>
      {links.length ? (
        <ul className="mt-4 space-y-2">
          {links.map((link) => (
            <li key={link.to}>
              <Link to={link.to} className="font-inter text-sm font-semibold text-neon-paddy">
                {link.label} →
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function AdminOperations() {
  const [tab, setTab] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return TABS.some((t) => t.id === hash) ? hash : 'margin';
  });

  const panel = useMemo(() => {
    switch (tab) {
      case 'batches':
        return (
          <ComingSoon
            title="Batch & label workflow"
            body="Next Operations build: batch number, packed date, best-before, quantity, purchase cost, printable label — starting with Yasvik-packed Heroes. Existing Price Labels stay available meanwhile."
            links={[
              { to: '/admin/labels', label: 'Price Labels (current)' },
              { to: '/admin/inventory', label: 'Inventory ledger' },
            ]}
          />
        );
      case 'fulfililment':
        return (
          <ComingSoon
            title="Order fulfilment board"
            body="Next: New → Paid → Picking → Packed → Assigned → Out → Delivered, with packing list and WhatsApp. Use Orders + Delivery board until this ships."
            links={[
              { to: '/admin/orders', label: 'Orders' },
              { to: '/admin/delivery', label: 'Delivery board' },
            ]}
          />
        );
      case 'media':
        return (
          <ComingSoon
            title="Media Inbox"
            body="Optional phone-friendly raw upload → product → type → note → R2, with raw/shortlisted/approved status. Use Media Library until then."
            links={[{ to: '/admin/media', label: 'Media Library' }]}
          />
        );
      default:
        return <OpsMarginControlPanel />;
    }
  }, [tab]);

  const selectTab = (id) => {
    setTab(id);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <AdminPageHeader
        title="Yasvik Operations"
        description="Business operating system — margin control first. Does not change the public storefront. Editorial launch stays content-only."
        action={(
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/pricing"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold uppercase tracking-wider text-deep-forest"
            >
              <Calculator className="h-3.5 w-3.5" />
              Pricing Strategy
            </Link>
            <Link
              to="/admin/packaging"
              className="inline-flex items-center gap-2 rounded-full border border-soft-border bg-white px-4 py-2 font-inter text-xs font-bold uppercase tracking-wider text-deep-forest"
            >
              <Package className="h-3.5 w-3.5" />
              Packaging
            </Link>
          </div>
        )}
      />

      <div className="mb-4 rounded-2xl border border-soft-border bg-white px-4 py-3">
        <p className="font-inter text-sm text-deep-forest/70">
          Path: <span className="font-semibold text-deep-forest">/admin/operations</span>
          {' · '}
          Priority: Margin → Batch/Labels → Fulfilment → Media Inbox
          {' · '}
          Recommend only — you approve price changes.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-soft-border pb-3">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTab(item.id)}
            className={`rounded-full px-4 py-2 text-left transition ${
              tab === item.id
                ? 'bg-deep-forest text-warm-cream'
                : 'bg-white text-deep-forest/70 ring-1 ring-soft-border hover:text-deep-forest'
            }`}
          >
            <span className="block font-inter text-[11px] font-bold uppercase tracking-wider">
              {item.label}
              {!item.ready ? ' · soon' : ''}
            </span>
            <span className={`mt-0.5 block font-inter text-[10px] ${tab === item.id ? 'text-warm-cream/70' : 'text-deep-forest/40'}`}>
              {item.hint}
            </span>
          </button>
        ))}
      </div>

      {panel}
    </div>
  );
}
