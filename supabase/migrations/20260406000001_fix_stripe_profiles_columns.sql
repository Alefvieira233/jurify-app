-- Migration: Add missing Stripe columns to profiles + make tenant_id NOT NULL
-- Context: stripe-webhook Edge Function queries profiles.stripe_customer_id,
-- subscription_status, subscription_tier — none of which existed, causing
-- ALL Stripe webhook processing to silently fail.

-- 1. Add stripe_customer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

-- 2. Add subscription_status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_status text DEFAULT 'inactive';
  END IF;
END $$;

-- 3. Add subscription_tier
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier text DEFAULT 'free';
  END IF;
END $$;

-- 4. Unique partial index on stripe_customer_id (only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- 5. Make tenant_id NOT NULL (critical for RLS integrity)
-- First, handle any orphaned profiles with NULL tenant_id
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT count(*) INTO orphan_count FROM public.profiles WHERE tenant_id IS NULL;

  IF orphan_count > 0 THEN
    RAISE WARNING 'Found % profiles with NULL tenant_id — deleting orphans', orphan_count;
    DELETE FROM public.profiles WHERE tenant_id IS NULL;
  END IF;

  -- Now safe to add NOT NULL constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'tenant_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;
