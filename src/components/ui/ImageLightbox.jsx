import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function ImageLightbox({ src, alt, caption, onClose }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[999] bg-rain-cloud/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
          onClick={onClose}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        <img
          src={src}
          alt={alt}
          className="max-w-[92vw] max-h-[90vh] w-auto rounded-2xl object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {/* Caption */}
        {caption && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 font-cormorant text-white/70 text-lg text-center italic"
          >
            {caption}
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}