const { OpenAI } = require('openai');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const openai = new OpenAI();

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
Você é um astrólogo experiente, com linguagem envolvente e acessível. Gere um relatório astrológico completo com cerca de 20 páginas, dividido nas seções abaixo, com base nos seguintes dados:

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
        { role: 'system', content: 'Você é um astrólogo experiente e sensível, especialista em relatórios completos.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 10000
    });

    const fullReport = response.choices[0].message.content;
    const htmlContent = marked.parse(fullReport);

    // Template básico com estilo
    const htmlWrapper = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: 'Georgia', serif;
              padding: 2rem;
              line-height: 1.6;
              color: #222;
              max-width: 800px;
              margin: auto;
            }
            h1, h2, h3 {
              color: #6A5ACD;
            }
            hr {
              margin: 2rem 0;
            }
          </style>
        </head>
        <body>
          <h1>Relatório Astrológico de ${name}</h1>
          ${htmlContent}
        </body>
      </html>
    `;

    // Gera o PDF com Puppeteer
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setContent(htmlWrapper, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // Codifica o PDF em base64 para download no frontend
    const pdfBase64 = pdfBuffer.toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({
        summary: "Relatório gerado com sucesso.",
        fullReport,
        pdfBase64 // você pode baixar ou converter para Blob no frontend
      })
    };

  } catch (err) {
    console.error('[Astrografia] Erro ao gerar PDF:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno ao gerar o relatório.' })
    };
  }
};