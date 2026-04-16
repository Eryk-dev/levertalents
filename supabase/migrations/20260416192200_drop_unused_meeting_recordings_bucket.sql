-- T9: remove o bucket órfão 'meeting-recordings'.
--
-- Bucket criado em 20251009221254 mas nunca usado pelo código — o app grava
-- em 'meeting-audios'. As três policies abaixo ficaram encostadas em
-- storage.objects gerando conflito.

DROP POLICY IF EXISTS "Users can upload their meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their meeting recordings" ON storage.objects;
DROP POLICY IF EXISTS "RH and Socio can view all meeting recordings" ON storage.objects;

-- Limpa qualquer objeto remanescente (não deveria existir) antes de soltar o bucket.
DELETE FROM storage.objects WHERE bucket_id = 'meeting-recordings';
DELETE FROM storage.buckets WHERE id = 'meeting-recordings';
