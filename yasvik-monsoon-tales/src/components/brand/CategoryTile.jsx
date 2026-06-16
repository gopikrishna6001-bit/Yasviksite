import { Link } from 'react-router-dom';

export default function CategoryTile({ label, href, imageUrl, index = 0 }) {
  return (
    <Link
      to={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-soft-border bg-white shadow-[0_8px_24px_rgba(31,61,43,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-paddy/35 hover:shadow-[0_14px_36px_rgba(31,61,43,0.1)] active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-warm-cream">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ) : (
          <div
            className="flex h-full w-full items-end p-4"
            style={{
              background: `linear-gradient(135deg, color-mix(in srgb, #34C230 ${12 + (index % 3) * 4}%, #FAF7EF), #F3EDE0)`,
            }}
          >
            <span className="font-inter text-[10px] font-bold uppercase tracking-[0.14em] text-deep-forest/40">
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 items-center px-3.5 py-3.5">
        <p className="font-inter text-[13px] font-bold leading-snug text-deep-forest md:text-sm">
          {label}
        </p>
      </div>
    </Link>
  );
}
