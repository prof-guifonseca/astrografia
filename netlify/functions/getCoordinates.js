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
  const key = process.env.OPENCAGE_KEY;
  if (!key) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'OpenCage API key not configured.' })
    };
  }
  try {
    const url = new URL('https://api.opencagedata.com/geocode/v1/json');
    url.searchParams.set('q', place);
    url.searchParams.set('key', key);
    url.searchParams.set('language', 'pt');
    url.searchParams.set('limit', '1');
    const res = await fetch(url.toString());
    if (!res.ok) {
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: 'Upstream geocoding request failed.' })
      };
    }
    const data = await res.json();
    const geometry = data?.results?.[0]?.geometry || null;
    return {
      statusCode: 200,
      body: JSON.stringify(geometry),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch coordinates.', details: err.message })
    };
  }
}

module.exports = { handler };
