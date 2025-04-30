require('dotenv').config();
const { OpenAI } = require('openai');
const { marked } = require('marked');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SECTIONS = {
  amor:       "vida amorosa",
  trabalho:   "vida profissional",
  familia:    "relações familiares",
  espiritual: "caminho espiritual",
  mente:      "potencial mental e comunicação",
  karmas:     "desafios e bloqueios",
  crescimento:"conselhos para crescimento pessoal",
  sintese:    "uma síntese poética da carta"
};

exports.handler = async (event) => {
  try {
    const { name, section, planets } = JSON.parse(event.body || '{}');

    if (!name || !section || !Array.isArray(planets)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Parâmetros ausentes ou inválidos.' })
      };
    }

    if (!SECTIONS[section]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Seção desconhecida.' })
      };
    }

    const foco = SECTIONS[section];
    const nomeLimpo = name.replace(/[^\p{L} \-']/gu, '').trim();

    const mapa = planets
      .map(p => `${p.name} em ${p.sign} (${p.signDegree}°)`)
      .join(', ');

    const prompt = `
Você é um astrólogo experiente. Com base nas posições planetárias abaixo, escreva um texto breve (1 parágrafo) sobre ${foco} para a pessoa chamada ${nomeLimpo}:

${mapa}

Use linguagem acolhedora, objetiva, inspiradora e sem termos técnicos. Responda em Markdown.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um astrólogo direto, acolhedor e sensível.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400
    });

    const interpretation = response?.choices?.[0]?.message?.content || '⚠️ Nenhum texto gerado.';
    const html = marked.parse(interpretation);

    return {
      statusCode: 200,
      body: JSON.stringify({
        html,
        markdown: interpretation,
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
