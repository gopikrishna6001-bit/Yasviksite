import { Link } from 'react-router-dom';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  Bean,
  Cookie,
  Droplets,
  Flame,
  Nut,
  Sparkles,
  Wheat,
} from 'lucide-react';

const CATEGORY_ICONS = [
  { match: /millet/i, Icon: Wheat },
  { match: /pulse|staple/i, Icon: Bean },
  { match: /rice/i, Icon: Wheat },
  { match: /oil/i, Icon: Droplets },
  { match: /honey|ghee|jaggery/i, Icon: Droplets },
  { match: /spice|masala/i, Icon: Flame },
  { match: /dry fruit|superfood|nut/i, Icon: Nut },
  { match: /snack/i, Icon: Cookie },
  { match: /pooja|puja/i, Icon: Sparkles },
];

function getCategoryIcon(label = '') {
  const entry = CATEGORY_ICONS.find(({ match }) => match.test(label));
  return entry?.Icon || Wheat;
}

export default function CategoryTile({ label, href, imageUrl, index = 0 }) {
  const FallbackIcon = getCategoryIcon(label);
  const badge = label
    .split(/[&\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <Link
      to={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-soft-border bg-white shadow-[0_8px_24px_rgba(31,61,43,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-paddy/35 hover:shadow-[0_14px_36px_rgba(31,61,43,0.1)] active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-warm-cream">
        {imageUrl ? (
          <OptimizedImage
            src={imageUrl}
            alt=""
            preset="category"
            eager={index < 4}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-warm-cream via-white to-[#F3EDE0] p-4">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-soft-border bg-white text-neon-paddy shadow-[0_8px_20px_rgba(31,61,43,0.06)]">
              <FallbackIcon className="h-7 w-7" strokeWidth={1.75} aria-hidden="true" />
            </span>
            {badge && (
              <span className="rounded-full border border-soft-border bg-white/90 px-2.5 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-deep-forest/55">
                {badge}
              </span>
            )}
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
