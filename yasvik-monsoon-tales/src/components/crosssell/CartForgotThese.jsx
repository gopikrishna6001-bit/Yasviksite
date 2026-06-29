import { useQuery } from '@tanstack/react-query';
import CrossSellProductCard from '@/components/crosssell/CrossSellProductCard';
import { fetchCartCrossSell } from '@/services/productRelationsApi';

export default function CartForgotThese({ cartProductIds = [] }) {
  const { data: items = [] } = useQuery({
    queryKey: ['cart-cross-sell', cartProductIds.join(',')],
    queryFn: () => fetchCartCrossSell(cartProductIds, 3),
    enabled: cartProductIds.length > 0,
    staleTime: 60 * 1000,
  });

  if (!items.length) return null;

  return (
    <div className="border-t border-soft-border bg-white/70 px-5 py-4">
      <h3 className="font-cormorant text-xl font-semibold text-deep-forest">Forgot these?</h3>
      <p className="mt-0.5 font-inter text-xs text-deep-forest/50">Handy add-ons based on your cart.</p>
      <div className="mt-3 space-y-2">
        {items.map((product) => (
          <CrossSellProductCard key={product.id} product={product} compact />
        ))}
      </div>
    </div>
  );
}
