-- ============================================================================
-- Sprint 2: Drop api_keys.key_value (already hashed) + minor cleanups
-- ============================================================================

-- 1. Drop plaintext key_value column — keys validated via hash since 20260403000002
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS key_value;

COMMENT ON TABLE public.api_keys IS
  'API keys — validated via SHA-256 hash. Plaintext key_value dropped in v1.3.';
