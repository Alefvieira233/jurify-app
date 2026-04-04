-- ============================================================================
-- DEB-002: API Keys Hashing & Tenant Scoping
--
-- Problem: api_keys.key_value stores API keys in plaintext.
-- The table also lacks tenant_id, meaning keys are not tenant-scoped.
--
-- Current schema (from types.ts):
--   id UUID PK, nome TEXT, key_value TEXT, ativo BOOLEAN,
--   criado_por UUID, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
--   No tenant_id column. No Relationships (FKs).
--
-- Frontend: useApiKeys.ts already passes tenant_id on insert (via
-- supabaseUntyped), and queries filter by tenant_id — suggesting the column
-- may exist in the DB but was not regenerated in types.ts properly, OR
-- the column exists and is being used via untyped client.
--
-- Strategy:
--   1. Add tenant_id, key_hash, key_prefix columns
--   2. Backfill tenant_id from profiles (via criado_por)
--   3. Populate key_hash and key_prefix from existing key_value
--   4. Create validation function for hash-based API key lookup
--   5. Keep key_value for rollback safety (drop in Sprint 2)
--
-- Storage bucket RLS: Already secured (migration 20260307000006).
-- Webhook signatures: Stripe and Kapso both use HMAC verification.
-- ============================================================================

BEGIN;

-- =========================================================================
-- STEP 1: Enable pgcrypto extension (required for digest/hmac functions)
-- =========================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- STEP 2: Add new columns to api_keys
-- =========================================================================

-- tenant_id — may already exist if frontend is using it via untyped client
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE public.api_keys ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- key_hash — SHA-256 hash of the key for secure comparison
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'key_hash'
  ) THEN
    ALTER TABLE public.api_keys ADD COLUMN key_hash TEXT;
  END IF;
END $$;

-- key_prefix — first 8 chars of the key for identification (e.g., "jf_a1b2c3")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'api_keys'
      AND column_name = 'key_prefix'
  ) THEN
    ALTER TABLE public.api_keys ADD COLUMN key_prefix VARCHAR(8);
  END IF;
END $$;

-- =========================================================================
-- STEP 3: Create hash function
-- Uses SHA-256 with a per-row salt (the key id) for uniqueness.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.hash_api_key(p_key TEXT, p_salt TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(p_salt || ':' || p_key, 'sha256'),
    'hex'
  );
$$;

COMMENT ON FUNCTION public.hash_api_key IS
  'Compute SHA-256 hash of an API key with a salt (typically the key row id). '
  'Used for secure storage and comparison without storing plaintext.';

-- =========================================================================
-- STEP 4: Backfill tenant_id from profiles (via criado_por)
-- =========================================================================
UPDATE public.api_keys ak
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE ak.criado_por = p.id
  AND ak.tenant_id IS NULL
  AND p.tenant_id IS NOT NULL;

-- =========================================================================
-- STEP 5: Populate key_hash and key_prefix from existing key_value
-- =========================================================================
UPDATE public.api_keys
SET
  key_hash = public.hash_api_key(key_value, id::TEXT),
  key_prefix = LEFT(key_value, 8)
WHERE key_hash IS NULL
  AND key_value IS NOT NULL;

-- =========================================================================
-- STEP 6: Log orphaned rows before enforcing NOT NULL
-- =========================================================================
DO $$
DECLARE
  _count BIGINT;
BEGIN
  SELECT count(*) INTO _count FROM public.api_keys WHERE tenant_id IS NULL;
  IF _count > 0 THEN
    RAISE WARNING '[DEB-002] % API keys have NULL tenant_id after backfill. Manual review required.', _count;
    RAISE EXCEPTION '[DEB-002] Cannot enforce NOT NULL on api_keys.tenant_id: % orphaned rows remain.', _count;
  END IF;
END $$;

-- =========================================================================
-- STEP 7: Enforce constraints
-- =========================================================================

-- tenant_id NOT NULL (only reached if no orphans)
ALTER TABLE public.api_keys
  ALTER COLUMN tenant_id SET NOT NULL;

-- key_hash NOT NULL
ALTER TABLE public.api_keys
  ALTER COLUMN key_hash SET NOT NULL;

-- key_prefix NOT NULL
ALTER TABLE public.api_keys
  ALTER COLUMN key_prefix SET NOT NULL;

-- FK to tenants
ALTER TABLE public.api_keys
  ADD CONSTRAINT api_keys_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
  ON DELETE CASCADE;

-- FK to profiles for criado_por (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'api_keys_criado_por_fkey'
  ) THEN
    ALTER TABLE public.api_keys
      ADD CONSTRAINT api_keys_criado_por_fkey
      FOREIGN KEY (criado_por) REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Index on key_hash for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON public.api_keys(key_hash);

-- Index on tenant_id for RLS filtering
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id
  ON public.api_keys(tenant_id);

-- Unique constraint: key_hash should be unique
ALTER TABLE public.api_keys
  ADD CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash);

-- =========================================================================
-- STEP 8: Create validation function
-- Validates an API key by hashing the input and comparing against stored hash.
-- Also enforces tenant scoping — key must belong to the specified tenant.
-- =========================================================================
CREATE OR REPLACE FUNCTION public.validate_api_key_v2(
  p_key TEXT,
  p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _found BOOLEAN := false;
BEGIN
  -- Look up by prefix first (fast path), then verify hash
  SELECT EXISTS (
    SELECT 1
    FROM public.api_keys
    WHERE key_prefix = LEFT(p_key, 8)
      AND tenant_id = p_tenant_id
      AND ativo = true
      AND key_hash = public.hash_api_key(p_key, id::TEXT)
  ) INTO _found;

  RETURN _found;
END;
$$;

COMMENT ON FUNCTION public.validate_api_key_v2 IS
  'Validate an API key by prefix + hash comparison with tenant scoping. '
  'Returns TRUE if the key is valid, active, and belongs to the tenant.';

-- =========================================================================
-- STEP 9: RLS policies for api_keys (tenant isolation)
-- =========================================================================
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tenant's keys
CREATE POLICY "api_keys_select_own_tenant"
  ON public.api_keys FOR SELECT
  USING (
    tenant_id = (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
    )
  );

-- Users can only insert keys for their own tenant
CREATE POLICY "api_keys_insert_own_tenant"
  ON public.api_keys FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
    )
  );

-- Users can only update their own tenant's keys
CREATE POLICY "api_keys_update_own_tenant"
  ON public.api_keys FOR UPDATE
  USING (
    tenant_id = (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
    )
  );

-- Users can only delete their own tenant's keys
CREATE POLICY "api_keys_delete_own_tenant"
  ON public.api_keys FOR DELETE
  USING (
    tenant_id = (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
    )
  );

COMMIT;

-- =========================================================================
-- SPRINT 2 TODO:
-- 1. Drop key_value column after confirming hash-based validation works:
--    ALTER TABLE public.api_keys DROP COLUMN key_value;
-- 2. Update useApiKeys.ts to stop returning key_value after creation
--    (show key only once on create, never again).
-- 3. Update any API key validation endpoints to use validate_api_key_v2().
-- 4. Consider adding rate limiting per-key using api_rate_limits table.
-- =========================================================================
