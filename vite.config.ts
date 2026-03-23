import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Dev-only plugin: handles /api/moments/presign locally (on Vercel, the serverless function handles it)
function momentsPresignPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'moments-presign',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/moments/presign' || req.method !== 'POST') {
          return next();
        }

        // Parse body
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

            const { filename, contentType, event, userId } = JSON.parse(body);

            if (!filename || !contentType || !event || !userId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing required fields' }));
              return;
            }

            const s3 = new S3Client({
              region: 'auto',
              endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
              },
            });

            const ext = filename.split('.').pop() || 'jpg';
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 10);
            const key = `moments/${event}/${userId}/${timestamp}-${randomId}.${ext}`;

            const command = new PutObjectCommand({
              Bucket: env.R2_BUCKET_NAME || 'wedding-moments',
              Key: key,
              ContentType: contentType,
            });

            const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
            const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ uploadUrl, key, publicUrl }));
          } catch (err: any) {
            console.error('Presign error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Failed to generate upload URL' }));
          }
        });
      });
    },
  };
}

// Dev-only plugin: handles /api/moments/delete-photo locally (secure delete)
function momentsDeletePhotoPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'moments-delete-photo',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/moments/delete-photo' || req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
            const { photoId } = JSON.parse(body);

            if (!photoId) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing photoId' }));
              return;
            }

            const supabase = createClient(
              env.VITE_SUPABASE_URL || env.SUPABASE_URL || '',
              env.SUPABASE_SERVICE_ROLE_KEY || ''
            );

            // Verify token
            const authHeader = req.headers.authorization as string;
            if (!authHeader?.startsWith('Bearer ')) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Unauthorized' }));
              return;
            }
            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
            if (authErr || !user) {
              res.writeHead(401, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid token' }));
              return;
            }

            // Fetch photo
            const { data: photo } = await supabase
              .from('moment_photos')
              .select('id, uploader_id, storage_key')
              .eq('id', photoId)
              .maybeSingle();

            if (!photo) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Photo not found' }));
              return;
            }

            const isOwner = photo.uploader_id === user.id;
            const isAdmin = !!user.email && user.email.endsWith('@weddr.in');
            if (!isOwner && !isAdmin) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Not authorized' }));
              return;
            }

            // Delete likes then photo (service role bypasses RLS)
            await supabase.from('moment_likes').delete().eq('photo_id', photoId);
            await supabase.from('moment_photos').delete().eq('id', photoId);

            // R2 cleanup
            if (photo.storage_key) {
              try {
                const s3 = new S3Client({
                  region: 'auto',
                  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
                });
                await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME || 'wedding-moments', Key: photo.storage_key }));
                const thumbKey = photo.storage_key.replace(/\.[^.]+$/, '_thumb.jpg');
                await s3.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME || 'wedding-moments', Key: thumbKey })).catch(() => {});
              } catch {}
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            console.error('Delete photo error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Delete failed' }));
          }
        });
      });
    },
  };
}

// Dev-only plugin: handles /api/moments/delete-file locally (R2 cleanup)
function momentsDeleteFilePlugin(env: Record<string, string>): Plugin {
  return {
    name: 'moments-delete-file',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/moments/delete-file' || req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
            const { key } = JSON.parse(body);

            if (!key || typeof key !== 'string' || !key.startsWith('moments/') || key.includes('..')) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid storage key' }));
              return;
            }

            const s3 = new S3Client({
              region: 'auto',
              endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
              credentials: {
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
              },
            });

            await s3.send(new DeleteObjectCommand({
              Bucket: env.R2_BUCKET_NAME || 'wedding-moments',
              Key: key,
            }));

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            console.error('R2 delete error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Failed to delete file' }));
          }
        });
      });
    },
  };
}

// Dev-only plugin: handles /api/moments/phone-login locally
function momentsPhoneLoginPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'moments-phone-login',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/moments/firebase-auth' || req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { createClient } = await import('@supabase/supabase-js');
            const { phone, guestName } = JSON.parse(body);

            if (!phone) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Missing phone number' }));
              return;
            }

            const supabase = createClient(
              env.VITE_SUPABASE_URL || env.SUPABASE_URL || '',
              env.SUPABASE_SERVICE_ROLE_KEY || ''
            );

            const cleanPhone = phone.replace(/\D/g, '');
            const proxyEmail = `${cleanPhone}@phone.weddr.in`;

            // Try to create user first; if exists, update instead
            const { data: createData, error: createError } = await supabase.auth.admin.createUser({
              email: proxyEmail,
              email_confirm: true,
              user_metadata: { guest_name: guestName || '', phone_number: phone },
            });

            if (createError) {
              if (createError.message?.includes('already been registered') || (createError as any).status === 422) {
                // User exists — find them with a targeted list
                const { data: allUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 50 });
                const existingUser = allUsers?.users?.find((u: any) => u.email === proxyEmail);
                if (!existingUser) {
                  res.writeHead(500, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'User exists but could not be found' }));
                  return;
                }
                if (guestName) {
                  await supabase.auth.admin.updateUserById(existingUser.id, {
                    user_metadata: { guest_name: guestName, phone_number: phone },
                  });
                }
              } else {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Failed to create user: ${createError.message}` }));
                return;
              }
            }

            // Generate magic link token for instant session
            const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: proxyEmail,
            });

            if (linkError || !linkData?.properties?.hashed_token) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Failed to generate session' }));
              return;
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ email: proxyEmail, hashedToken: linkData.properties.hashed_token }));
          } catch (err: any) {
            console.error('Phone login error:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'Authentication failed' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api/spotify-token': {
          target: 'https://accounts.spotify.com/api/token',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/spotify-token/, ''),
        },
        '/api/spotify': {
          target: 'https://api.spotify.com/v1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/spotify/, ''),
        },
      },
    },
    plugins: [react(), momentsPresignPlugin(env), momentsDeletePhotoPlugin(env), momentsDeleteFilePlugin(env), momentsPhoneLoginPlugin(env)],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
