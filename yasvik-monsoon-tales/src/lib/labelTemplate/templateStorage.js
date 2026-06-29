import {
  LABEL_ACTIVE_TEMPLATE_KEY,
  LABEL_TEMPLATE_SETTINGS_KEY,
} from '@/lib/labelTemplate/constants';
import { createDefaultGroceryTemplate } from '@/lib/labelTemplate/defaultTemplates';
import { resolveSetting } from '@/services/settingsService';
import { upsertAppSetting } from '@/services/settingsService';

function parseTemplates(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function upgradeTemplateWithPosQr(template) {
  if (!template?.elements?.length) return template;
  const hasBarcode = template.elements.some((el) => el.type === 'barcode');
  if (hasBarcode) return template;
  const fresh = createDefaultGroceryTemplate();
  const barcodeEl = fresh.elements.find((el) => el.id === 'productBarcode');
  if (!barcodeEl) return template;
  return {
    ...template,
    elements: [...template.elements, { ...barcodeEl, id: `productBarcode-${Date.now().toString(36)}` }],
  };
}

function upgradeTemplateTextFit(template) {
  if (!template?.elements?.length) return template;
  const defaults = createDefaultGroceryTemplate();
  const defaultById = Object.fromEntries(defaults.elements.map((el) => [el.id, el]));

  return {
    ...template,
    elements: template.elements.map((element) => {
      const fallback = defaultById[element.id];
      if (!fallback) return element;

      if (element.id === 'title' || element.fieldKey === 'productTitle') {
        return {
          ...element,
          multiLine: true,
          maxWidthMm: Math.max(Number(element.maxWidthMm) || 0, fallback.maxWidthMm || 46),
          lineGapMm: element.lineGapMm ?? fallback.lineGapMm ?? 0.75,
          minFontSizeMm: Math.min(
            Number(element.minFontSizeMm) || fallback.minFontSizeMm || 2,
            fallback.minFontSizeMm || 2
          ),
        };
      }

      if (element.id === 'shelfLife' || element.fieldKey === 'shelfLife') {
        return {
          ...element,
          maxWidthMm: Math.max(Number(element.maxWidthMm) || 0, fallback.maxWidthMm || 21),
          minFontSizeMm: element.minFontSizeMm ?? fallback.minFontSizeMm ?? 1.5,
        };
      }

      if (fallback.maxWidthMm && (!element.maxWidthMm || element.maxWidthMm < fallback.maxWidthMm * 0.85)) {
        return { ...element, maxWidthMm: fallback.maxWidthMm };
      }

      return element;
    }),
  };
}

function upgradeStoredTemplate(template) {
  return upgradeTemplateTextFit(upgradeTemplateWithPosQr(template));
}

export function getLabelTemplatesFromSettings(settings = []) {
  const stored = parseTemplates(resolveSetting(settings, LABEL_TEMPLATE_SETTINGS_KEY, null));
  if (stored.length > 0) {
    return stored.map(upgradeStoredTemplate);
  }
  return [createDefaultGroceryTemplate()];
}

export function getActiveLabelTemplateId(settings = []) {
  return (
    resolveSetting(settings, LABEL_ACTIVE_TEMPLATE_KEY, null)
    || getLabelTemplatesFromSettings(settings)[0]?.id
    || createDefaultGroceryTemplate().id
  );
}

export function getActiveLabelTemplate(settings = []) {
  const templates = getLabelTemplatesFromSettings(settings);
  const activeId = getActiveLabelTemplateId(settings);
  return templates.find((tpl) => tpl.id === activeId) || templates[0] || createDefaultGroceryTemplate();
}

export async function saveLabelTemplates(settings = [], templates, activeTemplateId) {
  const safeTemplates = Array.isArray(templates) && templates.length > 0
    ? templates
    : [createDefaultGroceryTemplate()];

  await upsertAppSetting(settings, LABEL_TEMPLATE_SETTINGS_KEY, safeTemplates, {
    data_type: 'json',
    description: 'Saved label print templates for admin label builder.',
  });

  await upsertAppSetting(settings, LABEL_ACTIVE_TEMPLATE_KEY, activeTemplateId || safeTemplates[0].id, {
    data_type: 'string',
    description: 'Active label template id for Seznik / roll printing.',
  });

  return { templates: safeTemplates, activeTemplateId: activeTemplateId || safeTemplates[0].id };
}
