import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireRole } from "../_shared/role-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Whisper aceita até 25MB. base64 expande ~33%; decodificado = bytes reais.
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;

  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);

    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }

    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const guard = await requireRole(req, ['lider', 'rh', 'socio', 'admin']);
  if (!guard.ok) return guard.response;

  try {
    const { audio } = await req.json();

    if (!audio) {
      throw new Error('No audio data provided');
    }

    // Checa tamanho antes de bater no OpenAI — evita gastar quota em arquivo
    // que vai ser rejeitado de qualquer jeito.
    const approxBytes = Math.floor((audio.length * 3) / 4);
    if (approxBytes > MAX_AUDIO_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Áudio excede o limite de 25MB (tamanho aproximado: ${(approxBytes / 1024 / 1024).toFixed(1)}MB).`,
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing audio transcription: ~${(approxBytes / 1024 / 1024).toFixed(1)}MB, user=${guard.userId}`);

    const binaryAudio = processBase64Chunks(audio);

    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.code === 'insufficient_quota') {
          throw new Error('Créditos do OpenAI esgotados. Por favor, adicione créditos à sua conta OpenAI e atualize a chave API.');
        }
      } catch (_e) {
        // fall through to generic error below
      }

      throw new Error(`Erro na API OpenAI: ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription successful');

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transcription error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
