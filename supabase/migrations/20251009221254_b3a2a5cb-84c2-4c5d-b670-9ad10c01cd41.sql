-- Criar bucket para armazenar áudios das reuniões 1:1
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', false);

-- Políticas para o bucket de gravações
CREATE POLICY "Users can upload their meeting recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-recordings' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their meeting recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'meeting-recordings' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM one_on_ones o
      WHERE 
        o.meeting_structure->>'audio_url' = storage.objects.name AND
        (o.leader_id = auth.uid() OR o.collaborator_id = auth.uid())
    )
  )
);

CREATE POLICY "RH and Socio can view all meeting recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'meeting-recordings' AND
  (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role IN ('rh', 'socio')
    )
  )
);