import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { recipes as recipesApi } from '@/services/api';
import { Clock } from 'lucide-react';

export default function RecipeWorld() {
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes-world'],
    queryFn: () => recipesApi.listPublished(20),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="pb-28 pt-3">
      <div className="px-4 mb-4">
        <p className="font-inter text-[10px] tracking-[0.28em] uppercase text-rain-cloud/30">From the kitchen</p>
        <h1 className="font-cormorant text-2xl text-rain-cloud font-light mt-1">Recipes worth making</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden">
              <div className="aspect-square bg-temple-stone/25 animate-pulse" />
              <div className="p-3 space-y-1.5">
                <div className="h-3.5 bg-temple-stone/25 rounded w-3/4 animate-pulse" />
                <div className="h-3 bg-temple-stone/15 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {/* Featured recipe — full width */}
          {recipes[0] && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link to={`/recipes/${recipes[0].id}`}>
                <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-temple-stone/10 group">
                  {recipes[0].hero_image && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={recipes[0].hero_image}
                        alt={recipes[0].title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    {recipes[0].cuisine && (
                      <p className="font-inter text-[9px] tracking-[0.25em] uppercase text-rain-cloud/30 mb-1">{recipes[0].cuisine}</p>
                    )}
                    <h2 className="font-cormorant text-[1.35rem] text-rain-cloud font-light">{recipes[0].title}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      {recipes[0].prep_time_minutes && (
                        <span className="flex items-center gap-1 font-inter text-[10px] text-rain-cloud/40">
                          <Clock className="w-3 h-3" strokeWidth={1.5} />
                          {recipes[0].prep_time_minutes + (recipes[0].cook_time_minutes || 0)} min
                        </span>
                      )}
                      {recipes[0].serves && (
                        <span className="font-inter text-[10px] text-rain-cloud/40">{recipes[0].serves}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )}

          {/* 2-col grid for the rest */}
          <div className="grid grid-cols-2 gap-3">
            {recipes.slice(1).map((recipe, i) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.45 }}
              >
                <Link to={`/recipes/${recipe.id}`}>
                  <div className="bg-white rounded-2xl overflow-hidden border border-temple-stone/10 group">
                    {recipe.hero_image ? (
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={recipe.hero_image}
                          alt={recipe.title}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gradient-to-br from-warm-turmeric/10 to-wet-earth/10" />
                    )}
                    <div className="p-3">
                      <h3 className="font-cormorant text-base text-rain-cloud font-light leading-snug line-clamp-2">
                        {recipe.title}
                      </h3>
                      {recipe.prep_time_minutes && (
                        <p className="font-inter text-[10px] text-rain-cloud/35 mt-1">
                          {recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}