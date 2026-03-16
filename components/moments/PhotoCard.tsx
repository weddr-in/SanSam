import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMomentsAuth } from '../../src/lib/moments/auth-context';
import { useMomentsStore } from '../../src/lib/moments/store';
import { toggleLike, deletePhoto } from '../../src/lib/moments/storage';
import type { MomentPhoto } from '../../src/lib/moments/types';

function canDelete(userId: string | undefined, userEmail: string | undefined, photo: MomentPhoto): boolean {
  if (!userId) return false;
  if (photo.uploader_id === userId) return true;
  if (userEmail && userEmail.endsWith('@weddr.in')) return true;
  return false;
}

interface PhotoCardProps {
  photo: MomentPhoto;
  index: number;
}

export function PhotoCard({ photo, index }: PhotoCardProps) {
  const { user } = useMomentsAuth();
  const { openLightbox, updatePhotoLike, removePhoto } = useMomentsStore();
  const [deleting, setDeleting] = useState(false);
  const showDelete = canDelete(user?.id, user?.email, photo);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || deleting) return;
    if (!confirm('Delete this photo?')) return;
    setDeleting(true);
    try {
      await deletePhoto(photo.id, user.id, user.email);
      removePhoto(photo.id);
    } catch { setDeleting(false); }
  };
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  const handleLike = () => {
    if (!user) return;
    const wasLiked = photo.is_liked_by_me;
    const newCount = wasLiked ? Math.max(0, photo.likes_count - 1) : photo.likes_count + 1;
    updatePhotoLike(photo.id, !wasLiked, newCount);
    toggleLike(photo.id, user.id).catch(() => {
      updatePhotoLike(photo.id, wasLiked, photo.likes_count);
    });
  };

  const handleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap → like
      if (!photo.is_liked_by_me) {
        handleLike();
      }
      // Show floating heart animation
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
      lastTap.current = 0;
    } else {
      // Single tap → open lightbox (with delay to check for double tap)
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now) {
          openLightbox(index);
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        delay: Math.min(index * 0.04, 0.4),
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
      onClick={handleTap}
      className="group relative cursor-pointer break-inside-avoid mb-2 md:mb-3"
    >
      {/* Image frame */}
      <div className="relative overflow-hidden bg-white/[0.02]">
        {/* Skeleton shimmer */}
        {!imageLoaded && (
          <div className="aspect-square bg-white/[0.03] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
          </div>
        )}

        <img
          src={photo.image_url}
          alt={`By ${photo.uploader_name}`}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          className={`w-full block transition-all duration-700 ease-out
            group-hover:scale-[1.04]
            ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
        />

        {/* Cinematic gradient overlay — always subtle, stronger on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
          opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Double-tap heart animation */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <svg width="48" height="48" viewBox="0 0 24 24"
                fill="#d4af37" stroke="none"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(212,175,55,0.4))' }}>
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover info — desktop */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 p-3
          translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100
          transition-all duration-400 ease-out">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-sans text-[11px] text-white/80 leading-tight">{photo.uploader_name}</p>
              <p className="font-sans text-[9px] text-white/30 mt-0.5">{formatTime(photo.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleLike(); }} disabled={false}
                className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24"
                  fill={photo.is_liked_by_me ? '#d4af37' : 'none'}
                  stroke={photo.is_liked_by_me ? '#d4af37' : 'rgba(255,255,255,0.5)'}
                  strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {photo.likes_count > 0 && <span className="font-sans text-[10px] text-white/50">{photo.likes_count}</span>}
              </button>
              <button onClick={handleDownload}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              {showDelete && (
                <button onClick={handleDelete} disabled={deleting} className="opacity-60 hover:opacity-100 transition-opacity">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5">
                    <polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Compact info row beneath image */}
      <div className="md:hidden flex items-center justify-between px-0.5 pt-1.5 pb-1">
        <p className="font-sans text-[10px] text-white/25 truncate flex-1">{photo.uploader_name}</p>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); handleLike(); }} disabled={false}
            className="flex items-center gap-0.5">
            <svg width="11" height="11" viewBox="0 0 24 24"
              fill={photo.is_liked_by_me ? '#d4af37' : 'none'}
              stroke={photo.is_liked_by_me ? '#d4af37' : 'rgba(255,255,255,0.2)'}
              strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {photo.likes_count > 0 && <span className="font-sans text-[9px] text-white/20">{photo.likes_count}</span>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
