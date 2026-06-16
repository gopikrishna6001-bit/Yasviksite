import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { journeys as journeysApi, products as productsApi } from '@/services/api';
import { ChevronLeft } from 'lucide-react';
import ShareSheet from '@/components/ui/ShareSheet';
import ProductCard from '../components/products/ProductCard';
import StoryTag from '../components/ui/StoryTag';
import JourneyProductFlow from '../components/journeys/JourneyProductFlow';
import CollapsibleNarrative from '../components/journeys/CollapsibleNarrative';

function getInstagramReelId(url) {
  if (!url) return null;
  const match = url.match(/instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function InstagramReelHero({ reelUrl, coverImage, title }) {
  return (
    <div className="relative w-full h-full bg-black">
      {/* Cover image */}
      <img
        src={coverImage}
        alt={title}
        className="w-full h-full object-cover"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/35" />
      {/* Play button — opens reel in Instagram app or browser */}
      <a
        href={reelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
      >
        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/70 flex items-center justify-center active:scale-95 transition-transform">
          <svg className="w-9 h-9 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span className="font-inter text-xs text-white/70 tracking-wider uppercase">Watch on Instagram</span>
      </a>
    </div>
  );
}

export default function JourneyDetail() {
  const { id } = useParams();

  const { data: journey, isLoading } = useQuery({
    queryKey: ['journey', id],
    queryFn: () => journeysApi.get(id),
    enabled: !!id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['journey-products', id],
    queryFn: () => productsApi.listByJourney(id, 6),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-rain-mist pb-24">
        <div className="h-[55vh] bg-temple-stone/30 animate-pulse" />
        <div className="p-6 space-y-4">
          <div className="h-4 bg-temple-stone/30 rounded w-1/3 animate-pulse" />
          <div className="h-8 bg-temple-stone/30 rounded w-2/3 animate-pulse" />
          <div className="h-4 bg-temple-stone/20 rounded animate-pulse" />
          <div className="h-4 bg-temple-stone/20 rounded animate-pulse w-4/5" />
        </div>
      </div>
    );
  }

  if (!journey) return null;

  return (
    <div className="min-h-screen bg-rain-mist pb-24">
      {/* Hero */}
      <div className="relative h-[60vh] overflow-hidden">
        {journey.hero_video && getInstagramReelId(journey.hero_video) ? (
          <InstagramReelHero
            reelUrl={journey.hero_video}
            coverImage={journey.cover_image}
            title={journey.title}
          />
        ) : (
          <img
            src={journey.cover_image}
            alt={journey.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-rain-cloud/85 via-rain-cloud/25 to-transparent pointer-events-none" />

        <Link
          to="/our-roots#roads"
          className="absolute top-14 left-5 z-10 flex items-center gap-1 text-white/80 font-inter text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Our Roots
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <StoryTag>{journey.location_label}</StoryTag>
          <h1 className="font-cormorant text-4xl text-white font-light mt-2 leading-tight">
            {journey.tagline}
          </h1>
          <div className="mt-3 text-white/70">
            <ShareSheet title={journey.tagline} />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-6 py-10">
        <CollapsibleNarrative shortText={journey.description} longText={journey.long_narrative} />
      </div>

      {/* Gallery */}
      {journey.gallery_images?.length > 0 && (
        <div className="px-5 pb-8">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar">
            {journey.gallery_images.map((img, i) => (
              <div key={i} className="flex-shrink-0 w-52 h-36 rounded-xl overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products from this journey — visual flow */}
      {products.length > 0 && <JourneyProductFlow products={products} journeyTitle={journey.tagline} />}
    </div>
  );
}
