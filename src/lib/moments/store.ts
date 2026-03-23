import { create } from 'zustand';
import type { MomentPhoto, WeddingEvent, UploadProgress } from './types';

interface MomentsState {
  // Navigation
  currentView: 'login' | 'name' | 'events' | 'gallery';
  selectedEvent: WeddingEvent | null;

  // Gallery (paginated)
  photos: MomentPhoto[];
  photoCounts: Record<WeddingEvent, number>;
  loadingPhotos: boolean;
  loadingMore: boolean;
  currentPage: number;
  hasMore: boolean;

  // Upload
  uploads: UploadProgress[];

  // Lightbox
  lightboxOpen: boolean;
  lightboxIndex: number;

  // Actions
  setView: (view: MomentsState['currentView']) => void;
  setSelectedEvent: (event: WeddingEvent | null) => void;
  setPhotos: (photos: MomentPhoto[]) => void;
  appendPhotos: (photos: MomentPhoto[]) => void;
  addPhoto: (photo: MomentPhoto) => void;
  setPhotoCounts: (counts: Record<WeddingEvent, number>) => void;
  setLoadingPhotos: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setCurrentPage: (page: number) => void;
  setHasMore: (hasMore: boolean) => void;
  resetGallery: () => void;
  setUploads: (uploads: UploadProgress[]) => void;
  updateUpload: (index: number, update: Partial<UploadProgress>) => void;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  updatePhotoLike: (photoId: string, liked: boolean, newCount: number) => void;
  removePhoto: (photoId: string) => void;
  hidePhoto: (photoId: string) => void;
}

export const useMomentsStore = create<MomentsState>((set) => ({
  currentView: 'login',
  selectedEvent: null,
  photos: [],
  photoCounts: { sangeet: 0, reception: 0, mahurtha: 0 },
  loadingPhotos: false,
  loadingMore: false,
  currentPage: 0,
  hasMore: true,
  uploads: [],
  lightboxOpen: false,
  lightboxIndex: 0,

  setView: (view) => set({ currentView: view }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setPhotos: (photos) => set({ photos }),
  appendPhotos: (newPhotos) =>
    set((s) => {
      // Deduplicate by ID in case of race conditions
      const existingIds = new Set(s.photos.map((p) => p.id));
      const unique = newPhotos.filter((p) => !existingIds.has(p.id));
      return { photos: [...s.photos, ...unique] };
    }),
  addPhoto: (photo) => set((s) => ({ photos: [photo, ...s.photos] })),
  setPhotoCounts: (counts) => set({ photoCounts: counts }),
  setLoadingPhotos: (loading) => set({ loadingPhotos: loading }),
  setLoadingMore: (loading) => set({ loadingMore: loading }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setHasMore: (hasMore) => set({ hasMore }),
  resetGallery: () => set({ photos: [], currentPage: 0, hasMore: true, loadingPhotos: false, loadingMore: false }),
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
  hidePhoto: (photoId) =>
    set((s) => ({
      photos: s.photos.filter((p) => p.id !== photoId),
    })),
}));
