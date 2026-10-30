import { Search, X } from 'lucide-react';
import CategoryArtwork from '@/components/categories/CategoryArtwork';
import { getCategoryDisplayName } from '@/lib/categoryDisplay';
import { findCategoryById } from '@/lib/categoryTree';
import { BUNDLES_SHOP_CATEGORY_KEY } from '@/lib/comboUtils';
import { optimizeMediaUrl } from '@/lib/mediaUrl';
import { resolveCategoryDisplayImage } from '@/lib/categoryDisplayImages';

function CategoryThumb({ label, imageUrl, active }) {
  return (
    <span
      className={`relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-warm-cream transition-colors ${
        active ? 'border-neon-paddy ring-2 ring-neon-paddy/25' : 'border-soft-border'
      }`}
    >
      {imageUrl ? (
        <img
          src={optimizeMediaUrl(imageUrl, { width: 96, quality: 70 })}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <CategoryArtwork title={label} className="h-full w-full" />
      )}
    </span>
  );
}

function FilterRow({ active, onClick, label, imageUrl, accent = 'forest' }) {
  const activeClass =
    accent === 'clay'
      ? 'bg-sun-dried-clay/10 text-sun-dried-clay'
      : 'bg-deep-forest/[0.04] text-deep-forest';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
        active ? activeClass : 'hover:bg-warm-cream'
      }`}
    >
      <CategoryThumb label={label} imageUrl={imageUrl} active={active} />
      <span className={`font-inter text-sm font-semibold leading-snug ${active ? '' : 'text-deep-forest/75'}`}>
        {label}
      </span>
    </button>
  );
}

/**
 * Amazon / Myntra style filter column — sidebar on desktop, sheet on mobile.
 */
export default function ShopFiltersPanel({
  variant = 'sidebar',
  search,
  onSearchChange,
  onClearSearch,
  categories = [],
  allCategories = [],
  categoryImageMap = {},
  routeSlug,
  queryCategory,
  resolvedCategoryId,
  activeRootId,
  subcategories = [],
  showBundles,
  hasAnyCombos,
  onSelectCategory,
  hasActiveFilters,
  onClearAll,
  showRegionFilter = false,
  regions = [],
  activeRegion = '',
  onRegionChange,
  onClose,
}) {
  const isSheet = variant === 'sheet';
  const allActive = !routeSlug && !queryCategory && !showBundles;

  const body = (
    <div className="flex h-full flex-col">
      {isSheet ? (
        <div className="flex items-center justify-between border-b border-soft-border px-4 py-3">
          <h2 className="font-inter text-base font-bold text-deep-forest">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-9 w-9 items-center justify-center rounded-full text-deep-forest/60 hover:bg-warm-cream hover:text-deep-forest"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <h2 className="font-inter text-base font-bold text-deep-forest">Filters</h2>
      )}

      <div className={`flex-1 space-y-5 overflow-y-auto ${isSheet ? 'px-4 py-4' : 'mt-4'}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deep-forest/45" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products…"
            className="h-11 w-full rounded-xl border border-soft-border bg-white pl-10 pr-10 font-inter text-sm text-deep-forest outline-none transition-colors placeholder:text-deep-forest/45 focus:border-neon-paddy focus:ring-2 focus:ring-neon-paddy/15"
          />
          {search.trim() ? (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-deep-forest/55 hover:bg-warm-cream hover:text-deep-forest"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div>
          <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
            Category
          </p>
          <div className="space-y-0.5">
            <FilterRow
              label="All"
              active={allActive}
              onClick={() => onSelectCategory(null)}
              imageUrl=""
            />
            {hasAnyCombos ? (
              <FilterRow
                label="Combos"
                active={showBundles}
                accent="clay"
                onClick={() => onSelectCategory(BUNDLES_SHOP_CATEGORY_KEY)}
                imageUrl=""
              />
            ) : null}
            {categories.map((cat) => {
              const isActive = resolvedCategoryId === cat.id || activeRootId === cat.id;
              const label = getCategoryDisplayName(cat);
              const imageUrl = resolveCategoryDisplayImage(cat, categoryImageMap);
              return (
                <FilterRow
                  key={cat.id}
                  label={label}
                  imageUrl={imageUrl}
                  active={isActive}
                  onClick={() => onSelectCategory(cat.id)}
                />
              );
            })}
          </div>
        </div>

        {subcategories.length > 0 ? (
          <div>
            <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
              {getCategoryDisplayName(findCategoryById(activeRootId, allCategories)) || 'Subcategory'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onSelectCategory(activeRootId)}
                className={`h-8 rounded-full px-3 font-inter text-[11px] font-bold transition-colors ${
                  resolvedCategoryId === activeRootId
                    ? 'bg-neon-paddy text-deep-forest'
                    : 'border border-soft-border bg-white text-deep-forest/65 hover:border-neon-paddy/35'
                }`}
              >
                All
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectCategory(sub.id)}
                  className={`h-8 rounded-full px-3 font-inter text-[11px] font-bold transition-colors ${
                    resolvedCategoryId === sub.id
                      ? 'bg-neon-paddy text-deep-forest'
                      : 'border border-soft-border bg-white text-deep-forest/65 hover:border-neon-paddy/35'
                  }`}
                >
                  {getCategoryDisplayName(sub)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showRegionFilter && regions.length > 0 ? (
          <div>
            <p className="mb-2 font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
              Origin
            </p>
            <select
              value={activeRegion}
              onChange={(e) => onRegionChange?.(e.target.value)}
              className="h-10 w-full rounded-xl border border-soft-border bg-white px-3 font-inter text-sm text-deep-forest outline-none focus:border-neon-paddy"
            >
              <option value="">All origin areas</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {hasActiveFilters ? (
        <div className={`border-t border-soft-border ${isSheet ? 'px-4 py-3' : 'mt-4 pt-4'}`}>
          <button
            type="button"
            onClick={onClearAll}
            className="font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest"
          >
            Clear all
          </button>
        </div>
      ) : null}

      {isSheet ? (
        <div className="border-t border-soft-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-full bg-deep-forest font-inter text-sm font-bold text-warm-cream"
          >
            Show results
          </button>
        </div>
      ) : null}
    </div>
  );

  if (isSheet) {
    return (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
        <button
          type="button"
          className="absolute inset-0 bg-deep-forest/40"
          aria-label="Dismiss filters"
          onClick={onClose}
        />
        <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-white shadow-xl">
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-soft-border bg-white p-4 shadow-[0_8px_24px_rgba(31,61,43,0.04)]">
      {body}
    </div>
  );
}
