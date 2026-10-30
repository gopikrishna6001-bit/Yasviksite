import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Boxes, Calculator, Layers, Package, Plus, Save, Trash2, X,
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminCatalogueTabs from '@/components/admin/AdminCatalogueTabs';
import { appClient } from '@/api/appClient';
import { products as productsApi, categories as categoriesApi } from '@/services/api';
import {
  COMPONENT_ROLES,
  MATERIAL_TYPES,
  PROFILE_FAMILIES,
  calcMaterialCostPerPiecePaise,
  formatPaiseAsRupee,
  sumBomCostPaise,
} from '@/lib/packagingCost';
import { isPricingMetaVariant } from '@/lib/productPricingMeta';
import { buildCategorySelectOptions } from '@/lib/categoryTree';

const TABS = [
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'profiles', label: 'Profiles', icon: Layers },
  { id: 'assign', label: 'Variant mapping', icon: Boxes },
  { id: 'costs', label: 'Landed costs', icon: Calculator },
];

const EMPTY_MATERIAL = {
  id: null,
  name: '',
  material_type: 'kraft_pouch',
  size_label: '',
  capacity_ml: '',
  capacity_g: '',
  purchase_quantity: '100',
  total_purchase_cost_rs: '',
  supplier_name: '',
  stock_quantity: '0',
  wastage_pct: '2',
  notes: '',
  is_active: true,
};

const EMPTY_PROFILE = {
  id: null,
  name: '',
  profile_family: 'kraft_pouch',
  size_label: '',
  pack_kg: '',
  packing_labour_rs: '1',
  inward_transport_rs: '0',
  packaging_scope: 'primary',
  notes: '',
  is_active: true,
  components: [],
};

function materialToForm(m) {
  return {
    id: m.id,
    name: m.name || '',
    material_type: m.material_type || 'other',
    size_label: m.size_label || '',
    capacity_ml: m.capacity_ml != null ? String(m.capacity_ml) : '',
    capacity_g: m.capacity_g != null ? String(m.capacity_g) : '',
    purchase_quantity: String(m.purchase_quantity ?? 1),
    total_purchase_cost_rs: m.total_purchase_cost_paise != null
      ? String((m.total_purchase_cost_paise / 100).toFixed(2))
      : '',
    supplier_name: m.supplier_name || '',
    stock_quantity: String(m.stock_quantity ?? 0),
    wastage_pct: String(m.wastage_pct ?? 0),
    notes: m.notes || '',
    is_active: m.is_active !== false,
  };
}

function materialFormToPayload(form) {
  const totalPaise = Math.round(Number(form.total_purchase_cost_rs || 0) * 100);
  const purchaseQty = Number(form.purchase_quantity);
  const wastage = Number(form.wastage_pct) || 0;
  return {
    id: form.id || undefined,
    name: form.name.trim(),
    material_type: form.material_type,
    size_label: form.size_label.trim() || null,
    capacity_ml: form.capacity_ml === '' ? null : Number(form.capacity_ml),
    capacity_g: form.capacity_g === '' ? null : Number(form.capacity_g),
    purchase_quantity: purchaseQty,
    total_purchase_cost_paise: totalPaise,
    cost_per_piece_paise: calcMaterialCostPerPiecePaise({
      purchase_quantity: purchaseQty,
      total_purchase_cost_paise: totalPaise,
      wastage_pct: wastage,
    }),
    supplier_name: form.supplier_name.trim() || null,
    stock_quantity: Number(form.stock_quantity) || 0,
    wastage_pct: wastage,
    notes: form.notes.trim() || null,
    is_active: form.is_active,
  };
}

function profileToForm(p) {
  const components = (p.packaging_profile_components || []).map((c) => ({
    material_id: c.material_id,
    quantity: String(c.quantity ?? 1),
    component_role: c.component_role || 'other',
  }));
  return {
    id: p.id,
    name: p.name || '',
    profile_family: p.profile_family || 'other',
    size_label: p.size_label || '',
    pack_kg: p.pack_kg != null ? String(p.pack_kg) : '',
    packing_labour_rs: String(((p.packing_labour_paise || 0) / 100).toFixed(2)),
    inward_transport_rs: String(((p.inward_transport_paise || 0) / 100).toFixed(2)),
    packaging_scope: p.packaging_scope || 'primary',
    notes: p.notes || '',
    is_active: p.is_active !== false,
    components,
  };
}

function profileFormToPayload(form) {
  return {
    id: form.id || undefined,
    name: form.name.trim(),
    profile_family: form.profile_family,
    size_label: form.size_label.trim() || null,
    pack_kg: form.pack_kg === '' ? null : Number(form.pack_kg),
    packing_labour_paise: Math.round(Number(form.packing_labour_rs || 0) * 100),
    inward_transport_paise: Math.round(Number(form.inward_transport_rs || 0) * 100),
    packaging_scope: form.packaging_scope,
    notes: form.notes.trim() || null,
    is_active: form.is_active,
    components: (form.components || [])
      .filter((c) => c.material_id)
      .map((c, idx) => ({
        material_id: c.material_id,
        quantity: Number(c.quantity) || 1,
        component_role: c.component_role || 'other',
        sort_order: idx,
      })),
  };
}

function parseSellableVariants(product) {
  const raw = product?.quick_variants ?? product?.variants ?? [];
  const list = Array.isArray(raw) ? raw : [];
  return list.filter((v) => v && typeof v === 'object' && !isPricingMetaVariant(v));
}

export default function AdminPackaging() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('materials');
  const [materialForm, setMaterialForm] = useState(EMPTY_MATERIAL);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [materialDrawer, setMaterialDrawer] = useState(false);
  const [profileDrawer, setProfileDrawer] = useState(false);
  const [error, setError] = useState('');
  const [bulk, setBulk] = useState({
    category_id: '',
    pack_kg: '0.5',
    size_label: '',
    profile_id: '',
  });
  const [assignForm, setAssignForm] = useState({
    product_id: '',
    variant_sku: '',
    variant_label: '',
    pack_kg: '',
    profile_id: '',
  });
  const [costProductIds, setCostProductIds] = useState([]);

  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['admin-packaging-materials'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listPackagingMaterials', {});
      return res.data?.materials || [];
    },
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-packaging-profiles'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listPackagingProfiles', {});
      return res.data?.profiles || [];
    },
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['admin-variant-packaging'],
    queryFn: async () => {
      const res = await appClient.functions.invoke('listVariantPackaging', {});
      return res.data?.mappings || [];
    },
  });

  const { data: productList = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productsApi.list('name', 500),
  });

  const { data: categoryList = [] } = useQuery({
    queryKey: ['categories-all'],
    queryFn: () => categoriesApi.listActive(100),
  });

  const categoryOptions = useMemo(
    () => buildCategorySelectOptions(categoryList, productList),
    [categoryList, productList],
  );

  const materialsById = useMemo(
    () => Object.fromEntries(materials.map((m) => [m.id, m])),
    [materials],
  );

  const primaryProfiles = useMemo(
    () => profiles.filter((p) => p.packaging_scope !== 'fulfiliment' && p.is_active !== false),
    [profiles],
  );
  const fulfilmentProfiles = useMemo(
    () => profiles.filter((p) => p.packaging_scope === 'fulfiliment' && p.is_active !== false),
    [profiles],
  );

  const { data: landedData, isFetching: landedLoading, refetch: refetchLanded } = useQuery({
    queryKey: ['admin-landed-costs', costProductIds],
    enabled: costProductIds.length > 0,
    queryFn: async () => {
      const res = await appClient.functions.invoke('resolveLandedCosts', {
        product_ids: costProductIds,
      });
      return res.data;
    },
  });

  const saveMaterial = useMutation({
    mutationFn: async (payload) => {
      const res = await appClient.functions.invoke('upsertPackagingMaterial', payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-packaging-materials']);
      qc.invalidateQueries(['admin-packaging-profiles']);
      qc.invalidateQueries(['admin-landed-costs']);
      setMaterialDrawer(false);
      setMaterialForm(EMPTY_MATERIAL);
      setError('');
    },
    onError: (err) => setError(err?.message || 'Save failed'),
  });

  const saveProfile = useMutation({
    mutationFn: async (payload) => {
      const res = await appClient.functions.invoke('upsertPackagingProfile', payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-packaging-profiles']);
      qc.invalidateQueries(['admin-landed-costs']);
      setProfileDrawer(false);
      setProfileForm(EMPTY_PROFILE);
      setError('');
    },
    onError: (err) => setError(err?.message || 'Save failed'),
  });

  const saveMapping = useMutation({
    mutationFn: async (payload) => {
      const res = await appClient.functions.invoke('setVariantPackaging', payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-variant-packaging']);
      qc.invalidateQueries(['admin-landed-costs']);
      setError('');
      setAssignForm({ product_id: '', variant_sku: '', variant_label: '', pack_kg: '', profile_id: '' });
    },
    onError: (err) => setError(err?.message || 'Assign failed'),
  });

  const bulkAssign = useMutation({
    mutationFn: async (payload) => {
      const res = await appClient.functions.invoke('bulkAssignPackagingProfiles', payload);
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries(['admin-variant-packaging']);
      qc.invalidateQueries(['admin-landed-costs']);
      alert(`Assigned packaging to ${data?.variants_assigned || 0} variants across ${data?.products_scanned || 0} products.`);
    },
    onError: (err) => setError(err?.message || 'Bulk assign failed'),
  });

  const previewCostPerPiece = useMemo(() => {
    const payload = materialFormToPayload(materialForm);
    return calcMaterialCostPerPiecePaise(payload);
  }, [materialForm]);

  const selectedProductVariants = useMemo(() => {
    const product = productList.find((p) => p.id === assignForm.product_id);
    return product ? parseSellableVariants(product) : [];
  }, [productList, assignForm.product_id]);

  const profileCostPreview = (profile) => {
    const comps = profile.packaging_profile_components || [];
    const { packaging_cost_paise } = sumBomCostPaise(
      comps.map((c) => ({
        material_id: c.material_id,
        quantity: c.quantity,
        component_role: c.component_role,
        material: c.packaging_materials,
      })),
      materialsById,
    );
    return packaging_cost_paise + (profile.packing_labour_paise || 0) + (profile.inward_transport_paise || 0);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-24">
      <AdminPageHeader
        title="Packaging costs"
        description="Reusable materials and profiles — assign once, landed cost updates when purchase prices change."
      />
      <AdminCatalogueTabs />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-inter text-sm transition-colors ${
              tab === id
                ? 'bg-wet-earth text-white'
                : 'border border-border bg-white text-rain-cloud/70 hover:bg-muted/30'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
        <Link
          to="/admin/pricing"
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-inter text-sm text-forest-canopy hover:bg-forest-canopy/5"
        >
          <Calculator className="h-4 w-4" />
          Pricing strategy
        </Link>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-inter text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {tab === 'materials' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-inter text-sm text-rain-cloud/55">
              Central material master. Cost/piece = (total purchase ÷ qty) × (1 + wastage%).
            </p>
            <button
              type="button"
              onClick={() => {
                setMaterialForm(EMPTY_MATERIAL);
                setMaterialDrawer(true);
              }}
              className="inline-flex items-center gap-2 rounded-full bg-forest-canopy px-4 py-2 font-inter text-sm text-white"
            >
              <Plus className="h-4 w-4" />
              Add material
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/20 bg-white">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border/40 text-left font-inter text-[11px] uppercase tracking-wider text-rain-cloud/45">
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Type / size</th>
                  <th className="px-4 py-3 text-right">Purchase</th>
                  <th className="px-4 py-3 text-right">₹/pc</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {materialsLoading ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-rain-cloud/40">Loading…</td></tr>
                ) : !materials.length ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-rain-cloud/40">No materials yet.</td></tr>
                ) : materials.map((m) => (
                  <tr key={m.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-inter text-sm font-medium text-rain-cloud">{m.name}</p>
                      {m.wastage_pct ? (
                        <p className="font-inter text-[10px] text-rain-cloud/40">Wastage {m.wastage_pct}%</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-inter text-xs text-rain-cloud/60">
                      {MATERIAL_TYPES.find((t) => t.id === m.material_type)?.label || m.material_type}
                      {m.size_label ? ` · ${m.size_label}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right font-inter text-xs tabular-nums">
                      {m.purchase_quantity} @ {formatPaiseAsRupee(m.total_purchase_cost_paise)}
                    </td>
                    <td className="px-4 py-3 text-right font-inter text-sm font-medium tabular-nums text-forest-canopy">
                      {formatPaiseAsRupee(calcMaterialCostPerPiecePaise(m))}
                    </td>
                    <td className="px-4 py-3 font-inter text-xs text-rain-cloud/55">{m.supplier_name || '—'}</td>
                    <td className="px-4 py-3 text-right font-inter text-xs tabular-nums">{m.stock_quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setMaterialForm(materialToForm(m));
                          setMaterialDrawer(true);
                        }}
                        className="rounded-lg px-2 py-1 font-inter text-xs text-wet-earth hover:bg-wet-earth/10"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'profiles' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-inter text-sm text-rain-cloud/55">
              Profiles are reusable BOM kits (container + lid + seal + stickers…). Primary = product pack; Fulfilment = order outer pack.
            </p>
            <button
              type="button"
              onClick={() => {
                setProfileForm(EMPTY_PROFILE);
                setProfileDrawer(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-forest-canopy px-4 py-2 font-inter text-sm text-white"
            >
              <Plus className="h-4 w-4" />
              Add profile
            </button>
          </div>

          {[['Primary product packaging', primaryProfiles], ['Order fulfilment packaging', fulfilmentProfiles]].map(([title, list]) => (
            <div key={title}>
              <h3 className="mb-2 font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/45">{title}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {profilesLoading ? (
                  <p className="font-inter text-sm text-rain-cloud/40">Loading…</p>
                ) : !list.length ? (
                  <p className="font-inter text-sm text-rain-cloud/40">None yet.</p>
                ) : list.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProfileForm(profileToForm(p));
                      setProfileDrawer(true);
                    }}
                    className="rounded-2xl border border-border/20 bg-white p-4 text-left hover:border-forest-canopy/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-inter text-sm font-semibold text-rain-cloud">{p.name}</p>
                        <p className="mt-0.5 font-inter text-[11px] text-rain-cloud/45">
                          {PROFILE_FAMILIES.find((f) => f.id === p.profile_family)?.label}
                          {p.size_label ? ` · ${p.size_label}` : ''}
                          {p.pack_kg != null ? ` · ${p.pack_kg} kg` : ''}
                        </p>
                      </div>
                      <span className="font-inter text-sm font-medium text-forest-canopy">
                        {formatPaiseAsRupee(profileCostPreview(p))}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1">
                      {(p.packaging_profile_components || []).slice(0, 5).map((c) => (
                        <li key={c.id} className="font-inter text-[11px] text-rain-cloud/55">
                          {c.quantity}× {c.packaging_materials?.name || 'Material'} · {COMPONENT_ROLES.find((r) => r.id === c.component_role)?.label || c.component_role}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'assign' && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-border/20 bg-white p-5 space-y-4">
            <h3 className="font-cormorant text-xl text-rain-cloud">Assign profile to one variant</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Product</span>
                <select
                  value={assignForm.product_id}
                  onChange={(e) => setAssignForm((prev) => ({
                    ...prev,
                    product_id: e.target.value,
                    variant_sku: '',
                    variant_label: '',
                    pack_kg: '',
                  }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                >
                  <option value="">Select product…</option>
                  {productList.map((p) => (
                    <option key={p.id} value={p.id}>{p.title || p.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Variant</span>
                <select
                  value={assignForm.variant_sku || assignForm.variant_label}
                  onChange={(e) => {
                    const v = selectedProductVariants.find(
                      (x) => (x.sku || x.label) === e.target.value,
                    );
                    setAssignForm((prev) => ({
                      ...prev,
                      variant_sku: v?.sku || '',
                      variant_label: v?.label || '',
                      pack_kg: v?.pack_kg != null ? String(v.pack_kg) : '',
                    }));
                  }}
                  className="w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                  disabled={!assignForm.product_id}
                >
                  <option value="">Select variant…</option>
                  {selectedProductVariants.map((v) => (
                    <option key={v.sku || v.label} value={v.sku || v.label}>
                      {v.label || v.sku}{v.pack_kg != null ? ` (${v.pack_kg} kg)` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Packaging profile</span>
                <select
                  value={assignForm.profile_id}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, profile_id: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                >
                  <option value="">Select profile…</option>
                  {primaryProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.size_label ? ` · ${p.size_label}` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              disabled={!assignForm.product_id || !assignForm.profile_id || saveMapping.isPending}
              onClick={() => saveMapping.mutate({
                product_id: assignForm.product_id,
                variant_sku: assignForm.variant_sku || null,
                variant_label: assignForm.variant_label || null,
                pack_kg: assignForm.pack_kg === '' ? null : Number(assignForm.pack_kg),
                profile_id: assignForm.profile_id,
              })}
              className="inline-flex items-center gap-2 rounded-full bg-wet-earth px-5 py-2.5 font-inter text-sm text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save mapping
            </button>
          </div>

          <div className="rounded-2xl border border-border/20 bg-white p-5 space-y-4">
            <h3 className="font-cormorant text-xl text-rain-cloud">Bulk assign by category + size</h3>
            <p className="font-inter text-xs text-rain-cloud/50">
              Applies one profile to matching variants — does not copy costs onto products.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Category</span>
                <select
                  value={bulk.category_id}
                  onChange={(e) => setBulk((prev) => ({ ...prev, category_id: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                >
                  <option value="">Select category…</option>
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Profile</span>
                <select
                  value={bulk.profile_id}
                  onChange={(e) => setBulk((prev) => ({ ...prev, profile_id: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                >
                  <option value="">Select profile…</option>
                  {primaryProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Match pack size (kg / L / pcs)</span>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={bulk.pack_kg}
                  onChange={(e) => setBulk((prev) => ({ ...prev, pack_kg: e.target.value, size_label: '' }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                  placeholder="0.5"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">Or match size label</span>
                <input
                  type="text"
                  value={bulk.size_label}
                  onChange={(e) => setBulk((prev) => ({ ...prev, size_label: e.target.value, pack_kg: '' }))}
                  className="w-full rounded-xl border border-border px-3 py-2.5 font-inter text-sm"
                  placeholder="500g"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!bulk.category_id || !bulk.profile_id || bulkAssign.isPending}
              onClick={() => {
                if (!window.confirm('Assign this packaging profile to all matching variants in the category?')) return;
                bulkAssign.mutate({
                  category_id: bulk.category_id,
                  profile_id: bulk.profile_id,
                  pack_kg: bulk.pack_kg === '' ? null : Number(bulk.pack_kg),
                  size_label: bulk.size_label.trim() || null,
                });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-forest-canopy px-5 py-2.5 font-inter text-sm text-white disabled:opacity-50"
            >
              Bulk assign
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/20 bg-white">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border/40 text-left font-inter text-[11px] uppercase tracking-wider text-rain-cloud/45">
                  <th className="px-4 py-3">Product / variant</th>
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Pack</th>
                </tr>
              </thead>
              <tbody>
                {!mappings.length ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-rain-cloud/40">No variant mappings yet.</td></tr>
                ) : mappings.slice(0, 100).map((m) => {
                  const product = productList.find((p) => p.id === m.product_id);
                  return (
                    <tr key={m.id} className="border-b border-border/30">
                      <td className="px-4 py-3 font-inter text-sm">
                        {product?.title || product?.name || m.product_id?.slice(0, 8)}
                        <span className="text-rain-cloud/45"> · {m.variant_label || m.variant_sku || '—'}</span>
                      </td>
                      <td className="px-4 py-3 font-inter text-xs text-rain-cloud/60">
                        {m.packaging_profiles?.name || '—'}
                      </td>
                      <td className="px-4 py-3 font-inter text-xs tabular-nums">{m.pack_kg ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'costs' && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border/20 bg-white p-5 space-y-3">
            <h3 className="font-cormorant text-xl text-rain-cloud">Landed cost sheet</h3>
            <p className="font-inter text-xs text-rain-cloud/50">
              Content + packaging + packing labour + wastage + inward transport. Suggested price from current variant sell price.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const ids = productList.slice(0, 40).map((p) => p.id);
                  setCostProductIds(ids);
                  setTimeout(() => refetchLanded(), 0);
                }}
                className="rounded-full bg-wet-earth px-4 py-2 font-inter text-sm text-white"
              >
                Load first 40 products
              </button>
              <button
                type="button"
                onClick={() => {
                  const mapped = [...new Set(mappings.map((m) => m.product_id))];
                  setCostProductIds(mapped.slice(0, 80));
                }}
                className="rounded-full border border-border px-4 py-2 font-inter text-sm text-rain-cloud"
              >
                Load mapped products
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/20 bg-white">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-border/40 text-left font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">
                  <th className="px-3 py-3">Variant</th>
                  <th className="px-3 py-3">Profile</th>
                  <th className="px-3 py-3 text-right">Product</th>
                  <th className="px-3 py-3 text-right">Packaging</th>
                  <th className="px-3 py-3 text-right">Packing</th>
                  <th className="px-3 py-3 text-right">Landed</th>
                  <th className="px-3 py-3 text-right">Suggested</th>
                  <th className="px-3 py-3 text-right">Contribution</th>
                  <th className="px-3 py-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {landedLoading ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-rain-cloud/40">Calculating…</td></tr>
                ) : !(landedData?.variants || []).length ? (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-rain-cloud/40">Load products to see landed costs.</td></tr>
                ) : (landedData.variants || []).map((row) => (
                  <tr key={`${row.product_id}-${row.variant_sku || row.variant_label}`} className="border-b border-border/30">
                    <td className="px-3 py-2.5">
                      <p className="font-inter text-xs font-medium text-rain-cloud line-clamp-1">{row.product_name}</p>
                      <p className="font-inter text-[10px] text-rain-cloud/45">{row.variant_label || row.variant_sku}</p>
                    </td>
                    <td className="px-3 py-2.5 font-inter text-[11px] text-rain-cloud/55">{row.profile_name || '—'}</td>
                    <td className="px-3 py-2.5 text-right font-inter text-xs tabular-nums">{formatPaiseAsRupee(row.content_cost_paise)}</td>
                    <td className="px-3 py-2.5 text-right font-inter text-xs tabular-nums">{formatPaiseAsRupee(row.packaging_cost_paise)}</td>
                    <td className="px-3 py-2.5 text-right font-inter text-xs tabular-nums">{formatPaiseAsRupee(row.packing_labour_paise)}</td>
                    <td className="px-3 py-2.5 text-right font-inter text-xs font-semibold tabular-nums">{formatPaiseAsRupee(row.landed_cost_paise)}</td>
                    <td className="px-3 py-2.5 text-right font-inter text-xs tabular-nums">{formatPaiseAsRupee(row.suggested_price_paise)}</td>
                    <td className="px-3 py-2.5 text-right font-inter text-xs tabular-nums">{formatPaiseAsRupee(row.gross_contribution_paise)}</td>
                    <td className="px-3 py-2.5 text-right font-inter text-xs tabular-nums">
                      {row.gross_margin_pct != null ? `${row.gross_margin_pct}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Material drawer */}
      {materialDrawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-cormorant text-2xl text-rain-cloud">{materialForm.id ? 'Edit material' : 'New material'}</h2>
              <button type="button" onClick={() => setMaterialDrawer(false)} className="rounded-lg p-2 hover:bg-muted/40">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Name">
                <input value={materialForm.name} onChange={(e) => setMaterialForm((p) => ({ ...p, name: e.target.value }))} className="field" />
              </Field>
              <Field label="Type">
                <select value={materialForm.material_type} onChange={(e) => setMaterialForm((p) => ({ ...p, material_type: e.target.value }))} className="field">
                  {MATERIAL_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Size / capacity label">
                <input value={materialForm.size_label} onChange={(e) => setMaterialForm((p) => ({ ...p, size_label: e.target.value }))} className="field" placeholder="500g / 1L" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Purchase qty">
                  <input type="number" min="0.001" step="1" value={materialForm.purchase_quantity} onChange={(e) => setMaterialForm((p) => ({ ...p, purchase_quantity: e.target.value }))} className="field" />
                </Field>
                <Field label="Total purchase ₹">
                  <input type="number" min="0" step="0.01" value={materialForm.total_purchase_cost_rs} onChange={(e) => setMaterialForm((p) => ({ ...p, total_purchase_cost_rs: e.target.value }))} className="field" />
                </Field>
              </div>
              <p className="font-inter text-xs text-forest-canopy">
                Cost per piece: <strong>{formatPaiseAsRupee(previewCostPerPiece)}</strong>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Wastage %">
                  <input type="number" min="0" max="100" step="0.1" value={materialForm.wastage_pct} onChange={(e) => setMaterialForm((p) => ({ ...p, wastage_pct: e.target.value }))} className="field" />
                </Field>
                <Field label="Stock">
                  <input type="number" min="0" step="1" value={materialForm.stock_quantity} onChange={(e) => setMaterialForm((p) => ({ ...p, stock_quantity: e.target.value }))} className="field" />
                </Field>
              </div>
              <Field label="Supplier">
                <input value={materialForm.supplier_name} onChange={(e) => setMaterialForm((p) => ({ ...p, supplier_name: e.target.value }))} className="field" />
              </Field>
              <Field label="Notes">
                <textarea value={materialForm.notes} onChange={(e) => setMaterialForm((p) => ({ ...p, notes: e.target.value }))} className="field min-h-[72px]" />
              </Field>
              <button
                type="button"
                disabled={saveMaterial.isPending || !materialForm.name.trim()}
                onClick={() => saveMaterial.mutate(materialFormToPayload(materialForm))}
                className="w-full rounded-full bg-forest-canopy py-3 font-inter text-sm text-white disabled:opacity-50"
              >
                {saveMaterial.isPending ? 'Saving…' : 'Save material'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Profile drawer */}
      {profileDrawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-cormorant text-2xl text-rain-cloud">{profileForm.id ? 'Edit profile' : 'New profile'}</h2>
              <button type="button" onClick={() => setProfileDrawer(false)} className="rounded-lg p-2 hover:bg-muted/40">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Name">
                <input value={profileForm.name} onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))} className="field" placeholder="Kraft pouch 500g kit" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Family">
                  <select value={profileForm.profile_family} onChange={(e) => setProfileForm((p) => ({ ...p, profile_family: e.target.value }))} className="field">
                    {PROFILE_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </Field>
                <Field label="Scope">
                  <select value={profileForm.packaging_scope} onChange={(e) => setProfileForm((p) => ({ ...p, packaging_scope: e.target.value }))} className="field">
                    <option value="primary">Primary (product)</option>
                    <option value="fulfiliment">Fulfilment (order)</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Size label">
                  <input value={profileForm.size_label} onChange={(e) => setProfileForm((p) => ({ ...p, size_label: e.target.value }))} className="field" />
                </Field>
                <Field label="Pack kg">
                  <input type="number" step="0.001" min="0" value={profileForm.pack_kg} onChange={(e) => setProfileForm((p) => ({ ...p, pack_kg: e.target.value }))} className="field" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Packing labour ₹">
                  <input type="number" min="0" step="0.01" value={profileForm.packing_labour_rs} onChange={(e) => setProfileForm((p) => ({ ...p, packing_labour_rs: e.target.value }))} className="field" />
                </Field>
                <Field label="Inward transport ₹">
                  <input type="number" min="0" step="0.01" value={profileForm.inward_transport_rs} onChange={(e) => setProfileForm((p) => ({ ...p, inward_transport_rs: e.target.value }))} className="field" />
                </Field>
              </div>

              <div className="rounded-xl border border-border/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-inter text-xs font-medium uppercase tracking-wider text-rain-cloud/45">Components</p>
                  <button
                    type="button"
                    onClick={() => setProfileForm((p) => ({
                      ...p,
                      components: [...p.components, { material_id: '', quantity: '1', component_role: 'other' }],
                    }))}
                    className="inline-flex items-center gap-1 font-inter text-xs text-forest-canopy"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>
                {profileForm.components.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_4.5rem_7rem_2rem] gap-1.5 items-center">
                    <select
                      value={c.material_id}
                      onChange={(e) => setProfileForm((p) => {
                        const next = [...p.components];
                        next[idx] = { ...next[idx], material_id: e.target.value };
                        return { ...p, components: next };
                      })}
                      className="field text-xs py-1.5"
                    >
                      <option value="">Material…</option>
                      {materials.filter((m) => m.is_active !== false).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0.001"
                      step="1"
                      value={c.quantity}
                      onChange={(e) => setProfileForm((p) => {
                        const next = [...p.components];
                        next[idx] = { ...next[idx], quantity: e.target.value };
                        return { ...p, components: next };
                      })}
                      className="field text-xs py-1.5 text-right"
                    />
                    <select
                      value={c.component_role}
                      onChange={(e) => setProfileForm((p) => {
                        const next = [...p.components];
                        next[idx] = { ...next[idx], component_role: e.target.value };
                        return { ...p, components: next };
                      })}
                      className="field text-xs py-1.5"
                    >
                      {COMPONENT_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setProfileForm((p) => ({
                        ...p,
                        components: p.components.filter((_, i) => i !== idx),
                      }))}
                      className="rounded p-1 text-rain-cloud/35 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={saveProfile.isPending || !profileForm.name.trim()}
                onClick={() => saveProfile.mutate(profileFormToPayload(profileForm))}
                className="w-full rounded-full bg-forest-canopy py-3 font-inter text-sm text-white disabled:opacity-50"
              >
                {saveProfile.isPending ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid hsl(var(--border));
          padding: 0.625rem 0.75rem;
          font-family: Inter, sans-serif;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-inter text-[10px] uppercase tracking-wider text-rain-cloud/45">{label}</span>
      {children}
    </label>
  );
}
