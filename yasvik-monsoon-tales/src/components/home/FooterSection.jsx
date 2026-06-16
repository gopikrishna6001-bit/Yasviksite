import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { Instagram, Mail, MessageCircle, Phone, ShieldCheck, Youtube } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { fetchAllAppSettings, resolveSettingsMap, SETTINGS_QUERY_KEYS } from '@/services/settingsService';

const NAV_GROUPS = [
  { title: 'Explore', links: [{ label: 'Shop', path: '/shop' }, { label: 'Our Roots', path: '/our-roots' }, { label: 'Producers', path: '/producers' }, { label: 'Recipes', path: '/recipes' }] },
  { title: 'Care', links: [{ label: 'Contact', path: '/contact' }, { label: 'Wishlist', path: '/wishlist' }, { label: 'Profile', path: '/profile' }, { label: 'Checkout', path: '/checkout' }] },
];

function isRandomPlaceholder(url = '') { return /picsum\.photos|source\.unsplash\.com|placehold/i.test(String(url)); }
function safeMedia(url = '') { const value = String(url || '').trim(); return value && !isRandomPlaceholder(value) ? value : ''; }
function cleanPublicLicense(value = '') {
  const text = String(value || '').trim();
  return /pending|to be confirmed|license number/i.test(text) ? '' : text;
}
function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '917842938998';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export default function FooterSection() {
  const { data: settings = [] } = useQuery({ queryKey: SETTINGS_QUERY_KEYS.public, queryFn: fetchAllAppSettings, staleTime: 10 * 60 * 1000 });
  const settingsMap = useMemo(() => resolveSettingsMap(settings), [settings]);
  const getSetting = (key, fallback) => { const value = settingsMap[key]; return value === undefined || value === null || value === '' ? fallback : value; };
  const footerBg = safeMedia(getSetting('footer_background_media_url', ''));
  const footerArt = safeMedia(getSetting('footer_art_overlay_url', ''));
  const fssaiLicense = cleanPublicLicense(getSetting('fssai_license_number', ''));
  const instagramUrl = String(getSetting('instagram_url', '') || '').trim();
  const youtubeUrl = String(getSetting('youtube_url', '') || '').trim();
  const supportEmail = String(getSetting('support_email', 'yasvikfoods@gmail.com') || 'yasvikfoods@gmail.com').trim();
  const supportPhone = String(getSetting('support_phone', '088011 96998') || '088011 96998').trim();
  const whatsappNumber = normalizePhone(getSetting('whatsapp_number', getSetting('support_whatsapp_number', '')));
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Yasvik, I need help with my order.')}`;
  const brandOrigin = String(getSetting('brand_origin_credentials', 'Conscious Food for Modern Living. Responsible Sourcing, Honest Quality.'));

  return (
    <footer className="relative overflow-hidden bg-[#1e1c18] text-[#f5f1e8]">
      {footerBg && <img src={footerBg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-18" />}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_14%,rgba(139,105,20,.22),transparent_34%),linear-gradient(180deg,rgba(30,28,24,.92),#1e1c18)]" />
      {footerArt && <img src={footerArt} alt="" className="pointer-events-none absolute bottom-0 right-0 max-h-[24rem] max-w-[52%] object-contain opacity-35" />}

      <div className="relative mx-auto max-w-[1480px] px-6 py-14 md:px-8 md:py-18">
        <div className="grid gap-12 md:grid-cols-[1.6fr_0.9fr_0.9fr_1fr]">
          <div>
            <Link to="/" aria-label="Yasvik Home" className="inline-flex rounded-2xl bg-[#f5f1e8] px-4 py-3">
              <YasvikLogo variant="horizontal" imageClassName="h-12 w-auto" />
            </Link>
            <h2 className="mt-8 max-w-xl font-cormorant text-5xl font-semibold leading-[0.95] text-[#fffaf0] md:text-6xl">Because food is never just food.</h2>
            <p className="mt-5 max-w-xl font-inter text-sm leading-7 text-[#f5f1e8]/68">Conscious Food for Modern Living. Responsible Sourcing, Honest Quality.</p>
          </div>

          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <h4 className="font-inter text-[11px] font-bold uppercase tracking-[0.24em] text-[#d9c88d]">{group.title}</h4>
              <ul className="mt-5 space-y-3">
                {group.links.map((link) => (
                  <li key={link.path + link.label}>
                    <Link to={link.path} className="font-inter text-sm text-[#f5f1e8]/64 transition-colors hover:text-[#fffaf0]">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="font-inter text-[11px] font-bold uppercase tracking-[0.24em] text-[#d9c88d]">Connect</h4>
            <div className="mt-5 space-y-3">
              <a href={`mailto:${supportEmail}`} className="flex items-center gap-3 font-inter text-sm text-[#f5f1e8]/68 hover:text-[#fffaf0]"><Mail className="h-4 w-4" /> {supportEmail}</a>
              <a href="tel:+918801196998" className="flex items-center gap-3 font-inter text-sm text-[#f5f1e8]/68 hover:text-[#fffaf0]"><Phone className="h-4 w-4" /> {supportPhone}</a>
              <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 font-inter text-sm text-[#f5f1e8]/68 hover:text-[#fffaf0]"><MessageCircle className="h-4 w-4" /> WhatsApp support</a>
              {instagramUrl && <a href={instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 font-inter text-sm text-[#f5f1e8]/68 hover:text-[#fffaf0]"><Instagram className="h-4 w-4" /> Instagram</a>}
              {youtubeUrl && <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 font-inter text-sm text-[#f5f1e8]/68 hover:text-[#fffaf0]"><Youtube className="h-4 w-4" /> YouTube</a>}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-[1.4rem] border border-[#f5f1e8]/10 bg-[#f5f1e8]/6 p-5">
          <p className="font-inter text-[10px] font-bold uppercase tracking-[0.22em] text-[#d9c88d]">Origin and compliance</p>
          <p className="mt-2 font-inter text-xs leading-6 text-[#f5f1e8]/62">{brandOrigin}</p>
          <p className="mt-3 font-inter text-xs leading-6 text-[#f5f1e8]/62">
            Yasvik Store, Bavanipuram Colony Road no4, Ashok Nagar, Chanda Nagar, Hyderabad, Telangana, 500050, IN
          </p>
          {fssaiLicense && <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#f5f1e8]/12 px-3 py-1.5 font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-[#f5f1e8]"><ShieldCheck className="h-3.5 w-3.5" /> FSSAI: {fssaiLicense}</p>}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[#f5f1e8]/10 pt-6 font-inter text-xs text-[#f5f1e8]/48 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Yasvik. All rights reserved.</p>
          <p>Natural Foods & Everyday Essentials</p>
        </div>
      </div>
    </footer>
  );
}
