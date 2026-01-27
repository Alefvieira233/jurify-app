-- 🚀 JURIFY - STORAGE SETUP
-- Create 'documents' bucket for Generated PDFs

-- 1. Create Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );

CREATE POLICY "Auth Users Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'authenticated' );
