import { motion } from 'framer-motion';

export default function HamburgerButton({ open, onClick, light = false }) {
  const color = 'bg-rain-cloud';
  return (
    <button
      onClick={onClick}
      aria-label="Open menu"
      className={`w-10 h-10 rounded-full ${light ? 'bg-white/92 border border-white shadow-md' : 'bg-rain-cloud/10 border border-rain-cloud/15'} backdrop-blur-md flex flex-col items-center justify-center gap-[5px] transition-all`}
    >
      <motion.span
        animate={open ? { rotate: 45, y: 6.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`block w-4 h-[1.5px] ${color} origin-center`}
      />
      <motion.span
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }}
        className={`block w-4 h-[1.5px] ${color}`}
      />
      <motion.span
        animate={open ? { rotate: -45, y: -6.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`block w-4 h-[1.5px] ${color} origin-center`}
      />
    </button>
  );
}
