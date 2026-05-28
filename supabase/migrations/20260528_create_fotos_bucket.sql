-- Create fotos_obra storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos_obra',
  'fotos_obra',
  true,
  52428800, -- 50MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for storage
CREATE POLICY "Users can upload fotos to their obras"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'fotos_obra'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view fotos from their obras"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'fotos_obra'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their fotos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'fotos_obra'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
