/**
 * Catalogue publishing engine — public entry for Cloudflare Worker.
 */

import { buildCatalogueSnapshot } from './catalogue/snapshot.js';
import { buildPagePlan } from './catalogue/pagePlan.js';
import { renderCatalogueHtml } from './catalogue/render.js';
import { defaultCatalogueOptions, mergeOptions, DESIGN_TEMPLATES, CATALOGUE_PRESETS } from './catalogue/templates.js';
import { FORMAT_PROFILES, resolveFormat, browserPdfOptions } from './catalogue/formats.js';
import { slugify } from './catalogue/utils.js';

export {
  buildCatalogueSnapshot,
  buildPagePlan,
  renderCatalogueHtml,
  defaultCatalogueOptions,
  mergeOptions,
  DESIGN_TEMPLATES,
  CATALOGUE_PRESETS,
  FORMAT_PROFILES,
  resolveFormat,
  browserPdfOptions,
  slugify,
};

/**
 * Full pipeline: live data → snapshot → page plan → HTML.
 */
export function compileCatalogue(input) {
  const snapshot = buildCatalogueSnapshot(input);
  const planned = buildPagePlan(snapshot);
  const html = renderCatalogueHtml(planned);
  return { snapshot: planned, html, pdfOptions: browserPdfOptions(planned.format || {}) };
}
