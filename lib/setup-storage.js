/**
 * ═══════════════════════════════════════════════════════════
 * Supabase Storage & Database Setup for Mentra Video Catalog
 * ═══════════════════════════════════════════════════════════
 *
 * Run the SQL statements below in the Supabase SQL Editor
 * (Dashboard → SQL Editor → New Query) to set up the
 * storage bucket and the new lesson columns.
 *
 * ─── 1. CREATE THE "videos" STORAGE BUCKET ───────────────
 *
 * Option A — Via Supabase Dashboard (recommended):
 *   1. Go to Storage in the sidebar
 *   2. Click "New bucket"
 *   3. Name: videos
 *   4. Toggle "Public bucket" ON (so video URLs are publicly accessible)
 *   5. Allowed MIME types (optional): video/*
 *   6. Max file size: 500 MB (or whatever limit you prefer)
 *   7. Click "Create bucket"
 *
 * Option B — Via SQL:
 */

// -- Insert the bucket row (run once)
const CREATE_BUCKET_SQL = `
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'videos',
  'videos',
  true,
  524288000,                -- 500 MB in bytes
  ARRAY['video/*']::text[]  -- only allow video files
)
ON CONFLICT (id) DO NOTHING;
`;

/**
 * ─── 2. STORAGE RLS POLICIES ─────────────────────────────
 *
 * These policies let any authenticated (or anonymous/anon-key)
 * user upload, read, and delete videos.
 * Adjust to your security needs in production.
 */

const STORAGE_POLICIES_SQL = `
-- Allow public read access to the videos bucket
CREATE POLICY "Public read access on videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');

-- Allow uploads (INSERT) with the anon key
CREATE POLICY "Allow uploads to videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'videos');

-- Allow updates (upsert / replace) with the anon key
CREATE POLICY "Allow updates to videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'videos');

-- Allow deletes with the anon key
CREATE POLICY "Allow deletes from videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'videos');
`;

/**
 * ─── 3. ADD NEW COLUMNS TO THE lessons TABLE ─────────────
 *
 * These columns store the script text, quiz JSON, and video URL.
 * Run this if the columns don't already exist.
 */

const ALTER_LESSONS_SQL = `
-- Script content (plain text, unlimited length)
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS script_content text;

-- Quiz content (JSON array of questions)
-- Each question: { "question": "...", "options": ["A","B","C","D"], "correct": 0 }
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS quiz_content jsonb;

-- Video URL (public URL from Supabase Storage)
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS video_url text;
`;

/**
 * ─── 4. QUICK REFERENCE ──────────────────────────────────
 *
 * After running the SQL above your setup is:
 *
 *   Storage bucket:  "videos"  (public, 500 MB limit)
 *   Lessons table new columns:
 *     - script_content  (text)       — stores the lesson script
 *     - quiz_content    (jsonb)      — stores quiz questions as JSON
 *     - video_url       (text)       — stores the public video URL
 *
 * The app reads/writes these via the Supabase client in lib/supabase.js.
 */

// Export the SQL strings so you can copy-paste them easily,
// or programmatically run them if you wire up an admin script.
module.exports = {
  CREATE_BUCKET_SQL,
  STORAGE_POLICIES_SQL,
  ALTER_LESSONS_SQL,
}
