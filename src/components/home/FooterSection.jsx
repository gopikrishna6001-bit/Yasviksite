import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Mail, MapPinned, ShieldCheck, Sprout } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const NAV_GROUPS = [
  { title: 'Shop', links: [{ label: 'All Products', path: '/shop' }, { label: 'Our Roots', path: '/our-roots' }, { label: 'Contact', path: '/contact' }] },
  { title: 'Account', links: [{ label: 'Profile', path: '/profile' }, { label: 'Wishlist', path: '/wishlist' }, { label: 'Track Order', path: '/profile' }] },
  { title: 'Support', links: [{ label: 'FAQs', path: '/contact' }, { label: 'Shipping', path: '/contact' }, { label: 'Returns', path: '/contact' }] },
];

function isRandomPlaceholder(url = '') { return /picsum\.photos|source\.unsplash\.com|placehold/i.test(String(url)); }
function safeMedia(url = '') { const value = String(url || '').trim(); return value && !isRandomPlaceholder(value) ? value : ''; }
function cleanPublicLicense(value = '') {
  const text = String(value || '').trim();
  return /pending|to be confirmed|license number/i.test(text) ? '' : text;
}

export default function FooterSection() {
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.public, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const getSetting = (key, fallback) => { const value = settingsMap[key]; return value === undefined || value === null || value === '' ? fallback : value; };
  const footerBg = safeMedia(getSetting('footer_background_media_url', ''));
  const footerArt = safeMedia(getSetting('footer_art_overlay_url', ''));
  const fssaiLicense = cleanPublicLicense(getSetting('fssai_license_number', ''));
  const brandOrigin = String(getSetting('brand_origin_credentials', 'Thoughtfully chosen everyday essentials, traditional foods, and better alternatives from trusted regional sources.'));
  const footerSubcopy = String(getSetting('footer_subcopy', 'Traditional foods, fair prices and trusted quality for everyday family kitchens.'));

  return (
    <footer className="relative overflow-hidden bg-[var(--theme-header)] text-[var(--theme-header-text)]">
      {footerBg && <img src={footerBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,var(--theme-header-soft),var(--theme-header-deep))]" />
      {footerArt ? <img src={footerArt} alt="" className="pointer-events-none absolute bottom-0 right-0 max-h-[22rem] max-w-[52%] object-contain opacity-80" /> : <div className="pointer-events-none absolute -bottom-12 right-8 h-72 w-72 rounded-full border border-[var(--theme-border)]" />}

      <div className="relative mx-auto max-w-[1400px] px-6 py-12 md:px-8 md:py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="inline-flex rounded-2xl bg-[var(--bg-card)] p-3 shadow-lg"><YasvikLogo variant="horizontal" imageClassName="h-12 w-auto" /></div>
            <p className="mt-5 max-w-md font-inter text-sm leading-7 text-[color-mix(in_srgb,var(--theme-header-text)_70%,transparent)]">{footerSubcopy}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {[['Foods Sourced Through Journeys', MapPinned], ['Trusted Quality', ShieldCheck], ['Traditional Staples', Sprout]].map(([label, Icon]) => <span key={label} className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--action-primary)_16%,transparent)] px-3 py-2 font-inter text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--action-primary)]"><Icon className="h-3.5 w-3.5" />{label}</span>)}
            </div>
          </div>

          {NAV_GROUPS.map((group) => <div key={group.title}><h4 className="font-syne text-sm font-bold text-[var(--theme-header-text)]">{group.title}</h4><ul className="mt-4 space-y-2">{group.links.map((link) => <li key={link.path + link.label}><Link to={link.path} className="font-inter text-sm text-[color-mix(in_srgb,var(--theme-header-text)_62%,transparent)] hover:text-[var(--action-primary)]">{link.label}</Link></li>)}</ul></div>)}
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-header)_72%,black_28%)] p-4">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--action-primary)]">Origin & Compliance</p>
          <p className="mt-2 font-inter text-xs leading-6 text-[color-mix(in_srgb,var(--theme-header-text)_68%,transparent)]">{brandOrigin}</p>
          {fssaiLicense && <p className="mt-2 font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--theme-header-text)]">FSSAI: {fssaiLicense}</p>}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--theme-border)] pt-6 font-inter text-xs text-[color-mix(in_srgb,var(--theme-header-text)_54%,transparent)] md:flex-row md:items-center md:justify-between">
          <p>© 2026 Yasvik. All rights reserved.</p>
          <a href="mailto:hello@yasvik.com" className="inline-flex items-center gap-2 hover:text-[var(--action-primary)]"><Mail className="h-3.5 w-3.5" /> hello@yasvik.com</a>
          <div className="flex gap-2"><span className="rounded bg-[color-mix(in_srgb,var(--action-primary)_14%,transparent)] px-2 py-1 text-[10px] font-bold">UPI</span><span className="rounded bg-[color-mix(in_srgb,var(--action-primary)_14%,transparent)] px-2 py-1 text-[10px] font-bold">Razorpay</span><span className="rounded bg-[color-mix(in_srgb,var(--action-primary)_14%,transparent)] px-2 py-1 text-[10px] font-bold">Cards</span></div>
        </div>
      </div>
    </footer>
  );
}
