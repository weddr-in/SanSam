import React, { useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMomentsAuth } from '../../src/lib/moments/auth-context';
import { useMomentsStore } from '../../src/lib/moments/store';
import { uploadToR2, savePhotoMetadata } from '../../src/lib/moments/storage';
import type { UploadProgress } from '../../src/lib/moments/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES_PER_BATCH = 20;
const MAX_CONCURRENT_UPLOADS = 3;
const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
];

interface UploadZoneProps {
  onAllDone?: () => void;
}

export function UploadZone({ onAllDone }: UploadZoneProps) {
  const { user, guestName } = useMomentsAuth();
  const { selectedEvent, uploads, setUploads, updateUpload, addPhoto } = useMomentsStore();
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [allComplete, setAllComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, []);

  const createTrackedObjectUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    return url;
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (!selectedEvent || !user) return;
    setErrorMsg('');
    setAllComplete(false);

    let allFiles = Array.from(files).filter(f => {
      if (!ACCEPTED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });

    if (allFiles.length === 0) {
      setErrorMsg('No valid files. Accepted: images/videos up to 50 MB');
      return;
    }

    if (allFiles.length > MAX_FILES_PER_BATCH) {
      allFiles = allFiles.slice(0, MAX_FILES_PER_BATCH);
      setErrorMsg(`Only the first ${MAX_FILES_PER_BATCH} files will be uploaded`);
    }

    const newUploads: UploadProgress[] = allFiles.map(f => ({
      file: f, progress: 0, status: 'pending',
    }));
    setUploads([...uploads, ...newUploads]);
    const startIdx = uploads.length;
    let successCount = 0;
    let errorCount = 0;

    const uploadFile = async (i: number) => {
      const idx = startIdx + i;
      const file = allFiles[i];
      try {
        updateUpload(idx, { status: 'uploading', progress: 0 });
        const dims = await getMediaDimensions(file);
        const { url, key, thumbnailUrl } = await uploadToR2(file, selectedEvent, user.id,
          (progress) => updateUpload(idx, { progress }));
        const photo = await savePhotoMetadata({
          event: selectedEvent, imageUrl: url, storageKey: key,
          uploaderId: user.id, uploaderName: guestName || 'Guest',
          uploaderPhone: user.user_metadata?.phone_number || '',
          width: dims.width, height: dims.height,
          thumbnailUrl,
        });
        updateUpload(idx, { status: 'done', progress: 100, url });
        addPhoto(photo);
        successCount++;
      } catch (err: any) {
        updateUpload(idx, { status: 'error', error: err.message || 'Upload failed' });
        errorCount++;
      }
    };

    for (let i = 0; i < allFiles.length; i += MAX_CONCURRENT_UPLOADS) {
      const chunk = [];
      for (let j = i; j < Math.min(i + MAX_CONCURRENT_UPLOADS, allFiles.length); j++) {
        chunk.push(uploadFile(j));
      }
      await Promise.all(chunk);
    }

    // All uploads finished
    setAllComplete(true);
  }, [selectedEvent, user, guestName, uploads, setUploads, updateUpload, addPhoto]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDone = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setUploads([]);
    setAllComplete(false);
    onAllDone?.();
  };

  const handleUploadMore = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setUploads([]);
    setAllComplete(false);
  };

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
  const doneCount = uploads.filter(u => u.status === 'done').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  const isUploading = activeUploads.length > 0;

  // Completion summary screen
  if (allComplete && uploads.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center py-10 px-6"
      >
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-20 h-20 mb-6"
        >
          <div className="absolute inset-0 rounded-full bg-[#d4af37]/[0.08] border border-[#d4af37]/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.svg
              width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <polyline points="20,6 9,17 4,12" />
            </motion.svg>
          </div>
          {/* Sparkle ring animation */}
          <motion.div
            className="absolute inset-0 rounded-full border border-[#d4af37]/30"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          />
        </motion.div>

        {/* Message */}
        <motion.p
          className="font-serif text-2xl text-[#f5f0e8] font-light mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {errorCount === 0 ? 'Moments shared!' : 'Upload complete'}
        </motion.p>

        <motion.p
          className="font-sans text-[12px] text-white/30 mb-1 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {doneCount} photo{doneCount !== 1 ? 's' : ''} added to the gallery
          {errorCount > 0 && (
            <span className="text-red-400/60"> &middot; {errorCount} failed</span>
          )}
        </motion.p>

        <motion.p
          className="font-sans text-[10px] text-white/15 mb-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Your photos are now visible to all guests
        </motion.p>

        {/* Action buttons */}
        <motion.div
          className="flex gap-3 w-full max-w-[300px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleUploadMore}
            className="flex-1 py-3.5 font-sans text-[11px] tracking-[0.2em] uppercase
              bg-white/[0.04] border border-white/[0.08] text-white/40
              hover:bg-white/[0.08] transition-colors"
          >
            Upload More
          </button>
          <button
            onClick={handleDone}
            className="flex-1 py-3.5 font-sans text-[11px] tracking-[0.2em] uppercase
              bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37]/80
              hover:bg-[#d4af37]/20 transition-colors"
          >
            Done
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Upload area — cinematic glass panel */}
      {!isUploading && (
        <motion.div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative cursor-pointer overflow-hidden
            transition-all duration-500 ease-out
            ${dragOver
              ? 'bg-[#d4af37]/[0.06] border-[#d4af37]/25'
              : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1]'}
            border backdrop-blur-sm`}
          whileTap={{ scale: 0.98 }}
        >
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple
            onChange={handleFileSelect} className="hidden" />

          <div className="flex flex-col items-center py-12 px-6">
            <div className={`relative w-14 h-14 mb-5 transition-all duration-500
              ${dragOver ? 'scale-110' : ''}`}>
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="absolute inset-0">
                <circle cx="28" cy="28" r="27" stroke={dragOver ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'} strokeWidth="0.5"/>
                <circle cx="28" cy="28" r="20" stroke={dragOver ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)'} strokeWidth="0.5"/>
                <g transform="translate(16, 17)" stroke={dragOver ? 'rgba(212,175,55,0.6)' : 'rgba(255,255,255,0.2)'} strokeWidth="1" fill="none">
                  <path d="M23 17a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="11" r="4"/>
                </g>
              </svg>
            </div>

            <p className="font-sans text-[13px] text-white/35 text-center">
              {dragOver ? (
                <span className="text-[#d4af37]/60">Drop to upload</span>
              ) : (
                <span className="text-white/50">Tap to select photos</span>
              )}
            </p>
            <p className="font-sans text-[10px] text-white/15 mt-2 tracking-wider">
              Photos & videos &middot; up to 50 MB &middot; max 20 at once
            </p>
            {errorMsg && (
              <p className="font-sans text-[10px] text-red-400/70 mt-2">{errorMsg}</p>
            )}
          </div>
        </motion.div>
      )}

      {/* Upload progress */}
      <AnimatePresence>
        {uploads.length > 0 && !allComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {/* Overall progress bar */}
            <div className="px-1 mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-sans text-[11px] text-white/40">
                  {isUploading ? (
                    <>Uploading <span className="text-[#d4af37]/70 tabular-nums">{doneCount}</span> of <span className="tabular-nums">{uploads.length}</span></>
                  ) : (
                    <>{doneCount} uploaded</>
                  )}
                </p>
                {isUploading && (
                  <div className="w-4 h-4 border border-[#d4af37]/30 border-t-[#d4af37]/70 rounded-full animate-spin" />
                )}
              </div>
              {/* Master progress bar */}
              <div className="h-[3px] bg-white/[0.06] overflow-hidden rounded-full">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#d4af37]/50 to-[#d4af37]/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploads.length > 0 ? (doneCount / uploads.length) * 100 : 0}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Individual file cards */}
            {uploads.map((upload, i) => (
              <UploadItem key={i} upload={upload} index={i} createObjectUrl={createTrackedObjectUrl} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UploadItem({ upload, index, createObjectUrl }: {
  upload: UploadProgress;
  index: number;
  createObjectUrl: (file: File) => string;
}) {
  const thumbRef = useRef<string | null>(null);
  if (!thumbRef.current) {
    thumbRef.current = createObjectUrl(upload.file);
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center gap-3 p-2.5 border transition-colors duration-300
        ${upload.status === 'done'
          ? 'bg-[#d4af37]/[0.03] border-[#d4af37]/10'
          : upload.status === 'error'
            ? 'bg-red-500/[0.03] border-red-500/10'
            : 'bg-white/[0.02] border-white/[0.04]'}`}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 overflow-hidden bg-white/[0.03] shrink-0 relative">
        <img src={thumbRef.current} alt="" className="w-full h-full object-cover" />
        {upload.status === 'done' && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-sans text-[11px] text-white/40 truncate">{upload.file.name}</p>
        {upload.status === 'uploading' && (
          <div className="mt-1.5 h-[2px] bg-white/[0.04] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#d4af37]/40 to-[#d4af37]/70"
              initial={{ width: 0 }}
              animate={{ width: `${upload.progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}
        {upload.status === 'done' && (
          <p className="font-sans text-[9px] text-[#d4af37]/40 mt-0.5">Uploaded</p>
        )}
        {upload.status === 'pending' && (
          <p className="font-sans text-[9px] text-white/15 mt-0.5">Waiting...</p>
        )}
        {upload.status === 'error' && (
          <p className="font-sans text-[10px] text-red-400/60 mt-0.5">{upload.error}</p>
        )}
      </div>

      {/* Status icon */}
      <div className="shrink-0 w-8 flex justify-end">
        {upload.status === 'uploading' && (
          <span className="font-sans text-[9px] text-[#d4af37]/40 tabular-nums">{upload.progress}%</span>
        )}
        {upload.status === 'pending' && (
          <div className="w-3 h-3 rounded-full border border-white/10" />
        )}
        {upload.status === 'error' && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
      </div>
    </motion.div>
  );
}

function getMediaDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => { resolve({ width: video.videoWidth, height: video.videoHeight }); URL.revokeObjectURL(url); };
      video.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
      video.src = url;
    } else {
      const img = new Image();
      img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve({ width: 0, height: 0 }); URL.revokeObjectURL(url); };
      img.src = url;
    }
  });
}
