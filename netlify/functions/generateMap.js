require('dotenv').config(); // apenas para uso local

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
Você é um astrólogo experiente, com linguagem acessível e poética. Crie um relatório astrológico resumido (4 a 5 páginas) com base nos dados abaixo:

- Nome: ${name}
- Data de nascimento: ${birthDate}
- Hora: ${birthTime}
- Local: ${birthPlace}

Divida o conteúdo nas seções:

## Introdução  
## Sol, Lua e Ascendente  
## Temas de Vida  
## Relações e Emoções  
## Caminho Pessoal

Use Markdown e linguagem fluida. Evite termos técnicos. Seja acolhedor.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
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
