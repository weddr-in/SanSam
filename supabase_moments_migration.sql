-- ================================================
-- Moments Feature: Supabase Tables & Policies
-- Run this in your Supabase SQL Editor
-- ================================================

-- 1. Photos table
CREATE TABLE IF NOT EXISTS moment_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL CHECK (event IN ('sangeet', 'reception', 'mahurtha')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_key TEXT NOT NULL,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name TEXT NOT NULL DEFAULT 'Guest',
  uploader_phone TEXT DEFAULT '',
  width INT DEFAULT 0,
  height INT DEFAULT 0,
  flagged BOOLEAN DEFAULT FALSE,
  flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Likes table
CREATE TABLE IF NOT EXISTS moment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES moment_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, user_id) -- one like per user per photo
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_moment_photos_event ON moment_photos(event);
CREATE INDEX IF NOT EXISTS idx_moment_photos_uploader ON moment_photos(uploader_id);
CREATE INDEX IF NOT EXISTS idx_moment_photos_event_created ON moment_photos(event, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moment_photos_flagged ON moment_photos(flagged) WHERE flagged = true;
CREATE INDEX IF NOT EXISTS idx_moment_likes_photo ON moment_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_moment_likes_user ON moment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_moment_likes_photo_user ON moment_likes(photo_id, user_id);

-- 4. Enable RLS
ALTER TABLE moment_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_likes ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for moment_photos

-- Anyone authenticated can read all photos
CREATE POLICY "Authenticated users can view photos"
  ON moment_photos FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own photos
CREATE POLICY "Users can upload photos"
  ON moment_photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploader_id);

-- Users can delete their own photos; admins (@weddr.in) can delete any photo
CREATE POLICY "Users can delete own photos or admins can delete any"
  ON moment_photos FOR DELETE
  TO authenticated
  USING (
    auth.uid() = uploader_id
    OR (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@weddr.in'
  );

-- Users can flag any photo; admins (@weddr.in) can update any photo (unflag)
CREATE POLICY "Users can flag photos and admins can manage flags"
  ON moment_photos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. RLS Policies for moment_likes

-- Anyone authenticated can view likes
CREATE POLICY "Authenticated users can view likes"
  ON moment_likes FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own likes
CREATE POLICY "Users can like photos"
  ON moment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can unlike photos"
  ON moment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ================================================
-- 7. Database function: Get like counts for a batch of photos
--    This avoids the client-side .in() limitation
-- ================================================
CREATE OR REPLACE FUNCTION get_photo_like_counts(photo_ids UUID[])
RETURNS TABLE(photo_id UUID, likes_count BIGINT) AS $$
  SELECT ml.photo_id, COUNT(*) as likes_count
  FROM moment_likes ml
  WHERE ml.photo_id = ANY(photo_ids)
  GROUP BY ml.photo_id;
$$ LANGUAGE sql STABLE;

-- ================================================
-- 8. Database function: Get user's likes for a batch of photos
-- ================================================
CREATE OR REPLACE FUNCTION get_user_likes(p_user_id UUID, photo_ids UUID[])
RETURNS TABLE(photo_id UUID) AS $$
  SELECT ml.photo_id
  FROM moment_likes ml
  WHERE ml.user_id = p_user_id
    AND ml.photo_id = ANY(photo_ids);
$$ LANGUAGE sql STABLE;

-- ================================================
-- IF UPGRADING FROM PREVIOUS VERSION:
-- Run these ALTER statements to add the missing columns
-- ================================================
-- ALTER TABLE moment_photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
-- ALTER TABLE moment_photos ADD COLUMN IF NOT EXISTS flagged BOOLEAN DEFAULT FALSE;
-- ALTER TABLE moment_photos ADD COLUMN IF NOT EXISTS flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
-- CREATE INDEX IF NOT EXISTS idx_moment_photos_event_created ON moment_photos(event, created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_moment_photos_flagged ON moment_photos(flagged) WHERE flagged = true;
-- CREATE INDEX IF NOT EXISTS idx_moment_likes_photo_user ON moment_likes(photo_id, user_id);
