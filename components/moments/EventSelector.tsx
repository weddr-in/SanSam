import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMomentsAuth } from '../../src/lib/moments/auth-context';
import { useMomentsStore } from '../../src/lib/moments/store';
import { EVENTS, type WeddingEvent } from '../../src/lib/moments/types';
import { getEventPhotoCounts } from '../../src/lib/moments/storage';

// Cinematic cover images for each event
const EVENT_COVERS: Record<WeddingEvent, string> = {
  sangeet: 'https://i.pinimg.com/736x/da/30/70/da30705a938baf0a28c62ff565d1f858.jpg',
  reception: 'https://wciudwliwmxfmevbzzfc.supabase.co/storage/v1/object/public/pics/2.png',
  mahurtha: 'https://i.pinimg.com/736x/68/00/6c/68006cebf5583930ccb5d77dd3489202.jpg',
};

export function MomentsEventSelector() {
  const { guestName, signOut } = useMomentsAuth();
  const { setView, setSelectedEvent, photoCounts, setPhotoCounts } = useMomentsStore();
  const [pressedEvent, setPressedEvent] = useState<WeddingEvent | null>(null);

  useEffect(() => {
    getEventPhotoCounts().then(setPhotoCounts).catch(console.error);
  }, []);

  const handleSelect = (eventId: WeddingEvent) => {
    setPressedEvent(eventId);
    setTimeout(() => {
      setSelectedEvent(eventId);
      setView('gallery');
    }, 200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      {/* Header */}
      <motion.div
        className="relative z-20 flex items-center justify-between px-5 pt-6 pb-3 md:px-10 lg:px-16 md:pt-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <p className="text-3xl text-[#d4af37]/40 tracking-wide leading-none" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontStyle: 'italic' }}>
          S <span className="text-[#d4af37]/20 text-xl">&</span> S
        </p>
        <div className="flex items-center gap-4">
          <span className="font-sans text-[11px] text-white/30">{guestName}</span>
          <button
            onClick={signOut}
            className="font-sans text-[9px] tracking-[0.15em] uppercase text-white/15
              hover:text-white/35 transition-colors"
          >
            Sign out
          </button>
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        className="relative z-10 px-5 pt-2 pb-5 md:px-10 lg:px-16 md:pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <h1 className="font-serif text-[38px] md:text-5xl lg:text-6xl text-[#f5f0e8] font-light leading-[1.05] tracking-tight">
          Choose your moment
        </h1>
        <div className="w-10 h-px bg-[#d4af37]/30 mt-4 md:mt-6" />
      </motion.div>

      {/* Event cards — stacked on mobile, 3-col grid on desktop */}
      <div className="flex-1 px-4 pb-8 md:px-10 lg:px-16 md:pb-12
        grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 lg:gap-6
        auto-rows-min md:auto-rows-fr">
        {EVENTS.map((event, i) => (
          <motion.button
            key={event.id}
            onClick={() => handleSelect(event.id)}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.4 + i * 0.15,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="group relative w-full text-left overflow-hidden block"
          >
            {/* Image container — landscape on mobile, tall portrait on desktop */}
            <div className={`relative aspect-[16/10] md:aspect-[3/4] lg:aspect-[3/4] overflow-hidden
              transition-transform duration-500 ease-out
              ${pressedEvent === event.id ? 'scale-[0.97]' : 'group-active:scale-[0.98]'}`}
            >
              {/* Cover image */}
              <img
                src={EVENT_COVERS[event.id]}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover
                  transition-transform duration-700 ease-out
                  group-hover:scale-[1.06]"
              />

              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10 opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent md:bg-none" />

              {/* Film grain */}
              <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                  backgroundSize: '128px',
                }}
              />

              {/* Photo count badge */}
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/[0.06] rounded-full">
                  <span className="font-sans text-[10px] tracking-wider text-white/50">
                    {photoCounts[event.id]} {photoCounts[event.id] === 1 ? 'photo' : 'photos'}
                  </span>
                </div>
              </div>

              {/* Event info — bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                <p className="font-sans text-[9px] tracking-[0.4em] uppercase text-[#d4af37]/50 mb-2">
                  {event.date}
                </p>
                <h3 className="font-serif text-3xl md:text-[28px] lg:text-4xl text-[#f5f0e8] font-light leading-none
                  group-hover:text-[#d4af37]/90 transition-colors duration-500">
                  {event.title}
                </h3>
                <p className="font-sans text-[11px] text-white/30 mt-2 tracking-wide">
                  {event.subtitle}
                </p>

                {/* Enter arrow */}
                <motion.div
                  className="mt-4 w-10 h-10 rounded-full border border-white/[0.1]
                    flex items-center justify-center
                    bg-white/[0.04] backdrop-blur-sm
                    group-hover:border-[#d4af37]/30 group-hover:bg-[#d4af37]/[0.08]
                    transition-all duration-500"
                  animate={{ x: pressedEvent === event.id ? 6 : 0 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="1.5"
                    className="text-white/30 group-hover:text-[#d4af37]/70 transition-colors duration-500">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.div>
              </div>

              {/* Hover shimmer line */}
              <div className="absolute bottom-0 left-0 right-0 h-px
                bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent
                opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
