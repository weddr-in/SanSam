import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'wedding-moments';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// Service role client — bypasses RLS for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify auth token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { photoId } = req.body;
  if (!photoId || typeof photoId !== 'string') {
    return res.status(400).json({ error: 'Missing photoId' });
  }

  try {
    // Fetch photo to verify ownership or admin status
    const { data: photo, error: fetchError } = await supabase
      .from('moment_photos')
      .select('id, uploader_id, storage_key')
      .eq('id', photoId)
      .maybeSingle();

    if (fetchError || !photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Authorization: only the uploader OR @weddr.in admins
    const isOwner = photo.uploader_id === user.id;
    const isAdmin = !!user.email && user.email.endsWith('@weddr.in');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this photo' });
    }

    // Delete likes first (service role bypasses RLS)
    await supabase.from('moment_likes').delete().eq('photo_id', photoId);

    // Delete the photo record
    const { error: deleteError } = await supabase
      .from('moment_photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      return res.status(500).json({ error: deleteError.message });
    }

    // Clean up R2 files (original + thumbnail)
    if (photo.storage_key) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: photo.storage_key,
        }));
        // Also try to delete the thumbnail variant
        const thumbKey = photo.storage_key.replace(/\.[^.]+$/, '_thumb.jpg');
        await s3.send(new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: thumbKey,
        })).catch(() => {}); // Thumbnail may not exist
      } catch {
        // R2 cleanup is best-effort
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('Delete photo error:', err);
    return res.status(500).json({ error: 'Failed to delete photo' });
  }
}
