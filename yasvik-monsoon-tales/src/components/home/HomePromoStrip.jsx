import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

function parseEnabled(value) {
  return value === true || value === 'true' || value === '1';
}

export default function HomePromoStrip() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.home,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = resolveSettingsMap(settings);

  const enabled = parseEnabled(settingsMap.home_promo_enabled);
  const title = String(settingsMap.home_promo_title || '').trim();
  const body = String(settingsMap.home_promo_body || '').trim();
  const ctaLabel = String(settingsMap.home_promo_cta_label || 'Shop now').trim();
  const ctaLink = String(settingsMap.home_promo_cta_link || '/shop').trim() || '/shop';

  if (!enabled || !title) return null;

  const isExternal = /^https?:\/\//i.test(ctaLink);

  return (
    <section className="border-b border-soft-border/50 bg-deep-forest px-4 py-3 text-warm-cream md:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-neon-paddy" aria-hidden="true" />
          <div>
            <p className="font-inter text-sm font-bold leading-snug">{title}</p>
            {body ? <p className="font-inter text-xs text-warm-cream/75">{body}</p> : null}
          </div>
        </div>
        {isExternal ? (
          <a
            href={ctaLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-warm-cream px-4 py-1.5 font-inter text-xs font-bold text-deep-forest hover:bg-white"
          >
            {ctaLabel} <ChevronRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Link
            to={ctaLink}
            className="inline-flex items-center gap-1 rounded-full bg-warm-cream px-4 py-1.5 font-inter text-xs font-bold text-deep-forest hover:bg-white"
          >
            {ctaLabel} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
