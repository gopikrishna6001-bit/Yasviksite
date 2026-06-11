import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function EntityFormModal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-rain-cloud/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative bg-white w-full max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col z-10"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
              <h2 className="font-cormorant text-xl text-rain-cloud font-medium">{title}</h2>
              <button onClick={onClose} className="text-rain-cloud/35 hover:text-rain-cloud/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}