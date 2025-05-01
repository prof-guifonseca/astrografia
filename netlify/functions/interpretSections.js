require('dotenv').config();
const { OpenAI } = require('openai');
const { marked } = require('marked');

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

// 🚀 Função principal Netlify
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

    // 🌌 Composição do mapa astral para o prompt
    const mapa = planetas
      .map(p => {
        const grau = typeof p.degree === 'number' ? `${p.degree.toFixed(1)}°` : '?°';
        return `${p.icon || '🔹'} ${p.name} em ${p.sign} (${grau})`;
      })
      .join(', ');

    const ascText = ascendant
      ? `Ascendente em ${ascendant.sign} (${typeof ascendant.degree === 'number' ? ascendant.degree.toFixed(1) : '?'}°)`
      : '';

    // 🧠 Prompt bem formatado
    const prompt = `
Você é um astrólogo experiente, sensível e responsável. Com base nas posições astrológicas abaixo, escreva um parágrafo interpretando o tema "${foco}" para ${nomeLimpo}.

Padrões astrais:
${mapa}
${ascText ? '\n' + ascText : ''}

• Use linguagem acolhedora, clara e motivadora.
• Não use termos técnicos como "quadratura", "casa", "aspecto", etc.
• Evite clichês esotéricos e frases genéricas.
• Mencione o Ascendente como estilo pessoal, se presente.
• Responda em **1 parágrafo em Markdown** (sem listas).

Seja objetivo, centrado no contexto astral apresentado, e útil para a reflexão pessoal.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um astrólogo profissional que escreve com sensibilidade, precisão e respeito ao simbolismo astrológico.'
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
