require('dotenv').config();

const { julian, solar, moonposition, planetposition, data, base } = require('astronomia');

// Carregar efemérides VSOP87
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

    const lista = [
      { name: 'Sol',      total: solar.apparentLongitude(jd) },
      { name: 'Lua',      total: moonposition.position(jd).lon },
      { name: 'Mercúrio', total: planetGeoLongitude(jd, mercury) },
      { name: 'Vênus',    total: planetGeoLongitude(jd, venus) },
      { name: 'Marte',    total: planetGeoLongitude(jd, mars) },
      { name: 'Júpiter',  total: planetGeoLongitude(jd, jupiter) },
      { name: 'Saturno',  total: planetGeoLongitude(jd, saturn) },
      { name: 'Urano',    total: planetGeoLongitude(jd, uranus) },
      { name: 'Netuno',   total: planetGeoLongitude(jd, neptune) },
      { name: 'Plutão',   total: planetGeoLongitude(jd, pluto) }
    ];

    const planets = lista.map(obj => {
      const { sign, degree } = grauParaSigno(obj.total);
      return { name: obj.name, degree: +obj.total.toFixed(2), sign, signDegree: degree };
    });

    console.log('[Astrografia] Planetas calculados:', planets);

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
