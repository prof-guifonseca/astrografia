require('dotenv').config();
const { OpenAI } = require('openai');
const { marked } = require('marked');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TEMAS = {
  amor:            'vida amorosa',
  carreira:        'vida profissional',
  familia:         'relações familiares',
  espiritualidade: 'caminho espiritual',
  missao:          'missão de vida',
  desafios:        'desafios e bloqueios pessoais'
};

exports.handler = async function (event) {
  try {
    const { tema, planetas, nome, ascendant } = JSON.parse(event.body || '{}');

    if (!TEMAS[tema] || !Array.isArray(planetas) || planetas.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Parâmetros ausentes ou inválidos.' })
      };
    }

    const foco = TEMAS[tema];
    const nomeLimpo = (nome || 'a pessoa').replace(/[^\wÀ-ÿ \-']/gu, '').trim();

    const mapa = planetas.map(p => {
      const grau = typeof p.degree === 'number' ? `${p.degree.toFixed(1)}°` : '?°';
      return `${p.icon || '🔹'} ${p.name} em ${p.sign} (${grau})`;
    }).join(', ');

    const ascText = ascendant?.sign
      ? `Ascendente em ${ascendant.sign} (${typeof ascendant.degree === 'number' ? ascendant.degree.toFixed(1) : '?'}°)`
      : '';

    const prompt = `
Você é um astrólogo profissional, sensível e objetivo. Com base nas posições astrais abaixo, escreva uma **interpretação dissertativa** para ${nomeLimpo}, focando no tema "${foco}".

Mapa:
${mapa}
${ascText ? '\n' + ascText : ''}

📌 Estrutura da resposta:
1. **Introdução**: apresente o tema e o tom geral do mapa astral da pessoa.
2. **Desenvolvimento**: analise ao menos dois planetas relevantes para o tema, indicando seus signos e significados. Mencione também o Ascendente se estiver presente.
3. **Considerações finais**: ofereça uma síntese prática e encorajadora sobre como o mapa pode guiar a pessoa nesse aspecto da vida.

Regras:
- ❌ Evite termos técnicos como "quadratura", "aspecto", "casa X".
- ❌ Não use frases genéricas sem base astral.
- ✅ Use linguagem natural, respeitosa, inspiradora e **sem parecer automatizada**.
- ✅ Escreva usando Markdown (títulos, parágrafos).

Retorne apenas o texto final em Markdown.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Você escreve como um astrólogo ético, direto e reflexivo. Não usa jargões técnicos, mas sim referências claras aos astros do mapa.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.65,
      max_tokens: 800
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
