import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Instagram, Youtube } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import YasvikLogo from '@/components/brand/YasvikLogo';
import FooterArtwork from '@/components/brand/atmosphere/FooterArtwork';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const FOOTER_LINKS = [
  { label: 'Shop', path: '/shop' },
  { label: 'Our Roots', path: '/our-roots' },
  { label: 'Our Farmers', path: '/farmers' },
  { label: 'Stories', path: '/stories' },
  { label: 'Contact', path: '/contact' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
];

export default function FooterSection() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const instagramUrl = String(settingsMap.instagram_url || '').trim();
  const youtubeUrl = String(settingsMap.youtube_url || '').trim();
  const hasSocial = instagramUrl || youtubeUrl;

  return (
    <footer className="relative overflow-hidden border-t border-soft-border/60 bg-warm-cream text-deep-forest">
      <FooterArtwork className="absolute inset-0" />

      {/* Soft veil so text reads over the illustration */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-warm-cream/55 via-warm-cream/25 to-warm-cream/70"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex min-h-[min(300px,36vw)] max-w-2xl flex-col items-center justify-center px-6 py-10 text-center md:min-h-[min(340px,32vw)] md:py-12">
        <Link to="/" aria-label="Yasvik Home" className="inline-flex opacity-95 transition-opacity hover:opacity-100">
          <YasvikLogo variant="symbol" imageClassName="h-10 w-auto md:h-11" />
        </Link>

        <p className="mt-4 font-cormorant text-[1.5rem] font-medium leading-snug text-deep-forest/92 drop-shadow-sm md:text-[1.75rem]">
          From Indian fields to your family kitchen.
        </p>

        <nav aria-label="Footer" className="mt-5 flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
          {FOOTER_LINKS.map((link, index) => (
            <span key={link.path} className="inline-flex items-center">
              {index > 0 && <span className="mx-2.5 text-deep-forest/25" aria-hidden="true">·</span>}
              <Link
                to={link.path}
                className="font-inter text-sm text-deep-forest/70 transition-colors hover:text-neon-paddy"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>

        {hasSocial && (
          <div className="mt-4 flex items-center gap-3">
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-soft-border/80 bg-white/70 text-deep-forest/60 backdrop-blur-sm transition-colors hover:border-neon-paddy/30 hover:text-neon-paddy"
              >
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-soft-border/80 bg-white/70 text-deep-forest/60 backdrop-blur-sm transition-colors hover:border-neon-paddy/30 hover:text-neon-paddy"
              >
                <Youtube className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        <p className="mt-6 font-inter text-[11px] tracking-wide text-deep-forest/45">© 2026 Yasvik</p>
      </div>
    </footer>
  );
}
