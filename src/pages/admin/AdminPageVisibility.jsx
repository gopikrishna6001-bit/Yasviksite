import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Menu, Save } from 'lucide-react';
import { pageSettings as pageSettingsApi } from '@/services/api';
import {
  PUBLIC_NAV_GROUPS,
  getConfigurableNavItems,
  getPageSettingForKey,
} from '@/config/publicNavigation';

function buildRows(pageSettings = []) {
  return getConfigurableNavItems()
    .map((item) => {
      const setting = getPageSettingForKey(pageSettings, item.key);
      const group = PUBLIC_NAV_GROUPS.find((entry) => entry.key === item.group);
      return {
        ...item,
        groupLabel: group?.label || item.group,
        settingId: setting?.id || null,
        label: setting?.label || item.label,
        is_visible: setting?.is_visible !== false,
        sort_order: Number.isFinite(Number(setting?.sort_order)) ? Number(setting.sort_order) : item.sortOrder,
      };
    })
    .sort((a, b) => (a.group === b.group ? a.sort_order - b.sort_order : (PUBLIC_NAV_GROUPS.find((g) => g.key === a.group)?.sortOrder || 0) - (PUBLIC_NAV_GROUPS.find((g) => g.key === b.group)?.sortOrder || 0)));
}

export default function AdminPageVisibility() {
  const queryClient = useQueryClient();
  const [draftRows, setDraftRows] = useState({});

  const { data: pageSettings = [], isLoading } = useQuery({
    queryKey: ['page-settings'],
    queryFn: pageSettingsApi.list,
  });

  const rows = useMemo(() => buildRows(pageSettings), [pageSettings]);

  const upsertMutation = useMutation({
    mutationFn: async ({ row, patch }) => {
      const payload = {
        page_key: row.key,
        label: patch.label ?? row.label,
        is_visible: patch.is_visible ?? row.is_visible,
        sort_order: Number(patch.sort_order ?? row.sort_order ?? row.sortOrder ?? 0),
      };
      if (row.settingId) {
        return pageSettingsApi.update(row.settingId, payload);
      }
      return pageSettingsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-settings'] });
      queryClient.invalidateQueries({ queryKey: ['drawer-page-settings'] });
    },
  });

  const setDraft = (key, field, value) => {
    setDraftRows((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  };

  const mergedRow = (row) => ({ ...row, ...(draftRows[row.key] || {}) });

  const groupedRows = PUBLIC_NAV_GROUPS.map((group) => ({
    ...group,
    rows: rows.filter((row) => row.group === group.key),
  })).filter((group) => group.rows.length > 0);

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="h-8 bg-temple-stone/20 rounded animate-pulse w-1/3 mb-4" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-canopy/10 text-forest-canopy">
            <Menu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-cormorant text-3xl text-rain-cloud font-medium">Hamburger Menu</h1>
            <p className="font-inter text-sm text-rain-cloud/45 mt-1">Show, hide, and order public pages in the main site drawer.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {groupedRows.map((group) => (
          <section key={group.key} className="rounded-2xl bg-white shadow-sm ring-1 ring-border/20 overflow-hidden">
            <div className="border-b border-border/20 px-5 py-4">
              <h2 className="font-inter text-[11px] font-black uppercase tracking-[0.2em] text-rain-cloud/45">{group.label}</h2>
            </div>
            <div className="divide-y divide-border/20">
              {group.rows.map((row, i) => {
                const draft = mergedRow(row);
                const isDirty = Boolean(draftRows[row.key]);
                return (
                  <motion.div
                    key={row.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_7rem_8rem_auto] md:items-center"
                  >
                    <div>
                      <p className="font-inter text-sm font-bold text-rain-cloud">{row.label}</p>
                      <p className="font-inter text-xs text-rain-cloud/45">{row.path}</p>
                    </div>

                    <label className="flex items-center gap-2 font-inter text-xs text-rain-cloud/55">
                      Order
                      <input
                        type="number"
                        value={draft.sort_order}
                        onChange={(event) => setDraft(row.key, 'sort_order', event.target.value)}
                        className="h-10 w-20 rounded-xl border border-border/50 px-3 font-inter text-sm text-rain-cloud outline-none focus:border-forest-canopy"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        const nextVisible = !draft.is_visible;
                        upsertMutation.mutate({ row, patch: { ...draftRows[row.key], is_visible: nextVisible } });
                      }}
                      disabled={upsertMutation.isPending}
                      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 font-inter text-xs font-bold transition-colors ${
                        draft.is_visible
                          ? 'bg-forest-canopy/10 text-forest-canopy'
                          : 'bg-red-50 text-red-500'
                      }`}
                    >
                      {draft.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {draft.is_visible ? 'Visible' : 'Hidden'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        upsertMutation.mutate({ row, patch: draftRows[row.key] || {} });
                        setDraftRows((prev) => {
                          const next = { ...prev };
                          delete next[row.key];
                          return next;
                        });
                      }}
                      disabled={!isDirty || upsertMutation.isPending}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-rain-cloud px-4 font-inter text-xs font-bold text-white transition-opacity disabled:opacity-35"
                    >
                      {upsertMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
