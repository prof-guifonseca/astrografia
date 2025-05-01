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
Você é um astrólogo profissional com acesso a efemérides reais. Gere as posições dos principais planetas (Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno) e o Ascendente, com base na data, hora e local de nascimento a seguir. Use o modelo JSON com o mesmo formato exato abaixo. Assegure que os graus da **Lua** e do **Ascendente** estejam corretos com base na astrologia tradicional (sideral ou tropical), pois esses dois dados são sensíveis e precisam refletir precisão próxima de serviços como AstroSeek, Personare ou Astrodienst.

Modelo de saída:
{
  "planets": [
    { "name": "Sol", "sign": "Capricórnio", "degree": 10.2 },
    ...
  ],
  "ascendant": { "sign": "Aquário", "degree": 5.1 }
}

Dados:
- Data: ${birthDate}
- Hora: ${birthTime}
- Local: ${birthPlace}
- Latitude: ${lat}
- Longitude: ${lng}

Retorne apenas o JSON, entre blocos \`\`\`json.
  `.trim();
}

exports.handler = async function(event) {
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
      max_tokens: 600
    });

    const raw = completion.choices?.[0]?.message?.content || '';
    const match = raw.match(/```json([\s\S]*?)```/);
    const jsonStr = match ? match[1].trim() : raw.trim();

    const data = JSON.parse(jsonStr);

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
