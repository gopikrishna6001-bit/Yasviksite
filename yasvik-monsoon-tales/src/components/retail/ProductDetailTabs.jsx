import { useState } from 'react';
import { Star } from 'lucide-react';

const TABS = ['About', 'Reviews', 'FAQ'];

function formatReviewDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function ProductDetailTabs({
  about = '',
  specs = [],
  reviews = [],
  reviewCount = 0,
  reviewAverage = null,
  faq = '',
}) {
  const [active, setActive] = useState('About');
  const countLabel = reviewCount > 0 ? ` (${reviewCount})` : '';

  return (
    <div className="border-t border-soft-border pt-4">
      <div className="flex border-b border-soft-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`flex-1 border-b-2 py-2.5 font-inter text-xs font-bold transition-colors ${
              active === tab ? 'border-deep-forest text-deep-forest' : 'border-transparent text-deep-forest/40'
            }`}
          >
            {tab}{tab === 'Reviews' ? countLabel : ''}
          </button>
        ))}
      </div>

      <div className="py-4 font-inter text-sm leading-6 text-deep-forest/75">
        {active === 'About' && (
          <div className="space-y-4">
            <p className="whitespace-pre-line">{about || 'Product details coming soon.'}</p>
            {specs.length > 0 ? (
              <dl className="divide-y divide-soft-border rounded-lg border border-soft-border">
                {specs.map(({ label, value }) => (
                  <div key={label} className="flex justify-between gap-4 px-3 py-2.5 text-xs">
                    <dt className="font-semibold text-deep-forest/55">{label}</dt>
                    <dd className="text-right text-deep-forest">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        )}
        {active === 'Reviews' && (
          <div className="space-y-4">
            {reviewCount > 0 ? (
              <>
                {reviewAverage ? (
                  <p className="inline-flex items-center gap-1.5 font-inter text-sm text-deep-forest">
                    <Star className="h-4 w-4 fill-[#c9a227] text-[#c9a227]" aria-hidden="true" />
                    <span className="font-bold">{reviewAverage}</span>
                    <span className="text-deep-forest/55">average from {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                  </p>
                ) : null}
                <ul className="space-y-3">
                  {reviews.slice(0, 8).map((review) => (
                    <li key={review.id} className="rounded-lg border border-soft-border/70 bg-warm-cream/30 px-3 py-3">
                      <div className="flex items-center gap-1 text-[#c9a227]" aria-hidden="true">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${i < Number(review.rating || 0) ? 'fill-current' : 'text-deep-forest/15'}`}
                          />
                        ))}
                      </div>
                      {review.title ? (
                        <p className="mt-1 font-inter text-xs font-bold text-deep-forest">{review.title}</p>
                      ) : null}
                      {review.review_text ? (
                        <p className="mt-1 font-inter text-sm leading-6 text-deep-forest/75">{review.review_text}</p>
                      ) : null}
                      {review.created_date ? (
                        <p className="mt-1 font-inter text-[10px] text-deep-forest/45">{formatReviewDate(review.created_date)}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>No reviews yet — be the first to share your experience after ordering.</p>
            )}
          </div>
        )}
        {active === 'FAQ' && <p>{faq || 'Questions about delivery or storage? WhatsApp us anytime.'}</p>}
      </div>
    </div>
  );
}

export function ProductDetailTabsDesktop(props) {
  return (
    <div className="hidden md:block">
      <ProductDetailTabs {...props} />
    </div>
  );
}

export function ProductDetailTabsMobile(props) {
  return (
    <div className="md:hidden">
      <ProductDetailTabs {...props} />
    </div>
  );
}
