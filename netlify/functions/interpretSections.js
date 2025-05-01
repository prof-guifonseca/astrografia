require('dotenv').config();
const { OpenAI } = require('openai');
const { marked } = require('marked');

// 🔑 Inicialização segura do cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🎯 Temas disponíveis para análise
const TEMAS = {
  amor:            'vida amorosa',
  carreira:        'vida profissional',
  familia:         'relações familiares',
  espiritualidade: 'caminho espiritual',
  missao:          'missão de vida',
  desafios:        'desafios e bloqueios pessoais'
};

// 🚀 Função Netlify principal
exports.handler = async function(event) {
  try {
    const { tema, planetas, nome, ascendant } = JSON.parse(event.body || '{}');

    if (!TEMAS[tema] || !Array.isArray(planetas)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Parâmetros ausentes ou inválidos.' })
      };
    }

    const foco = TEMAS[tema];
    const nomeLimpo = (nome || 'a pessoa').replace(/[^À-ſ\w \-']/gu, '').trim();

    const mapa = planetas
      .map(p => `${p.name} em ${p.sign} (${p.signDegree}°)`)
      .join(', ');

    const ascText = ascendant
      ? `Ascendente em ${ascendant.sign} (${ascendant.degree}°)`
      : '';

    const prompt = `
Você é um astrólogo experiente, sensível e responsável. Com base nas posições astrológicas a seguir, escreva um parágrafo interpretando a temática de "${foco}" para ${nomeLimpo}.

Padrões astrais:
${mapa}
${ascText ? '\n' + ascText : ''}

• Utilize linguagem acolhedora, motivadora e clara.
• Não use jargões técnicos como "quadratura" ou "trígono".
• Evite clichês esotéricos e generalizações óbvias.
• Mencione o Ascendente como marcador de estilo pessoal, se estiver presente.
• Responda exclusivamente em Markdown (1 parágrafo, sem listas).

Seja útil, coerente e centrado no contexto astral apresentado.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um astrólogo profissional que escreve com sensibilidade, precisão e respeito pelo simbolismo astrológico.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.65,
      max_tokens: 450
    });

    const markdown = response?.choices?.[0]?.message?.content?.trim() || '⚠️ Nenhum conteúdo gerado.';
    const html = marked.parse(markdown);

    return {
      statusCode: 200,
      body: JSON.stringify({
        html,
        markdown,
        section: foco
      })
    };

  } catch (err) {
    console.error('[Astrografia] Erro na interpretação por seção:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno ao gerar interpretação.' })
    };
  }
};
