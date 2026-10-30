import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderTree, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { categoryLabel, listChildCategories } from '@/lib/categoryTree';

function countTreeProducts(categoryId, categories, productCounts) {
  let total = productCounts.get(categoryId) || 0;
  listChildCategories(categoryId, categories).forEach((child) => {
    total += productCounts.get(child.id) || 0;
  });
  return total;
}

function CategoryRowActions({
  item,
  onEdit,
  onDelete,
  onHide,
  onAddSubcategory,
  isParent,
  productCount = 0,
  canDelete = true,
}) {
  return (
    <div className="flex items-center gap-1">
      {isParent ? (
        <button
          type="button"
          onClick={() => onAddSubcategory(item)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-inter text-[10px] font-medium text-forest-canopy hover:bg-forest-canopy/10"
          title="Add subcategory"
        >
          <Plus className="h-3 w-3" /> Sub
        </button>
      ) : null}
      {item.is_active !== false ? (
        <button
          type="button"
          onClick={() => onHide(item)}
          className="rounded-lg px-2 py-1 font-inter text-[10px] font-medium text-rain-cloud/55 hover:bg-rain-mist hover:text-rain-cloud"
          title="Hide from shop"
        >
          Hide
        </button>
      ) : null}
      <button type="button" onClick={() => onEdit(item)} className="rounded-lg p-1.5 text-rain-cloud/45 hover:bg-rain-mist hover:text-rain-cloud" title="Edit">
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        disabled={!canDelete}
        className="rounded-lg p-1.5 text-rain-cloud/45 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
        title={canDelete ? 'Delete' : `${productCount} product(s) still tagged — reassign first`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function CategoryTreePanel({
  tree = [],
  orphans = [],
  isLoading = false,
  onEdit,
  onDelete,
  onHide,
  onAddParent,
  onAddSubcategory,
  productCounts = new Map(),
  categories = [],
  legacyMode = false,
}) {
  const [collapsed, setCollapsed] = useState({});

  const toggle = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-temple-stone/20" />
        ))}
      </div>
    );
  }

  const hasRows = tree.length > 0 || orphans.length > 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3 bg-rain-mist/20">
        <div>
          <p className="font-inter text-sm font-medium text-rain-cloud">Category tree</p>
          <p className="font-inter text-[11px] text-rain-cloud/45">
            {legacyMode ? 'Old duplicate categories — retag products, then delete empty rows' : 'Launch parent aisles → subcategories'}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddParent}
          className="inline-flex items-center gap-1.5 rounded-full bg-wet-earth px-3 py-1.5 font-inter text-xs font-medium text-white hover:bg-wet-earth/90"
        >
          <Plus className="h-3.5 w-3.5" /> Parent category
        </button>
      </div>

      {!hasRows ? (
        <div className="px-4 py-12 text-center">
          <FolderTree className="mx-auto h-8 w-8 text-rain-cloud/25" />
          <p className="mt-3 font-inter text-sm text-rain-cloud/50">No categories yet</p>
          <button type="button" onClick={onAddParent} className="mt-3 font-inter text-sm font-medium text-wet-earth hover:underline">
            Create your first parent category
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {tree.map(({ category: root, children }) => {
            const isOpen = collapsed[root.id] !== true;
            const rootProductCount = countTreeProducts(root.id, categories, productCounts);
            const rootCanDelete = rootProductCount === 0;
            return (
              <div key={root.id}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-rain-mist/30">
                  <button
                    type="button"
                    onClick={() => toggle(root.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rain-cloud/45 hover:bg-rain-mist"
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {children.length > 0 ? (
                      isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    ) : (
                      <Layers className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                  {root.cover_image ? (
                    <img src={root.cover_image} alt="" className="h-9 w-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-9 w-12 rounded-lg bg-temple-stone/25 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-inter text-sm font-medium text-rain-cloud truncate">
                      {categoryLabel(root)}
                    </p>
                    <p className="font-inter text-[10px] text-rain-cloud/40">
                      Parent · order {root.sort_order ?? 0}
                      {children.length ? ` · ${children.length} sub` : ' · assign products here or on subs'}
                      {rootProductCount ? ` · ${rootProductCount} product${rootProductCount === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <span className={`hidden sm:inline font-inter text-[10px] px-2 py-0.5 rounded-full ${root.is_active ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>
                    {root.is_active ? 'Active' : 'Hidden'}
                  </span>
                  <CategoryRowActions
                    item={root}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onHide={onHide}
                    onAddSubcategory={onAddSubcategory}
                    isParent
                    productCount={rootProductCount}
                    canDelete={rootCanDelete}
                  />
                </div>

                {isOpen && children.length > 0 ? (
                  <div className="border-t border-border/30 bg-rain-mist/10">
                    {children.map((child) => {
                      const childProductCount = productCounts.get(child.id) || 0;
                      return (
                      <div key={child.id} className="flex items-center gap-3 border-b border-border/20 px-4 py-2.5 pl-12 last:border-b-0">
                        <div className="h-7 w-7 shrink-0 rounded-lg border border-dashed border-border/60" />
                        <div className="min-w-0 flex-1">
                          <p className="font-inter text-sm text-rain-cloud/85 truncate">{categoryLabel(child)}</p>
                          <p className="font-inter text-[10px] text-rain-cloud/40">
                            Subcategory · order {child.sort_order ?? 0}
                            {childProductCount ? ` · ${childProductCount} product${childProductCount === 1 ? '' : 's'}` : ''}
                          </p>
                        </div>
                        <span className={`hidden sm:inline font-inter text-[10px] px-2 py-0.5 rounded-full ${child.is_active ? 'bg-forest-canopy/15 text-forest-canopy' : 'bg-temple-stone/30 text-rain-cloud/40'}`}>
                          {child.is_active ? 'Active' : 'Hidden'}
                        </span>
                        <CategoryRowActions
                          item={child}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onHide={onHide}
                          onAddSubcategory={onAddSubcategory}
                          productCount={childProductCount}
                          canDelete={childProductCount === 0}
                        />
                      </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}

          {orphans.length > 0 ? (
            <div className="px-4 py-3 bg-amber-50/50">
              <p className="font-inter text-[10px] uppercase tracking-wider text-amber-800/70 mb-2">Needs parent fix</p>
              {orphans.map((cat) => {
                const orphanCount = productCounts.get(cat.id) || 0;
                return (
                <div key={cat.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="font-inter text-sm text-rain-cloud/70">
                    {categoryLabel(cat)}
                    {orphanCount ? ` · ${orphanCount} product${orphanCount === 1 ? '' : 's'}` : ''}
                  </span>
                  <CategoryRowActions
                    item={cat}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onHide={onHide}
                    onAddSubcategory={onAddSubcategory}
                    productCount={orphanCount}
                    canDelete={orphanCount === 0}
                  />
                </div>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function countCategoryProducts(categories = [], products = []) {
  const counts = new Map();
  products.forEach((product) => {
    if (!product?.category_id) return;
    counts.set(product.category_id, (counts.get(product.category_id) || 0) + 1);
  });
  return counts;
}

export function orphanCategories(categories = []) {
  const list = Array.isArray(categories) ? categories : [];
  return list.filter((cat) => {
    if (!cat?.parent_id) return false;
    return !list.some((row) => row.id === cat.parent_id);
  });
}
