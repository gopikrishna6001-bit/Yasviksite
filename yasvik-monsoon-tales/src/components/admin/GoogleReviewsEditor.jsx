import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { parseGoogleReviews, serializeGoogleReviews } from '@/lib/homeGoogleReviews';

function emptyDraft(order = 1) {
  return {
    id: `new-${Date.now()}-${order}`,
    text: '',
    name: '',
    location: 'Hyderabad',
    rating: 5,
    source: 'google',
    order,
    is_active: true,
  };
}

export default function GoogleReviewsEditor({ value, onChange }) {
  const [rows, setRows] = useState(() => {
    const parsed = parseGoogleReviews(value);
    return parsed.length ? parsed : [emptyDraft(1)];
  });

  useEffect(() => {
    const parsed = parseGoogleReviews(value);
    if (!parsed.length) return;
    setRows(parsed);
  }, [value]);

  const commit = (next) => {
    const normalized = next.map((row, index) => ({ ...row, order: index + 1 }));
    setRows(normalized);
    onChange(JSON.stringify(serializeGoogleReviews(normalized)));
  };

  const updateRow = (id, patch) => {
    commit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id) => {
    const next = rows.filter((row) => row.id !== id);
    commit(next.length ? next : [emptyDraft(1)]);
  };

  const addRow = () => {
    commit([...rows, emptyDraft(rows.length + 1)]);
  };

  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.id} className="rounded-xl border border-border/70 bg-rain-mist/40 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-rain-cloud/45">
              Review {index + 1}
            </p>
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="inline-flex items-center gap-1 font-inter text-[11px] font-semibold text-rust-red hover:opacity-80"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
          <textarea
            value={row.text}
            onChange={(e) => updateRow(row.id, { text: e.target.value })}
            rows={3}
            placeholder="Paste the Google review text here"
            className="w-full rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
          />
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_5.5rem]">
            <input
              type="text"
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              placeholder="Reviewer name"
              className="rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
            />
            <input
              type="text"
              value={row.location}
              onChange={(e) => updateRow(row.id, { location: e.target.value })}
              placeholder="Location (optional)"
              className="rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
            />
            <select
              value={row.rating ?? 5}
              onChange={(e) => updateRow(row.id, { rating: Number(e.target.value) || 5 })}
              className="rounded-xl border border-border px-3 py-2 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
              aria-label="Star rating"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}★
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-forest-canopy/40 px-3 py-2 font-inter text-xs font-bold text-forest-canopy hover:bg-forest-canopy/5"
      >
        <Plus className="h-3.5 w-3.5" />
        Add another Google review
      </button>
    </div>
  );
}
