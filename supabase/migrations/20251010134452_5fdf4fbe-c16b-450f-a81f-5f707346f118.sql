-- Criar bucket para áudios de 1:1
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-audios', 'meeting-audios', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket meeting-audios
CREATE POLICY "Usuários podem fazer upload dos próprios áudios"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-audios' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Usuários podem visualizar seus próprios áudios"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-audios' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Líderes podem visualizar áudios das suas 1:1s"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-audios' AND
  EXISTS (
    SELECT 1 FROM one_on_ones
    WHERE (one_on_ones.leader_id = auth.uid() OR one_on_ones.collaborator_id = auth.uid())
    AND (storage.foldername(name))[2] = one_on_ones.id::text
  )
);

CREATE POLICY "Usuários podem deletar seus próprios áudios"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-audios' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Adicionar colunas na tabela one_on_ones
ALTER TABLE one_on_ones
ADD COLUMN IF NOT EXISTS audio_url TEXT,
ADD COLUMN IF NOT EXISTS audio_duration INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN one_on_ones.audio_url IS 'URL do áudio gravado da reunião no storage';
COMMENT ON COLUMN one_on_ones.audio_duration IS 'Duração do áudio em segundos';