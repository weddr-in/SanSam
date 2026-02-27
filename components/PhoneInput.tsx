import React from 'react';
import { motion } from 'framer-motion';
import { formatPhone } from '../src/lib/phoneUtils';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export function PhoneInput({ value, onChange, error, disabled }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="space-y-2">
      <label className="block font-sans tracking-[0.2em] uppercase text-[9px] text-white/60">
        Phone Number
      </label>
      <div className="relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 font-sans text-sm text-white/40">
          +91
        </div>
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Enter mobile number"
          className={`w-full bg-transparent pl-12 pr-4 py-3 border-b ${error ? 'border-red-500/50' : 'border-white/10'
            } text-white font-sans transition-colors duration-300 focus:outline-none focus:border-white/40 disabled:opacity-50 disabled:cursor-not-allowed`}
          maxLength={11} // 10 digits + 1 space
        />
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-xs font-sans"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
