import { motion } from 'framer-motion';

// Premium cubic-bezier curve mimicking organic, physics-based decelerations
const premiumEase = [0.22, 1, 0.36, 1];

export const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        initial: {
          opacity: 0,
          y: 12,
          scale: 0.99,
        },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: 0.45,
            ease: premiumEase,
            staggerChildren: 0.1,
          },
        },
        exit: {
          opacity: 0,
          y: -8,
          transition: {
            duration: 0.25,
            ease: [0.4, 0, 1, 1],
          },
        },
      }}
      style={{ width: '100%', willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
