import 'dotenv/config';
import { julian, solar, moonposition, base, sidereal } from 'astronomia';
const { earth, mercury, venus, mars, jupiter, saturn, uranus, neptune } = require('astronomia/planetary');

// ✅ Importação dinâmica do fetch (para Node)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// 🔢 Utilitários matemáticos
const DEG = base.RAD2DEG;
const RAD = Math.PI / 180;
const DEG_FROM_RAD = 180 / Math.PI;

const signos = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
];

const planetIcons = {
  'Sol': '☀️', 'Lua': '🌙', 'Mercúrio': '☿️', 'Vênus': '♀️',
  'Marte': '♂️', 'Júpiter': '♃', 'Saturno': '♄', 'Urano': '♅', 'Netuno': '♆'
};

function grauParaSigno(degree) {
  const index = Math.floor(degree / 30) % 12;
  return {
    sign: signos[index],
    degree: +(degree % 30).toFixed(2)
  };
}

function planetGeoLongitude(jd, planet) {
  const earthPos = earth.position(jd);
  const planetPos = planet.position(jd);
  const { lon } = base.geocentricPosition(earthPos, planetPos);
  return base.pmod(lon * DEG, 360);
}

function calcularAscendente(jd, lat, lon) {
  const obliquity = 23.4367;
  const lst = sidereal.mean(jd) + (lon / 15);
  const lstDeg = base.pmod(lst * 15, 360);
  const lstRad = lstDeg * RAD;
  const oblRad = obliquity * RAD;

  const ascRad = Math.atan2(
    Math.cos(oblRad) * Math.sin(lstRad),
    Math.cos(lstRad)
  );

  return base.pmod(ascRad * DEG_FROM_RAD, 360);
}

async function obterCoordenadas(local) {
  const key = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(local)}&key=${key}&language=pt&no_annotations=1&limit=1`;

  const res = await fetch(url);
  const json = await res.json();
  const geo = json?.results?.[0]?.geometry;
  if (!geo) throw new Error('Coordenadas não encontradas');
  return geo;
}

// 🚀 Função serverless principal
export async function handler(event) {
  try {
    const { birthDate, birthTime, birthPlace } = JSON.parse(event.body || '{}');

    if (!birthDate || !birthTime || !birthPlace) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Data, hora e local obrigatórios.' })
      };
    }

    const { lat, lng } = await obterCoordenadas(birthPlace);
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = birthTime.split(':').map(Number);
    const decimalDay = day + (hour + minute / 60) / 24;
    const jd = julian.CalendarGregorianToJD(year, month, decimalDay);

    const ascLongitude = calcularAscendente(jd, lat, lng);
    const ascendant = {
      degree: +ascLongitude.toFixed(2),
      sign: grauParaSigno(ascLongitude).sign
    };

    const lista = [
      { name: 'Sol',      total: solar.apparentLongitude(jd) },
      { name: 'Lua',      total: moonposition.position(jd).lon },
      { name: 'Mercúrio', total: planetGeoLongitude(jd, mercury) },
      { name: 'Vênus',    total: planetGeoLongitude(jd, venus) },
      { name: 'Marte',    total: planetGeoLongitude(jd, mars) },
      { name: 'Júpiter',  total: planetGeoLongitude(jd, jupiter) },
      { name: 'Saturno',  total: planetGeoLongitude(jd, saturn) },
      { name: 'Urano',    total: planetGeoLongitude(jd, uranus) },
      { name: 'Netuno',   total: planetGeoLongitude(jd, neptune) }
    ];

    const planets = lista.map(({ name, total }) => {
      const { sign, degree } = grauParaSigno(total);
      return {
        name,
        icon: planetIcons[name] || '',
        degree: +total.toFixed(2),
        sign,
        signDegree: degree
      };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ planets, ascendant, location: { lat, lng } })
    };

  } catch (err) {
    console.error('[Astrografia] Erro ao calcular posições:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno no cálculo.' })
    };
  }
}
