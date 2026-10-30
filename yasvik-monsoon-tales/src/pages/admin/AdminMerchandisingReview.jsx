import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Check, Download, Filter, Layers, RefreshCw, X, StickyNote,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { supabase } from '@/api/supabaseClient';
import {
  PHASE_1B1_AUDIT_RUN_ID,
  OWNER_INPUT_DEFAULTS,
  OWNER_DECISION_ACTIONS,
  filterProposals1b1,
  scorecardToCsv,
  buildReadinessScorecard,
  assessProductIdentity,
} from '@/lib/merchandisingReview1b1';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'hero', label: 'Hero' },
  { key: 'core', label: 'Core' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'pending', label: 'Pending' },
  { key: 'identity_conflict', label: 'Identity conflict' },
  { key: 'margin_unknown', label: 'Margin unknown' },
  { key: 'supply_unknown', label: 'Supply unknown' },
  { key: 'high_delivery_burden', label: 'High delivery burden' },
  { key: 'content_incomplete', label: 'Content incomplete' },
  { key: 'special_oils', label: 'Special oil' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'supply', label: 'Supply' },
  { key: 'demand', label: 'Demand' },
  { key: 'operational', label: 'Operational' },
  { key: 'content_readiness', label: 'Content readiness' },
];

const DETAIL_TABS = [
  { key: 'identity', label: 'Identity' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'supply', label: 'Supply' },
  { key: 'demand', label: 'Demand' },
  { key: 'operational', label: 'Operational' },
  { key: 'content', label: 'Content' },
  { key: 'owner', label: 'Owner input' },
];

async function fetchAuditRuns() {
  const { data, error } = await supabase
    .from('merchandising_audit_runs')
    .select('id, generated_at, generation_version, proposal_rule_version, notes')
    .order('generated_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

async function fetchProposals(auditRunId) {
  if (!auditRunId) return [];
  const { data, error } = await supabase
    .from('merchandising_product_proposals')
    .select(`
      *,
      product:products(
        id, name, slug, price, discount_price, is_published, sell_online,
        featured_image_url, category_id, short_description, description,
        seo_title, seo_description, sku, stock_quantity, quick_variants,
        ingredients, allergen_info, processing_method, best_for, storage_note,
        origin_state, supplier_name, source_type, subject_to_availability,
        shelf_life_text, product_kind, bundle_id
      ),
      collection:merchandising_collections!proposed_collection_id(id, slug, title)
    `)
    .eq('audit_run_id', auditRunId)
    .order('proposed_tier', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    report_flags: row.report_flags || {},
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    owner_inputs: { ...OWNER_INPUT_DEFAULTS, ...(row.owner_inputs || {}) },
    identity_assessment: row.identity_assessment || {},
    readiness_scorecard: row.readiness_scorecard || {},
    demand_snapshot: row.demand_snapshot || {},
  }));
}

function downloadBlob(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ScorePill({ label, score }) {
  const tone = score === 'strong' || score === 'acceptable'
    ? 'bg-emerald-100 text-emerald-900'
    : score === 'needs_owner_input'
      ? 'bg-amber-100 text-amber-900'
      : score === 'weak' || score === 'poor'
        ? 'bg-rose-100 text-rose-900'
        : 'bg-stone-100 text-stone-700';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md font-inter text-[10px] ${tone}`}>
      {label}: {score || '—'}
    </span>
  );
}

function TierBadge({ tier }) {
  if (!tier) return <span className="font-inter text-[10px] uppercase tracking-wide text-deep-forest/40">Pending</span>;
  const colors = {
    hero: 'bg-amber-100 text-amber-900',
    core: 'bg-emerald-100 text-emerald-900',
    local_store: 'bg-sky-100 text-sky-900',
    hidden: 'bg-stone-200 text-stone-700',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md font-inter text-[10px] uppercase tracking-wide ${colors[tier] || 'bg-stone-100'}`}>
      {String(tier).replace('_', ' ')}
    </span>
  );
}

function DetailPanel({ row, tab, ownerInputs, setOwnerInputs }) {
  const sc = row.readiness_scorecard || {};
  const ida = row.identity_assessment || {};
  const dem = row.demand_snapshot || sc.demand?.snapshot || {};

  if (tab === 'identity') {
    return (
      <div className="space-y-2 font-inter text-xs text-deep-forest/75">
        {ida.has_conflict && (
          <p className="flex items-start gap-2 text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span><strong>Identity warning:</strong> {ida.summary}</span>
          </p>
        )}
        <p>ID: {row.product_id || '—'} · Slug: {row.product?.slug || '—'} · Pub: {row.product?.is_published ? 'yes' : 'no'} · Online: {row.product?.sell_online === false ? 'no' : 'yes'}</p>
        <p>Short: {row.product?.short_description || '—'}</p>
        <p>SEO: {row.product?.seo_title || '—'} / {row.product?.seo_description || '—'}</p>
        {(ida.findings || []).length > 0 && (
          <ul className="list-disc pl-4 space-y-0.5">{ida.findings.map((f) => <li key={f}>{f}</li>)}</ul>
        )}
        {(ida.repair_plan || []).length > 0 && (
          <div>
            <p className="font-semibold text-deep-forest">Recommended repair (do not apply in 1B1)</p>
            <ol className="list-decimal pl-4 space-y-0.5">{ida.repair_plan.map((f) => <li key={f}>{f}</li>)}</ol>
          </div>
        )}
      </div>
    );
  }

  if (tab === 'commercial') {
    const c = sc.commercial || {};
    return (
      <div className="grid md:grid-cols-2 gap-2 font-inter text-xs text-deep-forest/75">
        <p>Sell ₹: {c.selling_price_rs ?? '—'}</p>
        <p>Cost: {String(c.product_cost_rs)}</p>
        <p>Packaging: {String(c.packaging_cost_rs)}</p>
        <p>Payment cost: {String(c.payment_cost_estimate)}</p>
        <p>Contribution ₹: {String(c.expected_gross_contribution_rs)}</p>
        <p>Contribution %: {String(c.gross_contribution_pct)}</p>
        <p>Delivery burden: {c.delivery_burden || '—'}</p>
        <p>Discount pressure: {c.likely_discount_pressure || '—'}</p>
        {sc.hero_gate?.strategic_hero_margin_concern && (
          <p className="md:col-span-2 text-amber-900 bg-amber-50 rounded-lg px-3 py-2">Strategic Hero — margin concern</p>
        )}
        {(c.price_warnings || []).map((w) => <p key={w} className="md:col-span-2 text-amber-800">• {w}</p>)}
      </div>
    );
  }

  if (tab === 'supply') {
    const s = sc.supply || {};
    return (
      <div className="space-y-1 font-inter text-xs text-deep-forest/75">
        <p>Supplier: {s.supplier_name || '—'} · Type: {s.source_type || '—'}</p>
        <p>Subject to availability: {String(s.subject_to_availability)}</p>
        <p>Missing inputs: {(s.missing || []).join(', ') || '—'}</p>
      </div>
    );
  }

  if (tab === 'demand') {
    return (
      <div className="grid md:grid-cols-3 gap-2 font-inter text-xs text-deep-forest/75">
        <p>Orders: {dem.orders ?? '—'}</p>
        <p>Units: {dem.units ?? '—'}</p>
        <p>Revenue ₹: {dem.revenue_rs ?? '—'}</p>
        <p>Customers: {dem.unique_customers ?? '—'}</p>
        <p>Repeat customers: {dem.repeat_customers ?? '—'}</p>
        <p>Last sold: {dem.last_sold ? new Date(dem.last_sold).toLocaleDateString() : '—'}</p>
        <p>POS units: {dem.pos_units ?? '—'}</p>
        <p>Web units: {dem.web_units ?? '—'}</p>
        <p>Data: {dem.data_status || '—'}</p>
      </div>
    );
  }

  if (tab === 'operational') {
    const o = sc.operational || {};
    return (
      <div className="font-inter text-xs text-deep-forest/75 space-y-1">
        <p>Shelf life: {o.shelf_life_text || 'needs_owner_input'}</p>
        <pre className="whitespace-pre-wrap bg-warm-cream/60 rounded-lg p-2">{JSON.stringify(o.checks || {}, null, 2)}</pre>
      </div>
    );
  }

  if (tab === 'content') {
    const c = sc.content || {};
    return (
      <div className="font-inter text-xs text-deep-forest/75 space-y-1">
        <p>Recommendation: {c.recommendation || '—'}</p>
        {(c.description_warnings || []).map((w) => <p key={w}>• {w}</p>)}
        <pre className="whitespace-pre-wrap bg-warm-cream/60 rounded-lg p-2 max-h-40 overflow-auto">{JSON.stringify(c.checks || {}, null, 2)}</pre>
      </div>
    );
  }

  // owner input
  const fields = [
    ['supplier_confirmed', 'Supplier confirmed', 'bool'],
    ['supplier_type', 'Supplier type', 'text'],
    ['supply_consistency', 'Supply consistency', 'text'],
    ['typical_restocking_time', 'Restocking time', 'text'],
    ['minimum_order_quantity', 'MOQ', 'text'],
    ['subject_to_availability_risk', 'STA risk', 'bool'],
    ['alternative_supplier_available', 'Alt supplier', 'bool'],
    ['product_cost_rs', 'Product cost ₹', 'number'],
    ['packaging_cost_rs', 'Packaging cost ₹', 'number'],
    ['expected_wastage_pct', 'Expected wastage %', 'number'],
    ['shelf_life', 'Shelf life', 'text'],
    ['leakage_or_breakage_risk', 'Leakage/breakage risk', 'text'],
    ['strategic_importance', 'Strategic importance', 'text'],
    ['owner_remarks', 'Owner remarks', 'text'],
  ];

  return (
    <div className="grid md:grid-cols-2 gap-2">
      {fields.map(([key, label, type]) => (
        <label key={key} className="font-inter text-xs text-deep-forest/70 space-y-1">
          <span>{label}</span>
          {type === 'bool' ? (
            <select
              value={ownerInputs[key] === true ? 'true' : ownerInputs[key] === false ? 'false' : ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : e.target.value === 'true';
                setOwnerInputs((prev) => ({ ...prev, [key]: v }));
              }}
              className="w-full border border-soft-border rounded-lg px-2 py-1.5"
            >
              <option value="">needs_owner_input</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              value={ownerInputs[key] ?? ''}
              onChange={(e) => setOwnerInputs((prev) => ({
                ...prev,
                [key]: type === 'number'
                  ? (e.target.value === '' ? null : Number(e.target.value))
                  : e.target.value,
              }))}
              className="w-full border border-soft-border rounded-lg px-2 py-1.5"
              placeholder="needs_owner_input"
            />
          )}
        </label>
      ))}
    </div>
  );
}

export default function AdminMerchandisingReview() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('hero');
  const [selectedRunId, setSelectedRunId] = useState(PHASE_1B1_AUDIT_RUN_ID);
  const [detailTab, setDetailTab] = useState('identity');
  const [expandedId, setExpandedId] = useState(null);
  const [ownerInputsById, setOwnerInputsById] = useState({});
  const [actionById, setActionById] = useState({});
  const [noteById, setNoteById] = useState({});
  const [message, setMessage] = useState('');

  const { data: runs = [] } = useQuery({ queryKey: ['merch-audit-runs'], queryFn: fetchAuditRuns });
  const activeRunId = selectedRunId || runs[0]?.id || PHASE_1B1_AUDIT_RUN_ID;

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['merch-proposals-1b1', activeRunId],
    queryFn: () => fetchProposals(activeRunId),
    enabled: Boolean(activeRunId),
  });

  const filtered = useMemo(() => filterProposals1b1(proposals, filter), [proposals, filter]);
  const counts = useMemo(() => {
    const c = {};
    for (const f of FILTERS) c[f.key] = filterProposals1b1(proposals, f.key).length;
    return c;
  }, [proposals]);

  const decideMutation = useMutation({
    mutationFn: async ({ id, action, note, ownerInputs }) => {
      const meta = OWNER_DECISION_ACTIONS.find((a) => a.value === action);
      const { data: userData } = await supabase.auth.getUser();
      const status = action === 'reject_proposal' ? 'rejected'
        : action === 'keep_pending' ? 'pending'
          : (action?.startsWith('change_') || action === 'confirm_hidden') ? 'changed'
            : 'approved';
      const patch = {
        owner_decision_action: action,
        owner_decision_status: status,
        owner_selected_tier: meta?.tier ?? null,
        decision_note: note || null,
        owner_inputs: ownerInputs || {},
        decided_at: new Date().toISOString(),
        decided_by: userData?.user?.id || null,
        updated_at: new Date().toISOString(),
        review_phase: '1b1',
      };
      // Recompute scorecard with owner inputs if product present on client row
      const row = proposals.find((p) => p.id === id);
      if (row?.product) {
        const identity = row.identity_assessment?.has_conflict
          ? row.identity_assessment
          : assessProductIdentity(row.product);
        patch.readiness_scorecard = buildReadinessScorecard(row.product, {
          ownerInputs,
          demand: row.demand_snapshot,
          identity,
          proposal: { ...row, ...patch },
        });
        patch.report_flags = {
          ...(row.report_flags || {}),
          ...(patch.readiness_scorecard.flags || {}),
          identity_conflict: Boolean(identity.has_conflict),
        };
      }
      const { error } = await supabase.from('merchandising_product_proposals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-proposals-1b1', activeRunId] });
      setMessage('Decision saved on proposal only — products and storefront unchanged.');
    },
    onError: (err) => setMessage(err.message || 'Save failed'),
  });

  const saveInputsMutation = useMutation({
    mutationFn: async ({ id, ownerInputs }) => {
      const row = proposals.find((p) => p.id === id);
      const patch = {
        owner_inputs: ownerInputs,
        updated_at: new Date().toISOString(),
        review_phase: '1b1',
      };
      if (row?.product) {
        const identity = row.identity_assessment || assessProductIdentity(row.product);
        patch.readiness_scorecard = buildReadinessScorecard(row.product, {
          ownerInputs,
          demand: row.demand_snapshot,
          identity,
          proposal: row,
        });
      }
      const { error } = await supabase.from('merchandising_product_proposals').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['merch-proposals-1b1', activeRunId] });
      setMessage('Owner inputs saved (review system only).');
    },
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Merchandising Review"
        description="Phase 1B1 — identity, commercial readiness and owner decisions. Does not apply tiers, memberships, prices or storefront changes."
      />

      <div className="rounded-2xl border border-soft-border bg-white p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="w-4 h-4 text-deep-forest/50" />
            <select
              value={activeRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
              className="border border-soft-border rounded-lg px-3 py-1.5 font-inter text-sm"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.generated_at).toLocaleString()} · {r.id === PHASE_1B1_AUDIT_RUN_ID ? '1B1 baseline' : r.generation_version}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadBlob(`merch-scorecard-${filter}.csv`, scorecardToCsv(filtered), 'text/csv')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-soft-border font-inter text-xs"
            >
              <Download className="w-3.5 h-3.5" /> Scorecard CSV
            </button>
            <button
              type="button"
              onClick={() => downloadBlob(`merch-${filter}.json`, JSON.stringify({ audit_run_id: activeRunId, filter, rows: filtered }, null, 2), 'application/json')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-soft-border font-inter text-xs"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
          </div>
        </div>

        {message && <p className="font-inter text-sm text-deep-forest/70 bg-warm-cream/80 rounded-xl px-3 py-2">{message}</p>}

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-inter text-xs border ${
                filter === f.key ? 'bg-deep-forest text-warm-cream border-deep-forest' : 'border-soft-border text-deep-forest/70'
              }`}
            >
              <Filter className="w-3 h-3" />
              {f.label}
              <span className="opacity-70">{counts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-soft-border bg-white overflow-hidden divide-y divide-soft-border">
        {isLoading && <p className="font-inter text-sm text-deep-forest/50 p-6">Loading…</p>}
        {!isLoading && !filtered.length && (
          <p className="font-inter text-sm text-deep-forest/50 p-6">No rows for this filter. Run enrich-merchandising-1b1.mjs if scorecards are empty.</p>
        )}
        {filtered.map((row) => {
          const open = expandedId === row.id;
          const ownerInputs = ownerInputsById[row.id] || row.owner_inputs || OWNER_INPUT_DEFAULTS;
          const sc = row.readiness_scorecard || {};
          const action = actionById[row.id] || row.owner_decision_action || '';
          const note = noteById[row.id] ?? row.decision_note ?? '';
          const missing = [
            sc.flags?.margin_unknown ? 'margin' : null,
            sc.flags?.supply_unknown ? 'supply' : null,
            sc.flags?.identity_conflict ? 'identity' : null,
          ].filter(Boolean);

          return (
            <div key={row.id} className="p-4 md:p-5 space-y-3">
              <div className="flex flex-wrap items-start gap-3 justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-cormorant font-semibold text-lg text-deep-forest">{row.product?.name || row.unmatched_label}</h3>
                    <TierBadge tier={row.proposed_tier} />
                    {row.identity_assessment?.has_conflict && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-inter text-[10px]">
                        <AlertTriangle className="w-3 h-3" /> Identity conflict
                      </span>
                    )}
                    {!!missing.length && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-inter text-[10px]">
                        Needs owner input: {missing.join(', ')}
                      </span>
                    )}
                    <span className="font-inter text-[10px] uppercase tracking-wide text-deep-forest/45">
                      {row.owner_decision_status} {row.owner_decision_action ? `· ${row.owner_decision_action}` : ''}
                    </span>
                  </div>
                  <p className="font-inter text-xs text-deep-forest/55">
                    {row.product?.slug} · ₹{row.product?.price ?? '—'}
                    {row.collection?.title ? ` · ${row.collection.title}` : ''}
                    {row.hidden_reason_code ? ` · hidden:${row.hidden_reason_code}` : ''}
                    {row.pending_reason_group ? ` · pending:${row.pending_reason_group}` : ''}
                    {row.special_oil_recommendation ? ` · oil→${row.special_oil_recommendation}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <ScorePill label="Supply" score={sc.supply?.score} />
                    <ScorePill label="Commercial" score={sc.commercial?.score} />
                    <ScorePill label="Demand" score={sc.demand?.score} />
                    <ScorePill label="Brand" score={sc.brand?.score} />
                    <ScorePill label="Ops" score={sc.operational?.score} />
                    <ScorePill label="Content" score={sc.content?.score} />
                  </div>
                  <p className="font-inter text-sm text-deep-forest/70">{row.classification_reason}</p>
                </div>
                <button
                  type="button"
                  className="font-inter text-xs underline text-deep-forest/60"
                  onClick={() => setExpandedId(open ? null : row.id)}
                >
                  {open ? 'Hide detail' : 'Open scorecard'}
                </button>
              </div>

              {open && (
                <div className="space-y-3 border-t border-soft-border pt-3">
                  <div className="flex flex-wrap gap-2">
                    {DETAIL_TABS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setDetailTab(t.key)}
                        className={`px-2.5 py-1 rounded-lg font-inter text-xs border ${
                          detailTab === t.key ? 'bg-deep-forest text-warm-cream border-deep-forest' : 'border-soft-border'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <DetailPanel
                    row={row}
                    tab={detailTab}
                    ownerInputs={ownerInputs}
                    setOwnerInputs={(updater) => setOwnerInputsById((prev) => ({
                      ...prev,
                      [row.id]: typeof updater === 'function' ? updater(ownerInputs) : updater,
                    }))}
                  />

                  <div className="grid md:grid-cols-3 gap-2 items-end">
                    <label className="font-inter text-xs space-y-1">
                      <span>Owner decision</span>
                      <select
                        value={action}
                        onChange={(e) => setActionById((p) => ({ ...p, [row.id]: e.target.value }))}
                        className="w-full border border-soft-border rounded-lg px-2 py-1.5"
                      >
                        <option value="">Select…</option>
                        {OWNER_DECISION_ACTIONS.map((a) => (
                          <option key={a.value} value={a.value}>{a.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="font-inter text-xs space-y-1 md:col-span-2">
                      <span>Owner note</span>
                      <input
                        value={note}
                        onChange={(e) => setNoteById((p) => ({ ...p, [row.id]: e.target.value }))}
                        className="w-full border border-soft-border rounded-lg px-2 py-1.5"
                        placeholder="Decision rationale"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!action || decideMutation.isPending}
                      onClick={() => decideMutation.mutate({ id: row.id, action, note, ownerInputs })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-inter text-xs disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Save decision
                    </button>
                    <button
                      type="button"
                      onClick={() => saveInputsMutation.mutate({ id: row.id, ownerInputs })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-soft-border font-inter text-xs"
                    >
                      <StickyNote className="w-3.5 h-3.5" /> Save owner inputs
                    </button>
                    <button
                      type="button"
                      onClick={() => decideMutation.mutate({ id: row.id, action: 'reject_proposal', note, ownerInputs })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-700 text-white font-inter text-xs"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                  <p className="font-inter text-[11px] text-deep-forest/45 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Decisions stay on proposals. Phase 1B2 apply is blocked until owner review completes.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
