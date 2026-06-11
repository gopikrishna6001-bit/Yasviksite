import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';

export default function PersonProductGrid({ products, personName }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="px-5 mb-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-cormorant text-xl text-rain-cloud font-light">{personName}'s Products</h3>
          <span className="font-inter text-xs text-rain-cloud/40">{products.length} items</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {products.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/product/${p.id}`}
                className="group relative rounded-lg overflow-hidden aspect-[3/4] bg-temple-stone/20"
              >
                <img
                  src={p.hero_image}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <div className="flex-1">
                    <p className="font-cormorant text-sm text-white font-light line-clamp-1">{p.title}</p>
                    <p className="font-inter text-[10px] text-white/80">₹{p.price}</p>
                  </div>
                  <ShoppingBag className="w-4 h-4 text-white/70" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}