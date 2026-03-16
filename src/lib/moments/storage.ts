import { supabase } from '../supabase';
import type { MomentPhoto, WeddingEvent } from './types';

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

/**
 * Upload image to Cloudflare R2 via Vercel serverless function.
 * Flow: Client → /api/moments/upload (Vercel fn) → R2
 */
export async function uploadToR2(
  file: File,
  event: WeddingEvent,
  userId: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; key: string }> {
  // Step 1: Get presigned upload URL from our API
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch('/api/moments/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      event,
      userId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Failed to get upload URL');
  }

  const { uploadUrl, key, publicUrl } = await res.json();

  // Step 2: Upload directly to R2 using presigned URL
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });

  return { url: publicUrl || `${R2_PUBLIC_URL}/${key}`, key };
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
}): Promise<MomentPhoto> {
  const { data, error } = await supabase
    .from('moment_photos')
    .insert({
      event: params.event,
      image_url: params.imageUrl,
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
 * Fetch all photos for an event
 */
export async function fetchEventPhotos(
  event: WeddingEvent,
  userId: string
): Promise<MomentPhoto[]> {
  const { data: photos, error } = await supabase
    .from('moment_photos')
    .select('*')
    .eq('event', event)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Fetch like counts and user's own likes
  const photoIds = photos.map((p: any) => p.id);

  const { data: likeCounts } = await supabase
    .from('moment_likes')
    .select('photo_id')
    .in('photo_id', photoIds);

  const { data: myLikes } = await supabase
    .from('moment_likes')
    .select('photo_id')
    .eq('user_id', userId)
    .in('photo_id', photoIds);

  const likeMap: Record<string, number> = {};
  (likeCounts || []).forEach((l: any) => {
    likeMap[l.photo_id] = (likeMap[l.photo_id] || 0) + 1;
  });

  const myLikeSet = new Set((myLikes || []).map((l: any) => l.photo_id));

  return photos.map((p: any) => ({
    ...p,
    likes_count: likeMap[p.id] || 0,
    is_liked_by_me: myLikeSet.has(p.id),
  }));
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
 * Delete a photo (only uploader or @weddr.in admins)
 */
export async function deletePhoto(
  photoId: string,
  userId: string,
  userEmail: string | undefined
): Promise<boolean> {
  // Fetch the photo to check ownership
  const { data: photo } = await supabase
    .from('moment_photos')
    .select('uploader_id')
    .eq('id', photoId)
    .maybeSingle();

  if (!photo) return false;

  const isOwner = photo.uploader_id === userId;
  const isAdmin = !!userEmail && userEmail.endsWith('@weddr.in');

  if (!isOwner && !isAdmin) return false;

  // Delete likes first, then photo
  await supabase.from('moment_likes').delete().eq('photo_id', photoId);
  const { error } = await supabase.from('moment_photos').delete().eq('id', photoId);
  if (error) throw new Error(error.message);
  return true;
}

/**
 * Get photo counts per event
 */
export async function getEventPhotoCounts(): Promise<Record<WeddingEvent, number>> {
  const counts: Record<WeddingEvent, number> = { sangeet: 0, reception: 0, mahurtha: 0 };

  const { data, error } = await supabase
    .from('moment_photos')
    .select('event');

  if (error || !data) return counts;

  data.forEach((row: any) => {
    if (row.event in counts) {
      counts[row.event as WeddingEvent]++;
    }
  });

  return counts;
}
