import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Copy,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { appClient } from '@/api/appClient';
import LabelTemplateCanvasEditor from '@/components/admin/LabelTemplateCanvasEditor';
import { toast } from '@/components/ui/use-toast';
import {
  ALIGN_OPTIONS,
  ANCHOR_OPTIONS,
  BASELINE_OPTIONS,
  ELEMENT_TYPE_OPTIONS,
  FONT_FAMILY_OPTIONS,
  LABEL_FIELD_CATALOG,
  QR_FIELD_OPTIONS,
  BARCODE_FIELD_OPTIONS,
} from '@/lib/labelTemplate/constants';
import { createBlankTemplate, createDefaultGroceryTemplate } from '@/lib/labelTemplate/defaultTemplates';
import { buildSampleFieldValues } from '@/lib/labelTemplate/resolveLabelFieldValues';
import { clearLabelTemplateImageCache } from '@/lib/labelTemplate/renderLabelTemplate';
import {
  getActiveLabelTemplateId,
  getLabelTemplatesFromSettings,
  saveLabelTemplates,
} from '@/lib/labelTemplate/templateStorage';
import {
  fetchAllAppSettings,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

function cloneTemplate(template) {
  return JSON.parse(JSON.stringify(template));
}

function newElementId() {
  return `el-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createElement(type = 'field') {
  const base = {
    id: newElementId(),
    type,
    visible: true,
    xMm: 2.5,
    yMm: 2.5,
    anchor: 'left',
    baseline: 'top',
    align: 'left',
    color: '#000000',
  };
  if (type === 'field') {
    return {
      ...base,
      fieldKey: 'productTitle',
      fontFamily: 'mixed',
      fontSizeMm: 3,
      minFontSizeMm: 2.2,
      fontWeight: 700,
      maxWidthMm: 45,
    };
  }
  if (type === 'text') {
    return {
      ...base,
      text: 'Static text',
      fontFamily: 'arial',
      fontSizeMm: 2.2,
      fontWeight: 400,
      maxWidthMm: 40,
    };
  }
  if (type === 'line') {
    return {
      ...base,
      widthMm: 45,
      strokeMm: 0.14,
    };
  }
  if (type === 'qr') {
    return {
      ...base,
      fieldKey: 'posScanCode',
      sizeMm: 10,
      margin: 0,
      errorCorrection: 'M',
    };
  }
  if (type === 'barcode') {
    return {
      ...base,
      fieldKey: 'productBarcode',
      widthMm: 40,
      heightMm: 8,
      showValue: true,
    };
  }
  if (type === 'image') {
    return {
      ...base,
      assetKey: 'fssaiLogo',
      heightMm: 2,
    };
  }
  return base;
}

function NumberField({ label, value, onChange, step = 0.1, min, max }) {
  return (
    <label className="block">
      <span className="font-inter text-[11px] text-rain-cloud/55">{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="font-inter text-[11px] text-rain-cloud/55">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LabelTemplateBuilder({ onTemplateSaved }) {
  const queryClient = useQueryClient();
  const [templates, setTemplates] = useState([]);
  const [activeTemplateId, setActiveTemplateId] = useState('');
  const [selectedElementId, setSelectedElementId] = useState('');
  const [showSafeMarginGuide, setShowSafeMarginGuide] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.all,
    queryFn: fetchAllAppSettings,
  });

  useEffect(() => {
    const loaded = getLabelTemplatesFromSettings(settings);
    setTemplates(loaded);
    setActiveTemplateId(getActiveLabelTemplateId(settings));
  }, [settings]);

  const activeTemplate = useMemo(
    () => templates.find((tpl) => tpl.id === activeTemplateId) || templates[0] || createDefaultGroceryTemplate(),
    [templates, activeTemplateId]
  );

  const selectedElement = useMemo(
    () => activeTemplate?.elements?.find((el) => el.id === selectedElementId) || null,
    [activeTemplate, selectedElementId]
  );

  const sampleValues = useMemo(
    () => buildSampleFieldValues(activeTemplate),
    [activeTemplate]
  );

  const updateActiveTemplate = (updater) => {
    setTemplates((prev) =>
      prev.map((tpl) => (tpl.id === activeTemplate.id ? updater(cloneTemplate(tpl)) : tpl))
    );
  };

  const updateElement = (elementId, patch) => {
    updateActiveTemplate((tpl) => {
      tpl.elements = tpl.elements.map((el) =>
        el.id === elementId ? { ...el, ...patch } : el
      );
      return tpl;
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => saveLabelTemplates(settings, templates, activeTemplateId),
    onSuccess: async () => {
      clearLabelTemplateImageCache();
      await queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'settings',
      });
      toast({ title: 'Templates saved', description: 'Print panel will use the active template.' });
      onTemplateSaved?.(activeTemplateId);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save templates',
        description: error?.message || 'Please try again.',
      });
    },
  });

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const result = await appClient.integrations.Core.UploadFile({ file });
      const url = result?.file_url;
      if (!url) throw new Error('Upload did not return a URL');
      updateActiveTemplate((tpl) => {
        tpl.assets = { ...(tpl.assets || {}), fssaiLogoUrl: url };
        return tpl;
      });
      clearLabelTemplateImageCache();
      toast({ title: 'FSSAI logo updated' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logo upload failed',
        description: error?.message || 'Could not upload image.',
      });
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-rain-cloud/45">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-inter text-sm font-semibold text-rain-cloud">Label template builder</h2>
          <p className="mt-1 font-inter text-xs text-rain-cloud/45">
            Drag elements on canvas · {activeTemplate.widthMm} × {activeTemplate.heightMm} mm
          </p>
        </div>
        <button
          type="button"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-full bg-forest-canopy px-4 py-2 font-inter text-sm text-white hover:bg-forest-canopy/90 disabled:opacity-60"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save templates
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <section className="space-y-4 rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-inter text-xs font-semibold uppercase tracking-[0.14em] text-rain-cloud/55">Templates</h3>
            <button
              type="button"
              onClick={() => {
                const next = createBlankTemplate(`Template ${templates.length + 1}`);
                setTemplates((prev) => [...prev, next]);
                setActiveTemplateId(next.id);
                setSelectedElementId('');
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-inter text-[11px] text-rain-cloud/70 hover:bg-rain-mist"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>

          <div className="space-y-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setActiveTemplateId(tpl.id);
                  setSelectedElementId('');
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                  tpl.id === activeTemplateId
                    ? 'border-forest-canopy/50 bg-rain-mist/70'
                    : 'border-border/60 hover:bg-rain-mist/30'
                }`}
              >
                <p className="font-inter text-sm font-medium text-rain-cloud">{tpl.name}</p>
                <p className="font-inter text-[11px] text-rain-cloud/45">
                  {tpl.widthMm}×{tpl.heightMm} mm · {(tpl.elements || []).length} elements
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => {
                const copy = cloneTemplate(activeTemplate);
                copy.id = `tpl-${Date.now().toString(36)}`;
                copy.name = `${activeTemplate.name} copy`;
                setTemplates((prev) => [...prev, copy]);
                setActiveTemplateId(copy.id);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 font-inter text-[11px] text-rain-cloud/70 hover:bg-rain-mist"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                const defaults = createDefaultGroceryTemplate();
                updateActiveTemplate((tpl) => ({
                  ...defaults,
                  id: tpl.id,
                  name: tpl.name,
                }));
                toast({ title: 'Reset to Yasvik default layout' });
              }}
              className="rounded-full border border-border px-3 py-1.5 font-inter text-[11px] text-rain-cloud/70 hover:bg-rain-mist"
            >
              Reset default
            </button>
          </div>

          <div className="space-y-2 border-t border-border/50 pt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-inter text-xs font-semibold uppercase tracking-[0.14em] text-rain-cloud/55">Elements</h3>
              <select
                defaultValue=""
                onChange={(e) => {
                  const type = e.target.value;
                  if (!type) return;
                  const element = createElement(type);
                  updateActiveTemplate((tpl) => {
                    tpl.elements = [...(tpl.elements || []), element];
                    return tpl;
                  });
                  setSelectedElementId(element.id);
                  e.target.value = '';
                }}
                className="rounded-lg border border-border px-2 py-1 font-inter text-[11px] text-rain-cloud"
              >
                <option value="">+ Add…</option>
                {ELEMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="max-h-[320px] space-y-1.5 overflow-y-auto">
              {(activeTemplate.elements || []).map((element, index) => (
                <button
                  key={element.id}
                  type="button"
                  onClick={() => setSelectedElementId(element.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left ${
                    selectedElementId === element.id
                      ? 'border-forest-canopy/50 bg-rain-mist/70'
                      : 'border-border/50 hover:bg-rain-mist/30'
                  }`}
                >
                  <span className="font-inter text-xs text-rain-cloud">
                    {index + 1}. {element.type}
                    {element.fieldKey ? ` · ${element.fieldKey}` : ''}
                    {element.type === 'qr' ? ` · ${element.fieldKey || 'posScanCode'}` : ''}
                    {element.type === 'barcode' ? ` · ${element.fieldKey || 'productBarcode'}` : ''}
                    {element.text ? ` · ${element.text.slice(0, 18)}` : ''}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${element.visible === false ? 'bg-rain-cloud/20' : 'bg-forest-canopy'}`} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <input
                type="text"
                value={activeTemplate.name}
                onChange={(e) =>
                  updateActiveTemplate((tpl) => {
                    tpl.name = e.target.value;
                    return tpl;
                  })
                }
                className="w-full rounded-lg border border-border px-3 py-2 font-inter text-sm font-medium text-rain-cloud focus:border-forest-canopy focus:outline-none"
              />
              <p className="mt-1 font-inter text-xs text-rain-cloud/45">
                {activeTemplate.widthMm} × {activeTemplate.heightMm} mm preview
              </p>
            </div>
            <label className="inline-flex items-center gap-2 font-inter text-xs text-rain-cloud/65">
              <input
                type="checkbox"
                checked={showSafeMarginGuide}
                onChange={(e) => setShowSafeMarginGuide(e.target.checked)}
              />
              Show safe margin
            </label>
          </div>

          <div className="flex justify-center rounded-xl border border-border/50 bg-white p-4">
            <LabelTemplateCanvasEditor
              template={activeTemplate}
              fieldValues={sampleValues}
              selectedElementId={selectedElementId}
              onSelectElement={setSelectedElementId}
              onUpdateElement={updateElement}
              showSafeMarginGuide={showSafeMarginGuide}
              displayWidthPx={480}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <NumberField
              label="Label width (mm)"
              value={activeTemplate.widthMm}
              onChange={(v) => updateActiveTemplate((tpl) => { tpl.widthMm = v; return tpl; })}
            />
            <NumberField
              label="Label height (mm)"
              value={activeTemplate.heightMm}
              onChange={(v) => updateActiveTemplate((tpl) => { tpl.heightMm = v; return tpl; })}
            />
            <NumberField
              label="Safe margin (mm)"
              value={activeTemplate.safeMarginMm}
              onChange={(v) => updateActiveTemplate((tpl) => { tpl.safeMarginMm = v; return tpl; })}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="font-inter text-[11px] text-rain-cloud/55">Default shelf life</span>
              <input
                type="text"
                value={activeTemplate.meta?.shelfLifeDefault || ''}
                onChange={(e) =>
                  updateActiveTemplate((tpl) => {
                    tpl.meta = { ...(tpl.meta || {}), shelfLifeDefault: e.target.value };
                    return tpl;
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-inter text-[11px] text-rain-cloud/55">Default FSSAI license</span>
              <input
                type="text"
                value={activeTemplate.meta?.fssaiLicenseDefault || ''}
                onChange={(e) =>
                  updateActiveTemplate((tpl) => {
                    tpl.meta = { ...(tpl.meta || {}), fssaiLicenseDefault: e.target.value };
                    return tpl;
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="font-inter text-[11px] text-rain-cloud/55">Default website</span>
              <input
                type="text"
                value={activeTemplate.meta?.websiteDefault || ''}
                onChange={(e) =>
                  updateActiveTemplate((tpl) => {
                    tpl.meta = { ...(tpl.meta || {}), websiteDefault: e.target.value };
                    return tpl;
                  })
                }
                className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-border/60 bg-rain-mist/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-inter text-xs font-semibold text-rain-cloud">FSSAI logo</p>
                <p className="mt-1 font-inter text-[11px] text-rain-cloud/45 break-all">
                  {activeTemplate.assets?.fssaiLogoUrl || 'No logo uploaded'}
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 font-inter text-[11px] text-rain-cloud hover:bg-rain-mist">
                {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
            {activeTemplate.assets?.fssaiLogoUrl ? (
              <img
                src={activeTemplate.assets.fssaiLogoUrl}
                alt="FSSAI logo preview"
                className="mt-3 h-8 w-auto object-contain"
              />
            ) : (
              <div className="mt-3 flex h-8 items-center gap-2 font-inter text-[11px] text-rain-cloud/45">
                <ImagePlus className="h-4 w-4" /> Use builder image elements with asset “fssaiLogo”
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-4 shadow-sm">
          <h3 className="font-inter text-xs font-semibold uppercase tracking-[0.14em] text-rain-cloud/55">
            Element settings
          </h3>

          {!selectedElement ? (
            <p className="mt-6 font-inter text-sm text-rain-cloud/45">
              Click an element on the canvas or in the list. Drag to move · corner handle to resize.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 font-inter text-xs text-rain-cloud/70">
                <input
                  type="checkbox"
                  checked={selectedElement.visible !== false}
                  onChange={(e) =>
                    updateActiveTemplate((tpl) => {
                      tpl.elements = tpl.elements.map((el) =>
                        el.id === selectedElement.id ? { ...el, visible: e.target.checked } : el
                      );
                      return tpl;
                    })
                  }
                />
                Visible on label
              </label>

              <SelectField
                label="Type"
                value={selectedElement.type}
                onChange={(value) =>
                  updateActiveTemplate((tpl) => {
                    tpl.elements = tpl.elements.map((el) =>
                      el.id === selectedElement.id ? { ...createElement(value), id: el.id } : el
                    );
                    return tpl;
                  })
                }
                options={ELEMENT_TYPE_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label }))}
              />

              {(selectedElement.type === 'field' || selectedElement.type === 'text') && (
                <>
                  {selectedElement.type === 'field' ? (
                    <SelectField
                      label="Field"
                      value={selectedElement.fieldKey}
                      onChange={(value) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, fieldKey: value } : el
                          );
                          return tpl;
                        })
                      }
                      options={LABEL_FIELD_CATALOG.map((field) => ({
                        value: field.key,
                        label: field.label,
                      }))}
                    />
                  ) : (
                    <label className="block">
                      <span className="font-inter text-[11px] text-rain-cloud/55">Static text</span>
                      <input
                        type="text"
                        value={selectedElement.text || ''}
                        onChange={(e) =>
                          updateActiveTemplate((tpl) => {
                            tpl.elements = tpl.elements.map((el) =>
                              el.id === selectedElement.id ? { ...el, text: e.target.value } : el
                            );
                            return tpl;
                          })
                        }
                        className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="font-inter text-[11px] text-rain-cloud/55">Prefix</span>
                    <input
                      type="text"
                      value={selectedElement.prefix || ''}
                      onChange={(e) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, prefix: e.target.value } : el
                          );
                          return tpl;
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
                    />
                  </label>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  label="X (mm)"
                  value={selectedElement.xMm}
                  onChange={(v) =>
                    updateActiveTemplate((tpl) => {
                      tpl.elements = tpl.elements.map((el) =>
                        el.id === selectedElement.id ? { ...el, xMm: v } : el
                      );
                      return tpl;
                    })
                  }
                />
                <NumberField
                  label="Y (mm)"
                  value={selectedElement.yMm}
                  onChange={(v) =>
                    updateActiveTemplate((tpl) => {
                      tpl.elements = tpl.elements.map((el) =>
                        el.id === selectedElement.id ? { ...el, yMm: v } : el
                      );
                      return tpl;
                    })
                  }
                />
              </div>

              {(selectedElement.type === 'field' || selectedElement.type === 'text') && (
                <>
                  <SelectField
                    label="Anchor"
                    value={selectedElement.anchor || 'left'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, anchor: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={ANCHOR_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  />
                  <SelectField
                    label="Text align"
                    value={selectedElement.align || 'left'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, align: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={ALIGN_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  />
                  <SelectField
                    label="Baseline"
                    value={selectedElement.baseline || 'top'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, baseline: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={BASELINE_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  />
                  <SelectField
                    label="Font"
                    value={selectedElement.fontFamily || 'arial'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, fontFamily: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={FONT_FAMILY_OPTIONS.map((opt) => ({ value: opt.id, label: opt.label }))}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Font size (mm)"
                      value={selectedElement.fontSizeMm}
                      step={0.1}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, fontSizeMm: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                    <NumberField
                      label="Min size (mm)"
                      value={selectedElement.minFontSizeMm}
                      step={0.1}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, minFontSizeMm: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                    <NumberField
                      label="Font weight"
                      value={selectedElement.fontWeight}
                      step={100}
                      min={100}
                      max={900}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, fontWeight: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                    <NumberField
                      label="Max width (mm)"
                      value={selectedElement.maxWidthMm}
                      step={0.5}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, maxWidthMm: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                  </div>
                </>
              )}

              {selectedElement.type === 'barcode' && (
                <>
                  <SelectField
                    label="Barcode data field"
                    value={selectedElement.fieldKey || 'productBarcode'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, fieldKey: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={BARCODE_FIELD_OPTIONS.map((field) => ({
                      value: field.key,
                      label: field.label,
                    }))}
                  />
                  <p className="font-inter text-[10px] text-rain-cloud/45 leading-snug">
                    Use <strong>Product SKU</strong> for USB counter scanners (Code128). Price is chosen on screen after scan.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="Barcode width (mm)"
                      value={selectedElement.widthMm}
                      step={0.5}
                      min={10}
                      max={50}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, widthMm: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                    <NumberField
                      label="Barcode height (mm)"
                      value={selectedElement.heightMm}
                      step={0.5}
                      min={4}
                      max={20}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, heightMm: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                  </div>
                  <label className="flex items-center gap-2 font-inter text-xs text-rain-cloud/70">
                    <input
                      type="checkbox"
                      checked={selectedElement.showValue !== false}
                      onChange={(e) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, showValue: e.target.checked } : el
                          );
                          return tpl;
                        })
                      }
                    />
                    Show human-readable SKU below bars
                  </label>
                  <SelectField
                    label="Anchor"
                    value={selectedElement.anchor || 'left'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, anchor: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={ANCHOR_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  />
                </>
              )}

              {selectedElement.type === 'qr' && (
                <>
                  <SelectField
                    label="QR data field"
                    value={selectedElement.fieldKey || 'posScanCode'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, fieldKey: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={QR_FIELD_OPTIONS.map((field) => ({
                      value: field.key,
                      label: field.label,
                    }))}
                  />
                  <p className="font-inter text-[10px] text-rain-cloud/45 leading-snug">
                    Use <strong>POS scan code</strong> for counter billing without database lookup. Batch barcode needs label print records.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField
                      label="QR size (mm)"
                      value={selectedElement.sizeMm}
                      step={0.5}
                      min={4}
                      max={25}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, sizeMm: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                    <NumberField
                      label="Quiet zone (modules)"
                      value={selectedElement.margin}
                      step={1}
                      min={0}
                      max={4}
                      onChange={(v) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, margin: v } : el
                          );
                          return tpl;
                        })
                      }
                    />
                  </div>
                  <SelectField
                    label="Anchor"
                    value={selectedElement.anchor || 'left'}
                    onChange={(value) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, anchor: value } : el
                        );
                        return tpl;
                      })
                    }
                    options={ANCHOR_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  />
                </>
              )}

              {selectedElement.type === 'line' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Line width (mm)"
                    value={selectedElement.widthMm}
                    onChange={(v) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, widthMm: v } : el
                        );
                        return tpl;
                      })
                    }
                  />
                  <NumberField
                    label="Stroke (mm)"
                    value={selectedElement.strokeMm}
                    step={0.02}
                    onChange={(v) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, strokeMm: v } : el
                        );
                        return tpl;
                      })
                    }
                  />
                </div>
              )}

              {selectedElement.type === 'image' && (
                <>
                  <label className="block">
                    <span className="font-inter text-[11px] text-rain-cloud/55">Image URL (optional)</span>
                    <input
                      type="text"
                      value={selectedElement.imageUrl || ''}
                      onChange={(e) =>
                        updateActiveTemplate((tpl) => {
                          tpl.elements = tpl.elements.map((el) =>
                            el.id === selectedElement.id ? { ...el, imageUrl: e.target.value } : el
                          );
                          return tpl;
                        })
                      }
                      placeholder="Leave empty to use FSSAI logo asset"
                      className="mt-1 w-full rounded-lg border border-border px-2.5 py-1.5 font-inter text-sm text-rain-cloud focus:border-forest-canopy focus:outline-none"
                    />
                  </label>
                  <NumberField
                    label="Height (mm)"
                    value={selectedElement.heightMm}
                    step={0.1}
                    onChange={(v) =>
                      updateActiveTemplate((tpl) => {
                        tpl.elements = tpl.elements.map((el) =>
                          el.id === selectedElement.id ? { ...el, heightMm: v } : el
                        );
                        return tpl;
                      })
                    }
                  />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  updateActiveTemplate((tpl) => {
                    tpl.elements = tpl.elements.filter((el) => el.id !== selectedElement.id);
                    return tpl;
                  });
                  setSelectedElementId('');
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 font-inter text-[11px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove element
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
