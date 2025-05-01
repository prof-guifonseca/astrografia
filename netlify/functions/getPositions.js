require('dotenv').config();
const { julian, solar, moonposition, planetposition, data, base } = require('astronomia');
const fetch = require('node-fetch');

// Efemérides VSOP87
const earth   = new planetposition.Planet(data.vsop87Bearth);
const mercury = new planetposition.Planet(data.vsop87Bmercury);
const venus   = new planetposition.Planet(data.vsop87Bvenus);
const mars    = new planetposition.Planet(data.vsop87Bmars);
const jupiter = new planetposition.Planet(data.vsop87Bjupiter);
const saturn  = new planetposition.Planet(data.vsop87Bsaturn);
const uranus  = new planetposition.Planet(data.vsop87Buranus);
const neptune = new planetposition.Planet(data.vsop87Bneptune);
const pluto   = new planetposition.Planet(data.vsop87Bpluto);

const DEG = base.RAD2DEG;

const signos = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
];

const planetIcons = {
  'Sol':      '☀️',
  'Lua':      '🌙',
  'Mercúrio': '☿️',
  'Vênus':    '♀️',
  'Marte':    '♂️',
  'Júpiter':  '♃',
  'Saturno':  '♄',
  'Urano':    '♅',
  'Netuno':   '♆',
  'Plutão':   '♇'
};

function grauParaSigno(degree) {
  const index = Math.floor(degree / 30) % 12;
  const signo = signos[index];
  const grauNoSigno = +(degree % 30).toFixed(2);
  return { sign: signo, degree: grauNoSigno };
}

// Calcula longitude geocêntrica do planeta
function planetGeoLongitude(jd, planet) {
  const earthPos = earth.position(jd);
  const planetPos = planet.position(jd);
  const { lon } = base.geocentricPosition(earthPos, planetPos);
  return base.pmod(lon * DEG, 360);
}

// Cálculo astronômico aproximado do Ascendente
function calcularAscendente(jd, lat, lon) {
  const obliquity = 23.4367; // Obliquidade média da eclíptica
  const lst = base.siderealTime(jd) + (lon / 15); // Hora sideral local
  const lstDeg = base.pmod(lst * 15, 360); // Converte LST para graus

  const ascRad = Math.atan2(
    Math.cos(base.deg2rad(obliquity)) * Math.sin(base.deg2rad(lstDeg)),
    Math.cos(base.deg2rad(lstDeg))
  );

  return base.pmod(base.rad2deg(ascRad), 360);
}

// Consulta coordenadas via OpenCage
async function obterCoordenadas(local) {
  const key = process.env.OPENCAGE_API_KEY;
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(local)}&key=${key}&language=pt&no_annotations=1&limit=1`;
  const res = await fetch(url);
  const json = await res.json();

  const geo = json?.results?.[0]?.geometry;
  if (!geo) throw new Error('Coordenadas não encontradas');
  return geo; // { lat, lng }
}

exports.handler = async (event) => {
  try {
    const dataIn = JSON.parse(event.body || '{}');
    const { birthDate, birthTime, birthPlace } = dataIn;

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

    // Cálculo do Ascendente
    const ascLongitude = calcularAscendente(jd, lat, lng);
    const ascendant = {
      degree: +ascLongitude.toFixed(2),
      sign: grauParaSigno(ascLongitude).sign
    };

    // Planetas
    const solLon  = solar.apparentLongitude(jd);
    const luaLon  = moonposition.position(jd).lon;
    const mercLon = planetGeoLongitude(jd, mercury);
    const venLon  = planetGeoLongitude(jd, venus);
    const marLon  = planetGeoLongitude(jd, mars);
    const jupLon  = planetGeoLongitude(jd, jupiter);
    const satLon  = planetGeoLongitude(jd, saturn);
    const uraLon  = planetGeoLongitude(jd, uranus);
    const nepLon  = planetGeoLongitude(jd, neptune);
    const pluLon  = planetGeoLongitude(jd, pluto);

    const lista = [
      { name: 'Sol',      total: solLon },
      { name: 'Lua',      total: luaLon },
      { name: 'Mercúrio', total: mercLon },
      { name: 'Vênus',    total: venLon },
      { name: 'Marte',    total: marLon },
      { name: 'Júpiter',  total: jupLon },
      { name: 'Saturno',  total: satLon },
      { name: 'Urano',    total: uraLon },
      { name: 'Netuno',   total: nepLon },
      { name: 'Plutão',   total: pluLon }
    ];

    const planets = lista.map(obj => {
      const { sign, degree } = grauParaSigno(obj.total);
      return {
        name: obj.name,
        icon: planetIcons[obj.name] || '',
        degree: +obj.total.toFixed(2),
        sign,
        signDegree: degree
      };
    });

    console.log('[Astrografia] Planetas calculados:', planets);
    console.log('[Astrografia] Ascendente:', ascendant);

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
