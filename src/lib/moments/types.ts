export type WeddingEvent = 'sangeet' | 'reception' | 'mahurtha';

export interface EventInfo {
  id: WeddingEvent;
  title: string;
  subtitle: string;
  date: string;
  icon: string; // emoji
  gradient: string;
}

export interface MomentPhoto {
  id: string;
  event: WeddingEvent;
  image_url: string;
  thumbnail_url?: string;
  uploader_id: string;
  uploader_name: string;
  uploader_phone: string;
  likes_count: number;
  is_liked_by_me?: boolean;
  created_at: string;
  width?: number;
  height?: number;
}

export interface PhotoLike {
  id: string;
  photo_id: string;
  user_id: string;
  created_at: string;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
}

export const EVENTS: EventInfo[] = [
  {
    id: 'sangeet',
    title: 'Sangeet',
    subtitle: 'An evening of dance & celebration',
    date: 'March 24, 2026',
    icon: '🎶',
    gradient: 'from-amber-900/40 to-rose-900/40',
  },
  {
    id: 'reception',
    title: 'Reception',
    subtitle: 'A grand celebration of love',
    date: 'March 25, 2026',
    icon: '✨',
    gradient: 'from-violet-900/40 to-indigo-900/40',
  },
  {
    id: 'mahurtha',
    title: 'Mahurtha',
    subtitle: 'The sacred union',
    date: 'March 25, 2026',
    icon: '🪷',
    gradient: 'from-orange-900/40 to-amber-900/40',
  },
];
