import { Link } from 'react-router-dom';
import { trackLocalStoreEntryClicked } from '@/lib/editorialAnalytics';
import { retailClasses } from '@/brand/retailTheme';

/**
 * Hyderabad advantage — secondary entry to /store (route unchanged).
 */
export default function EditorialLocalStoreEntry() {
  return (
    <section className="border-b border-soft-border/40 bg-white py-8 md:py-10" aria-labelledby="local-store-entry-heading">
      <div className={retailClasses.container}>
        <div className="rounded-2xl border border-soft-border bg-warm-cream px-5 py-6 md:flex md:items-center md:justify-between md:gap-8 md:px-8 md:py-8">
          <div className="max-w-2xl">
            <p className={retailClasses.label}>Local store</p>
            <h2 id="local-store-entry-heading" className={`${retailClasses.titleMd} mt-2`}>
              Near Hyderabad? Yasvik is closer than you think.
            </h2>
            <p className={`${retailClasses.body} mt-2`}>
              Shop selected local-store essentials, ask about availability or arrange delivery from our Ashoknagar store.
            </p>
          </div>
          <Link
            to="/store"
            onClick={() => trackLocalStoreEntryClicked()}
            className={`${retailClasses.btnOutline} mt-5 shrink-0 md:mt-0`}
          >
            Visit Local Store
          </Link>
        </div>
      </div>
    </section>
  );
}
