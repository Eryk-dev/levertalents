-- Verificar e tornar o bucket meeting-audios público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'meeting-audios';

-- Verificar resultado
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'meeting-audios';