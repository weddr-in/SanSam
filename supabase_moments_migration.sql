-- ================================================
-- Moments Feature: Supabase Tables & Policies
-- Run this in your Supabase SQL Editor
-- ================================================

-- 1. Photos table
CREATE TABLE IF NOT EXISTS moment_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event TEXT NOT NULL CHECK (event IN ('sangeet', 'reception', 'mahurtha')),
  image_url TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name TEXT NOT NULL DEFAULT 'Guest',
  uploader_phone TEXT DEFAULT '',
  width INT DEFAULT 0,
  height INT DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_moment_likes_photo ON moment_likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_moment_likes_user ON moment_likes(user_id);

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

-- Users can delete their own photos
CREATE POLICY "Users can delete own photos"
  ON moment_photos FOR DELETE
  TO authenticated
  USING (auth.uid() = uploader_id);

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
-- IMPORTANT: Enable Phone Auth in Supabase Dashboard
-- Go to: Authentication → Providers → Phone
-- Enable Phone provider and configure Twilio or
-- another SMS provider with your credentials
-- ================================================
