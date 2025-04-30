require('dotenv').config(); // apenas útil em desenvolvimento local

const { OpenAI } = require('openai');
const { marked } = require('marked');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body || '{}');
    const { name, birthDate, birthTime, birthPlace } = data;

    if (!name || !birthDate || !birthTime || !birthPlace) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dados incompletos.' })
      };
    }

    const prompt = `
Você é um astrólogo experiente, com linguagem envolvente e acessível. Gere um relatório astrológico completo com cerca de 8 páginas, dividido nas seções abaixo, com base nos seguintes dados:

- Nome: ${name}
- Data de nascimento: ${birthDate}
- Hora de nascimento: ${birthTime}
- Local de nascimento: ${birthPlace}

O relatório deve conter:

1. Introdução personalizada
2. Interpretação do Sol, Lua e Ascendente
3. Análise das 12 casas
4. Aspectos planetários relevantes
5. Vida afetiva
6. Potencial profissional
7. Desafios e karmas
8. Conselho final simbólico

Evite termos técnicos excessivos. Use linguagem fluida e humanizada. Retorne todo o conteúdo em formato Markdown (## títulos e texto organizado).
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um astrólogo experiente e sensível, especialista em relatórios completos.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 7000
    });

    console.log('[Astrografia] Resposta da OpenAI recebida.');
    console.log('[Astrografia] Tokens utilizados:', response?.usage?.total_tokens || 'n/d');

    const fullReport = response?.choices?.[0]?.message?.content || '⚠️ Não foi possível gerar o relatório.';
    const htmlReport = marked.parse(fullReport);

    return {
      statusCode: 200,
      body: JSON.stringify({
        summary: "Relatório gerado com sucesso.",
        fullReport,
        htmlReport
      })
    };

  } catch (err) {
    console.error('[Astrografia] Erro ao gerar HTML:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno ao gerar o relatório.' })
    };
  }
};
