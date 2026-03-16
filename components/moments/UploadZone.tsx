import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMomentsAuth } from '../../src/lib/moments/auth-context';
import { useMomentsStore } from '../../src/lib/moments/store';
import { uploadToR2, savePhotoMetadata } from '../../src/lib/moments/storage';
import type { UploadProgress } from '../../src/lib/moments/types';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES_PER_BATCH = 20;
const ACCEPTED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo',
];

export function UploadZone() {
  const { user, guestName } = useMomentsAuth();
  const { selectedEvent, uploads, setUploads, updateUpload, addPhoto } = useMomentsStore();
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    if (!selectedEvent || !user) return;
    setErrorMsg('');

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

    const validFiles = allFiles;

    const newUploads: UploadProgress[] = validFiles.map(f => ({
      file: f, progress: 0, status: 'pending',
    }));
    setUploads([...uploads, ...newUploads]);
    const startIdx = uploads.length;

    for (let i = 0; i < validFiles.length; i++) {
      const idx = startIdx + i;
      const file = validFiles[i];
      try {
        updateUpload(idx, { status: 'uploading', progress: 0 });
        const dims = await getImageDimensions(file);
        const { url, key } = await uploadToR2(file, selectedEvent, user.id,
          (progress) => updateUpload(idx, { progress }));
        const photo = await savePhotoMetadata({
          event: selectedEvent, imageUrl: url, storageKey: key,
          uploaderId: user.id, uploaderName: guestName || 'Guest',
          uploaderPhone: user.phone || '',
          width: dims.width, height: dims.height,
        });
        updateUpload(idx, { status: 'done', progress: 100, url });
        addPhoto(photo);
      } catch (err: any) {
        updateUpload(idx, { status: 'error', error: err.message || 'Upload failed' });
      }
    }
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

  const activeUploads = uploads.filter(u => u.status === 'uploading' || u.status === 'pending');
  const doneCount = uploads.filter(u => u.status === 'done').length;

  return (
    <div className="space-y-5">
      {/* Upload area — cinematic glass panel, not a dashed box */}
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
          {/* Camera aperture icon */}
          <div className={`relative w-14 h-14 mb-5 transition-all duration-500
            ${dragOver ? 'scale-110' : ''}`}>
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="absolute inset-0">
              {/* Outer ring */}
              <circle cx="28" cy="28" r="27" stroke={dragOver ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.06)'} strokeWidth="0.5"/>
              {/* Inner ring */}
              <circle cx="28" cy="28" r="20" stroke={dragOver ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.04)'} strokeWidth="0.5"/>
              {/* Camera icon */}
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
              <>
                <span className="text-white/50">Tap to select photos</span>
              </>
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

      {/* Upload progress — cinematic film strip feel */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {/* Summary bar */}
            <div className="flex items-center justify-between px-1 mb-1">
              <p className="font-sans text-[10px] text-white/25 tracking-wider">
                {activeUploads.length > 0
                  ? `Uploading ${activeUploads.length}...`
                  : `${doneCount} uploaded`}
              </p>
              {uploads.every(u => u.status === 'done' || u.status === 'error') && (
                <button onClick={() => setUploads([])}
                  className="font-sans text-[9px] text-white/15 hover:text-white/30 transition-colors tracking-wider uppercase">
                  Clear
                </button>
              )}
            </div>

            {/* Individual file cards */}
            {uploads.map((upload, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-2.5 bg-white/[0.02] border border-white/[0.04]"
              >
                {/* Thumbnail */}
                <div className="w-10 h-10 overflow-hidden bg-white/[0.03] shrink-0">
                  <img src={URL.createObjectURL(upload.file)} alt=""
                    className="w-full h-full object-cover" />
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
                  {upload.status === 'error' && (
                    <p className="font-sans text-[10px] text-red-400/60 mt-0.5">{upload.error}</p>
                  )}
                </div>

                {/* Status */}
                <div className="shrink-0 w-6 text-right">
                  {upload.status === 'done' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" opacity="0.7">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  )}
                  {upload.status === 'uploading' && (
                    <span className="font-sans text-[9px] text-[#d4af37]/40 tabular-nums">{upload.progress}%</span>
                  )}
                  {upload.status === 'error' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.4">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(img.src); };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
