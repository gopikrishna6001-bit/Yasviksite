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
  { match: /millet|grain/i, Icon: Wheat },
  { match: /pulse|staple|dal|rice|flour/i, Icon: Bean },
  { match: /oil|press/i, Icon: Droplets },
  { match: /ghee|honey|jaggery|sweet/i, Icon: Droplets },
  { match: /spice|masala/i, Icon: Flame },
  { match: /dry fruit|nut|superfood/i, Icon: Nut },
  { match: /snack/i, Icon: Cookie },
  { match: /pooja|puja|pickle/i, Icon: Sparkles },
];

function getCategoryIcon(label = '') {
  const entry = CATEGORY_ICONS.find(({ match }) => match.test(label));
  return entry?.Icon || Wheat;
}

function shortLabel(label = '') {
  const text = String(label).trim().replace(/,\s*$/, '');
  if (text.length <= 16) return text;

  const beforeComma = text.split(',')[0]?.trim();
  if (beforeComma && beforeComma.length <= 16) return beforeComma;

  return text.split(/\s+/).slice(0, 2).join(' ').replace(/,\s*$/, '');
}

export default function CategoryCircle({ label, href, imageUrl, index = 0 }) {
  const FallbackIcon = getCategoryIcon(label);
  const displayLabel = shortLabel(label);

  return (
    <Link to={href} className="group flex flex-col items-center gap-2.5">
      <span className="flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full border border-soft-border/80 bg-white shadow-[0_4px_14px_rgba(31,61,43,0.06)] md:h-24 md:w-24">
        {imageUrl ? (
          <OptimizedImage
            src={imageUrl}
            alt=""
            preset="thumb"
            eager={index < 8}
            className="h-full w-full object-cover object-center"
          />
        ) : (
          <FallbackIcon className="h-7 w-7 text-deep-forest/60 md:h-8 md:w-8" strokeWidth={1.6} aria-hidden="true" />
        )}
      </span>
      <span className="max-w-[5rem] text-center font-inter text-xs font-semibold leading-tight text-deep-forest md:max-w-[6.5rem] md:text-sm">
        {displayLabel}
      </span>
    </Link>
  );
}
