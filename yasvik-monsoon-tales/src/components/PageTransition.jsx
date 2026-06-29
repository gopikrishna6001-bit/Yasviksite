import { motion } from 'framer-motion';

const premiumEase = [0.22, 1, 0.36, 1];

export const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={false}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.35,
          ease: premiumEase,
        },
      }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
