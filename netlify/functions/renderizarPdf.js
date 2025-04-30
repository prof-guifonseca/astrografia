const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

exports.handler = async function(event) {
  try {
    const { nome } = JSON.parse(event.body);
    const safeName = nome.replace(/\s/g, "_");

    const filePath = path.join("/tmp", `${safeName}_mapa.json`);

    if (!fs.existsSync(filePath)) {
      return {
        statusCode: 404,
        body: JSON.stringify({ erro: "Relatório não encontrado." })
      };
    }

    const rawData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const interpretacao = rawData.interpretacao;

    // Gera HTML básico para o relatório
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório Astrológico – ${nome}</title>
        <style>
          body { font-family: 'Georgia', serif; margin: 40px; }
          h1, h2 { color: #4B0082; }
          p { line-height: 1.6; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <h1>Mapa Astral de ${nome}</h1>
        ${interpretacao.split('\n').map(par => `<p>${par}</p>`).join('')}
      </body>
      </html>
    `;

    // Inicializa o navegador headless
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' }
    });

    await browser.close();

    const base64PDF = pdfBuffer.toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        nome,
        pdfBase64: base64PDF
      })
    };

  } catch (err) {
    console.error("Erro ao renderizar PDF:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ erro: "Falha na geração do PDF." })
    };
  }
};
