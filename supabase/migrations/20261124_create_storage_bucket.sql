-- Create afford-media public storage bucket with full public access
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('afford-media', 'afford-media', true, 104857600, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable public reads on afford-media
DROP POLICY IF EXISTS "Public can view afford-media" ON storage.objects;
CREATE POLICY "Public can view afford-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'afford-media');

-- Enable public uploads (anon and authenticated) on afford-media
DROP POLICY IF EXISTS "Public can upload afford-media" ON storage.objects;
CREATE POLICY "Public can upload afford-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'afford-media');

-- Enable updates on afford-media
DROP POLICY IF EXISTS "Public can update afford-media" ON storage.objects;
CREATE POLICY "Public can update afford-media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'afford-media');

-- Enable deletes on afford-media
DROP POLICY IF EXISTS "Public can delete afford-media" ON storage.objects;
CREATE POLICY "Public can delete afford-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'afford-media');
