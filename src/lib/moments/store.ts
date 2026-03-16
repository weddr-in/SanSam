import { create } from 'zustand';
import type { MomentPhoto, WeddingEvent, UploadProgress } from './types';

interface MomentsState {
  // Navigation
  currentView: 'login' | 'name' | 'events' | 'gallery';
  selectedEvent: WeddingEvent | null;

  // Gallery
  photos: MomentPhoto[];
  photoCounts: Record<WeddingEvent, number>;
  loadingPhotos: boolean;

  // Upload
  uploads: UploadProgress[];

  // Lightbox
  lightboxOpen: boolean;
  lightboxIndex: number;

  // Actions
  setView: (view: MomentsState['currentView']) => void;
  setSelectedEvent: (event: WeddingEvent | null) => void;
  setPhotos: (photos: MomentPhoto[]) => void;
  addPhoto: (photo: MomentPhoto) => void;
  setPhotoCounts: (counts: Record<WeddingEvent, number>) => void;
  setLoadingPhotos: (loading: boolean) => void;
  setUploads: (uploads: UploadProgress[]) => void;
  updateUpload: (index: number, update: Partial<UploadProgress>) => void;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  updatePhotoLike: (photoId: string, liked: boolean, newCount: number) => void;
  removePhoto: (photoId: string) => void;
}

export const useMomentsStore = create<MomentsState>((set) => ({
  currentView: 'login',
  selectedEvent: null,
  photos: [],
  photoCounts: { sangeet: 0, reception: 0, mahurtha: 0 },
  loadingPhotos: false,
  uploads: [],
  lightboxOpen: false,
  lightboxIndex: 0,

  setView: (view) => set({ currentView: view }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setPhotos: (photos) => set({ photos }),
  addPhoto: (photo) => set((s) => ({ photos: [photo, ...s.photos] })),
  setPhotoCounts: (counts) => set({ photoCounts: counts }),
  setLoadingPhotos: (loading) => set({ loadingPhotos: loading }),
  setUploads: (uploads) => set({ uploads }),
  updateUpload: (index, update) =>
    set((s) => ({
      uploads: s.uploads.map((u, i) => (i === index ? { ...u, ...update } : u)),
    })),
  openLightbox: (index) => set({ lightboxOpen: true, lightboxIndex: index }),
  closeLightbox: () => set({ lightboxOpen: false }),
  updatePhotoLike: (photoId, liked, newCount) =>
    set((s) => ({
      photos: s.photos.map((p) =>
        p.id === photoId ? { ...p, is_liked_by_me: liked, likes_count: newCount } : p
      ),
    })),
  removePhoto: (photoId) =>
    set((s) => ({
      photos: s.photos.filter((p) => p.id !== photoId),
    })),
}));
