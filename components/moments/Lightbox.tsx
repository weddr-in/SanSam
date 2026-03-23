import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useMomentsAuth } from '../../src/lib/moments/auth-context';
import { useMomentsStore } from '../../src/lib/moments/store';
import { toggleLike, deletePhoto, flagPhoto } from '../../src/lib/moments/storage';

export function Lightbox() {
  const { user } = useMomentsAuth();
  const { photos, lightboxOpen, lightboxIndex, closeLightbox, updatePhotoLike, removePhoto, hidePhoto } = useMomentsStore();
  const [currentIndex, setCurrentIndex] = useState(lightboxIndex);
  const [direction, setDirection] = useState(0);
  const [showFlagConfirm, setShowFlagConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Prefetch cache for adjacent images
  const prefetchCache = useRef<Set<string>>(new Set());

  const photo = photos[currentIndex];

  const canDeletePhoto = (p: typeof photo) => {
    if (!user || !p) return false;
    if (p.uploader_id === user.id) return true;
    if (user.email && user.email.endsWith('@weddr.in')) return true;
    return false;
  };

  // Prefetch next/prev images for smooth swiping
  const prefetchAdjacent = useCallback((idx: number) => {
    const indicesToPrefetch = [idx - 1, idx + 1, idx + 2];
    indicesToPrefetch.forEach((i) => {
      if (i >= 0 && i < photos.length) {
        const url = photos[i].image_url;
        if (!prefetchCache.current.has(url)) {
          prefetchCache.current.add(url);
          const img = new Image();
          img.src = url;
        }
      }
    });
  }, [photos]);

  const confirmDelete = () => {
    if (!user || !photo) return;
    setShowDeleteConfirm(false);
    const photoId = photo.id;
    // Optimistic: remove from UI instantly
    if (photos.length <= 1) closeLightbox();
    else if (currentIndex >= photos.length - 1) setCurrentIndex(prev => prev - 1);
    removePhoto(photoId);
    deletePhoto(photoId, user.id, user.email).catch(() => {
      console.warn('Delete API failed for photo:', photoId);
    });
  };

  const confirmFlag = async () => {
    if (!user || !photo) return;
    setShowFlagConfirm(false);
    await flagPhoto(photo.id, user.id);
    hidePhoto(photo.id);
    if (photos.length <= 1) closeLightbox();
    else if (currentIndex >= photos.length - 1) setCurrentIndex(prev => prev - 1);
  };

  useEffect(() => {
    setCurrentIndex(lightboxIndex);
  }, [lightboxIndex]);

  // Prefetch when index changes
  useEffect(() => {
    if (lightboxOpen) {
      prefetchAdjacent(currentIndex);
    }
  }, [currentIndex, lightboxOpen, prefetchAdjacent]);

  // Lock body scroll
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [lightboxOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, currentIndex, photos.length]);

  const navigate = useCallback((dir: number) => {
    setDirection(dir);
    setCurrentIndex(prev => {
      const next = prev + dir;
      if (next < 0 || next >= photos.length) return prev;
      return next;
    });
  }, [photos.length]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.y) > 120) {
      closeLightbox();
      return;
    }
    if (info.offset.x > 80) navigate(-1);
    else if (info.offset.x < -80) navigate(1);
  };

  // Optimistic like — update UI instantly, fire API in background
  const handleLike = () => {
    if (!user || !photo) return;
    const wasLiked = photo.is_liked_by_me;
    const newCount = wasLiked ? Math.max(0, photo.likes_count - 1) : photo.likes_count + 1;
    // Instant UI update
    updatePhotoLike(photo.id, !wasLiked, newCount);
    // Fire & forget API call
    toggleLike(photo.id, user.id).catch(() => {
      // Revert on failure
      updatePhotoLike(photo.id, wasLiked, photo.likes_count);
    });
  };

  const handleDownload = async () => {
    if (!photo) return;
    try {
      const res = await fetch(photo.image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moment-${photo.event}-${photo.id.slice(0, 8)}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(photo.image_url, '_blank');
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.9 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.9 }),
  };

  return (
    <AnimatePresence>
      {lightboxOpen && photo && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] bg-[#030303]"
        >
          {/* Film grain */}
          <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none z-50"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '128px',
            }}
          />

          {/* Top bar — ALWAYS visible */}
          <div className="absolute top-0 left-0 right-0 z-30
            bg-gradient-to-b from-black/70 to-transparent
            px-4 pt-safe pb-8 md:px-8">
            <div className="flex items-center justify-between pt-4">
              <button onClick={closeLightbox}
                className="w-10 h-10 flex items-center justify-center rounded-full
                  bg-white/[0.06] backdrop-blur-md hover:bg-white/[0.12] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>

              <span className="font-sans text-[11px] tracking-[0.2em] text-white/25 tabular-nums">
                {currentIndex + 1} / {photos.length}
              </span>

              <div className="flex items-center gap-2">
                <button onClick={() => setShowFlagConfirm(true)} title="Report inappropriate"
                  className="w-10 h-10 flex items-center justify-center rounded-full
                    bg-white/[0.06] backdrop-blur-md hover:bg-red-500/20 transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </button>
                {canDeletePhoto(photo) && (
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full
                      bg-white/[0.06] backdrop-blur-md hover:bg-red-500/20 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.6)" strokeWidth="1.5">
                      <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                )}
                <button onClick={handleDownload}
                  className="w-10 h-10 flex items-center justify-center rounded-full
                    bg-white/[0.06] backdrop-blur-md hover:bg-white/[0.12] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Image area */}
          <div className="absolute inset-0 flex items-center justify-center">
            {currentIndex > 0 && (
              <button onClick={() => navigate(-1)}
                className="hidden md:flex absolute left-6 z-20 w-12 h-12 items-center justify-center
                  rounded-full bg-black/40 backdrop-blur-md border border-white/[0.06]
                  hover:bg-white/[0.08] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                  <polyline points="15,18 9,12 15,6"/>
                </svg>
              </button>
            )}

            {currentIndex < photos.length - 1 && (
              <button onClick={() => navigate(1)}
                className="hidden md:flex absolute right-6 z-20 w-12 h-12 items-center justify-center
                  rounded-full bg-black/40 backdrop-blur-md border border-white/[0.06]
                  hover:bg-white/[0.08] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </button>
            )}

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.12}
                onDragEnd={handleDragEnd}
                className="w-full h-full flex items-center justify-center px-4 touch-pan-y"
              >
                <img
                  src={photo.image_url}
                  alt={`By ${photo.uploader_name}`}
                  className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain select-none pointer-events-none"
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Flag confirmation dialog */}
          <AnimatePresence>
            {showFlagConfirm && photo && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] flex items-center justify-center px-6"
              >
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowFlagConfirm(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-[320px] bg-[#141414] border border-white/[0.08]
                    shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden"
                >
                  <div className="px-6 py-6">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20
                      flex items-center justify-center mb-4">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                      </svg>
                    </div>
                    <h3 className="font-serif text-lg text-[#f5f0e8] font-light mb-1.5">Report this photo?</h3>
                    <p className="font-sans text-[11px] text-white/30 leading-relaxed mb-6">
                      This photo will be hidden from the gallery and sent for review by the hosts.
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowFlagConfirm(false)}
                        className="flex-1 py-3 font-sans text-[11px] tracking-[0.2em] uppercase
                          bg-white/[0.04] border border-white/[0.08] text-white/40
                          hover:bg-white/[0.08] transition-colors">
                        Cancel
                      </button>
                      <button onClick={confirmFlag}
                        className="flex-1 py-3 font-sans text-[11px] tracking-[0.2em] uppercase
                          bg-red-500/10 border border-red-500/20 text-red-400/80
                          hover:bg-red-500/20 transition-colors">
                        Report
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete confirmation dialog */}
          <AnimatePresence>
            {showDeleteConfirm && photo && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[100] flex items-center justify-center px-6">
                <div className="absolute inset-0 bg-black/60" onClick={() => setShowDeleteConfirm(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-[320px] bg-[#141414] border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                  <div className="px-6 py-6">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5">
                        <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </div>
                    <h3 className="font-serif text-lg text-[#f5f0e8] font-light mb-1.5">Delete this photo?</h3>
                    <p className="font-sans text-[11px] text-white/30 leading-relaxed mb-6">This photo will be permanently removed from the gallery.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-3 font-sans text-[11px] tracking-[0.2em] uppercase bg-white/[0.04] border border-white/[0.08] text-white/40 hover:bg-white/[0.08] transition-colors">Cancel</button>
                      <button onClick={confirmDelete}
                        className="flex-1 py-3 font-sans text-[11px] tracking-[0.2em] uppercase bg-red-500/10 border border-red-500/20 text-red-400/80 hover:bg-red-500/20 transition-colors">Delete</button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom bar — ALWAYS visible */}
          <div className="absolute bottom-0 left-0 right-0 z-30
            bg-gradient-to-t from-black/70 to-transparent
            px-5 pt-10 pb-6 pb-safe md:px-8">
            <div className="flex items-end justify-between max-w-lg mx-auto">
              <div>
                <p className="font-serif text-base text-[#f5f0e8]">{photo.uploader_name}</p>
                <p className="font-sans text-[10px] text-white/20 mt-0.5">
                  {new Date(photo.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
              </div>

              <motion.button
                onClick={handleLike}
                className="flex items-center gap-2.5 px-5 py-2.5
                  bg-white/[0.06] backdrop-blur-md border border-white/[0.08]
                  rounded-full hover:bg-white/[0.1] transition-colors"
                whileTap={{ scale: 0.92 }}
              >
                <motion.svg
                  width="17" height="17" viewBox="0 0 24 24"
                  fill={photo.is_liked_by_me ? '#d4af37' : 'none'}
                  stroke={photo.is_liked_by_me ? '#d4af37' : 'rgba(255,255,255,0.4)'}
                  strokeWidth="1.5"
                  animate={photo.is_liked_by_me ? { scale: [1, 1.25, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </motion.svg>
                <span className={`font-sans text-[12px] tabular-nums ${photo.is_liked_by_me ? 'text-[#d4af37]' : 'text-white/40'}`}>
                  {photo.likes_count || ''}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
