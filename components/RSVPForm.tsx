import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneInput } from './PhoneInput';
import { EventSelector } from './EventSelector';

interface RSVPFormProps {
  formData: {
    name: string;
    phone: string;
    attending: boolean;
    guests: number;
    attending_sangeet: boolean;
    attending_reception: boolean;
    attending_muhurtha: boolean;
    side?: 'bride' | 'groom';
  };
  errors: Record<string, string>;
  isSubmitting: boolean;
  onFieldChange: (field: string, value: any) => void;
  onSubmit: () => void;
}

export function RSVPForm({
  formData,
  errors,
  isSubmitting,
  onFieldChange,
  onSubmit,
}: RSVPFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Name input */}
      <div className="space-y-2">
        <label className="block font-sans tracking-[0.2em] uppercase text-[9px] text-white/60">
          Full Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onFieldChange('name', e.target.value)}
          disabled={isSubmitting}
          placeholder="Enter your name"
          className={`w-full bg-transparent px-4 py-3 border-b ${
            errors.name ? 'border-red-500/50' : 'border-white/10'
          } text-white font-sans transition-colors duration-300 focus:outline-none focus:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed`}
          maxLength={100}
        />
        {errors.name && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-xs font-sans"
          >
            {errors.name}
          </motion.p>
        )}
      </div>

      {/* Phone input */}
      <PhoneInput
        value={formData.phone}
        onChange={(value) => onFieldChange('phone', value)}
        error={errors.phone}
        disabled={isSubmitting}
      />

      {/* Attending toggle */}
      <div className="space-y-4">
        <label className="block font-sans tracking-[0.2em] uppercase text-[9px] text-white/60">
          Will you be attending?
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onFieldChange('attending', true)}
            disabled={isSubmitting}
            className={`flex-1 py-3 px-6 border transition-all duration-300 min-h-[44px] ${
              formData.attending
                ? 'bg-white/10 border-white/40 text-white'
                : 'border-white/10 text-white/40 hover:border-white/20'
            } font-sans text-[10px] tracking-[0.2em] uppercase disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onFieldChange('attending', false)}
            disabled={isSubmitting}
            className={`flex-1 py-3 px-6 border transition-all duration-300 min-h-[44px] ${
              !formData.attending
                ? 'bg-white/10 border-white/40 text-white'
                : 'border-white/10 text-white/40 hover:border-white/20'
            } font-sans text-[10px] tracking-[0.2em] uppercase disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            No
          </button>
        </div>
      </div>

      {/* Which Side Are You From? */}
      <div className="space-y-3">
        <label className="block font-sans tracking-[0.2em] uppercase text-[9px] text-white/60">
          Which Side Are You From?
        </label>
        <div className="flex gap-3 md:gap-4 w-full">
          <button
            type="button"
            onClick={() => onFieldChange('side', 'bride')}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 md:py-3 border transition-all uppercase text-[9px] md:text-[10px] tracking-wider md:tracking-widest min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
              formData.side === 'bride'
                ? 'bg-[#B76E79] border-[#B76E79] text-white'
                : 'border-white/20 text-white/60 hover:border-[#B76E79]/50'
            }`}
          >
            Team Bride
          </button>
          <button
            type="button"
            onClick={() => onFieldChange('side', 'groom')}
            disabled={isSubmitting}
            className={`flex-1 py-2.5 md:py-3 border transition-all uppercase text-[9px] md:text-[10px] tracking-wider md:tracking-widest min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
              formData.side === 'groom'
                ? 'bg-[#D4AF37] border-[#D4AF37] text-white'
                : 'border-white/20 text-white/60 hover:border-[#D4AF37]/50'
            }`}
          >
            Team Groom
          </button>
        </div>
      </div>

      {/* Number of guests (only if attending) */}
      <AnimatePresence>
        {formData.attending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-2"
          >
            <label className="block font-sans tracking-[0.2em] uppercase text-[9px] text-white/60">
              Number of Guests
            </label>
            <select
              value={formData.guests}
              onChange={(e) => onFieldChange('guests', parseInt(e.target.value))}
              disabled={isSubmitting}
              className="w-full bg-transparent px-4 py-3 border-b border-white/10 text-white font-sans transition-colors duration-300 focus:outline-none focus:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num} className="bg-[#0a0a0a]">
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event selection (only if attending) */}
      <AnimatePresence>
        {formData.attending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <EventSelector
              selectedEvents={{
                attending_sangeet: formData.attending_sangeet,
                attending_reception: formData.attending_reception,
                attending_muhurtha: formData.attending_muhurtha,
              }}
              onChange={(eventId, value) => onFieldChange(eventId, value)}
              error={errors.events}
              disabled={isSubmitting}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit error */}
      {errors.submit && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border border-red-500/30 bg-red-500/10 rounded"
        >
          <p className="text-red-400 text-sm font-sans">{errors.submit}</p>
        </motion.div>
      )}

      {/* Submit button */}
      <motion.button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 md:py-4 border border-white/20 hover:border-white/40 transition-all duration-300 font-sans text-[10px] md:text-[11px] tracking-[0.2em] uppercase text-white disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group min-h-[48px]"
        whileHover={!isSubmitting ? { scale: 1.01 } : {}}
        whileTap={!isSubmitting ? { scale: 0.99 } : {}}
      >
        {/* Button background effect */}
        <div className="absolute inset-0 bg-white/5 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

        <span className="relative">
          {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
        </span>
      </motion.button>
    </form>
  );
}
