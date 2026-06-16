import { Link } from 'react-router-dom';
import { MessageCircle, Truck } from 'lucide-react';
import YasvikButton from '@/components/brand/YasvikButton';
import YasvikLogo from '@/components/brand/YasvikLogo';
import { HERO_COPY } from '@/brand/monsoonTokens';
import { resolveSetting } from '@/services/settingsService';

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '917842938998';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function safeMedia(url = '') {
  const value = String(url || '').trim();
  return value && !/picsum\.photos|source\.unsplash\.com|placehold/i.test(value) ? value : '';
}

export default function HomeHeroSection({ settingsMap = {}, heroMedia = {} }) {
  const whatsappNumber = normalizePhone(
    resolveSetting(settingsMap, 'whatsapp_number', resolveSetting(settingsMap, 'support_whatsapp_number', '')),
  );
  const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hi Yasvik, I would like to place an order.')}`;
  const freeDeliveryThreshold = Number(resolveSetting(settingsMap, 'free_delivery_threshold', 999));
  const deliveryNote =
    freeDeliveryThreshold > 0
      ? `Free home delivery above ₹${freeDeliveryThreshold} within colony and nearby areas.`
      : HERO_COPY.deliveryNote;

  const desktopMedia = safeMedia(heroMedia.desktop);
  const mobileMedia = safeMedia(heroMedia.mobile);
  const heroImage = mobileMedia || desktopMedia;

  return (
    <section className="border-b border-soft-border bg-warm-cream px-4 pb-10 pt-28 md:px-8 md:pb-14 md:pt-32">
      <div className="mx-auto grid max-w-[1400px] items-center gap-8 md:grid-cols-[1.05fr_0.95fr] md:gap-12 lg:gap-16">
        <div className="flex flex-col items-start text-left">
          <h1 className="font-cormorant text-[2.35rem] font-semibold leading-[1.08] text-deep-forest md:text-5xl lg:text-[3.35rem]">
            {HERO_COPY.headline}
          </h1>

          <p className="mt-4 max-w-xl font-inter text-base leading-7 text-deep-forest/75 md:text-lg md:leading-8">
            {HERO_COPY.subheadline}
          </p>

          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
            <YasvikButton to="/shop" variant="primary" className="w-full justify-center sm:w-auto">
              {HERO_COPY.primaryCta}
            </YasvikButton>
            <YasvikButton
              href={whatsappHref}
              variant="whatsapp"
              target="_blank"
              rel="noreferrer"
              className="w-full justify-center sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              {HERO_COPY.secondaryCta}
            </YasvikButton>
          </div>

          <p className="mt-5 inline-flex items-start gap-2 rounded-2xl border border-soft-border bg-white px-4 py-3 font-inter text-sm leading-6 text-deep-forest/80">
            <Truck className="mt-0.5 h-4 w-4 flex-shrink-0 text-neon-paddy" aria-hidden="true" />
            {deliveryNote}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] border border-soft-border bg-white shadow-[0_16px_42px_rgba(31,61,43,0.08)]">
          {heroImage ? (
            <img
              src={heroImage}
              alt="Yasvik natural foods and everyday essentials"
              className="aspect-[4/3] h-full w-full object-cover md:aspect-[5/4]"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          ) : (
            <div
              className="flex aspect-[4/3] flex-col items-center justify-center gap-4 bg-gradient-to-br from-warm-cream via-white to-[#F3EDE0] p-8 md:aspect-[5/4]"
              aria-hidden="true"
            >
              <YasvikLogo variant="symbol" imageClassName="h-16 w-auto opacity-80" />
              <p className="max-w-xs text-center font-inter text-sm leading-6 text-deep-forest/60">
                Millets, staples, oils, spices &amp; everyday essentials for modern families.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-[1400px] md:hidden">
        <Link to="/shop" className="font-inter text-sm font-bold text-neon-paddy hover:text-deep-forest">
          Browse all categories →
        </Link>
      </div>
    </section>
  );
}
