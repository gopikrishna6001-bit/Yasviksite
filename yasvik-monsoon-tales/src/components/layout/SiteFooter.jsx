import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { ChevronDown, Instagram, Youtube } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { RETAIL } from '@/brand/retailTheme';
import { appClient } from '@/api/appClient';
import { resolveStoreLocationSettings } from '@/lib/storeLocationSettings';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';
import { YASVIK_WHATSAPP_NUMBER } from '@/lib/storeLocation';
import { FOOTER_SEO_DESCRIPTION } from '@/lib/seoEntity';

const FOOTER_COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'All products', path: '/shop' },
      { label: 'Popular at Yasvik', path: '/#featured' },
      { label: 'Wishlist', path: '/wishlist' },
    ],
  },
  {
    title: 'Yasvik',
    links: [
      { label: 'About', path: '/about' },
      { label: 'Our Roots', path: '/our-roots' },
      { label: 'Stories', path: '/stories' },
      { label: 'Contact', path: '/contact' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'WhatsApp', path: `https://wa.me/${YASVIK_WHATSAPP_NUMBER}`, external: true },
      { label: 'Store & map', path: '/store' },
      { label: 'Privacy', path: '/privacy' },
      { label: 'Terms', path: '/terms' },
      { label: 'Delivery policy', path: '/delivery-policy' },
    ],
  },
];

function FooterLink({ link }) {
  const className = 'font-inter text-sm text-warm-cream/78 transition-colors hover:text-white';
  if (link.external) {
    return (
      <a href={link.path} target="_blank" rel="noreferrer" className={className}>
        {link.label}
      </a>
    );
  }
  return <Link to={link.path} className={className}>{link.label}</Link>;
}

function MobileFooterColumn({ title, links, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-warm-cream/10 md:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-3.5 font-inter text-xs font-bold uppercase tracking-[0.14em] text-warm-cream/55 md:hidden"
        aria-expanded={open}
      >
        {title}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <h3 className="hidden font-inter text-xs font-bold uppercase tracking-[0.14em] text-warm-cream/55 md:block">{title}</h3>
      <ul className={`space-y-2.5 overflow-hidden transition-all md:mt-4 md:block ${open ? 'max-h-40 pb-3' : 'max-h-0 md:max-h-none'}`}>
        {links.map((link) => (
          <li key={link.label}>
            <FooterLink link={link} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  const [email, setEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('idle');
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const store = useMemo(() => resolveStoreLocationSettings(settingsMap), [settingsMap]);
  const instagramUrl = String(settingsMap.instagram_url || '').trim();
  const youtubeUrl = String(settingsMap.youtube_url || '').trim();

  const handleNewsletter = async (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!value || newsletterStatus === 'sending') return;

    setNewsletterStatus('sending');
    try {
      await appClient.integrations.Core.SendEmail({
        to: store.email || 'yasvikfoods@gmail.com',
        subject: 'Newsletter signup',
        body: `New footer newsletter signup:\n\nEmail: ${value}\n`,
        reply_to: value,
      });
      setNewsletterStatus('success');
      setEmail('');
    } catch {
      setNewsletterStatus('error');
    }
  };

  return (
    <footer className="border-t border-deep-forest/15 bg-deep-forest text-warm-cream">
      <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
        {/* Brand block — centered on mobile */}
        <div className="flex flex-col items-center text-center md:items-start md:text-left lg:hidden">
          <Link to="/" aria-label="Yasvik Home">
            <YasvikLogo variant="horizontal" imageClassName="h-8 w-auto brightness-0 invert" />
          </Link>
          <p className="mt-3 max-w-xs font-inter text-xs leading-6 text-warm-cream/70">
            {FOOTER_SEO_DESCRIPTION}
          </p>
        </div>

        <div className="mt-8 grid gap-0 md:mt-0 md:grid-cols-2 md:gap-10 lg:grid-cols-[1.15fr_1fr_1fr_1fr] lg:gap-8">
          {/* Desktop brand column */}
          <div className="hidden lg:block">
            <Link to="/" aria-label="Yasvik Home">
              <YasvikLogo variant="horizontal" imageClassName="h-9 w-auto brightness-0 invert" />
            </Link>
            <p className="mt-4 max-w-xs font-inter text-sm leading-7 text-warm-cream/75">
              {FOOTER_SEO_DESCRIPTION}
            </p>
            {(instagramUrl || youtubeUrl) && (
              <div className="mt-5 flex items-center gap-2.5">
                {instagramUrl ? (
                  <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-cream/15 text-warm-cream/70 hover:border-neon-paddy hover:text-neon-paddy">
                    <Instagram className="h-4 w-4" />
                  </a>
                ) : null}
                {youtubeUrl ? (
                  <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-cream/15 text-warm-cream/70 hover:border-neon-paddy hover:text-neon-paddy">
                    <Youtube className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            )}
          </div>

          {FOOTER_COLUMNS.map((col, i) => (
            <MobileFooterColumn key={col.title} title={col.title} links={col.links} defaultOpen={i === 0} />
          ))}
        </div>

        {/* Newsletter */}
        <div className="mt-8 rounded-xl border border-warm-cream/10 bg-warm-cream/[0.04] p-4 md:mt-10 md:flex md:items-center md:justify-between md:gap-6 md:p-5">
          <div className="text-center md:text-left">
            <p className="font-inter text-sm font-bold text-warm-cream">Get updates</p>
            <p className="mt-0.5 font-inter text-xs text-warm-cream/60">New arrivals & offers — no spam.</p>
          </div>
          <form onSubmit={handleNewsletter} className="mt-3 flex gap-2 md:mt-0 md:min-w-[18rem]">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (newsletterStatus !== 'idle') setNewsletterStatus('idle');
              }}
              placeholder="Email address"
              disabled={newsletterStatus === 'sending' || newsletterStatus === 'success'}
              className="h-10 min-w-0 flex-1 rounded-full border border-warm-cream/15 bg-transparent px-4 font-inter text-sm text-warm-cream outline-none placeholder:text-warm-cream/35 focus:border-neon-paddy/60 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={newsletterStatus === 'sending' || newsletterStatus === 'success'}
              className="flex-shrink-0 rounded-full bg-warm-cream px-4 font-inter text-[10px] font-bold uppercase tracking-wide text-deep-forest hover:bg-neon-paddy disabled:opacity-60"
            >
              {newsletterStatus === 'sending' ? 'Joining…' : newsletterStatus === 'success' ? 'Joined' : 'Join'}
            </button>
          </form>
          {newsletterStatus === 'success' ? (
            <p className="mt-2 text-center font-inter text-xs text-neon-paddy md:text-right">You&apos;re on the list. Thank you!</p>
          ) : null}
          {newsletterStatus === 'error' ? (
            <p className="mt-2 text-center font-inter text-xs text-red-300 md:text-right">Could not sign up. Please try again or contact us.</p>
          ) : null}
        </div>

        {/* Mobile social */}
        {(instagramUrl || youtubeUrl) && (
          <div className="mt-6 flex justify-center gap-3 lg:hidden">
            {instagramUrl ? (
              <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-cream/15 text-warm-cream/70">
                <Instagram className="h-4 w-4" />
              </a>
            ) : null}
            {youtubeUrl ? (
              <a href={youtubeUrl} target="_blank" rel="noreferrer" aria-label="YouTube" className="flex h-9 w-9 items-center justify-center rounded-full border border-warm-cream/15 text-warm-cream/70">
                <Youtube className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        )}

        <div className="mt-8 space-y-2 border-t border-warm-cream/10 pt-6 text-center md:text-left">
          <p className="font-inter text-[10px] tracking-wide text-warm-cream/45 md:text-[11px]">
            © {new Date().getFullYear()} Yasvik Foods · FSSAI licensed
          </p>
          <p className="font-inter text-[10px] text-warm-cream/35">{RETAIL.copy.trustFooter}</p>
        </div>
      </div>
    </footer>
  );
}
