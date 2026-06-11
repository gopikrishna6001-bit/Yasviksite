import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { recipes as recipesApi } from '@/services/api';
import { appClient } from '@/api/appClient';
import { Link } from 'react-router-dom';
import { Clock, Users, Flame } from 'lucide-react';
import PageHeroRenderer from '@/components/PageHeroRenderer';

export default function Recipes() {
  const { data: recipes = [], isLoading } = useQuery({
    queryKey: ['recipes-list'],
    queryFn: () => recipesApi.listPublished(20),
  });

  const { data: featured = [] } = useQuery({
    queryKey: ['featured-recipes'],
    queryFn: () => recipesApi.listFeatured(1),
  });

  const { data: hero, isLoading: heroLoading } = useQuery({
    queryKey: ['page-hero', 'recipes'],
    queryFn: async () => {
      const results = await appClient.entities.PageHero.filter({ page_key: 'recipes' }, '-updated_date', 1);
      return results[0];
    },
  });

  const featuredRecipe = featured[0];
  const otherRecipes = recipes.filter(r => r.id !== featuredRecipe?.id);

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {hero && <PageHeroRenderer hero={hero} isLoading={heroLoading} />}
      <div className="text-center mb-8 px-6 pt-8">
        <p className="font-inter text-[10px] tracking-[0.2em] uppercase text-rain-cloud/40 mb-2">From the Kitchen</p>
        <h1 className="font-cormorant text-4xl text-rain-cloud font-light mb-2">Recipes</h1>
        <p className="font-inter text-xs text-rain-cloud/50">Time-honoured cooking from heritage foodways</p>
      </div>
      {/* Featured recipe */}
      {featuredRecipe && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-5 mt-6 mb-10 rounded-2xl overflow-hidden bg-white shadow-md"
        >
          <Link to={`/recipes/${featuredRecipe.id}`}>
            <div className="aspect-[16/9] overflow-hidden relative">
              <img
                src={featuredRecipe.hero_image}
                alt={featuredRecipe.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/70 to-transparent flex items-end p-5">
                <div>
                  <span className="inline-block px-3 py-1 bg-warm-turmeric text-white font-inter text-[10px] rounded-full mb-2">Featured</span>
                  <h2 className="font-cormorant text-2xl text-white font-light">{featuredRecipe.title}</h2>
                  <p className="font-inter text-xs text-white/70 mt-1">{featuredRecipe.excerpt}</p>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Recipe grid */}
      <div className="px-5 space-y-5 max-w-lg mx-auto">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl h-32 animate-pulse" />
          ))
        ) : otherRecipes.length === 0 ? (
          <p className="text-center font-inter text-sm text-rain-cloud/40 py-12">No recipes yet.</p>
        ) : (
          otherRecipes.map((recipe, i) => (
            <motion.div
              key={recipe.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/recipes/${recipe.id}`} className="flex gap-4 bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                <div className="w-24 h-24 flex-shrink-0 overflow-hidden bg-temple-stone/20">
                  {recipe.hero_image && (
                    <img src={recipe.hero_image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-cormorant text-base text-rain-cloud font-light line-clamp-1">{recipe.title}</h3>
                    <p className="font-inter text-xs text-rain-cloud/50 line-clamp-1 mt-1">{recipe.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-rain-cloud/45">
                    {recipe.prep_time_minutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.prep_time_minutes}m</span>}
                    {recipe.serves && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.serves}</span>}
                    {recipe.cuisine && <span className="flex items-center gap-1"><Flame className="w-3 h-3" />{recipe.cuisine}</span>}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}