import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRSVPForm } from '../lib/useRSVPForm';
import { RSVPForm } from '../../components/RSVPForm';
import { RSVPSuccess } from '../../components/RSVPSuccess';

export function RSVPPage() {
  const navigate = useNavigate();
  const { formData, errors, isSubmitting, isSuccess, updateField, submitForm } = useRSVPForm();

  return (
    <div className="min-h-screen bg-[#050505] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] relative">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-transparent to-white/5 pointer-events-none opacity-50" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with back button */}
        <div className="p-6 md:p-8">
          <button
            onClick={() => navigate('/')}
            className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors duration-300 min-h-[44px]"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} className="transform group-hover:-translate-x-1 transition-transform duration-300" />
            <span className="font-sans text-[10px] tracking-[0.2em] uppercase">Back</span>
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center px-6 pb-12">
          <div className="w-full max-w-2xl">
            {/* Card container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-gradient-to-br from-black/60 via-black/40 to-black/60 border border-white/20 p-8 md:p-12 backdrop-blur-xl shadow-2xl shadow-black/50 rounded-sm"
            >
              <AnimatePresence mode="wait">
                {!isSuccess ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Header */}
                    <div className="text-center mb-12 space-y-4">
                      <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-white">
                        RSVP
                      </h1>
                      <p className="font-serif italic text-lg text-white/60 max-w-md mx-auto">
                        Join us in celebrating this sacred union
                      </p>
                      <div className="w-16 h-px bg-white/20 mx-auto" />
                    </div>

                    {/* Form */}
                    <RSVPForm
                      formData={formData}
                      errors={errors}
                      isSubmitting={isSubmitting}
                      onFieldChange={updateField}
                      onSubmit={submitForm}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <RSVPSuccess />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Footer note */}
            {!isSuccess && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-center mt-6 font-sans text-[9px] tracking-wider text-white/30 uppercase"
              >
                Your information will be kept private
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
