import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { products as productsApi } from '@/services/api';
import { useCart } from '@/lib/CartContext';
import { Plus, Check } from 'lucide-react';

export default function RelatedProductsSection({ productId, currentProduct }) {
  const { addItem } = useCart();
  const [addedIds, setAddedIds] = useState({});

  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', productId],
    queryFn: async () => {
      if (!currentProduct) return [];
      
      // Find products from same region/journey/farmer, excluding current
      const candidates = await productsApi.listPublished('-created_date', 8);
      
      return candidates
        .filter(p => p.id !== productId && (
          p.region_id === currentProduct.region_id ||
          p.journey_id === currentProduct.journey_id ||
          p.person_id === currentProduct.person_id
        ))
        .slice(0, 3);
    },
    enabled: !!currentProduct,
  });

  const handleAddToCart = (product) => {
    addItem(product, null, 1);
    setAddedIds(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds(prev => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  if (relatedProducts.length === 0) return null;

  return (
    <div className="px-6 py-8">
      <h3 className="font-cormorant text-xl text-rain-cloud font-light mb-6 italic text-center">
        Complete the Journey
      </h3>
      <div className="space-y-4 max-w-lg mx-auto">
        {relatedProducts.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl overflow-hidden"
          >
            <img src={p.hero_image} alt={p.title} className="w-full aspect-[4/3] object-cover" />
            <div className="p-5">
              <h3 className="font-cormorant text-lg text-rain-cloud font-medium">{p.title}</h3>
              <p className="font-inter text-sm text-rain-cloud/55 mt-1.5 line-clamp-2">{p.short_description}</p>
              <div className="flex items-center justify-between mt-4">
                <div>
                  <span className="font-cormorant text-lg text-rain-cloud">₹{p.price}</span>
                  {p.unit && <span className="font-inter text-xs text-rain-cloud/40 ml-2">{p.unit}</span>}
                </div>
                <button
                  onClick={() => handleAddToCart(p)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-inter text-sm transition-all ${
                    addedIds[p.id]
                      ? 'bg-forest-canopy text-white'
                      : 'bg-wet-earth text-white hover:bg-wet-earth/90'
                  }`}
                >
                  {addedIds[p.id] ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}