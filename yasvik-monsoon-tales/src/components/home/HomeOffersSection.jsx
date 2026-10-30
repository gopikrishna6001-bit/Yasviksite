import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { products as productsApi } from '@/services/api';
import ProductCard from '@/components/products/ProductCard';
import SectionHeader from '@/components/brand/SectionHeader';
import { filterOfferProducts } from '@/lib/productOfferUtils';

export default function HomeOffersSection() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['home-offer-products'],
    queryFn: () => productsApi.listPublished('sort_order', 60),
    staleTime: 3 * 60 * 1000,
  });

  const offers = filterOfferProducts(products, 8);

  if (isLoading || offers.length === 0) return null;

  return (
    <section className="border-b border-soft-border/40 bg-white px-4 py-10 md:px-8 md:py-12">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-6 flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow="Limited-time value"
            title="Offers & savings"
            description="Real MRP vs Yasvik price — the same numbers you see on shelf labels and checkout."
          />
          <Link
            to="/shop?sort=offers"
            className="hidden flex-shrink-0 items-center gap-1 font-inter text-sm font-bold text-sun-dried-clay hover:text-deep-forest md:inline-flex"
          >
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 hide-scrollbar md:grid md:grid-cols-4 md:gap-4 md:overflow-visible">
          {offers.map((product, index) => (
            <div key={product.id} className="w-[10.5rem] flex-shrink-0 md:w-auto">
              <ProductCard product={product} index={index} variant="homepage" />
            </div>
          ))}
        </div>

        <div className="mt-6 text-center md:hidden">
          <Link to="/shop?sort=offers" className="inline-flex items-center gap-1 font-inter text-sm font-bold text-sun-dried-clay">
            Shop all offers <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
