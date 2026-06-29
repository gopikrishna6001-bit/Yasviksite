import { useQuery } from '@tanstack/react-query';
import CrossSellProductCard from '@/components/crosssell/CrossSellProductCard';
import { fetchCompleteYourBasket } from '@/services/productRelationsApi';

export default function CompleteYourBasket({ productId }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['complete-basket', productId],
    queryFn: () => fetchCompleteYourBasket(productId, 4),
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || items.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="font-cormorant text-3xl font-semibold text-deep-forest">Complete Your Basket</h2>
      <p className="mt-1 font-inter text-sm text-deep-forest/55">Useful add-ons families often pick with this product.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {items.slice(0, 4).map((product) => (
          <CrossSellProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
