-- Remover políticas antigas se existirem e criar novas para o bucket meeting-audios
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public can view meeting audio files" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload meeting audios" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own meeting audios" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own meeting audios" ON storage.objects;
END $$;

-- Política para permitir SELECT público em objetos do bucket meeting-audios
CREATE POLICY "Public can view meeting audio files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'meeting-audios');

-- Política para permitir INSERT de áudios pelos usuários autenticados
CREATE POLICY "Authenticated users can upload meeting audios"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-audios' 
  AND auth.role() = 'authenticated'
);

-- Política para permitir UPDATE pelos donos
CREATE POLICY "Users can update their own meeting audios"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'meeting-audios' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para permitir DELETE pelos donos ou RH/Socio
CREATE POLICY "Users can delete their own meeting audios"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'meeting-audios' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('rh', 'socio')
    )
  )
);