import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { people as peopleApi, products as productsApi } from '@/services/api';
import { ChevronLeft } from 'lucide-react';
import ProductCard from '../components/products/ProductCard';
import PersonProductGrid from '../components/people/PersonProductGrid';

export default function PersonDetail() {
  const { id } = useParams();

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: () => peopleApi.get(id),
    enabled: !!id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['person-products', id],
    queryFn: () => productsApi.listByPerson(id, 6),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rain-mist pb-24">
        <div className="h-[55vh] bg-temple-stone/30 animate-pulse" />
        <div className="p-6 space-y-3">
          <div className="h-7 bg-temple-stone/30 rounded w-1/2 animate-pulse" />
          <div className="h-4 bg-temple-stone/20 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!person) return null;

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      <div className="relative h-[60vh] overflow-hidden">
        <img src={person.portrait_image} alt={person.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/85 via-transparent to-transparent" />
        <Link
          to="/our-roots#hands"
          className="absolute top-14 left-5 z-10 flex items-center gap-1 text-white/80 font-inter text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Our Roots
        </Link>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <h1 className="font-cormorant text-4xl text-white font-medium">{person.name}</h1>
          <p className="font-inter text-sm text-white/70 mt-1">{person.role}</p>
          <p className="font-inter text-xs text-white/50 mt-0.5">{person.location_label}</p>
        </div>
      </div>

      <div className="px-6 py-8">
        {person.quote && (
          <blockquote className="font-cormorant text-2xl italic text-wet-earth leading-relaxed border-l-2 border-temple-stone pl-5 mb-8">
            "{person.quote}"
          </blockquote>
        )}
        {person.short_bio && (
          <p className="font-inter text-sm text-rain-cloud/60 leading-relaxed">{person.short_bio}</p>
        )}
        {person.long_story && (
          <p className="font-inter text-sm text-rain-cloud/55 mt-5 leading-relaxed">{person.long_story}</p>
        )}
      </div>

      {products.length > 0 && <PersonProductGrid products={products} personName={person.name} />}
    </div>
  );
}
