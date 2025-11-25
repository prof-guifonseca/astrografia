/*
 * Netlify Function: getAstroData
 *
 * POST JSON: { date: "YYYY-MM-DD", time: "HH:MM", lat?: number, lon?: number, timezone?: number }
 * - Usa FreeAstrologyAPI (tropical, topocêntrico).
 * - Se falhar, cai em computeAstroData (aproximação).
 * - Sempre prioriza o fuso de Brasília (-3) como padrão.
 * - Retorna nomes de planetas e signos em PORTUGUÊS.
 */

async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { Allow: 'POST' }
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { date, time, lat, lon } = body || {};
  let fallbackReason = null;

  const apiKey = process.env.ASTRO_API_KEY;
  const baseUrl =
    process.env.ASTRO_API_URL || 'https://json.freeastrologyapi.com/western/planets';

  // Signos EN -> PT (caso a API ignore language=pt)
  const signMap = {
    Aries: 'Áries',
    Taurus: 'Touro',
    Gemini: 'Gêmeos',
    Cancer: 'Câncer',
    Leo: 'Leão',
    Virgo: 'Virgem',
    Libra: 'Libra',
    Scorpio: 'Escorpião',
    Sagittarius: 'Sagitário',
    Capricorn: 'Capricórnio',
    Aquarius: 'Aquário',
    Pisces: 'Peixes'
  };

  // Planetas EN -> PT
  const planetNamePtMap = {
    Sun: 'Sol',
    Moon: 'Lua',
    Mercury: 'Mercúrio',
    Venus: 'Vênus',
    Mars: 'Marte',
    Jupiter: 'Júpiter',
    Saturn: 'Saturno',
    Uranus: 'Urano',
    Neptune: 'Netuno',
    Pluto: 'Plutão'
  };

  // Ícones permanecem os mesmos
  const planetIcons = {
    Sun: '☀️',
    Moon: '🌙',
    Mercury: '☿️',
    Venus: '♀️',
    Mars: '♂️',
    Jupiter: '♃',
    Saturn: '♄',
    Uranus: '♅',
    Neptune: '♆',
    Pluto: '♇'
  };

  // Tenta usar a API externa, com fuso padrão de Brasília
  if (apiKey) {
    try {
      if (
        typeof date === 'string' &&
        typeof time === 'string' &&
        date.includes('-') &&
        time.includes(':')
      ) {
        const [yearStr, monthStr, dayStr] = date.split('-');
        const [hourStr, minuteStr] = time.split(':');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const dayNum = parseInt(dayStr, 10);
        const hoursNum = parseInt(hourStr, 10);
        const minutesNum = parseInt(minuteStr, 10);
        const secondsNum = 0;

        const latitude = typeof lat === 'number' ? lat : undefined;
        const longitude = typeof lon === 'number' ? lon : undefined;

        // Fuso padrão: Brasília (-3). Pode ser sobrescrito se vier timezone explícito.
        let timezone = -3;
        if (body && body.timezone !== undefined) {
          const tzNum = Number(body.timezone);
          if (!Number.isNaN(tzNum) && Number.isFinite(tzNum)) {
            timezone = tzNum;
          }
        }

        const payload = {
          year,
          month,
          date: dayNum,
          hours: hoursNum,
          minutes: minutesNum,
          seconds: secondsNum,
          latitude,
          longitude,
          timezone,
          config: {
            observation_point: 'topocentric',
            ayanamsha: 'tropical',
            language: 'pt'
          }
        };

        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          fallbackReason = `API respondeu ${response.status}`;
        } else {
          const apiData = await response.json();
          const output = apiData?.output;

          if (Array.isArray(output)) {
            const planets = [];
            let ascendant = null;

            output.forEach(item => {
              const nameEn = item?.planet?.en;
              const fullDeg =
                typeof item?.fullDegree === 'number' ? item.fullDegree : null;
              const normDeg =
                typeof item?.normDegree === 'number' ? item.normDegree : null;
              const signEn = item?.zodiac_sign?.name?.en;
              const signPt =
                signEn && signMap[signEn] ? signMap[signEn] : signEn;
              const namePt =
                nameEn && planetNamePtMap[nameEn]
                  ? planetNamePtMap[nameEn]
                  : nameEn;

              if (nameEn === 'Ascendant') {
                ascendant = {
                  sign: signPt,
                  degree: normDeg
                };
              } else if (planetIcons[nameEn]) {
                planets.push({
                  name: namePt,          // português
                  sign: signPt,          // português
                  signDegree: normDeg,
                  degree: fullDeg,
                  icon: planetIcons[nameEn]
                });
              }
            });

            if (planets.length > 0 && ascendant) {
              return {
                statusCode: 200,
                body: JSON.stringify({ planets, ascendant, source: 'api' }),
                headers: { 'Content-Type': 'application/json' }
              };
            }

            fallbackReason = 'API retornou sem dados suficientes';
          } else {
            fallbackReason = 'Resposta inesperada da API';
          }
        }
      } else {
        fallbackReason = 'Data ou hora ausentes/invalidas';
      }
    } catch (err) {
      fallbackReason = 'Erro ao contatar API externa';
      console.error('[getAstroData] External API error:', err);
    }
  } else {
    fallbackReason = 'Chave ASTRO_API_KEY não configurada';
  }

  // Fallback local (aproximação)
  const fallback = computeAstroData(date, time);
  return {
    statusCode: 200,
    body: JSON.stringify({
      ...fallback,
      source: 'fallback',
      reason: fallbackReason
    }),
    headers: { 'Content-Type': 'application/json' }
  };
}

module.exports = { handler };

/*
 * Fallback simplificado:
 * - Ignora latitude/longitude/timezone.
 * - Usa nomes de planetas e signos em português.
 * - Aproxima posições apenas para não quebrar a aplicação.
 */
function computeAstroData(dateStr, timeStr) {
  const SIGNS_PT = [
    'Áries',
    'Touro',
    'Gêmeos',
    'Câncer',
    'Leão',
    'Virgem',
    'Libra',
    'Escorpião',
    'Sagitário',
    'Capricórnio',
    'Aquário',
    'Peixes'
  ];

  const PLANET_DEFS = [
    { name: 'Sol', period: 365.256, init: 280.46, icon: '☀️' },
    { name: 'Lua', period: 27.321582, init: 218.316, icon: '🌙' },
    { name: 'Mercúrio', period: 87.969, init: 252.25084, icon: '☿️' },
    { name: 'Vênus', period: 224.701, init: 181.97973, icon: '♀️' },
    { name: 'Marte', period: 686.98, init: 355.433, icon: '♂️' },
    { name: 'Júpiter', period: 4332.59, init: 34.35151, icon: '♃' },
    { name: 'Saturno', period: 10759.22, init: 50.07744, icon: '♄' },
    { name: 'Urano', period: 30685.4, init: 314.05501, icon: '♅' },
    { name: 'Netuno', period: 60190.03, init: 304.34866, icon: '♆' },
    { name: 'Plutão', period: 90560, init: 238.92903, icon: '♇' }
  ];

  try {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const [h, mi] = (timeStr || '').split(':').map(Number);
    const birth = new Date(Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0));
    const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const days = (birth - epoch) / 86400000;

    // Longitude aproximada da Terra
    let earthLong = 100.46435 + (360 / 365.256) * days;
    earthLong = ((earthLong % 360) + 360) % 360;

    const planets = [];
    PLANET_DEFS.forEach(p => {
      let deg;
      if (p.name === 'Sol') {
        deg = (earthLong + 180) % 360;
      } else {
        deg = p.init + (360 / p.period) * days;
        deg = ((deg % 360) + 360) % 360;
      }
      const signIndex = Math.floor(deg / 30);
      const sign = SIGNS_PT[signIndex];
      const signDegree = deg % 30;
      planets.push({
        name: p.name,     // português
        sign,             // português
        signDegree,
        degree: deg,
        icon: p.icon
      });
    });

    // Ascendente super aproximado apenas pelo horário
    const hourVal = Number.isFinite(h) ? h : 0;
    const minVal = Number.isFinite(mi) ? mi : 0;
    const timeFraction = ((hourVal + minVal / 60) / 24) % 1;
    const ascDeg = (timeFraction * 360) % 360;
    const ascSignIndex = Math.floor(ascDeg / 30);
    const ascSign = SIGNS_PT[ascSignIndex];

    return {
      planets,
      ascendant: { sign: ascSign, degree: ascDeg % 30 }
    };
  } catch (err) {
    return { planets: [], ascendant: null };
  }
}
