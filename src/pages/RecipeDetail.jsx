import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { recipes as recipesApi, products as productsApi } from '@/services/api';
import { ChevronLeft, Clock, Users, Flame, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

export default function RecipeDetail() {
  const { id } = useParams();
  const { addItem } = useCart();

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', id],
    queryFn: () => recipesApi.get(id),
    enabled: !!id,
  });

  const { data: ingredientProducts = [] } = useQuery({
    queryKey: ['recipe-products', recipe?.product_ids],
    queryFn: () => {
      if (!recipe?.product_ids?.length) return [];
      return Promise.all(recipe.product_ids.map(id => productsApi.get(id)));
    },
    enabled: !!recipe?.product_ids?.length,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rain-mist pb-24">
        <div className="h-[50vh] bg-temple-stone/30 animate-pulse" />
      </div>
    );
  }

  if (!recipe) return null;

  const totalTime = (recipe.prep_time_minutes || 0) + (recipe.cook_time_minutes || 0);

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {/* Hero image */}
      <div className="relative h-[50vh] overflow-hidden">
        <img src={recipe.hero_image} alt={recipe.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/85 to-transparent" />
        <Link
          to="/recipes"
          className="absolute top-14 left-5 z-10 flex items-center gap-1 text-white/80 font-inter text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Recipes
        </Link>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="font-cormorant text-4xl text-white font-medium">{recipe.title}</h1>
        </div>
      </div>

      {/* Meta info */}
      <div className="px-6 py-6 bg-white border-b border-border/20 flex gap-6 overflow-x-auto hide-scrollbar max-w-lg mx-auto">
        {recipe.prep_time_minutes && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Clock className="w-4 h-4 text-rain-cloud/40" />
            <div>
              <p className="font-inter text-[10px] text-rain-cloud/40">Prep</p>
              <p className="font-cormorant text-sm text-rain-cloud">{recipe.prep_time_minutes}m</p>
            </div>
          </div>
        )}
        {recipe.cook_time_minutes && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Flame className="w-4 h-4 text-rain-cloud/40" />
            <div>
              <p className="font-inter text-[10px] text-rain-cloud/40">Cook</p>
              <p className="font-cormorant text-sm text-rain-cloud">{recipe.cook_time_minutes}m</p>
            </div>
          </div>
        )}
        {recipe.serves && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Users className="w-4 h-4 text-rain-cloud/40" />
            <div>
              <p className="font-inter text-[10px] text-rain-cloud/40">Serves</p>
              <p className="font-cormorant text-sm text-rain-cloud">{recipe.serves}</p>
            </div>
          </div>
        )}
      </div>

      {/* Ingredients */}
      {recipe.ingredients?.length > 0 && (
        <div className="px-6 py-8 max-w-lg mx-auto">
          <h2 className="font-cormorant text-2xl text-rain-cloud font-light mb-5">Ingredients</h2>
          <div className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-forest-canopy/10 flex items-center justify-center font-inter text-xs text-forest-canopy flex-shrink-0">
                  •
                </span>
                <div className="flex-1">
                  <p className="font-inter text-sm text-rain-cloud">{ing.item}</p>
                  <p className="font-inter text-xs text-rain-cloud/50">{ing.quantity}</p>
                </div>
                {ing.product_id && ingredientProducts.find(p => p.id === ing.product_id) && (
                  <button
                    onClick={() => {
                      const prod = ingredientProducts.find(p => p.id === ing.product_id);
                      addItem(prod, null, 1);
                    }}
                    className="px-3 py-1.5 rounded-full bg-warm-turmeric text-white font-inter text-[10px] hover:bg-warm-turmeric/90"
                  >
                    <ShoppingBag className="w-3 h-3 inline mr-1" />
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {recipe.instructions && (
        <div className="px-6 py-8 max-w-lg mx-auto">
          <h2 className="font-cormorant text-2xl text-rain-cloud font-light mb-5">Instructions</h2>
          <div className="space-y-5">
            {recipe.instructions.split('\n').filter(Boolean).map((step, i) => (
              <div key={i} className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-forest-canopy/10 flex items-center justify-center font-inter text-sm text-forest-canopy flex-shrink-0">
                  {i + 1}
                </span>
                <p className="font-inter text-sm text-rain-cloud/70 leading-relaxed pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      {recipe.gallery_images?.length > 0 && (
        <div className="px-5 py-8">
          <h2 className="font-cormorant text-xl text-rain-cloud font-light mb-4 px-1">Gallery</h2>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {recipe.gallery_images.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-40 h-32 rounded-xl overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}