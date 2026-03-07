-- Storage Tenant Security
-- Critical fix: restrict document access to the owning tenant only.
-- Previously the bucket was public and any authenticated user could read
-- any tenant's files. Files are stored under {tenant_id}/... paths.

-- 1. Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- 2. Drop insecure policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Upload" ON storage.objects;

-- Helper: extract tenant_id from the object path (first folder component)
-- Path structure: {tenant_id}/processos/{processo_id}/{filename}
--                {tenant_id}/avulso/{filename}

-- 3. Tenant-scoped SELECT — user can only read files belonging to their tenant
CREATE POLICY "Tenant Users Select Own Documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT p.tenant_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1
  )
);

-- 4. Tenant-scoped INSERT — user can only upload to their own tenant folder
CREATE POLICY "Tenant Users Insert Own Documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT p.tenant_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1
  )
);

-- 5. Tenant-scoped DELETE — user can only delete their own tenant's files
CREATE POLICY "Tenant Users Delete Own Documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = (
    SELECT p.tenant_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1
  )
);
