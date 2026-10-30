import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import RetailPageShell from '@/components/retail/RetailPageShell';
import RetailPageHeader from '@/components/retail/RetailPageHeader';
import StoreLocationCard from '@/components/retail/StoreLocationCard';
import { retailClasses } from '@/brand/retailTheme';
import { getCategoryShopHref } from '@/lib/categoryDisplay';
import { useStorefrontCategories } from '@/hooks/useStorefrontCategories';
import { YASVIK_BRAND } from '@/brand/yasvikManifesto';
import { STORE_PAGE_SEO } from '@/lib/seoEntity';
import { resolveStoreLocationSettings } from '@/lib/storeLocationSettings';
import {
  fetchAllAppSettings,
  resolveSettingsMap,
  SETTINGS_QUERY_KEYS,
} from '@/services/settingsService';

const VISIT_FAQ = [
  {
    q: 'Where is Yasvik located?',
    a: 'Yasvik is in Ashok Nagar, Chanda Nagar, Hyderabad — near Lingampally and Serilingampally.',
  },
  {
    q: 'Can I pick up my online order at the store?',
    a: 'Yes. Choose store pickup at checkout or message us on WhatsApp after placing your order.',
  },
  {
    q: 'Does Yasvik deliver across Hyderabad?',
    a: 'Yes. We offer local delivery across Hyderabad and selected courier shipping for certain orders.',
  },
];

export default function Store() {
  const { data: settings = [] } = useQuery({
    queryKey: SETTINGS_QUERY_KEYS.public,
    queryFn: fetchAllAppSettings,
    staleTime: 10 * 60 * 1000,
  });
  const settingsMap = resolveSettingsMap(settings);
  const store = resolveStoreLocationSettings(settingsMap);
  const { data: categories = [] } = useStorefrontCategories();
  const heroCategories = categories.slice(0, 8);

  return (
    <RetailPageShell>
      <RetailPageHeader
        title="Visit Yasvik"
        subtitle={STORE_PAGE_SEO.description}
        backTo="/"
        backLabel="Home"
      />

      <div className={`${retailClasses.container} space-y-10 py-6 md:py-10`}>
        <section className="max-w-3xl">
          <h1 className="font-cormorant text-3xl font-semibold text-deep-forest md:text-4xl">
            {YASVIK_BRAND.storePageH1}
          </h1>
          <p className="mt-3 font-inter text-sm leading-7 text-deep-forest/70 md:text-base">
            {YASVIK_BRAND.storePageBody}
          </p>
        </section>

        <StoreLocationCard store={store} />

        {heroCategories.length ? (
          <section>
            <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">What you&apos;ll find in store</h2>
            <p className="mt-1 font-inter text-sm text-deep-forest/60">
              Categories we choose for Yasvik — also available online with local delivery.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {heroCategories.map((cat) => (
                <Link
                  key={cat.id}
                  to={getCategoryShopHref(cat)}
                  className="rounded-full border border-soft-border bg-white px-3 py-1.5 font-inter text-xs font-semibold text-deep-forest hover:border-neon-paddy hover:text-neon-paddy"
                >
                  {cat.emotional_title || cat.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Store pickup & delivery</h2>
          <div className="mt-3 space-y-3 font-inter text-sm leading-7 text-deep-forest/70">
            <p>
              Order on the website, visit us in Ashok Nagar, or message us on WhatsApp. We serve
              customers across Hyderabad with local delivery and selected courier shipping.
            </p>
            <p>
              <Link to="/delivery-policy" className="font-semibold text-neon-paddy hover:text-deep-forest">
                Read our delivery policy
              </Link>
              {' · '}
              <Link to="/contact" className="font-semibold text-neon-paddy hover:text-deep-forest">
                Contact & directions
              </Link>
            </p>
          </div>
        </section>

        <section>
          <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Visiting Yasvik</h2>
          <div className="mt-4 space-y-4">
            {VISIT_FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-2xl border border-soft-border bg-white p-4">
                <h3 className="font-inter text-sm font-semibold text-deep-forest">{q}</h3>
                <p className="mt-1.5 font-inter text-sm leading-6 text-deep-forest/65">{a}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </RetailPageShell>
  );
}
