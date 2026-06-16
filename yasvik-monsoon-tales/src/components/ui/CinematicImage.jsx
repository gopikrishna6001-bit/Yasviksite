import { useState } from 'react';
import { motion } from 'framer-motion';

export default function CinematicImage({ src, alt, className = '', aspectRatio = 'aspect-[4/3]', priority = false }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-temple-stone/20 ${aspectRatio} ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-temple-stone/30 to-moss-green/10 animate-pulse" />
      )}
      <motion.img
        src={src}
        alt={alt || ''}
        className={`w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'low'}
      />
    </div>
  );
}
