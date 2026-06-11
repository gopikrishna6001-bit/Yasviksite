import { motion } from 'framer-motion';

export default function SplashLoader({ logoUrl, logoWidth = 80, logoHeight = 80 }) {
  const resolvedLogoUrl = logoUrl || '/brand-logos/symbol-original.png';

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 flex items-center justify-center bg-rain-mist z-[999]"
    >
      {/* Logo container with breathing pulse */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{
          duration: 0.7,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className="relative"
      >
        {/* Breathing pulse ring */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.4, 0, 0.4],
          }}
          transition={{
            duration: 2.4,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
          className="absolute inset-0 rounded-full"
          style={{
            width: `${logoWidth + 40}px`,
            height: `${logoHeight + 40}px`,
            border: '2px solid #CBBCA5',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Main logo with gentle sway */}
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
            style={{ filter: 'drop-shadow(0 0 24px rgba(177, 154, 119, 0.25))' }}
          />
        </motion.div>
      </motion.div>

      {/* Loading text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="absolute bottom-20 font-cormorant text-sm tracking-widest text-rain-cloud/40 uppercase"
      >
        Loading
      </motion.p>
    </motion.div>
  );
}
