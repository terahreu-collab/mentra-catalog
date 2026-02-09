/**
 * Supabase Notifications Setup for Mentra Video Catalog
 *
 * This file documents the SQL needed to create the notifications table
 * and update the team_members table with an email column.
 *
 * Please run the SQL commands in your Supabase SQL Editor.
 */

// 1. Create the 'notifications' table
/*
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by team member
CREATE INDEX idx_notifications_team_member ON notifications(team_member_id);

-- Index for filtering unread notifications
CREATE INDEX idx_notifications_unread ON notifications(team_member_id, is_read) WHERE is_read = FALSE;
*/

// 2. Enable Row Level Security (RLS) on notifications
//    (Optional — skip if using service role key or if RLS is not enabled on other tables)
/*
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust based on your auth setup)
CREATE POLICY "Allow all access to notifications"
  ON notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/

// 3. Add 'email' column to 'team_members' table
//    This is needed so that email notifications can be sent to team members.
/*
ALTER TABLE team_members
ADD COLUMN email TEXT;
*/

// 4. Environment variable needed for Resend email service:
//    Add RESEND_API_KEY to your .env.local file:
//
//    RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
//    You can get an API key from https://resend.com/api-keys
//
//    Optionally, also set the app URL for email links:
//    NEXT_PUBLIC_APP_URL=https://your-app-url.com
