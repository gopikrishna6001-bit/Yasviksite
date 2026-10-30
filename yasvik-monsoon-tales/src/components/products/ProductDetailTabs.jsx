import { useState } from 'react';

const TABS = ['About', 'Reviews', 'FAQ'];

export default function ProductDetailTabs({ about, reviewsNote, faq }) {
  const [active, setActive] = useState('About');

  return (
    <div className="mt-6 border-t border-soft-border pt-4 md:hidden">
      <div className="flex border-b border-soft-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`flex-1 border-b-2 py-2 font-inter text-xs font-bold ${
              active === tab ? 'border-deep-forest text-deep-forest' : 'border-transparent text-deep-forest/45'
            }`}
          >
            {tab}{tab === 'Reviews' ? ' (96)' : ''}
          </button>
        ))}
      </div>
      <div className="py-4 font-inter text-sm leading-6 text-deep-forest/75">
        {active === 'About' && (about || 'Product details coming soon.')}
        {active === 'Reviews' && (reviewsNote || 'Reviews from customers will appear here.')}
        {active === 'FAQ' && (faq || 'Questions about delivery, storage, or usage? WhatsApp us anytime.')}
      </div>
    </div>
  );
}
