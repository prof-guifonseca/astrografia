require('dotenv').config();
const { julian, solar, moonposition, base, planetposition } = require('astronomia');

// Importações VSOP87 dos planetas
const vsop87Bearth    = require('astronomia/data/vsop87Bearth');
const vsop87Bmercury  = require('astronomia/data/vsop87Bmercury');
const vsop87Bvenus    = require('astronomia/data/vsop87Bvenus');
const vsop87Bmars     = require('astronomia/data/vsop87Bmars');
const vsop87Bjupiter  = require('astronomia/data/vsop87Bjupiter');
const vsop87Bsaturn   = require('astronomia/data/vsop87Bsaturn');
const vsop87Buranus   = require('astronomia/data/vsop87Buranus');
const vsop87Bneptune  = require('astronomia/data/vsop87Bneptune');

// Instâncias planetárias
const earth   = new planetposition.Planet(vsop87Bearth);
const mercury = new planetposition.Planet(vsop87Bmercury);
const venus   = new planetposition.Planet(vsop87Bvenus);
const mars    = new planetposition.Planet(vsop87Bmars);
const jupiter = new planetposition.Planet(vsop87Bjupiter);
const saturn  = new planetposition.Planet(vsop87Bsaturn);
const uranus  = new planetposition.Planet(vsop87Buranus);
const neptune = new planetposition.Planet(vsop87Bneptune);

// Utilitários astrológicos
const DEG = base.RAD2DEG;
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
  const obliquity = 23.4367; // aproximação da obliquidade da eclíptica
  const lst = base.siderealTime(jd) + (lon / 15); // tempo sideral local
  const lstDeg = base.pmod(lst * 15, 360);

  const ascRad = Math.atan2(
    Math.cos(base.deg2rad(obliquity)) * Math.sin(base.deg2rad(lstDeg)),
    Math.cos(base.deg2rad(lstDeg))
  );

  return base.pmod(base.rad2deg(ascRad), 360);
}

async function obterCoordenadas(local) {
  const key = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(local)}&key=${key}&language=pt&no_annotations=1&limit=1`;

  const fetch = (...args) => import('node-fetch').then(mod => mod.default(...args));
  const res = await fetch(url);
  const json = await res.json();

  const geo = json?.results?.[0]?.geometry;
  if (!geo) throw new Error('Coordenadas não encontradas');
  return geo;
}

// 🔧 Função principal serverless
exports.handler = async (event) => {
  try {
    const { birthDate, birthTime, birthPlace, name } = JSON.parse(event.body || '{}');

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
};
