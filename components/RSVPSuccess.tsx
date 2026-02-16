import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function RSVPSuccess() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="text-center space-y-8"
    >
      {/* Animated checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        className="flex justify-center"
      >
        <div className="relative">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute inset-0 bg-white/20 rounded-full blur-2xl"
          />
          <div className="relative w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <Check size={48} strokeWidth={1.5} className="text-white" />
          </div>
        </div>
      </motion.div>

      {/* Success message */}
      <div className="space-y-4">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-4xl md:text-5xl text-white"
        >
          Thank You
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-serif italic text-lg text-white/60 max-w-md mx-auto"
        >
          Your RSVP has been received. We look forward to celebrating with you.
        </motion.p>
      </div>

      {/* Return home button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={() => navigate('/')}
        className="px-8 py-3 border border-white/20 hover:border-white/40 transition-colors duration-300 font-sans text-[10px] tracking-[0.2em] uppercase text-white"
      >
        Return Home
      </motion.button>
    </motion.div>
  );
}
