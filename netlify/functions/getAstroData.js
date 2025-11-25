// netlify/functions/getAstroData.js
/*
 * Netlify Function: getAstroData
 *
 * POST JSON: {
 *   date: "YYYY-MM-DD",
 *   time: "HH:MM",
 *   lat?: number | string,
 *   lon?: number | string,
 *   timezone?: number   // ex.: -3, -2, -5 (já incluindo +1h de verão, se aplicável)
 * }
 *
 * - Usa FreeAstrologyAPI (tropical, topocêntrico, Placidus).
 * - Se falhar, cai em computeAstroData (aproximação).
 * - Retorna planetas, casas e ângulos em PT-BR.
 * - Ícones:
 *    - `icon`: emoji (compatível com o front atual)
 *    - `iconKey`: id limpo para mapear em SVG / classes (ex.: "sun", "moon", "mars").
 */

const HOUSES_URL =
  process.env.ASTRO_HOUSES_URL ||
  'https://json.freeastrologyapi.com/western/houses';

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

  const { date, time, lat, lon, timezone: tzInput } = body || {};
  let fallbackReason = null;

  const apiKey = process.env.ASTRO_API_KEY;
  const baseUrl =
    process.env.ASTRO_API_URL ||
    'https://json.freeastrologyapi.com/western/planets';

  // Signos EN -> PT
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

  // Ângulos EN -> PT
  const angleNamePtMap = {
    Ascendant: 'Ascendente',
    Descendant: 'Descendente',
    IC: 'Fundo do Céu',
    MC: 'Meio do Céu'
  };

  // Ícones "profissionais": chave fixa (pra bater com SVG / CSS) + fallback emoji
  const planetIconKeyMap = {
    Sun: 'sun',
    Moon: 'moon',
    Mercury: 'mercury',
    Venus: 'venus',
    Mars: 'mars',
    Jupiter: 'jupiter',
    Saturn: 'saturn',
    Uranus: 'uranus',
    Neptune: 'neptune',
    Pluto: 'pluto'
  };

  const planetEmojiMap = {
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

  const angleIconKeyMap = {
    Ascendant: 'ascendant',
    Descendant: 'descendant',
    MC: 'midheaven',
    IC: 'imum-coeli'
  };

  const angleEmojiMap = {
    Ascendant: '🌅',
    Descendant: '🌇',
    MC: '🗻',
    IC: '🏡'
  };

  // ==========================
  //   Tenta usar API externa
  // ==========================
  let planets = [];
  let ascendant = null;
  let houses = null;
  let angles = {
    ascendant: null,
    midheaven: null,
    descendant: null,
    ic: null
  };

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

        const latitude = toNumber(lat);
        const longitude = toNumber(lon);

        if (latitude == null || longitude == null) {
          fallbackReason = 'Latitude/longitude inválidas ou ausentes';
        } else {
          // Fuso padrão: Brasília (-3). Front pode sobrescrever (incluindo +1h de verão).
          let timezone = -3;
          if (tzInput !== undefined) {
            const tzNum = Number(tzInput);
            if (!Number.isNaN(tzNum) && Number.isFinite(tzNum)) {
              timezone = tzNum;
            }
          }

          const basePayload = {
            year,
            month,
            date: dayNum,
            hours: hoursNum,
            minutes: minutesNum,
            seconds: secondsNum,
            latitude,
            longitude,
            timezone
          };

          const commonConfig = {
            observation_point: 'topocentric',
            ayanamsha: 'tropical',
            language: 'pt'
          };

          const planetsPayload = {
            ...basePayload,
            config: commonConfig
          };

          const housesPayload = {
            ...basePayload,
            config: {
              ...commonConfig,
              house_system: 'Placidus'
            }
          };

          const [planetsRes, housesRes] = await Promise.all([
            fetch(baseUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              },
              body: JSON.stringify(planetsPayload)
            }),
            fetch(HOUSES_URL, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              },
              body: JSON.stringify(housesPayload)
            })
          ]);

          // ---------- Planetas + ângulos ----------
          if (!planetsRes.ok) {
            fallbackReason = `API planets respondeu ${planetsRes.status}`;
          } else {
            const apiData = await planetsRes.json();
            const output = apiData?.output;

            if (Array.isArray(output)) {
              const rawAngles = {};

              output.forEach(item => {
                const nameEn = item?.planet?.en;
                const fullDeg =
                  typeof item?.fullDegree === 'number'
                    ? item.fullDegree
                    : typeof item?.degree === 'number'
                    ? item.degree
                    : null;
                const normDeg =
                  typeof item?.normDegree === 'number'
                    ? item.normDegree
                    : null;
                const signEn = item?.zodiac_sign?.name?.en;
                const signPt =
                  signEn && signMap[signEn] ? signMap[signEn] : signEn;

                if (nameEn === 'Ascendant') {
                  ascendant = {
                    sign: signPt,
                    degree: normDeg
                  };
                  rawAngles.ascendant = {
                    name: angleNamePtMap[nameEn],
                    sign: signPt,
                    degree: normDeg,
                    iconKey: angleIconKeyMap[nameEn],
                    icon: angleEmojiMap[nameEn]
                  };
                } else if (angleNamePtMap[nameEn]) {
                  const key =
                    nameEn === 'MC'
                      ? 'midheaven'
                      : nameEn === 'IC'
                      ? 'ic'
                      : nameEn === 'Descendant'
                      ? 'descendant'
                      : nameEn;

                  rawAngles[key] = {
                    name: angleNamePtMap[nameEn],
                    sign: signPt,
                    degree: normDeg,
                    iconKey: angleIconKeyMap[nameEn],
                    icon: angleEmojiMap[nameEn]
                  };
                } else if (planetIconKeyMap[nameEn]) {
                  planets.push({
                    name:
                      nameEn && planetNamePtMap[nameEn]
                        ? planetNamePtMap[nameEn]
                        : nameEn,
                    sign: signPt,
                    signDegree: normDeg,
                    degree: fullDeg,
                    icon: planetEmojiMap[nameEn],
                    iconKey: planetIconKeyMap[nameEn]
                  });
                }
              });

              angles = {
                ascendant:
                  rawAngles.ascendant ||
                  (ascendant
                    ? {
                        name: 'Ascendente',
                        sign: ascendant.sign,
                        degree: ascendant.degree,
                        iconKey: 'ascendant',
                        icon: angleEmojiMap.Ascendant
                      }
                    : null),
                midheaven: rawAngles.midheaven || null,
                descendant: rawAngles.descendant || null,
                ic: rawAngles.ic || null
              };
            } else {
              fallbackReason = 'Resposta inesperada da API de planetas';
            }
          }

          // ---------- Casas ----------
          if (!housesRes.ok) {
            const reason = `API houses respondeu ${housesRes.status}`;
            fallbackReason = fallbackReason
              ? `${fallbackReason}; ${reason}`
              : reason;
          } else {
            const housesJson = await housesRes.json();
            const rawOutput = housesJson?.output;

            const hArr = Array.isArray(rawOutput)
              ? rawOutput
              : Array.isArray(rawOutput?.Houses)
              ? rawOutput.Houses
              : null;

            if (hArr) {
              houses = hArr
                .map(item => {
                  const signEn = item?.zodiac_sign?.name?.en;
                  const signPt =
                    signEn && signMap[signEn] ? signMap[signEn] : signEn;
                  return {
                    house: item?.house ?? item?.House,
                    sign: signPt,
                    degree:
                      typeof item?.normDegree === 'number'
                        ? item.normDegree
                        : null,
                    fullDegree:
                      typeof item?.fullDegree === 'number'
                        ? item.fullDegree
                        : typeof item?.degree === 'number'
                        ? item.degree
                        : null
                  };
                })
                .filter(h => h.house != null)
                .sort((a, b) => a.house - b.house);
            } else {
              const reason = 'Resposta inesperada da API de casas';
              fallbackReason = fallbackReason
                ? `${fallbackReason}; ${reason}`
                : reason;
            }
          }

          // ---------- Enriquecer com casas ----------
          if (planets.length > 0 && ascendant) {
            if (houses && houses.length === 12) {
              planets = mapPlanetsToHouses(planets, houses);

              const mapH = new Map(houses.map(h => [h.house, h]));

              if (!angles.ascendant && mapH.get(1)) {
                const h1 = mapH.get(1);
                angles.ascendant = {
                  name: 'Ascendente',
                  sign: h1.sign,
                  degree: h1.degree,
                  iconKey: 'ascendant',
                  icon: angleEmojiMap.Ascendant
                };
              }
              if (!angles.ic && mapH.get(4)) {
                const h4 = mapH.get(4);
                angles.ic = {
                  name: 'Fundo do Céu',
                  sign: h4.sign,
                  degree: h4.degree,
                  iconKey: 'imum-coeli',
                  icon: angleEmojiMap.IC
                };
              }
              if (!angles.descendant && mapH.get(7)) {
                const h7 = mapH.get(7);
                angles.descendant = {
                  name: 'Descendente',
                  sign: h7.sign,
                  degree: h7.degree,
                  iconKey: 'descendant',
                  icon: angleEmojiMap.Descendant
                };
              }
              if (!angles.midheaven && mapH.get(10)) {
                const h10 = mapH.get(10);
                angles.midheaven = {
                  name: 'Meio do Céu',
                  sign: h10.sign,
                  degree: h10.degree,
                  iconKey: 'midheaven',
                  icon: angleEmojiMap.MC
                };
              }
            }

            return {
              statusCode: 200,
              body: JSON.stringify({
                planets,
                ascendant,
                houses,
                angles,
                source: 'api'
              }),
              headers: { 'Content-Type': 'application/json' }
            };
          }

          fallbackReason =
            fallbackReason || 'API retornou sem dados suficientes de planetas';
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

  // ==========================
  //     Fallback local
  // ==========================
  const fallback = computeAstroData(date, time);
  return {
    statusCode: 200,
    body: JSON.stringify({
      ...fallback,
      houses: null,
      angles: {
        ascendant: fallback.ascendant
          ? {
              name: 'Ascendente',
              sign: fallback.ascendant.sign,
              degree: fallback.ascendant.degree,
              iconKey: 'ascendant',
              icon: angleEmojiMap.Ascendant
            }
          : null,
        midheaven: null,
        descendant: null,
        ic: null
      },
      source: 'fallback',
      reason: fallbackReason
    }),
    headers: { 'Content-Type': 'application/json' }
  };
}

module.exports = { handler };

/*
 * Normaliza valores numéricos:
 * - Aceita number direto;
 * - Aceita string com vírgula ou ponto;
 * - Retorna null se não for número finito.
 */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const norm = value.replace(',', '.').trim();
    const n = Number(norm);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/*
 * Fallback simplificado:
 * - Ignora latitude/longitude/timezone.
 * - Usa nomes de planetas e signos em português.
 * - Aproxima posições para não quebrar a aplicação.
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
    { name: 'Sol', period: 365.256, init: 280.46, icon: '☀️', iconKey: 'sun' },
    {
      name: 'Lua',
      period: 27.321582,
      init: 218.316,
      icon: '🌙',
      iconKey: 'moon'
    },
    {
      name: 'Mercúrio',
      period: 87.969,
      init: 252.25084,
      icon: '☿️',
      iconKey: 'mercury'
    },
    {
      name: 'Vênus',
      period: 224.701,
      init: 181.97973,
      icon: '♀️',
      iconKey: 'venus'
    },
    {
      name: 'Marte',
      period: 686.98,
      init: 355.433,
      icon: '♂️',
      iconKey: 'mars'
    },
    {
      name: 'Júpiter',
      period: 4332.59,
      init: 34.35151,
      icon: '♃',
      iconKey: 'jupiter'
    },
    {
      name: 'Saturno',
      period: 10759.22,
      init: 50.07744,
      icon: '♄',
      iconKey: 'saturn'
    },
    {
      name: 'Urano',
      period: 30685.4,
      init: 314.05501,
      icon: '♅',
      iconKey: 'uranus'
    },
    {
      name: 'Netuno',
      period: 60190.03,
      init: 304.34866,
      icon: '♆',
      iconKey: 'neptune'
    },
    {
      name: 'Plutão',
      period: 90560,
      init: 238.92903,
      icon: '♇',
      iconKey: 'pluto'
    }
  ];

  try {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const [h, mi] = (timeStr || '').split(':').map(Number);
    const birth = new Date(
      Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0)
    );
    const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const days = (birth - epoch) / 86400000;

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
        name: p.name,
        sign,
        signDegree,
        degree: deg,
        icon: p.icon,
        iconKey: p.iconKey
      });
    });

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
    console.error('[getAstroData] Erro no fallback local:', err);
    return { planets: [], ascendant: null };
  }
}

/**
 * Atribui cada planeta a uma casa com base nas cúspides (em graus eclípticos).
 */
function mapPlanetsToHouses(planets, houses) {
  if (!Array.isArray(planets) || !Array.isArray(houses) || houses.length !== 12) {
    return planets;
  }

  const cusps = houses
    .slice()
    .sort((a, b) => a.house - b.house)
    .map(h => h.fullDegree);

  if (cusps.some(d => typeof d !== 'number')) {
    return planets;
  }

  const normCusps = [...cusps];
  for (let i = 1; i < normCusps.length; i++) {
    while (normCusps[i] < normCusps[i - 1]) {
      normCusps[i] += 360;
    }
  }

  return planets.map(p => {
    if (typeof p.degree !== 'number') return p;
    let pDeg = p.degree;
    if (pDeg < normCusps[0]) pDeg += 360;

    let houseNum = 12;
    for (let i = 0; i < 11; i++) {
      if (pDeg >= normCusps[i] && pDeg < normCusps[i + 1]) {
        houseNum = i + 1;
        break;
      }
    }

    return { ...p, house: houseNum };
  });
}
