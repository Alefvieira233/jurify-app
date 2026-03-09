-- Add push_token to profiles for native push notifications
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token text;
