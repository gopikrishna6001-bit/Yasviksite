import { Link } from 'react-router-dom';
import { ExternalLink, MapPin, MessageCircle, Phone, Truck } from 'lucide-react';
import YasvikButton from '@/components/brand/YasvikButton';
import { formatFreeDeliveryNote } from '@/lib/commerceCopy';
import { YASVIK_BRAND } from '@/brand/yasvikManifesto';
import {
  YASVIK_GOOGLE_MAPS_URL,
  YASVIK_SUPPORT_PHONE_DISPLAY,
  YASVIK_WHATSAPP_NUMBER,
} from '@/lib/storeLocation';

function getSetting(settingsMap, key, fallback) {
  const value = settingsMap?.[key];
  return value === undefined || value === null || value === '' ? fallback : value;
}

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return YASVIK_WHATSAPP_NUMBER;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

const STORE_CATEGORIES = [
  'Homemade snacks & sweets',
  'Pickles & spice powders',
  'Cold-pressed oils, ghee & honey',
  'Jaggery & dry fruits',
  'Rice, millets & everyday staples',
];

export default function LocalStoreBlock({ settingsMap = {} }) {
  const whatsappNumber = normalizePhone(
    getSetting(settingsMap, 'whatsapp_number', getSetting(settingsMap, 'support_whatsapp_number', '')),
  );
  const supportPhone = String(
    getSetting(settingsMap, 'support_phone', YASVIK_SUPPORT_PHONE_DISPLAY),
  ).trim();
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Yasvik, I want to order for home delivery.')}`;
  const deliveryLine = formatFreeDeliveryNote();

  return (
    <section className="border-b border-soft-border/40 bg-white px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[1.75rem] border border-soft-border bg-warm-cream shadow-[0_12px_36px_rgba(31,61,43,0.06)]">
        <div className="grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div>
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
              Our store
            </p>
            <h2 className="font-cormorant text-2xl font-semibold leading-tight text-deep-forest md:text-3xl">
              Visit Yasvik
            </h2>
            <p className="mt-4 font-inter text-sm leading-7 text-deep-forest/75 md:text-base">
              {YASVIK_BRAND.localStoreBody}
            </p>

            <ul className="mt-5 space-y-3">
              <li className="flex items-start gap-3 font-inter text-sm text-deep-forest/80">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-neon-paddy" />
                <span>
                  Ashok Nagar, Chanda Nagar, Hyderabad
                  <span className="block text-deep-forest/60">Bavanipuram Colony Road no 4 area</span>
                  <a
                    href={YASVIK_GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest"
                  >
                    Open in Google Maps
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3 font-inter text-sm text-deep-forest/80">
                <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-neon-paddy" />
                {deliveryLine}
              </li>
              <li className="flex items-start gap-3 font-inter text-sm text-deep-forest/80">
                <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-neon-paddy" />
                <a href={`tel:+91${whatsappNumber.slice(-10)}`} className="hover:text-deep-forest">
                  {supportPhone}
                </a>
              </li>
            </ul>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <YasvikButton href={whatsappHref} variant="whatsapp" target="_blank" rel="noreferrer" className="justify-center">
                <MessageCircle className="h-4 w-4" />
                Order on WhatsApp
              </YasvikButton>
              <YasvikButton to="/store" variant="outline" className="justify-center">
                Visit our store
              </YasvikButton>
            </div>
          </div>

          <div className="rounded-2xl border border-soft-border bg-white p-5 md:p-6">
            <p className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-deep-forest/45">
              What families shop here
            </p>
            <ul className="mt-4 space-y-2.5">
              {STORE_CATEGORIES.map((item) => (
                <li key={item} className="flex items-center gap-2 font-inter text-sm font-medium text-deep-forest">
                  <span className="h-1.5 w-1.5 rounded-full bg-neon-paddy" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/shop"
              className="mt-6 inline-flex font-inter text-xs font-bold text-neon-paddy hover:text-deep-forest"
            >
              Browse the full shop →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
