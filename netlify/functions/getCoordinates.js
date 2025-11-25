/*
 * Netlify Function: getCoordinates
 *
 * Esta função serverless faz proxy para o serviço de geocodificação:
 * 1) Tenta o OpenCage se a chave OPENCAGE_KEY estiver configurada.
 * 2) Se não houver chave ou não houver resultado, cai no Nominatim (OpenStreetMap).
 *
 * Entrada:
 *   - Método: GET
 *   - Query param obrigatório: `place` (string)
 *
 * Saída (200):
 *   {
 *     lat: number,
 *     lng: number,
 *     timezone?: number,  // offset em horas, se disponível (pode vir do OpenCage ou aproximado)
 *     tzName?: string     // nome da timezone (apenas OpenCage)
 *   }
 */

async function handler(event) {
  try {
    // Opcional: restringir método a GET
    if (event.httpMethod && event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json', Allow: 'GET' },
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    const rawPlace = event.queryStringParameters?.place;
    const place = typeof rawPlace === 'string' ? rawPlace.trim() : '';

    if (!place) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing required query parameter `place`.' })
      };
    }

    /**
     * Tenta obter coordenadas via OpenCage se a chave estiver configurada.
     * Se falhar ou não retornar resultados, retorna null.
     *
     * @param {string} q Localização a geocodificar
     * @returns {Promise<{lat:number,lng:number,timezone?:number,tzName?:string}|null>}
     */
    async function geocodeOpenCage(q) {
      const apiKey = process.env.OPENCAGE_KEY;
      if (!apiKey) return null;

      try {
        const url = new URL('https://api.opencagedata.com/geocode/v1/json');
        url.searchParams.set('q', q);
        url.searchParams.set('key', apiKey);
        url.searchParams.set('language', 'pt'); // consistência com UI
        url.searchParams.set('limit', '1');
        // Garantir que timezone venha nas anotações
        url.searchParams.set('no_annotations', '0');

        const res = await fetch(url.toString());
        if (!res.ok) {
          console.error('[getCoordinates] OpenCage HTTP error:', res.status);
          return null;
        }

        const data = await res.json();
        const result = data?.results?.[0];
        const geom = result?.geometry;

        if (!geom || typeof geom.lat !== 'number' || typeof geom.lng !== 'number') {
          return null;
        }

        const coord = {
          lat: geom.lat,
          lng: geom.lng
        };

        // Timezone vinda do próprio OpenCage (mais confiável que chute por longitude)
        const tz = result?.annotations?.timezone;
        if (tz && typeof tz.offset_sec === 'number') {
          coord.timezone = tz.offset_sec / 3600;
        }
        if (tz && typeof tz.name === 'string') {
          coord.tzName = tz.name;
        }

        return coord;
      } catch (err) {
        console.error('[getCoordinates] OpenCage error:', err);
        return null;
      }
    }

    /**
     * Fallback usando Nominatim (OpenStreetMap).
     * API pública, sem chave. Exige User-Agent.
     *
     * @param {string} q Localização a geocodificar
     * @returns {Promise<{lat:number,lng:number,timezone?:number}|null>}
     */
    async function geocodeNominatim(q) {
      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('q', q);
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '1');

        const res = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'astrografia-netlify-function/1.0',
            'Accept-Language': 'pt'
          }
        });

        if (!res.ok) {
          console.error('[getCoordinates] Nominatim HTTP error:', res.status);
          return null;
        }

        const data = await res.json();
        const first = data?.[0];
        if (!first || !first.lat || !first.lon) {
          return null;
        }

        const lat = parseFloat(first.lat);
        const lng = parseFloat(first.lon);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          return null;
        }

        const coord = { lat, lng };

        // Opcional: offset aproximado pela longitude.
        // Como a tua função de mapa astral já usa -3 de padrão,
        // você pode escolher usar ou não esse campo no front.
        const tzOffset = Math.round((lng / 15) * 4) / 4;
        if (Number.isFinite(tzOffset)) {
          coord.timezone = tzOffset;
        }

        return coord;
      } catch (err) {
        console.error('[getCoordinates] Nominatim error:', err);
        return null;
      }
    }

    // Tenta primeiro OpenCage; se falhar, cai no Nominatim
    const geometry =
      (await geocodeOpenCage(place)) || (await geocodeNominatim(place));

    if (geometry) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geometry)
      };
    }

    // Nenhum provedor retornou resultado
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unable to geocode location.' })
    };
  } catch (err) {
    console.error('[getCoordinates] Unexpected error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error.' })
    };
  }
}

module.exports = { handler };
