/*
 * Netlify Function: getCoordinates
 *
 * This serverless function proxies requests to the OpenCage geocoding API.
 * The API key is read from the environment variable `OPENCAGE_KEY` so it
 * doesn’t live in the client. When provided a `place` query parameter it
 * returns the latitude and longitude of the first match or null if
 * unavailable. If the upstream API call fails the function will respond
 * with an error status code and a descriptive message.
 */

async function handler(event) {
  const place = event.queryStringParameters?.place;
  if (!place) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required query parameter `place`.' })
    };
  }

  /**
   * Tenta obter coordenadas via OpenCage se a chave estiver configurada.  Se a
   * consulta falhar ou não retornar resultados, cai no fallback usando o
   * serviço Nominatim do OpenStreetMap.  Dessa forma aumentamos a
   * confiabilidade da geolocalização sem depender de um único provedor.
   *
   * @param {string} q Localização a geocodificar
   * @returns {Promise<{lat:number,lng:number}|null>}
   */
  async function geocodeOpenCage(q) {
    const apiKey = process.env.OPENCAGE_KEY;
    if (!apiKey) return null;
    try {
      const url = new URL('https://api.opencagedata.com/geocode/v1/json');
      url.searchParams.set('q', q);
      url.searchParams.set('key', apiKey);
      // Request Portuguese language for consistency with the UI
      url.searchParams.set('language', 'pt');
      url.searchParams.set('limit', '1');
      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json();
      const result = data?.results?.[0];
      const geom = result?.geometry;
      if (geom && typeof geom.lat === 'number' && typeof geom.lng === 'number') {
        let tzOffset = null;
        let tzName = null;
        // Attempt to extract timezone information if available
        const tz = result?.annotations?.timezone;
        if (tz) {
          if (typeof tz.offset_sec === 'number') {
            tzOffset = tz.offset_sec / 3600;
          }
          if (typeof tz.name === 'string') {
            tzName = tz.name;
          }
        }
        const coord = { lat: geom.lat, lng: geom.lng };
        if (typeof tzOffset === 'number') coord.timezone = tzOffset;
        if (tzName) coord.tzName = tzName;
        return coord;
      }
    } catch (_) {
      // ignore and fall back
    }
    return null;
  }

  /**
   * Fallback geocoding using Nominatim.  This API é pública e não requer chave.
   * Requer que o User-Agent seja informado para conformidade com os termos de uso.
   * Retorna a primeira coordenada encontrada ou null.
   *
   * @param {string} q Localização a geocodificar
   * @returns {Promise<{lat:number,lng:number}|null>}
   */
  async function geocodeNominatim(q) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', q);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '1');
      // Utilizamos fetch com cabeçalho User-Agent para cumprir as políticas de Nominatim
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'astrografia-netlify-function/1.0' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const first = data?.[0];
      if (first && first.lat && first.lon) {
        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          // Approximate timezone by longitude when using Nominatim (no timezone info)
          let tzOffset = null;
          if (!isNaN(lng)) {
            // one hour per 15° of longitude, round to nearest quarter hour
            tzOffset = Math.round((lng / 15) * 4) / 4;
          }
          const coord = { lat, lng };
          if (tzOffset !== null) coord.timezone = tzOffset;
          return coord;
        }
      }
    } catch (_) {
      // ignore
    }
    return null;
  }

  let geometry = null;
  // First attempt: OpenCage
  geometry = await geocodeOpenCage(place);
  // Fallback: Nominatim
  if (!geometry) {
    geometry = await geocodeNominatim(place);
  }
  if (geometry) {
    return {
      statusCode: 200,
      body: JSON.stringify(geometry),
      headers: { 'Content-Type': 'application/json' }
    };
  }
  // If no result at all
  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Unable to geocode location.' })
  };
}

module.exports = { handler };
