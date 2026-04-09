-- =============================================================================
-- Add email_verified field to profiles for frontend visibility
-- Updated by admin-create-user (false) and auth.users trigger (true on confirm)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true;

-- Set existing profiles as verified (they were created with email_confirm: true)
UPDATE public.profiles SET email_verified = true WHERE email_verified IS NULL;

-- Make it NOT NULL with default true (existing users are verified)
ALTER TABLE public.profiles
  ALTER COLUMN email_verified SET DEFAULT true,
  ALTER COLUMN email_verified SET NOT NULL;
