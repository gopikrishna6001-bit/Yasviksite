import { motion } from 'framer-motion';

import { BRAND_LOGO_HORIZONTAL } from '@/lib/brandAssets';
import { optimizeMediaUrl } from '@/lib/mediaUrl';

const CURRENT_ADMIN_LOGO_URL = BRAND_LOGO_HORIZONTAL;

export default function SplashLoader({ logoUrl, logoWidth = 220, logoHeight = 78 }) {
  const resolvedLogoUrl = optimizeMediaUrl(logoUrl || CURRENT_ADMIN_LOGO_URL, 'logo');

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-warm-cream"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{
          duration: 0.7,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className="relative"
      >
        <motion.div
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 3,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="flex items-center justify-center"
        >
          <img
            src={resolvedLogoUrl}
            alt="Yasvik"
            width={logoWidth}
            height={logoHeight}
            className="object-contain"
            style={{
              width: `${logoWidth}px`,
              height: `${logoHeight}px`,
              maxWidth: 'min(72vw, 360px)',
              objectFit: 'contain',
              filter: 'drop-shadow(0 18px 34px rgba(30, 28, 24, 0.12))',
            }}
          />
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="absolute bottom-20 font-inter text-xs font-semibold text-deep-forest/55"
      >
        Loading Yasvik
      </motion.p>
    </motion.div>
  );
}
