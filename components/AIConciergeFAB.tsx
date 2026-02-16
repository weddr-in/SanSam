import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { AIWeddingConcierge } from './AIWeddingConcierge';

/**
 * Minimalist Floating Action Button for AI Wedding Concierge
 * Appears after scrolling with a brief greeting
 */
export const AIConciergeFAB: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show FAB only after scrolling past the Hero section (100vh)
      const heroHeight = window.innerHeight;

      if (window.scrollY > heroHeight) {
        if (!hasScrolled) {
          setHasScrolled(true);
          // Show greeting 1 second after FAB appears
          setTimeout(() => {
            setShowGreeting(true);
            // Auto-hide greeting after 4 seconds
            setTimeout(() => {
              setShowGreeting(false);
            }, 4000);
          }, 1000);
        }
      } else {
        // Hide FAB when scrolling back to Hero section
        setHasScrolled(false);
        setShowGreeting(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolled]);

  return (
    <>
      <AnimatePresence>
        {hasScrolled && (
          <>
            {/* Floating Action Button - Minimal Design */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[150]"
            >
              <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group"
              >
                {/* Subtle Glow */}
                <div className="absolute inset-0 bg-white rounded-full blur-md opacity-0 group-hover:opacity-20 transition-opacity duration-500" />

                {/* Main Button - Clean Circle */}
                <div className="relative w-14 h-14 md:w-16 md:h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300">
                  <MessageCircle size={20} className="text-white/70 group-hover:text-white transition-colors" strokeWidth={1.5} />
                </div>

                {/* Minimal Pulse Ring */}
                <motion.div
                  className="absolute inset-0 border border-white/20 rounded-full"
                  animate={{
                    scale: [1, 1.3],
                    opacity: [0.3, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
              </motion.button>
            </motion.div>

            {/* Greeting Tooltip */}
            <AnimatePresence>
              {showGreeting && !isOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 20, y: 0 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="fixed bottom-6 right-20 sm:right-24 md:bottom-10 md:right-28 z-[149] pointer-events-none max-w-[180px] sm:max-w-[200px]"
                >
                  <div className="relative">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 shadow-2xl">
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                        Need help with events, venues, or outfits?
                      </p>
                      <p className="text-[10px] sm:text-xs text-white/50 mt-0.5 sm:mt-1 font-mono uppercase tracking-wider">
                        I'm here to assist
                      </p>
                    </div>
                    {/* Arrow pointing to button */}
                    <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-white/20" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>

      {/* AI Concierge Modal */}
      <AIWeddingConcierge isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
