import { Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { reviews as reviewsApi } from '@/services/api';

const FALLBACK = {
  text: 'The quality is excellent. Fresh, well-packed, and delivered on time. Highly recommended!',
  name: 'Priya S.',
  location: 'Hyderabad',
  rating: 5,
};

function ReviewCard({ review }) {
  const rating = Number(review.rating || 5);
  return (
    <article className="mx-auto max-w-md rounded-2xl border border-soft-border bg-warm-cream/50 px-5 py-5 text-center">
      <div className="flex items-center justify-center gap-0.5 text-[#c9a227]" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? 'fill-current' : 'text-deep-forest/15'}`} />
        ))}
      </div>
      <p className="mt-3 font-inter text-sm leading-6 text-deep-forest/80">
        &ldquo;{review.review_text || review.title || 'Great product and service.'}&rdquo;
      </p>
      <p className="mt-3 font-inter text-xs font-bold text-deep-forest">
        {review.display_name || review.author_name || 'Yasvik customer'}
        {review.location ? (
          <span className="font-normal text-deep-forest/55"> · {review.location}</span>
        ) : null}
      </p>
    </article>
  );
}

export default function HomeTestimonials() {
  const { data: reviews = [] } = useQuery({
    queryKey: ['home-testimonials'],
    queryFn: () => reviewsApi.filter({ is_approved: true }, '-created_date', 6),
    staleTime: 5 * 60 * 1000,
  });

  const featured = reviews.filter((review) => review.review_text || review.title);
  const items = featured.length ? featured.slice(0, 3) : [FALLBACK];

  return (
    <section className="bg-white px-4 py-8 md:px-8 md:py-10" aria-labelledby="home-testimonials-heading">
      <div className="mx-auto max-w-[1400px]">
        <h2 id="home-testimonials-heading" className="text-center font-cormorant text-xl font-semibold text-deep-forest md:text-2xl">
          What Our Customers Say
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {items.map((review, index) => (
            <ReviewCard key={review.id || `fallback-${index}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}
