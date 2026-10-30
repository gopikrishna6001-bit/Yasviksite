import { Link } from 'react-router-dom';
import { Camera, Eye, EyeOff, Calculator, Tag, Pencil } from 'lucide-react';
import ProductQuickStockEditor from '@/components/admin/ProductQuickStockEditor';
import { getAdminPackPriceSummary } from '@/lib/productQuickOpsUtils';
import { productPrimaryImageUrl } from '@/lib/mediaUrl';

export default function ProductMobileQuickCard({
  product,
  onEdit,
  onEditPhotos,
  onStockSave,
  isStockSaving = false,
}) {
  const thumb = productPrimaryImageUrl(product);
  const packPrices = getAdminPackPriceSummary(product);

  return (
    <article className="rounded-2xl border border-border bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-rain-mist/50">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-inter text-[10px] text-rain-cloud/35">No photo</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-inter text-sm font-semibold text-rain-cloud">{product.title}</p>
          <div className="mt-1 space-y-0.5">
            {packPrices.slice(0, 2).map((pack) => (
              <p key={pack.label} className="font-inter text-[10px] text-rain-cloud/55">
                {pack.label}: {pack.price || pack.web}
              </p>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProductQuickStockEditor
              product={product}
              onSave={(payload, done) => onStockSave(product, payload, done)}
              isSaving={isStockSaving}
            />
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-inter text-[10px] font-medium ${
                product.is_published ? 'bg-forest-canopy/10 text-forest-canopy' : 'bg-rain-mist/60 text-rain-cloud/45'
              }`}
            >
              {product.is_published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {product.is_published ? 'Live' : 'Draft'}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
        <button
          type="button"
          onClick={() => onEditPhotos?.(product)}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full bg-forest-canopy px-3 py-2 font-inter text-xs font-bold text-white"
        >
          <Camera className="h-3.5 w-3.5" />
          Photos
        </button>
        <Link
          to={`/admin/pricing?product=${product.id}`}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 font-inter text-xs font-medium text-rain-cloud hover:bg-rain-mist/50"
        >
          <Calculator className="h-3.5 w-3.5" />
          Prices
        </Link>
        <Link
          to={`/admin/labels?product=${product.id}`}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 font-inter text-xs font-medium text-rain-cloud hover:bg-rain-mist/50"
        >
          <Tag className="h-3.5 w-3.5" />
          Labels
        </Link>
        <button
          type="button"
          onClick={() => onEdit?.(product)}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 font-inter text-xs text-rain-cloud/70 hover:bg-rain-mist/50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
    </article>
  );
}
