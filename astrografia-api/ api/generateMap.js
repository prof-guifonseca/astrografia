import { OpenAI } from 'openai';
import { marked } from 'marked';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { name, birthDate, birthTime, birthPlace } = req.body;

    if (!name || !birthDate || !birthTime || !birthPlace) {
      return res.status(400).json({ error: 'Dados incompletos.' });
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
        { role: 'system', content: 'Você é um astrólogo experiente e acolhedor.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 3000
    });

    const fullReport = response?.choices?.[0]?.message?.content || '⚠️ Não foi possível gerar o relatório.';
    const htmlReport = marked.parse(fullReport);

    res.setHeader('Access-Control-Allow-Origin', '*'); // permite uso com frontend externo
    res.status(200).json({
      summary: "Relatório gerado com sucesso.",
      fullReport,
      htmlReport
    });

  } catch (err) {
    console.error('[Astrografia-Vercel] Erro ao gerar relatório:', err);
    res.status(500).json({ error: 'Erro interno ao gerar o relatório.' });
  }
}
