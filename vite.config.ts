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
    plugins: [react(), momentsPresignPlugin(env)],
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
