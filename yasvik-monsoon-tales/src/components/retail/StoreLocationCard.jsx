import { Clock, ExternalLink, Mail, MapPin, Navigation, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import OptimizedImage from '@/components/ui/OptimizedImage';
import { retailClasses } from '@/brand/retailTheme';

export default function StoreLocationCard({
  store,
  showPhoto = true,
  showMap = true,
  showFormLink = false,
  className = '',
}) {
  if (!store) return null;

  return (
    <section id="store" className={`scroll-mt-28 ${className}`} aria-labelledby="store-location-heading">
      {showPhoto && store.photoUrl ? (
        <div className="overflow-hidden rounded-xl border border-soft-border bg-[#f0ebe0]">
          <div className="relative aspect-[16/10] w-full md:aspect-[21/9]">
            <OptimizedImage
              src={store.photoUrl}
              alt={`${store.storeName} storefront`}
              preset="hero"
              eager
              className="h-full w-full object-cover object-center"
            />
          </div>
        </div>
      ) : null}

      {showMap ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-soft-border bg-white">
          <iframe
            title={`Map — ${store.storeName}`}
            src={store.mapsEmbedUrl}
            className="aspect-[4/3] w-full border-0 md:aspect-[16/9]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      ) : null}

      <div className={`${retailClasses.card} mt-4 p-5 md:p-6`}>
        <p className={retailClasses.label}>Visit us</p>
        <h2 id="store-location-heading" className="mt-1 font-cormorant text-xl font-semibold text-deep-forest md:text-2xl">
          {store.storeName}
        </h2>

        <ul className="mt-4 space-y-3">
          <li className="flex gap-3">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-deep-forest/55" aria-hidden="true" />
            <address className="not-italic font-inter text-sm leading-6 text-deep-forest/80">
              {store.addressLines.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </address>
          </li>
          <li className="flex items-center gap-3">
            <Phone className="h-4 w-4 flex-shrink-0 text-deep-forest/55" aria-hidden="true" />
            <a href={`tel:${store.phoneTel}`} className="font-inter text-sm font-semibold text-deep-forest hover:text-neon-paddy">
              {store.phoneDisplay}
            </a>
          </li>
          <li className="flex items-center gap-3">
            <Mail className="h-4 w-4 flex-shrink-0 text-deep-forest/55" aria-hidden="true" />
            <a href={`mailto:${store.email}`} className="font-inter text-sm font-semibold text-deep-forest hover:text-neon-paddy">
              {store.email}
            </a>
          </li>
          <li className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-deep-forest/55" aria-hidden="true" />
            <span className="font-inter text-sm text-deep-forest/80">{store.hoursText}</span>
          </li>
        </ul>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href={store.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`${retailClasses.btnPrimary} justify-center gap-2`}
          >
            <Navigation className="h-4 w-4" aria-hidden="true" />
            Get directions
          </a>
          <a
            href={store.mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`${retailClasses.btnOutline} justify-center gap-2`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open in Google Maps
          </a>
        </div>

        {showFormLink ? (
          <p className="mt-4 font-inter text-xs text-deep-forest/55">
            Questions?{' '}
            <Link to="/contact#message" className="font-bold text-neon-paddy hover:text-deep-forest">
              Send us a message
            </Link>
          </p>
        ) : null}
      </div>
    </section>
  );
}
