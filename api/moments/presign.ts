import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'wedding-moments';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!; // e.g. https://moments.yourdomain.com

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

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

  const { filename, contentType, event, userId } = req.body;

  if (!filename || !contentType || !event || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate event
  if (!['sangeet', 'reception', 'mahurtha'].includes(event)) {
    return res.status(400).json({ error: 'Invalid event' });
  }

  // Generate unique key
  const ext = filename.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 10);
  const key = `moments/${event}/${userId}/${timestamp}-${randomId}.${ext}`;

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 }); // 10 min

    return res.status(200).json({
      uploadUrl,
      key,
      publicUrl: `${R2_PUBLIC_URL}/${key}`,
    });
  } catch (err: any) {
    console.error('Presign error:', err);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
}
