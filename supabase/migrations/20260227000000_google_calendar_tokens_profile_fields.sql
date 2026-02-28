-- ============================================================================
-- Add profile fields to google_calendar_tokens
-- Required by the new OAuth flow (useGoogleCalendarConnection hook)
-- ============================================================================

ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name  TEXT,
  ADD COLUMN IF NOT EXISTS picture TEXT;

-- Allow service role to upsert (Edge Function google-calendar/oauth uses service role)
CREATE POLICY IF NOT EXISTS "Service role manages tokens"
  ON public.google_calendar_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);
