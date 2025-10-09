import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { meetingData } = await req.json();
    
    if (!meetingData) {
      throw new Error('No meeting data provided');
    }

    console.log('Generating meeting summary...');

    const prompt = `Você é um assistente especializado em resumir reuniões 1:1 entre líderes e colaboradores. 

Analise os dados da reunião abaixo e crie um resumo estruturado em português do Brasil seguindo este formato:

## 📋 Principais Pontos Discutidos
[Liste os tópicos mais importantes mencionados]

## 🎯 Conquistas e Sucessos
[Destaque realizações e pontos positivos]

## ⚠️ Desafios e Necessidades
[Identifique obstáculos e necessidades de suporte]

## 🚀 Próximos Passos
[Liste ações concretas e comprometimentos]

## 💡 Recomendações
[Sugira áreas de desenvolvimento e oportunidades]

Dados da reunião:

**Aquecimento:**
${JSON.stringify(meetingData.aquecimento, null, 2)}

**Desenvolvimento:**
${JSON.stringify(meetingData.desenvolvimento, null, 2)}

**Projeção:**
${JSON.stringify(meetingData.projecao, null, 2)}

Seja objetivo, profissional e mantenha o tom positivo e construtivo. Use markdown para formatação.`;

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
