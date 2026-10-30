import { resolveStorefrontRootCategory } from '@/lib/storefrontCategories';

function sortByOrder(a, b) {
  return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
    || String(a.emotional_title || a.name || '').localeCompare(String(b.emotional_title || b.name || ''));
}

export function categoryLabel(category) {
  return String(category?.emotional_title || category?.name || 'Category').trim();
}

/** Top-level categories for shop nav (no parent). */
export function listRootCategories(categories = []) {
  return (Array.isArray(categories) ? categories : [])
    .filter((cat) => cat && !cat.parent_id)
    .sort(sortByOrder);
}

export function listChildCategories(parentId, categories = []) {
  if (!parentId) return [];
  return (Array.isArray(categories) ? categories : [])
    .filter((cat) => cat?.parent_id === parentId)
    .sort(sortByOrder);
}

/** Category id + all direct children (for shop filters on a parent). */
export function expandCategoryFilterIds(categoryId, categories = []) {
  if (!categoryId) return [];
  const children = listChildCategories(categoryId, categories).map((cat) => cat.id);
  return children.length > 0 ? [categoryId, ...children] : [categoryId];
}

/** True if any product is tagged to this category or (for parents) any direct child. */
export function categoryHasTaggedProducts(categoryId, categories = [], products = []) {
  if (!categoryId) return false;
  const ids = new Set(expandCategoryFilterIds(categoryId, categories));
  return (Array.isArray(products) ? products : []).some((p) => ids.has(p.category_id));
}

/** Drop empty parents / leaves that have no products tagged (avoids dead filter chips). */
export function filterCategoriesWithProducts(categories = [], products = []) {
  const list = Array.isArray(categories) ? categories : [];
  const catalog = Array.isArray(products) ? products : [];
  return list.filter((cat) => categoryHasTaggedProducts(cat.id, list, catalog));
}

/**
 * Select options for assigning products.
 * Parents that only hold subcategories are omitted — pick the subcategory instead.
 * Empty parent aisles with no children and no products are also omitted.
 */
export function buildCategorySelectOptions(categories = [], products = null) {
  const list = Array.isArray(categories) ? categories : [];
  const roots = listRootCategories(list);
  const options = [];
  const catalog = Array.isArray(products) ? products : null;

  const orphans = list.filter((cat) => {
    if (!cat?.parent_id) return false;
    return !list.some((row) => row.id === cat.parent_id);
  });

  roots.forEach((root) => {
    const children = listChildCategories(root.id, list);
    if (children.length) {
      // Never offer the parent when it has subcategories — products belong on children.
      children.forEach((child) => {
        if (catalog && !categoryHasTaggedProducts(child.id, list, catalog)) return;
        options.push({
          value: child.id,
          label: `${categoryLabel(root)} › ${categoryLabel(child)}`,
        });
      });
      return;
    }
    // Leaf root (no children): include only if assigning, or if it has products when filtering.
    if (catalog && !categoryHasTaggedProducts(root.id, list, catalog)) return;
    options.push({ value: root.id, label: categoryLabel(root) });
  });

  orphans.sort(sortByOrder).forEach((cat) => {
    if (catalog && !categoryHasTaggedProducts(cat.id, list, catalog)) return;
    options.push({ value: cat.id, label: categoryLabel(cat) });
  });

  return options;
}

export function findCategoryById(categoryId, categories = []) {
  return (Array.isArray(categories) ? categories : []).find((cat) => cat.id === categoryId) || null;
}

export function categoryBreadcrumb(categoryId, categories = []) {
  const cat = findCategoryById(categoryId, categories);
  if (!cat) return '';
  const parent = cat.parent_id ? findCategoryById(cat.parent_id, categories) : null;
  if (!parent) return categoryLabel(cat);
  return `${categoryLabel(parent)} › ${categoryLabel(cat)}`;
}

/** Nested tree for admin UI: [{ category, children: [] }]. */
export function buildCategoryTree(categories = []) {
  const list = Array.isArray(categories) ? categories : [];
  return listRootCategories(list).map((root) => ({
    category: root,
    children: listChildCategories(root.id, list),
  }));
}

/** Resolve product's category, optional subcategory, and root aisle for sorting. */
export function resolveProductCategoryContext(product = {}, categories = []) {
  const cat = findCategoryById(product.category_id, categories);
  if (!cat) {
    return {
      category: null,
      subcategory: null,
      root: null,
      aisleLabel: 'Other',
      sectionLabel: 'Other',
    };
  }

  const root = resolveStorefrontRootCategory(product.category_id, categories);
  if (!root) {
    return {
      category: cat,
      subcategory: null,
      root: null,
      aisleLabel: 'Other',
      sectionLabel: 'Other',
    };
  }

  const parent = cat.parent_id ? findCategoryById(cat.parent_id, categories) : null;
  const subcategory = parent && parent.id === root.id ? cat : null;

  return {
    category: cat,
    subcategory,
    root,
    aisleLabel: categoryLabel(root),
    sectionLabel: subcategory
      ? `${categoryLabel(root)} › ${categoryLabel(subcategory)}`
      : categoryLabel(root),
  };
}

function productSortOrder(product = {}) {
  const value = Number(product.sort_order);
  return Number.isFinite(value) ? value : 0;
}

function categorySortOrder(category = {}) {
  const value = Number(category?.sort_order);
  return Number.isFinite(value) ? value : 0;
}

/** Sort products by aisle (root) → subcategory → product sort_order → name. */
export function sortProductsByCategoryHierarchy(products = [], categories = []) {
  return [...(Array.isArray(products) ? products : [])].sort((a, b) => {
    const ctxA = resolveProductCategoryContext(a, categories);
    const ctxB = resolveProductCategoryContext(b, categories);

    const rootDiff = categorySortOrder(ctxA.root) - categorySortOrder(ctxB.root);
    if (rootDiff !== 0) return rootDiff;

    const aisleDiff = ctxA.aisleLabel.localeCompare(ctxB.aisleLabel);
    if (aisleDiff !== 0) return aisleDiff;

    const subDiff = categorySortOrder(ctxA.subcategory) - categorySortOrder(ctxB.subcategory);
    if (subDiff !== 0) return subDiff;

    const subLabelDiff = ctxA.sectionLabel.localeCompare(ctxB.sectionLabel);
    if (subLabelDiff !== 0) return subLabelDiff;

    const orderDiff = productSortOrder(a) - productSortOrder(b);
    if (orderDiff !== 0) return orderDiff;

    return String(a.title || a.name || '').localeCompare(String(b.title || b.name || ''));
  });
}

/**
 * Group products into shop sections for the "All" view.
 * One block per root aisle; optional sub-headings when a root has multiple subcategories.
 */
export function groupProductsByShopAisle(products = [], categories = []) {
  const sorted = sortProductsByCategoryHierarchy(products, categories);
  const sections = [];
  const sectionIndex = new Map();

  sorted.forEach((product) => {
    const ctx = resolveProductCategoryContext(product, categories);
    if (!ctx.root) return;
    const rootId = ctx.root.id;
    let section = sectionIndex.get(rootId);

    if (!section) {
      section = {
        id: rootId,
        root: ctx.root,
        label: ctx.aisleLabel,
        rootOrder: categorySortOrder(ctx.root),
        subsections: [],
        products: [],
      };
      sectionIndex.set(rootId, section);
      sections.push(section);
    }

    if (ctx.subcategory) {
      let sub = section.subsections.find((row) => row.id === ctx.subcategory.id);
      if (!sub) {
        sub = {
          id: ctx.subcategory.id,
          label: categoryLabel(ctx.subcategory),
          sortOrder: categorySortOrder(ctx.subcategory),
          products: [],
        };
        section.subsections.push(sub);
      }
      sub.products.push(product);
    } else {
      section.products.push(product);
    }
  });

  sections.sort((a, b) => a.rootOrder - b.rootOrder || a.label.localeCompare(b.label));
  sections.forEach((section) => {
    section.subsections.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  });

  return sections;
}
