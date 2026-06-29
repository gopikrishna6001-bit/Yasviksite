import { Pencil } from 'lucide-react';

export default function LabelProductNameCell({ product, onEditProduct, className = '' }) {
  const name = product?.title || product?.name || 'Product';

  return (
    <div className={`flex items-center gap-1 min-w-0 ${className}`}>
      <p
        className="min-w-0 flex-1 truncate font-inter text-sm font-medium text-rain-cloud"
        title={name}
      >
        {name}
      </p>
      {onEditProduct ? (
        <button
          type="button"
          onClick={() => onEditProduct(product)}
          className="shrink-0 rounded-md p-1 text-rain-cloud/35 hover:bg-wet-earth/10 hover:text-wet-earth"
          title={`Edit ${name}`}
          aria-label={`Edit ${name}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
