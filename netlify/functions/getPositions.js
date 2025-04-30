require('dotenv').config();

const { julian, solar, moonposition, planetposition, data, base } = require('astronomia');

// Carregar efemérides VSOP87
const earth = new planetposition.Planet(data.vsop87Bearth);
const mercury = new planetposition.Planet(data.vsop87Bmercury);
const venus   = new planetposition.Planet(data.vsop87Bvenus);
const mars    = new planetposition.Planet(data.vsop87Bmars);
const jupiter = new planetposition.Planet(data.vsop87Bjupiter);
const saturn  = new planetposition.Planet(data.vsop87Bsaturn);

const DEG = base.RAD2DEG;
const signos = [
  'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
  'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
];

function grauParaSigno(degree) {
  const index = Math.floor(degree / 30) % 12;
  const signo = signos[index];
  const grauNoSigno = +(degree % 30).toFixed(2);
  return { sign: signo, degree: grauNoSigno };
}

exports.handler = async (event) => {
  try {
    const dataIn = JSON.parse(event.body || '{}');
    const { birthDate, birthTime } = dataIn;

    if (!birthDate || !birthTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Data e hora obrigatórias.' })
      };
    }

    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = birthTime.split(':').map(Number);
    const decimalDay = day + (hour + minute / 60) / 24;
    const jd = julian.CalendarGregorianToJD(year, month, decimalDay);

    // Sol e Lua
    const solLon  = solar.apparentLongitude(jd);
    const luaLon  = moonposition.position(jd).lon;

    // Planetas com efemérides
    const mercLon = planetGeoLongitude(jd, mercury);
    const venLon  = planetGeoLongitude(jd, venus);
    const marLon  = planetGeoLongitude(jd, mars);
    const jupLon  = planetGeoLongitude(jd, jupiter);
    const satLon  = planetGeoLongitude(jd, saturn);

    const lista = [
      { name: 'Sol',      total: solLon },
      { name: 'Lua',      total: luaLon },
      { name: 'Mercúrio', total: mercLon },
      { name: 'Vênus',    total: venLon },
      { name: 'Marte',    total: marLon },
      { name: 'Júpiter',  total: jupLon },
      { name: 'Saturno',  total: satLon }
    ];

    const planets = lista.map(obj => {
      const { sign, degree } = grauParaSigno(obj.total);
      return { name: obj.name, degree: +obj.total.toFixed(2), sign, signDegree: degree };
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ planets })
    };

  } catch (err) {
    console.error('[Astrografia] Erro ao calcular posições:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno no cálculo.' })
    };
  }
};

// Calcula longitude geocêntrica do planeta
function planetGeoLongitude(jd, planet) {
  const earthPos = earth.position(jd);
  const planetPos = planet.position(jd);
  const { lon } = base.geocentricPosition(earthPos, planetPos);
  return base.pmod(lon * DEG, 360);
}