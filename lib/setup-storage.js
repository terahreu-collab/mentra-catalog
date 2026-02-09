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
 * ─── 4. CREATE THE "lesson-files" STORAGE BUCKET ───────
 *
 * This bucket stores file attachments (images, PDFs, docs,
 * screenshots, etc.) uploaded to individual lessons.
 *
 * Option A — Via Supabase Dashboard:
 *   1. Go to Storage → New bucket
 *   2. Name: lesson-files
 *   3. Toggle "Public bucket" ON
 *   4. Max file size: 50 MB (or adjust as needed)
 *   5. Click "Create bucket"
 *
 * Option B — Via SQL:
 */

const CREATE_LESSON_FILES_BUCKET_SQL = `
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'lesson-files',
  'lesson-files',
  true,
  52428800  -- 50 MB in bytes
)
ON CONFLICT (id) DO NOTHING;
`;

/**
 * ─── 5. STORAGE RLS POLICIES FOR "lesson-files" ───────
 */

const LESSON_FILES_POLICIES_SQL = `
-- Allow public read access to lesson-files
CREATE POLICY "Public read access on lesson-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'lesson-files');

-- Allow uploads (INSERT) with the anon key
CREATE POLICY "Allow uploads to lesson-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'lesson-files');

-- Allow updates with the anon key
CREATE POLICY "Allow updates to lesson-files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'lesson-files');

-- Allow deletes with the anon key
CREATE POLICY "Allow deletes from lesson-files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'lesson-files');
`;

/**
 * ─── 6. ADD lesson_files COLUMN TO lessons TABLE ───────
 *
 * Stores file metadata as a JSON array. Each entry:
 * {
 *   "filename": "screenshot.png",
 *   "url": "https://...supabase.co/storage/v1/object/public/lesson-files/...",
 *   "storagePath": "lesson-id/timestamp_filename.png",
 *   "size": 204800,
 *   "type": "image/png",
 *   "note": "Use this screenshot at 0:45 in the video",
 *   "uploadedAt": "2026-02-09T12:00:00.000Z"
 * }
 */

const ALTER_LESSONS_FILES_SQL = `
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS lesson_files jsonb;
`;

/**
 * ─── 7. QUICK REFERENCE ──────────────────────────────────
 *
 * After running the SQL above your setup is:
 *
 *   Storage bucket:  "videos"        (public, 500 MB limit, video/* only)
 *   Storage bucket:  "lesson-files"  (public, 50 MB limit, any file type)
 *
 *   Lessons table columns:
 *     - script_content  (text)   — stores the lesson script
 *     - quiz_content    (jsonb)  — stores quiz questions as JSON
 *     - video_url       (text)   — stores the public video URL
 *     - lesson_files    (jsonb)  — stores file attachment metadata as JSON
 *
 * The app reads/writes these via the Supabase client in lib/supabase.js.
 */

module.exports = {
  CREATE_BUCKET_SQL,
  STORAGE_POLICIES_SQL,
  ALTER_LESSONS_SQL,
  CREATE_LESSON_FILES_BUCKET_SQL,
  LESSON_FILES_POLICIES_SQL,
  ALTER_LESSONS_FILES_SQL,
}
