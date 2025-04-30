require('dotenv').config();

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
Você é um astrólogo experiente e sensível. Gere um relatório astrológico personalizado com base nos seguintes dados:

- Nome: ${name}
- Data de nascimento: ${birthDate}
- Hora: ${birthTime}
- Local: ${birthPlace}

Crie um conteúdo resumido e reflexivo com cerca de 2 a 3 páginas em estilo Markdown. Divida o texto com os seguintes títulos:

## Introdução  
## Sol, Lua e Ascendente  
## Temas de Vida  
## Relações e Emoções  
## Caminho Pessoal

Use linguagem fluida e acolhedora, com tom inspirador. **Não inclua imagens, mapas ou gráficos.** Foque apenas em texto.
`.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um astrólogo experiente e acolhedor.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
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
    console.error('[Astrografia] Erro ao gerar relatório:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno ao gerar o relatório.' })
    };
  }
};
