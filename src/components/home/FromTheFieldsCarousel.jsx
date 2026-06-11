import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import { products as productsApi } from '@/services/api';
import { useWishlist } from '@/lib/WishlistContext';
import { useCart } from '@/lib/CartContext';
import { Heart, ZoomIn, Plus } from 'lucide-react';
import ImageLightbox from '@/components/ui/ImageLightbox';

export default function FromTheFieldsCarousel() {
  const navigate = useNavigate();
  const [emblaRef] = useEmblaCarousel({
    loop: true,
    align: 'center',
    dragFree: false,
    duration: 35,
    skipSnaps: false,
    inViewThreshold: 0.7,
  });
  const [lightbox, setLightbox] = useState(null);
  const [addedItems, setAddedItems] = useState({});

  const { toggle, isWishlisted } = useWishlist();
  const { addItem, items } = useCart();

  const { data: products = [] } = useQuery({
    queryKey: ['from-the-fields-products'],
    queryFn: () => productsApi.listFeatured(8),
    staleTime: 5 * 60 * 1000,
  });

  if (!products.length) return null;
  const goToProduct = (id) => navigate(`/product/${id}`);

  return (
    <>
    {lightbox && (
      <ImageLightbox
        src={lightbox.src}
        alt={lightbox.caption}
        caption={lightbox.caption}
        onClose={() => setLightbox(null)}
      />
    )}
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="py-16 overflow-hidden"
    >
      {/* Eyebrow */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        className="font-inter text-[9px] tracking-[0.35em] uppercase text-rain-cloud/30 text-center mb-10"
      >
        From the Fields
      </motion.p>

      {/* Embla carousel */}
      <div className="overflow-hidden cursor-grab active:cursor-grabbing" ref={emblaRef}>
        <div className="flex pl-4 pr-4">
          {products.map((product, i) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-[78vw] max-w-[340px] mx-2"
            >
              <div className="flex h-full flex-col cursor-pointer" onClick={() => goToProduct(product.id)}>
                {/* Image */}
                <motion.div
                  initial={{ opacity: 0, scale: 1.04 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                  className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-temple-stone/15 cursor-pointer"
                >
                  {/* Image first (lower z) */}
                  {product.hero_image ? (
                    <img
                      src={product.hero_image}
                      alt={product.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-temple-stone/20" />
                  )}

                  {/* Icons on top (higher z) */}
                  <div className="absolute top-3 right-3 z-20 flex flex-col items-center gap-1.5">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product.id); }}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm active:scale-90 transition-transform"
                    >
                      <Heart className={`w-4 h-4 transition-all ${isWishlisted(product.id) ? 'fill-red-400 text-red-400' : 'text-white'}`} />
                    </button>
                    {product.hero_image && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightbox({ src: product.hero_image, caption: product.title }); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm active:scale-90 transition-transform"
                      >
                        <ZoomIn className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </motion.div>

                {/* Text below image */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 + i * 0.06 }}
                  className="mt-5 pl-1 flex min-h-[210px] flex-col"
                >
                  {product.sourcing_location && (
                    <p className="font-inter text-[9px] tracking-[0.28em] uppercase text-wet-earth/55 mb-2">
                      {product.sourcing_location}
                    </p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); goToProduct(product.id); }}
                    className="text-left"
                  >
                    <h3 className="font-cormorant text-3xl text-rain-cloud font-light leading-tight hover:text-rain-cloud/80 transition-colors">
                      {product.title}
                    </h3>
                  </button>
                  {product.short_description && (
                    <p className="font-inter text-[11px] text-rain-cloud/40 mt-2 leading-relaxed line-clamp-2 min-h-[32px]">
                      {product.short_description}
                    </p>
                  )}
                  <div className="min-h-[18px] mt-1">
                    {product.person_id ? (
                      <Link
                        to={`/people/${product.person_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-inter text-[10px] text-forest-canopy hover:text-forest-canopy/80 underline underline-offset-2"
                      >
                        Traceable · View Farmer
                      </Link>
                    ) : (
                      <span className="font-inter text-[10px] text-rain-cloud/35">Not yet linked to farmer</span>
                    )}
                  </div>
                  <div className="mt-auto pt-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="font-cormorant text-xl text-wet-earth font-semibold">₹{product.price}</p>
                      {addedItems[product.id] && (
                        <span className="font-inter text-xs text-forest-canopy font-medium">
                          +{addedItems[product.id]} added
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addItem({
                          productId: product.id,
                          title: product.title,
                          price: product.price,
                          image: product.hero_image,
                          qty: 1,
                          unit: product.unit
                        });
                        setAddedItems(prev => ({
                          ...prev,
                          [product.id]: (prev[product.id] || 0) + 1
                        }));
                        setTimeout(() => {
                          setAddedItems(prev => ({
                            ...prev,
                            [product.id]: undefined
                          }));
                        }, 2000);
                      }}
                      className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl bg-forest-canopy hover:bg-forest-canopy/90 text-white font-inter text-sm transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swipe indicator */}
      <div className="flex justify-center items-center gap-2 mt-8">
        <div className="flex gap-1.5">
          {products.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className={`rounded-full bg-rain-cloud/20 transition-all ${i === 0 ? 'w-4 h-1' : 'w-1 h-1'}`}
            />
          ))}
        </div>
        <motion.span
          animate={{ x: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="text-rain-cloud/30 text-xs ml-2"
        >
          ←→
        </motion.span>
      </div>
    </motion.section>
    </>
  );
}
