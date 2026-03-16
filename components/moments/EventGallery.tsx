import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMomentsAuth } from '../../src/lib/moments/auth-context';
import { useMomentsStore } from '../../src/lib/moments/store';
import { fetchEventPhotos } from '../../src/lib/moments/storage';
import { EVENTS } from '../../src/lib/moments/types';
import { UploadZone } from './UploadZone';
import { PhotoCard } from './PhotoCard';
import { Lightbox } from './Lightbox';

export function EventGallery() {
  const { user } = useMomentsAuth();
  const { selectedEvent, setView, setSelectedEvent, photos, setPhotos, loadingPhotos, setLoadingPhotos } = useMomentsStore();
  const [showUpload, setShowUpload] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);

  const event = EVENTS.find(e => e.id === selectedEvent);

  useEffect(() => {
    if (!selectedEvent || !user) return;
    setLoadingPhotos(true);
    fetchEventPhotos(selectedEvent, user.id)
      .then(setPhotos)
      .catch(console.error)
      .finally(() => setLoadingPhotos(false));
  }, [selectedEvent, user]);

  const handleBack = () => {
    setSelectedEvent(null);
    setPhotos([]);
    setView('events');
  };

  if (!event) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">

      {/* Cinematic header with event branding */}
      <motion.div
        className="relative z-20 px-4 pt-6 pb-4 md:px-8 md:pt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back + title row */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full
              bg-white/[0.04] border border-white/[0.06]
              hover:bg-white/[0.08] transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl md:text-3xl text-[#f5f0e8] font-light truncate">
              {event.title}
            </h1>
          </div>
        </div>

        <p className="font-sans text-[10px] text-white/20 tracking-wider ml-12">
          {photos.length} moment{photos.length !== 1 ? 's' : ''} &middot; {event.date}
        </p>

        {/* Thin gold line separator */}
        <div className="mt-4 h-px bg-gradient-to-r from-[#d4af37]/20 via-[#d4af37]/10 to-transparent" />
      </motion.div>

      {/* Gallery content */}
      <div ref={galleryRef} className="flex-1 px-2 md:px-4 pb-24">
        {loadingPhotos ? (
          // Cinematic skeleton — staggered reveal shimmer
          <div className="columns-2 md:columns-3 lg:columns-4 gap-2 md:gap-3 pt-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.06 }}
                className="mb-2 md:mb-3 overflow-hidden"
                style={{ height: `${180 + ((i * 67) % 120)}px` }}
              >
                <div className="w-full h-full bg-white/[0.03] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : photos.length === 0 ? (
          // Empty state — cinematic, inviting
          <motion.div
            className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Camera aperture icon */}
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
              <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-4 rounded-full border border-[#d4af37]/10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(212,175,55,0.25)" strokeWidth="1">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
            </div>

            <p className="font-serif text-xl text-white/35 mb-2">No moments yet</p>
            <p className="font-sans text-[12px] text-white/15 mb-8 max-w-[220px] leading-relaxed">
              Be the first to capture a memory from {event.title}
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-8 py-3.5 bg-[#d4af37]/10 border border-[#d4af37]/20
                font-sans text-[11px] tracking-[0.3em] uppercase text-[#d4af37]/80
                hover:bg-[#d4af37]/20 hover:border-[#d4af37]/35
                active:scale-[0.97] transition-all duration-300"
            >
              Share Photos
            </button>
          </motion.div>
        ) : (
          // Masonry gallery — cinematic spacing
          <motion.div
            className="columns-2 md:columns-3 lg:columns-4 gap-2 md:gap-3 pt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {photos.map((photo, i) => (
              <PhotoCard key={photo.id} photo={photo} index={i} />
            ))}
          </motion.div>
        )}
      </div>

      {/* Floating upload button — elegant, cinematic */}
      <motion.button
        onClick={() => setShowUpload(true)}
        className="fixed bottom-6 right-5 z-30 flex items-center gap-2.5
          px-5 py-3.5 bg-[#0a0a0a]/80 backdrop-blur-xl
          border border-[#d4af37]/20
          shadow-[0_8px_32px_rgba(0,0,0,0.5)]
          hover:border-[#d4af37]/40 hover:bg-[#0a0a0a]/90
          active:scale-[0.96] transition-all duration-300"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 150, damping: 20 }}
        whileTap={{ scale: 0.96 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
        <span className="font-sans text-[10px] tracking-[0.25em] uppercase text-[#d4af37]/80">
          Upload
        </span>
      </motion.button>

      {/* Upload overlay — slides up from bottom */}
      <AnimatePresence>
        {showUpload && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpload(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />

            {/* Upload panel */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0c0c] border-t border-white/[0.06]
                rounded-t-2xl max-h-[85vh] overflow-y-auto pb-safe"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-8 h-0.5 rounded-full bg-white/10" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 pb-4">
                <div>
                  <h3 className="font-serif text-xl text-[#f5f0e8] font-light">Share your photos</h3>
                  <p className="font-sans text-[10px] text-white/20 mt-1">{event.title} &middot; {event.date}</p>
                </div>
                <button
                  onClick={() => setShowUpload(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full
                    bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              {/* Upload zone */}
              <div className="px-5 pb-6">
                <UploadZone />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <Lightbox />
    </div>
  );
}
