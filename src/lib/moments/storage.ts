import { supabase } from '../supabase';
import type { MomentPhoto, WeddingEvent } from './types';

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

/** Number of photos to load per page */
export const PAGE_SIZE = 40;

/** Max width for gallery thumbnails */
const THUMB_MAX_WIDTH = 600;
const THUMB_QUALITY = 0.7;

/**
 * Get the best available thumbnail URL for a photo.
 * Uses the dedicated thumbnail if one was generated at upload time,
 * otherwise falls back to the original image.
 */
export function getThumbnailUrl(photo: MomentPhoto): string {
  return photo.thumbnail_url || photo.image_url;
}

/**
 * Resize an image file client-side using Canvas.
 * Returns a compressed JPEG Blob suitable for use as a gallery thumbnail.
 * Videos are skipped (returns null).
 */
function generateThumbnail(file: File, maxWidth = THUMB_MAX_WIDTH): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (file.type.startsWith('video/')) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      // Skip if image is already small enough
      if (img.naturalWidth <= maxWidth) {
        resolve(null);
        return;
      }

      const scale = maxWidth / img.naturalWidth;
      const w = maxWidth;
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        THUMB_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Get a presigned upload URL from our API
 */
async function getPresignedUrl(token: string, params: {
  filename: string;
  contentType: string;
  event: string;
  userId: string;
}): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const res = await fetch('/api/moments/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Failed to get upload URL');
  }

  return res.json();
}

/**
 * Upload a blob/file to R2 via presigned URL with progress tracking.
 */
function uploadBlob(
  uploadUrl: string,
  blob: Blob | File,
  contentType: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(blob);
  });
}

/**
 * Upload image to Cloudflare R2 via presigned URL.
 * Also generates and uploads a thumbnail for gallery use.
 * Returns URLs for both the original and thumbnail.
 */
export async function uploadToR2(
  file: File,
  event: WeddingEvent,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; key: string; thumbnailUrl?: string }> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token || '';

  // Get presigned URL for original
  const { uploadUrl, key, publicUrl } = await getPresignedUrl(token, {
    filename: file.name,
    contentType: file.type,
    event,
    userId,
  });

  // Start thumbnail generation in parallel with the original upload
  const thumbPromise = generateThumbnail(file);

  // Upload original with progress tracking
  await uploadBlob(uploadUrl, file, file.type, onProgress);

  const finalUrl = publicUrl || `${R2_PUBLIC_URL}/${key}`;

  // Upload thumbnail if generated
  let thumbnailUrl: string | undefined;
  const thumbBlob = await thumbPromise;
  if (thumbBlob) {
    try {
      const thumbFilename = file.name.replace(/\.[^.]+$/, '_thumb.jpg');
      const { uploadUrl: thumbUploadUrl, publicUrl: thumbPublicUrl, key: thumbKey } =
        await getPresignedUrl(token, {
          filename: thumbFilename,
          contentType: 'image/jpeg',
          event,
          userId,
        });
      await uploadBlob(thumbUploadUrl, thumbBlob, 'image/jpeg');
      thumbnailUrl = thumbPublicUrl || `${R2_PUBLIC_URL}/${thumbKey}`;
    } catch {
      // Thumbnail upload failed — not critical, gallery falls back to original
    }
  }

  return { url: finalUrl, key, thumbnailUrl };
}

/**
 * Save photo metadata to Supabase after R2 upload
 */
export async function savePhotoMetadata(params: {
  event: WeddingEvent;
  imageUrl: string;
  storageKey: string;
  uploaderId: string;
  uploaderName: string;
  uploaderPhone: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}): Promise<MomentPhoto> {
  const { data, error } = await supabase
    .from('moment_photos')
    .insert({
      event: params.event,
      image_url: params.imageUrl,
      thumbnail_url: params.thumbnailUrl || null,
      storage_key: params.storageKey,
      uploader_id: params.uploaderId,
      uploader_name: params.uploaderName,
      uploader_phone: params.uploaderPhone,
      width: params.width,
      height: params.height,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return { ...data, likes_count: 0, is_liked_by_me: false };
}

/**
 * Fetch photos for an event with pagination.
 * Returns { photos, hasMore } so the UI knows whether to keep loading.
 */
export async function fetchEventPhotos(
  event: WeddingEvent,
  userId: string,
  page = 0
): Promise<{ photos: MomentPhoto[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: photos, error } = await supabase
    .from('moment_photos')
    .select('*')
    .eq('event', event)
    .or('flagged.is.null,flagged.eq.false')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  if (!photos || photos.length === 0) return { photos: [], hasMore: false };

  const photoIds = photos.map((p: any) => p.id);

  // Use RPC functions for efficient batch queries (avoids .in() limit)
  const [likeCountsResult, myLikesResult] = await Promise.all([
    supabase.rpc('get_photo_like_counts', { photo_ids: photoIds }),
    supabase.rpc('get_user_likes', { p_user_id: userId, photo_ids: photoIds }),
  ]);

  const likeMap: Record<string, number> = {};
  (likeCountsResult.data || []).forEach((row: any) => {
    likeMap[row.photo_id] = Number(row.likes_count);
  });

  const myLikeSet = new Set(
    (myLikesResult.data || []).map((row: any) => row.photo_id)
  );

  const enrichedPhotos = photos.map((p: any) => ({
    ...p,
    likes_count: likeMap[p.id] || 0,
    is_liked_by_me: myLikeSet.has(p.id),
  }));

  return {
    photos: enrichedPhotos,
    hasMore: photos.length === PAGE_SIZE,
  };
}

/**
 * Toggle like on a photo
 */
export async function toggleLike(
  photoId: string,
  userId: string
): Promise<{ liked: boolean; newCount: number }> {
  // Check if already liked
  const { data: existing } = await supabase
    .from('moment_likes')
    .select('id')
    .eq('photo_id', photoId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('moment_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('moment_likes').insert({ photo_id: photoId, user_id: userId });
  }

  // Get updated count
  const { count } = await supabase
    .from('moment_likes')
    .select('*', { count: 'exact', head: true })
    .eq('photo_id', photoId);

  return { liked: !existing, newCount: count || 0 };
}

/**
 * Delete a photo via the secure server-side API.
 * The server verifies ownership or admin status using the service role,
 * so this works for both the uploader AND @weddr.in admins regardless of RLS.
 * Also handles R2 file cleanup server-side.
 */
export async function deletePhoto(
  photoId: string,
  _userId: string,
  _userEmail: string | undefined
): Promise<boolean> {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch('/api/moments/delete-photo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ photoId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Delete failed' }));
    throw new Error(err.error || 'Failed to delete photo');
  }

  return true;
}

/**
 * Flag a photo as inappropriate (hides from gallery until admin review)
 */
export async function flagPhoto(photoId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('moment_photos')
    .update({ flagged: true, flagged_by: userId })
    .eq('id', photoId);
  if (error) throw new Error(error.message);
}

/**
 * Unflag a photo (admin restores it to gallery)
 */
export async function unflagPhoto(photoId: string): Promise<void> {
  const { error } = await supabase
    .from('moment_photos')
    .update({ flagged: false, flagged_by: null })
    .eq('id', photoId);
  if (error) throw new Error(error.message);
}

/**
 * Fetch flagged photos for admin review
 */
export async function fetchFlaggedPhotos(event: WeddingEvent): Promise<MomentPhoto[]> {
  const { data, error } = await supabase
    .from('moment_photos')
    .select('*')
    .eq('event', event)
    .eq('flagged', true)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map((p: any) => ({ ...p, likes_count: 0, is_liked_by_me: false }));
}

/**
 * Get photo counts per event using efficient COUNT queries (no row fetching)
 */
export async function getEventPhotoCounts(): Promise<Record<WeddingEvent, number>> {
  const counts: Record<WeddingEvent, number> = { sangeet: 0, reception: 0, mahurtha: 0 };

  const results = await Promise.all(
    (['sangeet', 'reception', 'mahurtha'] as WeddingEvent[]).map(async (event) => {
      const { count, error } = await supabase
        .from('moment_photos')
        .select('*', { count: 'exact', head: true })
        .eq('event', event)
        .or('flagged.is.null,flagged.eq.false');
      return { event, count: error ? 0 : (count || 0) };
    })
  );

  results.forEach(({ event, count }) => {
    counts[event] = count;
  });

  return counts;
}
