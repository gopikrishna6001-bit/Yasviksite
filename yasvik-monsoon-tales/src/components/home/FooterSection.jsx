import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Instagram, Youtube } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';

const SHOP_LINKS = [
  { label: 'All products', path: '/shop' },
  { label: 'Download catalogue', path: '/catalogue' },
  { label: 'Millets & staples', path: '/shop' },
  { label: 'Oils & ghee', path: '/shop' },
  { label: 'Spices', path: '/shop' },
];

const BRAND_LINKS = [
  { label: 'Our Roots', path: '/our-roots' },
  { label: 'Our Farmers', path: '/farmers' },
  { label: 'Stories', path: '/stories' },
  { label: 'Contact', path: '/contact' },
];

const HELP_LINKS = [
  { label: 'WhatsApp support', path: `https://wa.me/${YASVIK_WHATSAPP_NUMBER}` },
  { label: 'Store directions', path: '/contact' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Delivery policy', path: '/delivery-policy' },
];

function FooterColumn({ title, links }) {
  return (
    <div>
      <h3 className="font-inter text-xs font-bold uppercase tracking-[0.16em] text-warm-cream/55">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            {String(link.path).startsWith('http') ? (
              <a href={link.path} target="_blank" rel="noreferrer" className="font-inter text-sm text-warm-cream/80 transition-colors hover:text-neon-paddy">
                {link.label}
              </a>
            ) : (
              <Link to={link.path} className="font-inter text-sm text-warm-cream/80 transition-colors hover:text-neon-paddy">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FooterSection() {
  const [email, setEmail] = useState('');
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const instagramUrl = String(settingsMap.instagram_url || '').trim();
  const youtubeUrl = String(settingsMap.youtube_url || '').trim();
  const hasSocial = instagramUrl || youtubeUrl;

  const handleNewsletter = (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    window.location.href = `mailto:hello@yasvik.com?subject=Newsletter%20signup&body=Please%20add%20${encodeURIComponent(value)}%20to%20updates.`;
  };

  return (
    <footer className="border-t border-deep-forest/20 bg-deep-forest text-warm-cream">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label="Yasvik Home" className="inline-flex opacity-95 transition-opacity hover:opacity-100">
              <YasvikLogo variant="horizontal" imageClassName="h-9 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-4 max-w-sm font-inter text-sm leading-7 text-warm-cream/75">
              Honest Indian staples — millets, oils, spices, and pantry essentials sourced with care for Hyderabad families.
            </p>
            {hasSocial && (
              <div className="mt-5 flex items-center gap-3">
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-cream/20 text-warm-cream/70 transition-colors hover:border-neon-paddy hover:text-neon-paddy">
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {youtubeUrl && (
                  <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-cream/20 text-warm-cream/70 transition-colors hover:border-neon-paddy hover:text-neon-paddy">
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          <FooterColumn title="Shop" links={SHOP_LINKS} />
          <FooterColumn title="Yasvik" links={BRAND_LINKS} />
          <FooterColumn title="Help" links={HELP_LINKS} />
        </div>

        <div className="mt-10 rounded-2xl border border-warm-cream/10 bg-warm-cream/5 p-5 md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <p className="font-inter text-sm font-bold text-warm-cream">Stay in the loop</p>
            <p className="mt-1 font-inter text-xs text-warm-cream/65">Seasonal harvest updates and new arrivals — no spam.</p>
          </div>
          <form onSubmit={handleNewsletter} className="mt-4 flex gap-2 md:mt-0 md:min-w-[20rem]">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email"
              className="h-11 flex-1 rounded-full border border-warm-cream/15 bg-deep-forest px-4 font-inter text-sm text-warm-cream outline-none placeholder:text-warm-cream/40 focus:border-neon-paddy"
            />
            <button type="submit" className="rounded-full bg-neon-paddy px-5 font-inter text-xs font-bold uppercase tracking-[0.12em] text-deep-forest hover:bg-warm-cream">
              Join
            </button>
          </form>
        </div>

        <p className="mt-8 font-inter text-[11px] tracking-wide text-warm-cream/40">© 2026 Yasvik Foods · FSSAI licensed</p>
      </div>
    </footer>
  );
}
