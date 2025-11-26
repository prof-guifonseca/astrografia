/* 
 * Netlify Function: interpretPerspective
 *
 * Esta função recebe um POST com { text, astro } e gera uma interpretação
 * usando a API do OpenAI (GPT-5.1), se houver OPENAI_API_KEY configurada.
 * Se não houver chave ou ocorrer erro, cai num fallback simples.
 */

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
      headers: { Allow: "POST" },
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  // Também recebemos o primeiro nome para personalização
  const { text, astro, firstName } = body;

  if (!text || typeof text !== "string") {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or invalid `text` field." }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // Se não tiver chave configurada, usa mensagem simplificada
  if (!apiKey) {
    const html = buildFallbackMessage(text, astro, false);
    return respondOk(html);
  }

  try {
    const astroSummary = buildAstroSummary(astro);

    // Monta o conteúdo enviado pelo usuário incluindo o primeiro nome, quando presente
    const userContent = `
Mensagem da pessoa:
${text}

Nome da pessoa (primeiro nome, se disponível):
${firstName || 'Desconhecido'}

Resumo astrológico disponível:
${astroSummary}
`.trim();

    /*
     * Prepara a solicitação para a API de Chat Completions da OpenAI.
     * Utilizamos max_tokens com valor maior (1200) para permitir respostas densas (~800 tokens).
     * O prompt do sistema enfatiza um tom afetivo, estético e reflexivo, e orienta o uso natural
     * do primeiro nome quando disponível. Outras configurações são preservadas.
     */
    const openAiModel = process.env.OPENAI_MODEL || "gpt-4o";
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: openAiModel,
        max_tokens: 1200,
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `Você é um astrólogo cuidadoso, crítico com determinismos e extremamente acolhedor. Sua escrita em português do Brasil combina tom reflexivo, poético e estético, tratando a astrologia como linguagem simbólica e não como sentença. Sempre que possível, dirija-se à pessoa pelo primeiro nome fornecido de maneira natural, sem soar robótico ou repetitivo. Elabore respostas densas e fluidas, com cerca de 800 tokens, que acolham e inspirem, tecendo conexões entre a perspectiva apresentada, o mapa natal e temas da vida.`,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      const html = buildFallbackMessage(text, astro, true);
      return respondOk(html);
    }

    const data = await response.json();
    const content =
      data.choices?.[0]?.message?.content?.trim() ??
      "Não consegui gerar uma interpretação neste momento.";

    const html = textToHtml(content);
    return respondOk(html);
  } catch (err) {
    console.error("Unexpected error talking to OpenAI:", err);
    const html = buildFallbackMessage(text, astro, true);
    return respondOk(html);
  }
}

module.exports = { handler };

/**
 * Converte texto com quebras de linha em HTML simples (<p> e <br>).
 */
function textToHtml(text) {
  // proteção básica contra HTML injetado
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return safe
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Monta um pequeno resumo a partir dos dados astrológicos.
 */
function buildAstroSummary(astro) {
  if (!astro) return "Dados astrológicos não informados.";

  const sun = astro.planets?.find((p) => p.name === "Sun");
  const asc = astro.ascendant;

  const parts = [];
  if (sun) parts.push(`Sol em ${sun.sign}`);
  if (asc) parts.push(`Ascendente em ${asc.sign}`);

  if (astro.planets?.length) {
    const extras = astro.planets
      .filter((p) => p.name !== "Sun")
      .slice(0, 5)
      .map((p) => `${p.name} em ${p.sign}`)
      .join(" • ");
    if (extras) parts.push(extras);
  }

  return parts.join(" | ") || "Dados astrológicos não informados.";
}

/**
 * Fallback simples caso a IA não esteja disponível.
 */
function buildFallbackMessage(text, astro, withErrorNote) {
  const sun = astro?.planets?.find((p) => p.name === "Sun");
  const asc = astro?.ascendant;

  let msg = `Obrigado por compartilhar sua perspectiva.<br><br>`;

  if (sun && asc) {
    msg += `Você é nativo de ${sun.sign}, um signo que costuma expressar coragem e autenticidade. `;
    msg += `Seu Ascendente em ${asc.sign} colore a forma como você se apresenta ao mundo, modulando a maneira como os outros percebem sua energia.<br><br>`;
  }

  if (text.trim().length > 20) {
    msg += `Sua mensagem revela profundidade e introspecção. Use este momento para olhar para dentro, honrar seus sentimentos e confiar no seu caminho.<br><br>`;
  } else {
    msg += `Mesmo os pensamentos mais breves possuem significado. Permita-se sentir plenamente e avançar com gentileza.<br><br>`;
  }

  if (withErrorNote) {
    msg += `<small>Obs.: não foi possível acessar o serviço avançado de interpretação agora; exibindo uma leitura simplificada.</small>`;
  }

  return msg;
}

function respondOk(html) {
  return {
    statusCode: 200,
    body: JSON.stringify({ html }),
    headers: { "Content-Type": "application/json" },
  };
}
