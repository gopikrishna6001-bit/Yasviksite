import { useQuery } from '@tanstack/react-query';
import CrossSellProductCard from '@/components/crosssell/CrossSellProductCard';
import { fetchFrequentlyBoughtTogether } from '@/services/productRelationsApi';

export default function FrequentlyBoughtTogether({ productId }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['frequently-bought', productId],
    queryFn: () => fetchFrequentlyBoughtTogether(productId, 3),
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || items.length === 0) return null;

  return (
    <section className="mt-6 rounded-[28px] border border-soft-border bg-[#FAF7F0] p-4 md:p-5">
      <h2 className="font-cormorant text-2xl font-semibold text-deep-forest">Frequently Bought Together</h2>
      <p className="mt-1 font-inter text-sm text-deep-forest/55">Pairs well with this item — add individually.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.slice(0, 3).map((product) => (
          <CrossSellProductCard key={product.id} product={product} compact />
        ))}
      </div>
    </section>
  );
}
