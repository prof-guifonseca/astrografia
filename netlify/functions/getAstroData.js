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

async function handler(event) {
  // Only allow POST requests; return 405 for others
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { Allow: 'POST' }
    };
  }

  // Parse JSON body safely
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

  // API key for FreeAstrologyAPI (from environment)
  const apiKey = process.env.ASTRO_API_KEY;
  // Allow overriding the base URL via env; default to FreeAstrologyAPI's endpoint
  const baseUrl = process.env.ASTRO_API_URL || 'https://json.freeastrologyapi.com/western/planets';

  /**
   * Convert an English zodiac name to its Portuguese equivalent.  The
   * FreeAstrologyAPI may return zodiac sign names in English even when
   * language=pt is specified, so we translate them explicitly here.
   */
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

  /**
   * Mapping of planet names to emojis used in the UI.  Only the major
   * planets plus luminaries are included; additional bodies returned by
   * the API (e.g. Ceres, Chiron) are ignored for simplicity.
   */
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

  /**
   * Computes an approximate time zone offset in hours from a longitude.
   * Many time zone boundaries are irregular and often offset by half or
   * quarter hours, but as a reasonable estimate we divide longitude by
   * 15° (one hour per 15° of longitude) and round to the nearest 0.25.
   *
   * @param {number} longitude
   * @returns {number} time zone offset in hours
   */
  function approximateTimezone(longitude) {
    if (typeof longitude !== 'number' || isNaN(longitude)) return 0;
    const hours = longitude / 15;
    return Math.round(hours * 4) / 4;
  }

  // Attempt to call the FreeAstrologyAPI if an API key is configured
  if (apiKey) {
    try {
      // Ensure we have a date and time to work with
      if (typeof date === 'string' && typeof time === 'string' && date.includes('-') && time.includes(':')) {
        const [yearStr, monthStr, dayStr] = date.split('-');
        const [hourStr, minuteStr] = time.split(':');
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const dayNum = parseInt(dayStr, 10);
        const hoursNum = parseInt(hourStr, 10);
        const minutesNum = parseInt(minuteStr, 10);
        const secondsNum = 0;
        // Use provided lat/lon if valid numbers; else leave undefined to allow API default
        const latitude = typeof lat === 'number' ? lat : undefined;
        const longitude = typeof lon === 'number' ? lon : undefined;
        // Determine timezone: use timezone passed from client if provided; else approximate
        let timezone = 0;
        if (typeof body.timezone === 'number') {
          timezone = body.timezone;
        } else if (typeof longitude === 'number') {
          timezone = approximateTimezone(longitude);
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
        if (response.ok) {
          const apiData = await response.json();
          const output = apiData?.output;
          if (Array.isArray(output)) {
            const planets = [];
            let ascendant = null;
            output.forEach(item => {
              const nameEn = item?.planet?.en;
              const fullDeg = typeof item?.fullDegree === 'number' ? item.fullDegree : null;
              const normDeg = typeof item?.normDegree === 'number' ? item.normDegree : null;
              const signEn = item?.zodiac_sign?.name?.en;
              const signPt = signEn && signMap[signEn] ? signMap[signEn] : signEn;
              if (nameEn === 'Ascendant') {
                ascendant = {
                  sign: signPt,
                  degree: normDeg
                };
              } else if (planetIcons[nameEn]) {
                planets.push({
                  name: nameEn,
                  sign: signPt,
                  signDegree: normDeg,
                  degree: fullDeg,
                  icon: planetIcons[nameEn]
                });
              }
            });
            if (planets.length > 0 && ascendant) {
              return {
                statusCode: 200,
                body: JSON.stringify({ planets, ascendant }),
                headers: { 'Content-Type': 'application/json' }
              };
            }
          }
        }
      }
    } catch (err) {
      console.error('[getAstroData] External API error:', err);
    }
  }

  // Fallback: compute approximate positions locally using simplified algorithm
  const fallback = computeAstroData(date, time);
  return {
    statusCode: 200,
    body: JSON.stringify(fallback),
    headers: { 'Content-Type': 'application/json' }
  };
}

module.exports = { handler };

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
