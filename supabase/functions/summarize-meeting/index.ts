import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireRole } from "../_shared/role-guard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const guard = await requireRole(req, ['lider', 'rh', 'socio', 'admin']);
  if (!guard.ok) return guard.response;

  try {
    const { meetingData } = await req.json();

    if (!meetingData) {
      throw new Error('No meeting data provided');
    }

    console.log(`Generating meeting summary for user=${guard.userId}`);

    const prompt = `Você é um assistente especializado em resumir reuniões 1:1 entre líderes e colaboradores.

Analise a TRANSCRIÇÃO da reunião abaixo e crie um resumo estruturado em português do Brasil focando nos **itens mais relevantes** discutidos.

## Participantes da Reunião
- **Líder:** ${meetingData.leader?.name || 'Não informado'}
- **Colaborador:** ${meetingData.collaborator?.name || 'Não informado'}

## Formato do Resumo

### 📋 Principais Pontos Discutidos
[Baseie-se NA TRANSCRIÇÃO para listar os tópicos MAIS IMPORTANTES mencionados durante a conversa]

### 🎯 Conquistas e Sucessos
[Destaque realizações e pontos positivos mencionados NA TRANSCRIÇÃO]

### ⚠️ Desafios Identificados
[Liste obstáculos e necessidades de suporte discutidos NA CONVERSA]

### 🚀 Ações Definidas
[Liste ações concretas e comprometimentos mencionados NA REUNIÃO]

### 📅 Próximos Passos
[Indique próximos passos e acompanhamentos combinados]

---

## Dados da Reunião

**Transcrição da Conversa (FONTE PRINCIPAL):**
${meetingData.transcricao || 'Não disponível'}

**Contexto Adicional:**

${meetingData.pdi_review ? `- Revisão do PDI anterior: ${meetingData.pdi_review}` : ''}
${meetingData.roteiro ? `- Roteiro/Notas: ${meetingData.roteiro}` : ''}
${meetingData.pdi_mensal?.main_objective ? `- Novo PDI criado: ${meetingData.pdi_mensal.main_objective}` : ''}

---

**INSTRUÇÕES IMPORTANTES:**
- Base seu resumo PRINCIPALMENTE na TRANSCRIÇÃO da conversa
- Foque nos itens MAIS RELEVANTES, não liste tudo
- Seja objetivo e profissional
- Use markdown para formatação
- Mantenha tom positivo e construtivo
- Se a transcrição estiver vazia ou incompleta, mencione isso claramente no resumo`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em análise de reuniões 1:1 e desenvolvimento de pessoas.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);

      if (response.status === 429) {
        throw new Error('Limite de requisições atingido. Por favor, aguarde um momento e tente novamente.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Adicione créditos em Settings -> Workspace -> Usage.');
      }

      throw new Error(`AI Gateway error: ${errorText}`);
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated');
    }

    console.log('Summary generated successfully');

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Summary generation error:', error);
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
