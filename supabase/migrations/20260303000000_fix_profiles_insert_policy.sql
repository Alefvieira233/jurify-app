-- Fix RLS policy for profiles to allow users to insert their own profile
-- Current policy only allows admins to insert, which blocks self-registration

BEGIN;

-- Drop the restrictive policy if it exists (via the ensure_policy helper logic or directly)
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Create a new policy that allows users to insert their OWN profile
CREATE POLICY "profiles_insert_self" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Ensure update policy allows self-update (metadata, etc)
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

COMMIT;
