require('dotenv').config();
const { OpenAI } = require('openai');
const { marked } = require('marked');

// 🔑 Inicializa OpenAI com chave da API
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🎯 Tópicos válidos para relatório
const TEMAS = {
  amor:            'vida amorosa',
  carreira:        'vida profissional',
  familia:         'relações familiares',
  espiritualidade: 'caminho espiritual',
  missao:          'missão de vida',
  desafios:        'desafios e bloqueios pessoais'
};

// 🚀 Função serverless principal
exports.handler = async (event) => {
  try {
    const { tema, planetas, nome, ascendant } = JSON.parse(event.body || '{}');

    // 🔍 Validação dos parâmetros
    if (!TEMAS[tema] || !Array.isArray(planetas)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Parâmetros ausentes ou inválidos.' })
      };
    }

    const foco = TEMAS[tema];
    const nomeLimpo = (nome || 'a pessoa').replace(/[^À-ſ\w \-']/gu, '').trim();

    // 🔭 Monta mapa textual para uso no prompt
    const mapa = planetas
      .map(p => `${p.name} em ${p.sign} (${p.signDegree}°)`)
      .join(', ');

    const ascText = ascendant
      ? `Ascendente em ${ascendant.sign} (${ascendant.degree}°).`
      : '';

    // ✨ Prompt para interpretação
    const prompt = `
Você é um astrólogo experiente. Com base nas posições planetárias abaixo, escreva um texto breve (1 parágrafo) sobre ${foco} para ${nomeLimpo}:

${mapa}
${ascText}

Use linguagem acolhedora, objetiva, inspiradora e sem termos técnicos. Seja sensível, otimista e claro. Responda em Markdown.
    `.trim();

    // 📡 Requisição ao modelo da OpenAI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você é um astrólogo direto, acolhedor e sensível.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 400
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
