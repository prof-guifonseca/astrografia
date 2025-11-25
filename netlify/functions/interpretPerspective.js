/*
 * Netlify Function: interpretPerspective
 *
 * This endpoint accepts a POST request with a JSON body containing a
 * `text` string and optionally the `astro` data (planets and ascendant).
 * The function is intended to forward the message to a large language
 * model or database to generate a personalised reflection. For the
 * purpose of this exercise we provide a minimal implementation that
 * returns a canned response enriched with the sign of the Sun and
 * Ascendant when available. If a SUPABASE_URL and SUPABASE_KEY are
 * configured the function would be extended to persist the message or
 * query stored interpretations. This scaffolding allows future
 * development without exposing secret keys to the client.
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
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }
  const { text, astro } = body;
  if (!text || typeof text !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing or invalid `text` field.' }) };
  }
  // Basic interpretation: echo user input and include astrological highlights
  const sun = astro?.planets?.find(p => p.name === 'Sun');
  const asc = astro?.ascendant;
  let msg = '<p><strong>Obrigado por compartilhar sua perspectiva.</strong></p>';
  if (sun && asc) {
    msg += `<p>Você é nativo de <strong>${sun.sign}</strong>, um signo que demonstra características de coragem e autenticidade. `;
    msg += `Seu Ascendente em <strong>${asc.sign}</strong> adiciona uma camada de nuance à forma como se apresenta ao mundo.</p>`;
  }
  if (text.trim().length > 20) {
    msg += '<p>Sua mensagem revela profundidade e introspecção. Use este momento para olhar para dentro, honrar seus sentimentos e confiar no seu caminho.</p>';
  } else {
    msg += '<p>Mesmo os pensamentos mais breves possuem significado. Permita‑se sentir plenamente e avançar com gentileza.</p>';
  }
  // Optionally: persist to Supabase or call an LLM here
  return {
    statusCode: 200,
    body: JSON.stringify({ html: msg }),
    headers: { 'Content-Type': 'application/json' }
  };
}