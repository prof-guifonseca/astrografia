require('dotenv').config();
const { OpenAI } = require('openai');
const fetch = require('node-fetch');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function obterCoordenadas(local) {
  const key = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(local)}&key=${key}&language=pt&no_annotations=1&limit=1`;
  const res = await fetch(url);
  const json = await res.json();
  const geo = json?.results?.[0]?.geometry;
  if (!geo) throw new Error('Coordenadas não encontradas');
  return geo;
}

function formatarPrompt({ birthDate, birthTime, birthPlace, lat, lng }) {
  return `
Você é um astrólogo profissional com acesso a efemérides reais. Calcule e retorne as posições dos seguintes astros:

- Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno
- Ascendente (com base em latitude, longitude e hora local)

Cada planeta deve conter:
• name (exato, com inicial maiúscula)
• sign (nome completo do signo)
• degree (grau decimal entre 0.0 e 29.99)
• icon (símbolo unicode oficial do planeta)

O Ascendente deve conter:
• sign
• degree (grau decimal)

Use astrologia tropical.

⚠️ Instruções obrigatórias:
• Todos os graus devem ser números válidos (ex: 12.7)
• Lua e Ascendente devem refletir efemérides reais, com precisão próxima ao AstroSeek ou Personare
• Retorne **apenas o JSON** entre crases, sem explicações antes ou depois

Formato de saída:
\`\`\`json
{
  "planets": [
    { "name": "Sol", "sign": "Capricórnio", "degree": 10.2, "icon": "☀️" },
    { "name": "Lua", "sign": "Touro", "degree": 18.4, "icon": "🌙" }
    ...
  ],
  "ascendant": {
    "sign": "Aquário",
    "degree": 5.1
  }
}
\`\`\`

Informações da pessoa:
- Data: ${birthDate}
- Hora: ${birthTime}
- Local: ${birthPlace}
- Latitude: ${lat}
- Longitude: ${lng}
`.trim();
}

exports.handler = async function (event) {
  try {
    const { birthDate, birthTime, birthPlace } = JSON.parse(event.body || '{}');

    if (!birthDate || !birthTime || !birthPlace) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Data, hora e local obrigatórios.' })
      };
    }

    const { lat, lng } = await obterCoordenadas(birthPlace);
    const prompt = formatarPrompt({ birthDate, birthTime, birthPlace, lat, lng });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um astrólogo preciso, confiável e sensível, com conhecimento técnico e habilidade para gerar resultados compatíveis com efemérides reais.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 800
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const match = raw.match(/```json([\s\S]*?)```/);
    const jsonStr = match ? match[1].trim() : raw.trim();

    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (err) {
      console.error('[Astrografia] JSON inválido retornado pelo modelo:', jsonStr);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'O modelo retornou um JSON inválido.',
          rawResponse: raw
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...data,
        location: { lat, lng },
        rawResponse: raw
      })
    };

  } catch (err) {
    console.error('[Astrografia] Erro com GPT na obtenção do mapa:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno na geração astrológica com GPT.' })
    };
  }
};
