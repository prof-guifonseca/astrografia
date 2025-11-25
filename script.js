// Astrografia 🌌 — Versão alinhada com Netlify Functions
(() => {
  'use strict';

  // Endpoints Netlify (serverless). Mantêm as chaves fora do cliente.
  const API = {
    astro: '/.netlify/functions/getAstroData',
    coords: '/.netlify/functions/getCoordinates',
    perspective: '/.netlify/functions/interpretPerspective'
  };

  const $ = s => document.querySelector(s);

  /*
   * =============================
   *   Efemérides locais 🪐
   *
   * Fallback local caso a função serverless falhe (modo offline).
   * Usa um modelo circular simplificado a partir do epoch J2000.
   * NÃO substitui efemérides profissionais; serve apenas como
   * aproximação lúdica quando não há resposta do backend.
   */

  // Nomes dos signos em português na ordem zodiacal.
  const SIGNS_PT = [
    'Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem',
    'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'
  ];

  const SIGN_INFO = {
    'Áries': { traits: ['corajoso', 'impulsivo', 'independente', 'dinâmico'] },
    'Touro': { traits: ['estável', 'determinado', 'prático', 'sensual'] },
    'Gêmeos': { traits: ['comunicativo', 'curioso', 'versátil', 'social'] },
    'Câncer': { traits: ['emocional', 'protetor', 'nutritivo', 'sensível'] },
    'Leão': { traits: ['confiante', 'generoso', 'expressivo', 'criativo'] },
    'Virgem': { traits: ['analítico', 'organizado', 'detalhista', 'prudente'] },
    'Libra': { traits: ['harmonioso', 'sociável', 'diplomático', 'esteta'] },
    'Escorpião': { traits: ['intenso', 'transformador', 'profundo', 'misterioso'] },
    'Sagitário': { traits: ['aventureiro', 'otimista', 'filosófico', 'expansivo'] },
    'Capricórnio': { traits: ['disciplinado', 'ambicioso', 'pragmático', 'responsável'] },
    'Aquário': { traits: ['inovador', 'independente', 'visionário', 'humanitário'] },
    'Peixes': { traits: ['sensível', 'imaginativo', 'compassivo', 'místico'] }
  };

  const SIGN_ELEMENTS = {
    'Áries': 'Fogo', 'Leão': 'Fogo', 'Sagitário': 'Fogo',
    'Touro': 'Terra', 'Virgem': 'Terra', 'Capricórnio': 'Terra',
    'Gêmeos': 'Ar', 'Libra': 'Ar', 'Aquário': 'Ar',
    'Câncer': 'Água', 'Escorpião': 'Água', 'Peixes': 'Água'
  };

  // Definições dos planetas (português) para o fallback local
  const PLANET_DEFS = [
    { name: 'Sol',      period: 365.256,   init: 280.460,    icon: '☀️' },
    { name: 'Lua',      period: 27.321582, init: 218.316,    icon: '🌙' },
    { name: 'Mercúrio', period: 87.969,    init: 252.25084,  icon: '☿️' },
    { name: 'Vênus',    period: 224.701,   init: 181.97973,  icon: '♀️' },
    { name: 'Marte',    period: 686.98,    init: 355.43300,  icon: '♂️' },
    { name: 'Júpiter',  period: 4332.59,   init: 34.35151,   icon: '♃' },
    { name: 'Saturno',  period: 10759.22,  init: 50.07744,   icon: '♄' },
    { name: 'Urano',    period: 30685.4,   init: 314.05501,  icon: '♅' },
    { name: 'Netuno',   period: 60190.03,  init: 304.34866,  icon: '♆' },
    { name: 'Plutão',   period: 90560,     init: 238.92903,  icon: '♇' }
  ];

  /**
   * Fallback local: calcula posições planetárias aproximadas.
   * @param {string} dateStr YYYY-MM-DD
   * @param {string} timeStr HH:MM
   * @returns {{planets: Array, ascendant: Object}}
   */
  function computeAstroData(dateStr, timeStr) {
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
        if (p.name === 'Sol') {
          deg = (earthLong + 180) % 360;
        } else {
          deg = p.init + (360 / p.period) * days;
          deg = ((deg % 360) + 360) % 360;
        }
        const signIndex = Math.floor(deg / 30);
        const sign = SIGNS_PT[signIndex];
        const signDegree = deg % 30;
        planets.push({
          name: p.name,        // português
          sign,                // português
          signDegree,
          degree: deg,
          icon: p.icon
        });
      });

      const hourVal = Number.isFinite(h) ? h : 0;
      const minVal = Number.isFinite(mi) ? mi : 0;
      const timeFraction = ((hourVal + minVal / 60) / 24) % 1;
      const ascDeg = (timeFraction * 360) % 360;
      const ascSignIndex = Math.floor(ascDeg / 30);
      const ascSign = SIGNS_PT[ascSignIndex];

      return {
        planets,
        ascendant: { sign: ascSign, degree: ascDeg % 30 }
      };
    } catch (err) {
      console.error('[Astrografia] Erro ao calcular mapa local:', err);
      return { planets: [], ascendant: null };
    }
  }

  const formEl = $('#astro-form');
  const nameEl = $('#name');
  const dateEl = $('#birthDate');
  const timeEl = $('#birthTime');
  const placeEl = $('#birthPlace');
  const resultSection = $('#result-section');
  const summaryEl = $('#summary');
  const chartEl = $('#chart-container');
  const reportEl = $('#report-container');
  const sectionBtns = document.querySelectorAll('.btn-section');
  const sectionGroup = $('#section-buttons');
  const perspectiveSec = $('#perspective-section');
  const perspectiveEl = $('#perspective-text');
  const submitPerspectiveBtn = $('#submit-perspective');
  const perspectiveResult = $('#perspective-result');

  let dadosGerados = null;

  // ===============================
  //  Geocodificação (Netlify)
  // ===============================
  async function obterCoordenadas(local) {
    try {
      const url = `${API.coords}?place=${encodeURIComponent(local)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Falha ao obter coordenadas');
      return await res.json(); // { lat, lng, timezone?, tzName? }
    } catch (err) {
      console.error('[Astrografia] Erro ao obter coordenadas:', err);
      showToast('Não foi possível determinar as coordenadas. Usando cálculo aproximado.', 'warning');
      return null;
    }
  }

  // ===============================
  //  Posições planetárias (Netlify)
  // ===============================
  async function obterPosicoesPlanetarias(params) {
    try {
      const res = await fetch(API.astro, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json?.planets?.length) {
        // json já vem com { planets, ascendant, source }
        return json;
      }

      throw new Error('Resposta sem planetas');
    } catch (err) {
      console.error('[Astrografia] Erro ao obter posições:', err);
      // Fallback local: mesmo shape, mas marcando a origem
      const fallback = computeAstroData(params.date, params.time);
      return { ...fallback, source: 'fallback-local' };
    }
  }

  // ===============================
  //  Toasts
  // ===============================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast--hide');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
  }

  // ===============================
  //  Renderização das posições
  // ===============================
  function exibirPlanetas(planets = [], ascendant = null, source) {
    chartEl.innerHTML = '<h3 class="fade-in">🔭 Posições Celestes</h3>';

    if (!planets.length) {
      chartEl.innerHTML += '<p>⚠️ Nenhuma posição planetária encontrada.</p>';
      return;
    }

    const ul = document.createElement('ul');
    ul.classList.add('report-html');

    if (ascendant?.sign) {
      const grauAsc = typeof ascendant.degree === 'number'
        ? ascendant.degree.toFixed(1)
        : '?';
      ul.innerHTML += `<li>🌅 Ascendente: <strong>${ascendant.sign}</strong> ${grauAsc}°</li>`;
    }

    planets.forEach(p => {
      const grau = typeof p.signDegree === 'number'
        ? `${p.signDegree.toFixed(1)}°`
        : (typeof p.degree === 'number' ? `${p.degree.toFixed(1)}°` : '?°');
      ul.innerHTML += `<li>${p.icon || '🔹'} ${p.name}: <strong>${p.sign}</strong> ${grau}</li>`;
    });

    if (source === 'fallback' || source === 'fallback-local') {
      ul.innerHTML += `<li><em>⚠️ Mapa calculado de forma aproximada (sem efemérides completas).</em></li>`;
    }

    chartEl.appendChild(ul);
  }

  // ===============================
  //  Submit do formulário
  // ===============================
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = nameEl.value.trim();
    const birthDate = dateEl.value;
    const birthTime = timeEl.value;
    const birthPlace = placeEl.value.trim();

    if (!name || !birthDate || !birthTime || !birthPlace) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    const btn = $('#generateMap');
    btn.disabled = true;
    btn.textContent = '⌛ Gerando...';

    summaryEl.textContent = 'Calculando posições com alta precisão...';
    chartEl.innerHTML = '';
    reportEl.innerHTML = '';
    resultSection.classList.remove('hidden');

    // Coordenadas (pode vir timezone do OpenCage)
    const coords = await obterCoordenadas(birthPlace);

    // Solicita posições ao backend; inclui timezone se vier das coords
    const params = {
      date: birthDate,
      time: birthTime,
      lat: coords?.lat,
      lon: coords?.lng,
      timezone: coords?.timezone
    };

    const response = await obterPosicoesPlanetarias(params);
    dadosGerados = response;

    if (response.source === 'api') {
      summaryEl.textContent = '✅ Mapa gerado com efemérides precisas.';
    } else if (response.source === 'fallback') {
      summaryEl.textContent = '⚠️ Mapa gerado com cálculo aproximado (fallback do servidor).';
      showToast('Usando cálculo aproximado de posições. Resultados podem ser menos precisos.', 'warning');
    } else if (response.source === 'fallback-local') {
      summaryEl.textContent = '⚠️ Mapa gerado localmente (modo offline / erro de rede).';
      showToast('Mapa calculado localmente. Use como referência lúdica, não como cálculo profissional.', 'warning');
    } else {
      summaryEl.textContent = '✅ Mapa gerado.';
    }

    exibirPlanetas(response.planets, response.ascendant, response.source);
    sectionGroup?.classList.remove('hidden');
    perspectiveSec?.classList.remove('hidden');

    btn.disabled = false;
    btn.textContent = 'Gerar Mapa Astral';
  });

  // ===============================
  //  Interpretações por tema
  // ===============================
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-topic]');
    if (!btn || !dadosGerados) return;

    const tema = btn.dataset.topic;
    sectionBtns.forEach(b => b.classList.remove('btn-section--active'));
    btn.classList.add('btn-section--active');
    reportEl.innerHTML = '';

    btn.textContent = 'Gerando...';
    btn.disabled = true;

    function interpretTheme(themeKey, data) {
      const planets = data?.planets || [];
      const asc = data?.ascendant;
      const getPlanet = (name) => planets.find(p => p.name === name);
      const html = [];

      function traitsOf(sign, count = 4) {
        const traits = SIGN_INFO[sign]?.traits || [];
        return traits.slice(0, count).join(', ');
      }

      function synergyPhrase(el1, el2) {
        if (!el1 || !el2) return '';
        if (el1 === el2) {
          return `Como ambos pertencem ao elemento <strong>${el1}</strong>, suas energias tendem a atuar de forma harmoniosa e natural.`;
        }
        return `A combinação de elementos distintos (<strong>${el1}</strong> e <strong>${el2}</strong>) traz dinamismo e complementaridade, oferecendo oportunidades de aprendizado e equilíbrio.`;
      }

      switch (themeKey) {
        case 'amor': {
          const venus = getPlanet('Vênus');
          const mars = getPlanet('Marte');
          if (!venus || !mars || !asc) break;
          const venTraits = traitsOf(venus.sign);
          const marsTraits = traitsOf(mars.sign);
          const venElement = SIGN_ELEMENTS[venus.sign];
          const marsElement = SIGN_ELEMENTS[mars.sign];
          html.push(`<h4>❤️ Amor e Relacionamentos</h4>`);
          html.push(`<p>Com Vênus em <strong>${venus.sign}</strong> (${venus.signDegree.toFixed(1)}°), você expressa o afeto de maneira ${venTraits}. Vênus governa a forma como amamos, buscamos harmonia e apreciamos a beleza; este posicionamento revela como você se conecta emocionalmente e valoriza os vínculos afetivos.</p>`);
          html.push(`<p>Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°) acrescenta uma energia ${marsTraits} aos seus desejos e iniciativas. Marte mostra como perseguimos o que queremos, inclusive nos relacionamentos, e como lidamos com a paixão e a assertividade.</p>`);
          html.push(`<p>${synergyPhrase(venElement, marsElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a maneira como você se apresenta e influencia as dinâmicas afetivas.</p>`);
          break;
        }
        case 'carreira': {
          const jup = getPlanet('Júpiter');
          const sat = getPlanet('Saturno');
          if (!jup || !sat || !asc) break;
          const jupTraits = traitsOf(jup.sign);
          const satTraits = traitsOf(sat.sign);
          const jupElement = SIGN_ELEMENTS[jup.sign];
          const satElement = SIGN_ELEMENTS[sat.sign];
          html.push(`<h4>💼 Carreira e Propósito</h4>`);
          html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) sugere que suas oportunidades profissionais florescem quando você aposta em ${jupTraits}. Júpiter é o planeta da expansão e do crescimento; seu signo revela onde você busca prosperar.</p>`);
          html.push(`<p>Saturno em <strong>${sat.sign}</strong> (${sat.signDegree.toFixed(1)}°) traz uma disciplina ${satTraits} às suas ambições. Saturno indica onde precisamos trabalhar com persistência e responsabilidade para conquistar resultados duradouros.</p>`);
          html.push(`<p>${synergyPhrase(jupElement, satElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) mostra a postura que você adota ao perseguir suas metas e como é percebido no ambiente profissional.</p>`);
          break;
        }
        case 'familia': {
          const moon = getPlanet('Lua');
          const sun = getPlanet('Sol');
          if (!moon || !asc) break;
          const moonTraits = traitsOf(moon.sign);
          const sunTraits = sun ? traitsOf(sun.sign) : '';
          const moonElement = SIGN_ELEMENTS[moon.sign];
          const sunElement = sun ? SIGN_ELEMENTS[sun.sign] : null;
          html.push(`<h4>🏠 Família e Origens</h4>`);
          html.push(`<p>A Lua em <strong>${moon.sign}</strong> (${moon.signDegree.toFixed(1)}°) reflete uma natureza emocional ${moonTraits}. Ela revela como você nutre, procura segurança e se conecta com suas raízes.</p>`);
          if (sun) {
            html.push(`<p>O Sol em <strong>${sun.sign}</strong> (${sun.signDegree.toFixed(1)}°) contribui com uma essência ${sunTraits} às suas relações familiares, mostrando como sua identidade se manifesta dentro do lar.</p>`);
          }
          html.push(`<p>${synergyPhrase(moonElement, sunElement || moonElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) mostra como você acolhe e protege aqueles ao seu redor.</p>`);
          break;
        }
        case 'espiritualidade': {
          const nep = getPlanet('Netuno');
          const jup = getPlanet('Júpiter');
          if (!nep || !asc) break;
          const nepTraits = traitsOf(nep.sign);
          const jupTraits = jup ? traitsOf(jup.sign) : '';
          const nepElement = SIGN_ELEMENTS[nep.sign];
          const jupElement = jup ? SIGN_ELEMENTS[jup.sign] : null;
          html.push(`<h4>🧘 Espiritualidade</h4>`);
          html.push(`<p>Netuno em <strong>${nep.sign}</strong> (${nep.signDegree.toFixed(1)}°) aponta para uma conexão espiritual ${nepTraits}. Netuno rege sonhos, intuições e o inconsciente; seu signo indica por onde você se perde e se encontra no mistério da vida.</p>`);
          if (jup) {
            html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) complementa sua jornada espiritual com uma energia ${jupTraits}, incentivando a busca por sabedoria e sentido.</p>`);
          }
          html.push(`<p>${synergyPhrase(nepElement, jupElement || nepElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) orienta a forma como você manifesta sua busca interior no cotidiano.</p>`);
          break;
        }
        case 'missao': {
          const sun = getPlanet('Sol');
          const jup = getPlanet('Júpiter');
          if (!sun || !asc) break;
          const sunTraits = traitsOf(sun.sign);
          const jupTraits = jup ? traitsOf(jup.sign) : '';
          const sunElement = SIGN_ELEMENTS[sun.sign];
          const jupElement = jup ? SIGN_ELEMENTS[jup.sign] : null;
          html.push(`<h4>🚀 Missão de Vida</h4>`);
          html.push(`<p>O Sol em <strong>${sun.sign}</strong> (${sun.signDegree.toFixed(1)}°) revela uma essência marcada por ${sunTraits}. O Sol representa nosso núcleo, vitalidade e propósito.</p>`);
          if (jup) {
            html.push(`<p>Júpiter em <strong>${jup.sign}</strong> (${jup.signDegree.toFixed(1)}°) reforça seu propósito ao acrescentar uma visão ${jupTraits}, ampliando seus horizontes.</p>`);
          }
          html.push(`<p>${synergyPhrase(sunElement, jupElement || sunElement)} O Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) colore a expressão dessa missão, mostrando como você se coloca no mundo.</p>`);
          break;
        }
        case 'desafios': {
          const plut = getPlanet('Plutão');
          const mars = getPlanet('Marte');
          const sat = getPlanet('Saturno');
          if (!plut || !mars || !asc) break;
          const plutTraits = traitsOf(plut.sign);
          const marsTraits = traitsOf(mars.sign);
          const satTraits = sat ? traitsOf(sat.sign) : '';
          const plutElement = SIGN_ELEMENTS[plut.sign];
          const marsElement = SIGN_ELEMENTS[mars.sign];
          const satElement = sat ? SIGN_ELEMENTS[sat.sign] : null;
          html.push(`<h4>⚖️ Desafios Pessoais</h4>`);
          html.push(`<p>Plutão em <strong>${plut.sign}</strong> (${plut.signDegree.toFixed(1)}°) fala de processos de ${plutTraits}. Este planeta mostra onde precisamos nos transformar profundamente.</p>`);
          html.push(`<p>Marte em <strong>${mars.sign}</strong> (${mars.signDegree.toFixed(1)}°) apresenta desafios ligados à ${marsTraits}. Reconhecer a natureza de Marte ajuda a lidar melhor com impulsos e confrontos.</p>`);
          if (sat) {
            html.push(`<p>Saturno em <strong>${sat.sign}</strong> (${sat.signDegree.toFixed(1)}°) adiciona uma camada de ${satTraits} aos seus obstáculos, indicando onde a vida pode exigir disciplina.</p>`);
          }
          html.push(`<p>${synergyPhrase(plutElement, marsElement)} Seu Ascendente em <strong>${asc.sign}</strong> (${asc.degree.toFixed(1)}°) ajuda a integrar essas forças, apontando caminhos de crescimento.</p>`);
          break;
        }
        default: {
          html.push('<p>⚠️ Tema não reconhecido.</p>');
          break;
        }
      }

      if (!html.length) {
        return '<p>⚠️ Não há dados suficientes para interpretar este tema.</p>';
      }
      return html.join('');
    }

    const interpretation = interpretTheme(tema, dadosGerados);
    reportEl.innerHTML = interpretation;

    btn.textContent = '✔️ Interpretado';
    btn.disabled = true;
  });

  // ===============================
  //  Perspectiva pessoal
  // ===============================
  submitPerspectiveBtn?.addEventListener('click', async () => {
    const texto = perspectiveEl.value.trim();
    if (!texto) {
      showToast('Por favor, escreva sua perspectiva pessoal.', 'error');
      return;
    }
    submitPerspectiveBtn.disabled = true;
    submitPerspectiveBtn.textContent = '⌛ Interpretando...';
    perspectiveResult.innerHTML = '';
    try {
      const res = await fetch(API.perspective, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texto, astro: dadosGerados })
      });
      if (res.ok) {
        const json = await res.json();
        perspectiveResult.innerHTML = `<article class="report-html">${json.html}</article>`;
      } else {
        const msg = interpretPerspectiveLocal(texto, dadosGerados || {});
        perspectiveResult.innerHTML = `<article class="report-html">${msg}</article>`;
      }
    } catch (err) {
      console.error('[Astrografia] Erro ao interpretar perspectiva:', err);
      const msg = interpretPerspectiveLocal(texto, dadosGerados || {});
      perspectiveResult.innerHTML = `<article class="report-html">${msg}</article>`;
    }
    submitPerspectiveBtn.disabled = false;
    submitPerspectiveBtn.textContent = 'Interpretar Minha Perspectiva';
  });

  // Fallback local da perspectiva, usando nomes em PT
  function interpretPerspectiveLocal(text, data) {
    const sun = data?.planets?.find(p => p.name === 'Sol');
    const asc = data?.ascendant;
    let msg = '<p><strong>Obrigado por compartilhar sua perspectiva.</strong></p>';
    if (sun && asc && SIGN_INFO[sun.sign]) {
      const traits = SIGN_INFO[sun.sign].traits.slice(0, 2).join(' e ');
      msg += `<p>Como nativo de <strong>${sun.sign}</strong>, sua essência é marcada por ${traits}. `;
      msg += `O Ascendente em <strong>${asc.sign}</strong> influencia a maneira como você encara situações presentes.</p>`;
    }
    if (text.length > 20) {
      msg += '<p>Sua mensagem revela profundidade e autenticidade. Use esse momento para reconectar-se com seus valores e confiar no processo. Cada experiência é uma oportunidade de crescimento.</p>';
    } else {
      msg += '<p>Permita-se sentir e refletir. Pequenos pensamentos também carregam verdades. Honre suas necessidades e siga em frente com gentileza.</p>';
    }
    return msg;
  }

})();
