import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function StoryReadingProgress({ readTimeMinutes, storyId }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(scrolled, 100));
    };

    window.addEventListener('scroll', updateProgress);
    return () => window.removeEventListener('scroll', updateProgress);
  }, []);

  const estimateReadContinue = Math.round((readTimeMinutes || 5) * (progress / 100));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: progress > 5 ? 1 : 0 }}
      className="fixed bottom-20 right-5 z-30 bg-white rounded-full shadow-lg p-3 text-center min-w-[80px]"
    >
      <p className="font-inter text-xs text-rain-cloud/40">Reading</p>
      <p className="font-cormorant text-sm text-rain-cloud font-light">{estimateReadContinue} min</p>
      <div className="w-12 h-1 rounded-full bg-border/30 mx-auto mt-2">
        <motion.div
          className="h-full rounded-full bg-forest-canopy"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </motion.div>
  );
}