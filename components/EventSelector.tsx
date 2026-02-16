import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Star } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  icon: React.ReactNode;
}

const EVENTS: Event[] = [
  {
    id: 'reception',
    title: 'Reception',
    subtitle: 'Evening Elegance',
    date: '24.03.26',
    icon: <Moon size={24} strokeWidth={1.5} />,
  },
  {
    id: 'muhurtha', // Mapped to 'attending_muhurtha' in DB, displayed as Wedding
    title: 'Wedding',
    subtitle: 'Sacred Dawn',
    date: '25.03.26',
    icon: <Sun size={24} strokeWidth={1.5} />,
  },
];

interface EventSelectorProps {
  selectedEvents: {
    attending_sangeet: boolean;
    attending_reception: boolean;
    attending_muhurtha: boolean;
  };
  onChange: (eventId: 'attending_sangeet' | 'attending_reception' | 'attending_muhurtha', value: boolean) => void;
  error?: string;
  disabled?: boolean;
}

export function EventSelector({ selectedEvents, onChange, error, disabled }: EventSelectorProps) {
  const eventMapping: Record<string, 'attending_sangeet' | 'attending_reception' | 'attending_muhurtha'> = {
    reception: 'attending_reception',
    muhurtha: 'attending_muhurtha',
  };

  return (
    <div className="space-y-4">
      <label className="block font-sans tracking-[0.2em] uppercase text-[9px] text-white/60">
        Which events will you attend?
      </label>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EVENTS.map((event) => {
          const eventKey = eventMapping[event.id];
          const isSelected = selectedEvents[eventKey];

          return (
            <motion.button
              key={event.id}
              type="button"
              onClick={() => !disabled && onChange(eventKey, !isSelected)}
              disabled={disabled}
              className={`
                relative p-8 rounded-sm border transition-all duration-500 overflow-hidden group
                ${isSelected
                  ? 'bg-gradient-to-br from-white/15 to-white/5 border-white/60 shadow-lg shadow-white/5'
                  : 'bg-black/40 border-white/10 hover:border-white/30 hover:bg-black/30'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              whileHover={!disabled ? { scale: 1.03, y: -4 } : {}}
              whileTap={!disabled ? { scale: 0.97 } : {}}
            >
              {/* Background glow effect */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
                  />
                )}
              </AnimatePresence>

              {/* Checkmark indicator */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white flex items-center justify-center"
                  >
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" className="text-black">
                      <path d="M1 5.5L5 9.5L13 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Event icon */}
              <div className={`mb-4 transition-all duration-500 ${isSelected ? 'text-white scale-110' : 'text-white/40 group-hover:text-white/60'}`}>
                {event.icon}
              </div>

              {/* Event details */}
              <div className="text-left relative z-10">
                <h3 className={`font-display text-2xl mb-2 transition-all duration-500 ${isSelected ? 'text-white' : 'text-white/50 group-hover:text-white/70'}`}>
                  {event.title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className={`font-sans text-[9px] tracking-[0.2em] uppercase transition-all duration-500 ${isSelected ? 'text-white/70' : 'text-white/30 group-hover:text-white/50'}`}>
                    {event.subtitle}
                  </span>
                  <div className={`w-px h-3 transition-all duration-500 ${isSelected ? 'bg-white/40' : 'bg-white/20'}`} />
                  <span className={`font-sans text-[10px] tracking-wider transition-all duration-500 ${isSelected ? 'text-white/90' : 'text-white/40 group-hover:text-white/60'}`}>
                    {event.date}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
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
