/*
 * Netlify Function: getAstroData
 *
 * This serverless function accepts a POST request with a JSON body
 * containing birth details (`date`, `time`, `lat`, `lon`). It attempts to
 * forward this request to a remote ephemeris API defined by the
 * environment variable `ASTRO_API_URL`. If the remote call fails for
 * any reason the function falls back to a simplified in‑house algorithm
 * that approximates planetary positions based on orbital periods. The
 * simplified algorithm is included here to provide an offline‑ready
 * fallback and mimics the client side computeAstroData implementation.
 */

export async function handler(event) {
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
  const { date, time, lat, lon } = body;
  // Attempt to call external API if configured
  const remoteUrl = process.env.ASTRO_API_URL;
  if (remoteUrl) {
    try {
      const response = await fetch(remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, time, lat, lon })
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.planets && data?.ascendant) {
          return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/json' }
          };
        }
      }
    } catch (err) {
      // ignore error and fall back
    }
  }
  // Fallback: compute approximate positions locally
  const fallback = computeAstroData(date, time);
  return {
    statusCode: 200,
    body: JSON.stringify(fallback),
    headers: { 'Content-Type': 'application/json' }
  };
}

/*
 * Simplified astronomical calculator used when the remote API is
 * unavailable. The logic mirrors the client‑side computeAstroData
 * function with minimal modifications. It ignores latitude, longitude
 * and time zone; if higher precision is desired the remote API should
 * be configured.
 */
function computeAstroData(dateStr, timeStr) {
  const SIGNS_PT = [
    'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
    'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
  ];
  const PLANET_DEFS = [
    { name: 'Sun', period: 365.256, init: 280.460, icon: '☀️' },
    { name: 'Moon', period: 27.321582, init: 218.316, icon: '🌙' },
    { name: 'Mercury', period: 87.969, init: 252.25084, icon: '☿️' },
    { name: 'Venus', period: 224.701, init: 181.97973, icon: '♀️' },
    { name: 'Mars', period: 686.98, init: 355.43300, icon: '♂️' },
    { name: 'Jupiter', period: 4332.59, init: 34.35151, icon: '♃' },
    { name: 'Saturn', period: 10759.22, init: 50.07744, icon: '♄' },
    { name: 'Uranus', period: 30685.4, init: 314.05501, icon: '♅' },
    { name: 'Neptune', period: 60190.03, init: 304.34866, icon: '♆' },
    { name: 'Pluto', period: 90560, init: 238.92903, icon: '♇' }
  ];
  try {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const [h, mi] = (timeStr || '').split(':').map(Number);
    const birth = new Date(Date.UTC(y, (m || 1) - 1, d || 1, h || 0, mi || 0, 0));
    const epoch = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const days = (birth - epoch) / 86400000;
    let earthLong = 100.46435 + (360 / 365.256) * days;
    earthLong = ((earthLong % 360) + 360) % 360;
    const planets = [];
    PLANET_DEFS.forEach(p => {
      let deg;
      if (p.name === 'Sun') {
        deg = (earthLong + 180) % 360;
      } else {
        deg = p.init + (360 / p.period) * days;
        deg = ((deg % 360) + 360) % 360;
      }
      const signIndex = Math.floor(deg / 30);
      const sign = SIGNS_PT[signIndex];
      const signDegree = deg % 30;
      planets.push({ name: p.name, sign, signDegree, degree: deg, icon: p.icon });
    });
    const timeFraction = (((h || 0) + ((mi || 0) / 60)) / 24) % 1;
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